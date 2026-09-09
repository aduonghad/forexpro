import { Router, Request, Response } from 'express';
import { db } from '../db/database.js';
import { mt5Bridge } from '../services/mt5Bridge.js';
import { wsHub } from '../websocket/wsHub.js';

const router = Router();

// GET open positions
router.get('/open', (req: Request, res: Response) => {
  const positions = db.getOpenOrders();
  res.json({ success: true, data: positions });
});

// GET trade history
router.get('/history', (req: Request, res: Response) => {
  const allOrders = db.getAllOrders();
  const history = allOrders.filter(o => o.status === 'CLOSED');
  res.json({ success: true, data: history });
});

// GET account info
router.get('/account', (req: Request, res: Response) => {
  const account = mt5Bridge.getAccountInfo();
  res.json({ success: true, data: account });
});

// POST close single position
router.post('/close/:id', (req: Request, res: Response) => {
  const orderId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const order = mt5Bridge.closeOrder(orderId, 'Đóng qua API thủ công');
  if (!order) {
    res.status(404).json({ success: false, error: 'Không tìm thấy lệnh hoặc lệnh đã đóng' });
    return;
  }
  res.json({ success: true, data: order });
});

// POST close all positions
router.post('/close-all', (req: Request, res: Response) => {
  const closed = mt5Bridge.closeAllOrders('Đóng tất cả từ nút khẩn cấp');
  res.json({ success: true, count: closed.length, data: closed });
});

// POST reset demo balance
router.post('/reset-balance', (req: Request, res: Response) => {
  const amount = req.body.amount ? Number(req.body.amount) : 10000.0;
  const account = mt5Bridge.resetDemoBalance(amount);
  wsHub.broadcast({
    type: 'ACCOUNT_UPDATE',
    data: account
  });
  res.json({ success: true, data: account });
});

export default router;
