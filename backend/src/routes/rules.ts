import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/database.js';
import { AutomationRule } from '../types/index.js';
import { wsHub } from '../websocket/wsHub.js';

const router = Router();

// GET all rules
router.get('/', async (req: Request, res: Response) => {
  try {
    const rules = await db.getAllRules();
    res.json({ success: true, data: rules });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET single rule
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const ruleId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const rule = await db.getRuleById(ruleId);
    if (!rule) {
      res.status(404).json({ success: false, error: 'Không tìm thấy yêu cầu tự động' });
      return;
    }
    res.json({ success: true, data: rule });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST create rule
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      name,
      symbol,
      timeframe,
      indicator,
      condition,
      action,
      lot,
      slPips,
      tpPips,
      trailingStopPips,
      maxOpenPositions,
      isActive
    } = req.body;

    if (!name || !symbol || !indicator || !action) {
      res.status(400).json({ success: false, error: 'Thiếu các trường thông tin bắt buộc' });
      return;
    }

    const now = Date.now();
    const newRule: AutomationRule = {
      id: uuidv4(),
      name,
      symbol,
      timeframe: timeframe || 'M1',
      indicator,
      condition: condition || { operator: '<', value: 30 },
      action: action || 'BUY',
      lot: Number(lot) || 0.05,
      slPips: Number(slPips) || 25,
      tpPips: Number(tpPips) || 50,
      trailingStopPips: Number(trailingStopPips) || 0,
      maxOpenPositions: Number(maxOpenPositions) || 1,
      isActive: isActive !== undefined ? Boolean(isActive) : true,
      totalTrades: 0,
      winTrades: 0,
      totalProfit: 0,
      createdAt: now,
      updatedAt: now
    };

    await db.saveRule(newRule);

    // Notify connected frontend clients
    wsHub.broadcast({
      type: 'RULE_CREATED',
      data: newRule
    });

    res.status(201).json({ success: true, data: newRule });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT update rule
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const ruleId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const existing = await db.getRuleById(ruleId);
    if (!existing) {
      res.status(404).json({ success: false, error: 'Không tìm thấy yêu cầu tự động' });
      return;
    }

    const {
      name,
      symbol,
      timeframe,
      indicator,
      condition,
      action,
      lot,
      slPips,
      tpPips,
      trailingStopPips,
      maxOpenPositions,
      isActive
    } = req.body;

    const updatedRule: AutomationRule = {
      ...existing,
      name: name !== undefined ? name : existing.name,
      symbol: symbol !== undefined ? symbol : existing.symbol,
      timeframe: timeframe !== undefined ? timeframe : existing.timeframe,
      indicator: indicator !== undefined ? indicator : existing.indicator,
      condition: condition !== undefined ? condition : existing.condition,
      action: action !== undefined ? action : existing.action,
      lot: lot !== undefined ? Number(lot) : existing.lot,
      slPips: slPips !== undefined ? Number(slPips) : existing.slPips,
      tpPips: tpPips !== undefined ? Number(tpPips) : existing.tpPips,
      trailingStopPips: trailingStopPips !== undefined ? Number(trailingStopPips) : existing.trailingStopPips,
      maxOpenPositions: maxOpenPositions !== undefined ? Number(maxOpenPositions) : existing.maxOpenPositions,
      isActive: isActive !== undefined ? Boolean(isActive) : existing.isActive,
      updatedAt: Date.now()
    };

    await db.saveRule(updatedRule);

    wsHub.broadcast({
      type: 'RULE_UPDATED',
      data: updatedRule
    });

    res.json({ success: true, data: updatedRule });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE rule
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const ruleId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const existing = await db.getRuleById(ruleId);
    if (!existing) {
      res.status(404).json({ success: false, error: 'Không tìm thấy yêu cầu tự động' });
      return;
    }

    await db.deleteRule(ruleId);

    wsHub.broadcast({
      type: 'RULE_DELETED',
      data: { id: ruleId }
    });

    res.json({ success: true, message: 'Đã xoá yêu cầu tự động thành công' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
