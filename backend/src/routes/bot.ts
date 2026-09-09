import { Router, Request, Response } from 'express';
import { db } from '../db/database.js';
import { botEngine } from '../services/botEngine.js';
import { telegramService } from '../services/telegramService.js';

const router = Router();

// GET recent bot messages
router.get('/messages', (req: Request, res: Response) => {
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
  const messages = db.getBotMessages(limit);
  res.json({ success: true, data: messages });
});

// POST user chat to bot
router.post('/chat', (req: Request, res: Response) => {
  const { text } = req.body;
  if (!text || typeof text !== 'string') {
    res.status(400).json({ success: false, error: 'Thiếu nội dung tin nhắn' });
    return;
  }

  const reply = botEngine.handleUserChatMessage(text);
  res.json({ success: true, data: reply });
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
router.post('/telegram-config', (req: Request, res: Response) => {
  const { botToken, chatId } = req.body;
  if (typeof botToken !== 'string' || typeof chatId !== 'string') {
    res.status(400).json({ success: false, error: 'Thiếu botToken hoặc chatId' });
    return;
  }

  telegramService.setCredentials(botToken, chatId);
  res.json({ success: true, message: 'Đã cập nhật cấu hình Telegram Bot thành công!', data: telegramService.getCredentials() });
});

// POST toggle telegram notifications
router.post('/telegram-toggle', (req: Request, res: Response) => {
  const { enabled } = req.body;
  const newStatus = enabled !== undefined ? Boolean(enabled) : !telegramService.isNotificationsEnabled();
  const currentStatus = telegramService.setNotificationsEnabled(newStatus);
  res.json({ success: true, notificationsEnabled: currentStatus, message: currentStatus ? 'Đã BẬT đẩy thông báo Telegram' : 'Đã TẮT đẩy thông báo Telegram' });
});

export default router;

