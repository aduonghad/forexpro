import { Router, Request, Response } from 'express';
import { marketData } from '../services/marketData.js';
import { CONFIG } from '../config.js';
import { TradingSymbol, Timeframe } from '../types/index.js';

const router = Router();

// GET supported symbols
router.get('/symbols', (req: Request, res: Response) => {
  const symbols = Object.entries(CONFIG.SYMBOLS).map(([key, value]) => ({
    symbol: key,
    ...value
  }));
  res.json({ success: true, data: symbols });
});

// GET historical candles
router.get('/candles', (req: Request, res: Response) => {
  const symbol = (req.query.symbol as string || 'XAUUSD').toUpperCase() as TradingSymbol;
  const timeframe = (req.query.timeframe as string || 'M1').toUpperCase() as Timeframe;
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 200;

  if (!CONFIG.SYMBOLS[symbol]) {
    res.status(400).json({ success: false, error: 'Symbol không hợp lệ' });
    return;
  }

  const candles = marketData.getCandles(symbol, timeframe, limit);
  const currentPrices = marketData.getCurrentPrice(symbol);

  res.json({
    success: true,
    symbol,
    timeframe,
    prices: currentPrices,
    data: candles
  });
});

// GET indicators for a symbol and timeframe
router.get('/indicators', (req: Request, res: Response) => {
  const symbol = (req.query.symbol as string || 'XAUUSD').toUpperCase() as TradingSymbol;
  const timeframe = (req.query.timeframe as string || 'M1').toUpperCase() as Timeframe;

  if (!CONFIG.SYMBOLS[symbol]) {
    res.status(400).json({ success: false, error: 'Symbol không hợp lệ' });
    return;
  }

  const indicators = marketData.getIndicators(symbol, timeframe);
  res.json({ success: true, symbol, timeframe, data: indicators });
});

export default router;
