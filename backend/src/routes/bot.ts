import { Router, Request, Response } from 'express';
import { db } from '../db/database.js';
import { botEngine } from '../services/botEngine.js';

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

export default router;
