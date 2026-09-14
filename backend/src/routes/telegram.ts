import { Router, Request, Response } from 'express';
import { telegramService } from '../services/telegramService.js';
import { CONFIG } from '../config.js';
import { db } from '../db/database.js';

const router = Router();

// GET /api/telegram/status - Get current Telegram configuration status
router.get('/status', async (_req: Request, res: Response) => {
  try {
    const creds = telegramService.getCredentials();
    const token = ((await db.getSetting('telegramBotToken')) || CONFIG.TELEGRAM.BOT_TOKEN || '').trim();
    const chatId = ((await db.getSetting('telegramChatId')) || CONFIG.TELEGRAM.CHAT_ID || '').trim();

    let botInfo: any = null;
    if (token) {
      try {
        const checkRes = await fetch(`https://api.telegram.org/bot${token}/getMe`);
        const checkData = await checkRes.json() as any;
        if (checkData.ok) {
          botInfo = checkData.result;
        }
      } catch {}
    }

    res.json({
      success: true,
      data: {
        botTokenConfigured: Boolean(token),
        botTokenMasked: token ? `${token.substring(0, 10)}...${token.substring(token.length - 4)}` : '',
        chatId: chatId,
        notificationsEnabled: creds.notificationsEnabled,
        botUsername: botInfo?.username || 'juon9_trade_bot',
        botFirstName: botInfo?.first_name || 'Joun9 Trade Bot',
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/telegram/toggle - Turn notifications on or off
router.post('/toggle', async (req: Request, res: Response) => {
  try {
    const { enabled } = req.body;
    const isEnabled = enabled !== undefined ? Boolean(enabled) : !telegramService.isNotificationsEnabled();
    const newStatus = await telegramService.setNotificationsEnabled(isEnabled);

    // Also persist in database
    await db.setSetting('telegramAlertsActive', newStatus ? 'true' : 'false');

    res.json({
      success: true,
      data: {
        notificationsEnabled: newStatus,
        message: newStatus ? 'Đã BẬT thông báo Telegram' : 'Đã TẮT thông báo Telegram'
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/telegram/test - Send test message
router.post('/test', async (_req: Request, res: Response) => {
  try {
    const nowStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const testMsg = 
`🔔 *KIỂM TRA KẾT NỐI TELEGRAM*
━━━━━━━━━━━━━━━━━━━━
✅ *Trạng thái*: Hoạt động ổn định
⏰ *Thời gian*: ${nowStr}
📊 *Hệ thống*: Exness Pro Auto Trading Bot
⚡ *Kênh nhận*: Telegram Alert Service

_Thông báo này xác nhận kênh kết nối giữa Web App và Telegram của bạn hoạt động 100% bình thường!_`;

    const sent = await telegramService.sendTelegramMessage(testMsg, 'Markdown');
    if (sent) {
      res.json({ success: true, message: 'Đã gửi tin nhắn thử nghiệm thành công tới Telegram của bạn!' });
    } else {
      res.status(400).json({ 
        success: false, 
        error: 'Không thể gửi tin nhắn. Vui lòng kiểm tra lại Bot Token và Chat ID trong cấu hình.' 
      });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/telegram/credentials - Update Bot Token and Chat ID
router.post('/credentials', async (req: Request, res: Response) => {
  try {
    const { botToken, chatId } = req.body;
    if (!botToken || !chatId) {
      return res.status(400).json({ success: false, error: 'Vui lòng cung cấp đầy đủ Bot Token và Chat ID' });
    }

    const trimmedToken = String(botToken).trim();
    const trimmedChatId = String(chatId).trim();

    // Verify token validity with Telegram API
    try {
      const checkRes = await fetch(`https://api.telegram.org/bot${trimmedToken}/getMe`);
      const checkData = await checkRes.json() as any;
      if (!checkData.ok) {
        return res.status(400).json({
          success: false,
          error: `Telegram Bot Token không hợp lệ: ${checkData.description || 'Xác thực thất bại (Unauthorized)'}`
        });
      }
    } catch (netErr: any) {
      // If external network is temporarily unreachable, proceed with warning log
      console.warn('Không thể kiểm tra bot token qua Telegram API:', netErr.message);
    }

    await telegramService.setCredentials(trimmedToken, trimmedChatId);
    res.json({ success: true, message: 'Đã cập nhật thông tin Telegram Bot thành công!' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Lỗi cập nhật thông tin Telegram' });
  }
});

import { authenticateToken, AuthenticatedRequest } from '../middleware/auth.js';

// GET /api/telegram/user-status - Get logged-in user's personal telegram configuration
router.get('/user-status', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Chưa đăng nhập' });
      return;
    }

    const user = await db.findUserById(req.user.id);
    if (!user) {
      res.status(404).json({ success: false, error: 'Không tìm thấy người dùng' });
      return;
    }

    const isEligible = user.plan === 'pro' || user.plan === 'ultra' || user.role === 'admin';
    const token = user.telegramBotToken || '';
    const chatId = user.telegramChatId || '';

    let botInfo: any = null;
    if (token && isEligible) {
      try {
        const checkRes = await fetch(`https://api.telegram.org/bot${token}/getMe`);
        const checkData = await checkRes.json() as any;
        if (checkData.ok) {
          botInfo = checkData.result;
        }
      } catch {}
    }

    res.json({
      success: true,
      data: {
        isEligible,
        plan: user.plan,
        botTokenConfigured: Boolean(token),
        botTokenMasked: token ? `${token.substring(0, 8)}...${token.substring(token.length - 4)}` : '',
        chatId,
        notificationsEnabled: user.telegramAlertsActive !== false,
        botUsername: botInfo?.username || '',
        botFirstName: botInfo?.first_name || ''
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/telegram/user-config - Update user's personal telegram token & chat ID
router.put('/user-config', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Chưa đăng nhập' });
      return;
    }

    const user = await db.findUserById(req.user.id);
    if (!user) {
      res.status(404).json({ success: false, error: 'Không tìm thấy người dùng' });
      return;
    }

    if (user.plan !== 'pro' && user.plan !== 'ultra' && user.role !== 'admin') {
      res.status(403).json({
        success: false,
        error: 'Tính năng liên kết Bot Telegram riêng chỉ dành cho tài khoản gói PRO và ULTRA (hoặc Admin). Vui lòng nâng cấp gói để sử dụng!'
      });
      return;
    }

    const { botToken, chatId, notificationsEnabled } = req.body;
    const updates: any = {};
    if (botToken !== undefined) {
      const trimmedToken = String(botToken).trim();
      if (trimmedToken) {
        // Validate token if provided
        try {
          const checkRes = await fetch(`https://api.telegram.org/bot${trimmedToken}/getMe`);
          const checkData = await checkRes.json() as any;
          if (!checkData.ok) {
            return res.status(400).json({
              success: false,
              error: `Telegram Bot Token không hợp lệ: ${checkData.description || 'Xác thực thất bại (Unauthorized)'}`
            });
          }
        } catch (netErr: any) {
          console.warn('Không thể kiểm tra bot token qua Telegram API:', netErr.message);
        }
      }
      updates.telegramBotToken = trimmedToken;
    }
    if (chatId !== undefined) updates.telegramChatId = String(chatId).trim();
    if (notificationsEnabled !== undefined) updates.telegramAlertsActive = Boolean(notificationsEnabled);

    await db.updateUserTelegram(req.user.id, updates);

    res.json({
      success: true,
      message: 'Đã cập nhật cấu hình Telegram riêng thành công!'
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Lỗi cập nhật cấu hình Telegram' });
  }
});

// POST /api/telegram/user-test - Send test message to user's personal telegram
router.post('/user-test', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Chưa đăng nhập' });
      return;
    }

    const user = await db.findUserById(req.user.id);
    if (!user) {
      res.status(404).json({ success: false, error: 'Không tìm thấy người dùng' });
      return;
    }

    if (user.plan !== 'pro' && user.plan !== 'ultra' && user.role !== 'admin') {
      res.status(403).json({
        success: false,
        error: 'Tính năng liên kết Bot Telegram riêng chỉ dành cho tài khoản gói PRO và ULTRA (hoặc Admin).'
      });
      return;
    }

    const token = req.body.botToken || user.telegramBotToken;
    const chatId = req.body.chatId || user.telegramChatId;

    if (!token || !chatId) {
      res.status(400).json({
        success: false,
        error: 'Chưa có Bot Token hoặc Chat ID để kiểm tra.'
      });
      return;
    }

    const result = await telegramService.sendTestMessageToCredentials(token, chatId);
    if (result.success) {
      res.json({ success: true, message: result.message });
    } else {
      res.status(400).json({ success: false, error: result.message });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
