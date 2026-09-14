import { Router, Request, Response } from 'express';
import { db } from '../db/database.js';
import { mt5Bridge } from '../services/mt5Bridge.js';
import { wsHub } from '../websocket/wsHub.js';
import { optionalAuth, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

// GET open positions (chỉ trả về lệnh của user đã đăng nhập)
router.get('/open', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.json({ success: true, data: [] });
      return;
    }
    const positions = await db.getOpenOrders(userId);
    res.json({ success: true, data: positions });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET trade history (chỉ trả về lịch sử lệnh của user)
router.get('/history', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.json({ success: true, data: [] });
      return;
    }
    const allOrders = await db.getAllOrders(userId);
    const history = allOrders.filter(o => o.status === 'CLOSED');
    res.json({ success: true, data: history });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET account info (user-scoped)
router.get('/account', optionalAuth, (req: AuthenticatedRequest, res: Response) => {
  const account = mt5Bridge.getAccountInfo(req.user?.id);
  res.json({ success: true, data: account });
});

// POST close single position
router.post('/close/:id', async (req: Request, res: Response) => {
  try {
    const orderId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const order = await mt5Bridge.closeOrder(orderId, 'Đóng qua API thủ công');
    if (!order) {
      res.status(404).json({ success: false, error: 'Không tìm thấy lệnh hoặc lệnh đã đóng' });
      return;
    }
    res.json({ success: true, data: order });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST close all positions
router.post('/close-all', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const closed = await mt5Bridge.closeAllOrders('Đóng tất cả từ nút khẩn cấp', userId);
    res.json({ success: true, count: closed.length, data: closed });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST reset demo balance
router.post('/reset-balance', async (req: Request, res: Response) => {
  try {
    const amount = req.body.amount ? Number(req.body.amount) : 10000.0;
    const account = await mt5Bridge.resetDemoBalance(amount);
    wsHub.broadcast({
      type: 'ACCOUNT_UPDATE',
      data: account
    });
    res.json({ success: true, data: account });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
