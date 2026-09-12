import { Router, Request, Response } from 'express';
import { db } from '../db/database.js';
import { v4 as uuidv4 } from 'uuid';
import { TradingSignalConfig } from '../types/index.js';

const router = Router();

// GET /api/signals - List all trading signals
router.get('/', async (req: Request, res: Response) => {
  try {
    const signals = await db.getAllTradingSignals();
    res.json({ success: true, data: signals });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/signals/:id - Get specific signal
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const signal = await db.getTradingSignalById(id);
    if (!signal) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy tín hiệu này' });
    }
    res.json({ success: true, data: signal });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/signals - Create a new trading signal
router.post('/', async (req: Request, res: Response) => {
  try {
    const body = req.body;
    const newSignal: TradingSignalConfig = {
      id: body.id || uuidv4(),
      name: body.name || 'Tín hiệu giao dịch mới',
      description: body.description || '',
      action: body.action === 'SELL' ? 'SELL' : 'BUY',
      symbol: body.symbol || 'XAUUSD',
      timeframe: body.timeframe || 'M1',
      logicOperator: body.logicOperator === 'OR' ? 'OR' : 'AND',
      conditions: Array.isArray(body.conditions) ? body.conditions : [],
      lot: Number(body.lot) || 0.05,
      slPips: Number(body.slPips) || 30,
      tpPips: Number(body.tpPips) || 60,
      trailingStopPips: Number(body.trailingStopPips || 0),
      maxOpenPositions: Number(body.maxOpenPositions || 1),
      cooldownSeconds: Number(body.cooldownSeconds || 45),
      isActive: body.isActive !== false,
      totalTriggers: 0,
      updatedAt: Date.now()
    };

    const saved = await db.saveTradingSignal(newSignal);
    res.status(201).json({ success: true, data: saved });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// PUT /api/signals/:id - Update an existing trading signal
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const updates = req.body;
    const updated = await db.updateTradingSignal(id, updates);
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// DELETE /api/signals/:id - Delete a trading signal
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const success = await db.deleteTradingSignal(id);
    res.json({ success, message: 'Đã xoá tín hiệu thành công' });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// POST /api/signals/reset - Reset signals to system defaults
router.post('/reset', async (req: Request, res: Response) => {
  try {
    const fresh = await db.resetTradingSignalsToDefault();
    res.json({ success: true, data: fresh });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
