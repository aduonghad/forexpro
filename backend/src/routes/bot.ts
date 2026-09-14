import { Router, Request, Response } from 'express';
import { db } from '../db/database.js';
import { botEngine } from '../services/botEngine.js';
import { telegramService } from '../services/telegramService.js';
import { optionalAuth, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

// GET recent bot messages (isolated by user if authenticated, max 100)
router.get('/messages', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;
    const messages = await db.getBotMessages(limit, req.user?.id);
    res.json({ success: true, data: messages });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST user chat to bot
router.post('/chat', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { text, symbol, timeframe } = req.body;
    if (!text || typeof text !== 'string') {
      res.status(400).json({ success: false, error: 'Thiếu nội dung tin nhắn' });
      return;
    }

    const reply = await botEngine.handleUserChatMessage(text, req.user?.id, symbol, timeframe);
    res.json({ success: true, data: reply });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST toggle bot active
router.post('/toggle', (req: Request, res: Response) => {
  const { active } = req.body;
  const newStatus = active !== undefined ? Boolean(active) : !botEngine.isBotActive();
  botEngine.setBotActive(newStatus);
  res.json({ success: true, botActive: newStatus });
});

// GET telegram bot config status
router.get('/telegram-config', (req: Request, res: Response) => {
  res.json({ success: true, data: telegramService.getCredentials() });
});

// POST update telegram bot credentials
router.post('/telegram-config', async (req: Request, res: Response) => {
  try {
    const { botToken, chatId } = req.body;
    if (typeof botToken !== 'string' || typeof chatId !== 'string') {
      res.status(400).json({ success: false, error: 'Thiếu botToken hoặc chatId' });
      return;
    }

    await telegramService.setCredentials(botToken, chatId);
    res.json({ success: true, message: 'Đã cập nhật cấu hình Telegram Bot thành công!', data: telegramService.getCredentials() });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST toggle telegram notifications
router.post('/telegram-toggle', async (req: Request, res: Response) => {
  try {
    const { enabled } = req.body;
    const newStatus = enabled !== undefined ? Boolean(enabled) : !telegramService.isNotificationsEnabled();
    const currentStatus = await telegramService.setNotificationsEnabled(newStatus);
    res.json({ success: true, notificationsEnabled: currentStatus, message: currentStatus ? 'Đã BẬT đẩy thông báo Telegram' : 'Đã TẮT đẩy thông báo Telegram' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET overall bot status & alert flags
router.get('/status', (req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      botActive: botEngine.isBotActive(),
      swingAlertsActive: botEngine.isSwingAlertsActive(),
      analysisAlertsActive: botEngine.isAnalysisAlertsActive(),
      activeSymbol: botEngine.getActiveSymbol(),
      activeTimeframe: botEngine.getActiveTimeframe(),
      telegramNotificationsEnabled: telegramService.isNotificationsEnabled(),
      telegramConfigured: telegramService.getCredentials().active
    }
  });
});

// POST toggle market analysis alerts
router.post('/analysis-toggle', (req: Request, res: Response) => {
  const { active } = req.body;
  const newStatus = active !== undefined ? Boolean(active) : !botEngine.isAnalysisAlertsActive();
  botEngine.setAnalysisAlertsActive(newStatus);
  res.json({
    success: true,
    analysisActive: newStatus,
    message: newStatus ? 'Đã BẬT phân tích thị trường tự động' : 'Đã TẮT phân tích thị trường tự động'
  });
});

export default router;
