import { Router, Request, Response } from 'express';
import { marketData } from '../services/marketData.js';
import { CONFIG } from '../config.js';
import { TradingSymbol, Timeframe, Candle } from '../types/index.js';

const router = Router();

// Middleware xác thực nhẹ nhàng (hoặc cho phép nếu là localhost)
const verifySecret = (req: Request, res: Response, next: () => void) => {
  const secret = req.headers['x-webhook-secret'] || req.query.secret;
  const clientIp = req.ip || req.socket.remoteAddress || '';
  const isLocal = clientIp.includes('127.0.0.1') || clientIp.includes('::1') || clientIp.includes('localhost');

  // Cho phép kết nối nội bộ hoặc có secret đúng
  if (isLocal || secret === CONFIG.WEBHOOK_SECRET || !CONFIG.WEBHOOK_SECRET) {
    return next();
  }

  res.status(401).json({ success: false, error: 'Unauthorized MT5 Bridge request' });
};

/**
 * POST /api/mt5/candles
 * Nhận lịch sử nến từ MT5 EA (khi EA khởi động hoặc chuyển symbol)
 */
router.post('/candles', verifySecret, (req: Request, res: Response) => {
  try {
    const { symbol, timeframe, candles } = req.body;

    if (!symbol || !timeframe || !Array.isArray(candles)) {
      res.status(400).json({
        success: false,
        error: 'Thiếu tham số bắt buộc (symbol, timeframe, candles)'
      });
      return;
    }

    const cleanSymbol = symbol.toString().toUpperCase().trim() as TradingSymbol;
    const cleanTf = timeframe.toString().toUpperCase().trim() as Timeframe;

    if (!CONFIG.SYMBOLS[cleanSymbol]) {
      res.status(400).json({ success: false, error: `Symbol không được hỗ trợ: ${cleanSymbol}` });
      return;
    }

    const importedCount = marketData.importMT5Candles(cleanSymbol, cleanTf, candles as Candle[]);

    res.json({
      success: true,
      message: `Đã nạp thành công ${importedCount} nến cho ${cleanSymbol} (${cleanTf}) từ MT5`,
      symbol: cleanSymbol,
      timeframe: cleanTf,
      count: importedCount
    });
  } catch (err: any) {
    console.error('Lỗi khi nạp nến MT5:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/mt5/tick
 * Nhận tick giá thời gian thực từ MT5 EA
 */
router.post('/tick', verifySecret, (req: Request, res: Response) => {
  try {
    const { symbol, bid, ask, spread, time, candle } = req.body;

    if (!symbol || typeof bid !== 'number' || typeof ask !== 'number') {
      res.status(400).json({
        success: false,
        error: 'Tham số không hợp lệ (cần symbol, bid, ask dạng số)'
      });
      return;
    }

    const cleanSymbol = symbol.toString().toUpperCase().trim() as TradingSymbol;
    if (!CONFIG.SYMBOLS[cleanSymbol]) {
      res.status(400).json({ success: false, error: `Symbol không được hỗ trợ: ${cleanSymbol}` });
      return;
    }

    marketData.handleMT5Tick({
      symbol: cleanSymbol,
      bid,
      ask,
      spread,
      time: time || Date.now(),
      candle
    });

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/mt5/status
 * Kiểm tra tình trạng kết nối của MT5 Bridge
 */
router.get('/status', (req: Request, res: Response) => {
  const status = marketData.getMT5Status();
  res.json({
    success: true,
    data: status
  });
});

export default router;
