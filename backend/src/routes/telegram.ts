import { Router, Request, Response } from 'express';
import { telegramService } from '../services/telegramService.js';
import { CONFIG } from '../config.js';
import { db } from '../db/database.js';

const router = Router();

// GET /api/telegram/status - Get current Telegram configuration status
router.get('/status', async (_req: Request, res: Response) => {
  try {
    const creds = telegramService.getCredentials();
    const token = (db.getSetting('telegramBotToken') || CONFIG.TELEGRAM.BOT_TOKEN || '').trim();
    const chatId = (db.getSetting('telegramChatId') || CONFIG.TELEGRAM.CHAT_ID || '').trim();

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
router.post('/toggle', (req: Request, res: Response) => {
  try {
    const { enabled } = req.body;
    const isEnabled = enabled !== undefined ? Boolean(enabled) : !telegramService.isNotificationsEnabled();
    const newStatus = telegramService.setNotificationsEnabled(isEnabled);

    // Also persist in database
    db.setSetting('telegramAlertsActive', newStatus ? 'true' : 'false');

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
router.post('/credentials', (req: Request, res: Response) => {
  try {
    const { botToken, chatId } = req.body;
    if (!botToken || !chatId) {
      return res.status(400).json({ success: false, error: 'Vui lòng cung cấp đầy đủ botToken và chatId' });
    }

    telegramService.setCredentials(String(botToken), String(chatId));
    res.json({ success: true, message: 'Đã cập nhật thông tin Telegram Bot thành công!' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
