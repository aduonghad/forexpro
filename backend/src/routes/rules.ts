import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/database.js';
import { AutomationRule, PLAN_SIGNAL_LIMITS } from '../types/index.js';
import { wsHub } from '../websocket/wsHub.js';
import { optionalAuth, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

// GET all rules (filtered by user if authenticated)
router.get('/', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const rules = await db.getRulesByUser(req.user?.id);
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
router.post('/', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
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
      isActive,
      signalId,
      isDefaultRule
    } = req.body;

    if (!name || !symbol || !indicator || !action) {
      res.status(400).json({ success: false, error: 'Thiếu các trường thông tin bắt buộc' });
      return;
    }

    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Vui lòng đăng nhập để tạo yêu cầu tự động' });
      return;
    }

    const isActivating = isActive !== undefined ? Boolean(isActive) : true;

    // Check plan quota limits for authenticated user
    if (userId && isActivating) {
      const user = await db.findUserById(userId);
      const plan = user?.plan || 'free';
      const maxLimit = PLAN_SIGNAL_LIMITS[plan] || 1;
      const userRules = await db.getRulesByUser(userId);
      const activeCount = userRules.filter(r => r.isActive).length;

      if (activeCount >= maxLimit) {
        res.status(403).json({
          success: false,
          error: `Gói tài khoản ${plan.toUpperCase()} chỉ cho phép tối đa ${maxLimit === Infinity ? 'vô hạn' : maxLimit} tín hiệu kích hoạt đồng thời. Vui lòng tắt bớt bot hoặc nâng cấp gói để tiếp tục!`,
          plan,
          maxLimit,
          activeCount
        });
        return;
      }
    }

    const now = Date.now();
    const newRule: AutomationRule = {
      id: uuidv4(),
      userId,
      signalId,
      isDefaultRule: Boolean(isDefaultRule),
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
      isActive: isActivating,
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
router.put('/:id', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Vui lòng đăng nhập để cập nhật yêu cầu tự động' });
      return;
    }

    const ruleId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const existing = await db.getRuleById(ruleId);
    if (!existing) {
      res.status(404).json({ success: false, error: 'Không tìm thấy yêu cầu tự động' });
      return;
    }

    if (existing.userId && existing.userId !== userId) {
      res.status(403).json({ success: false, error: 'Bạn không có quyền chỉnh sửa yêu cầu này' });
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
      isActive,
      signalId
    } = req.body;

    const targetActive = isActive !== undefined ? Boolean(isActive) : existing.isActive;

    // Check plan quota limits if toggling to active
    if (targetActive && !existing.isActive) {
      const user = await db.findUserById(userId);
      const plan = user?.plan || 'free';
      const maxLimit = PLAN_SIGNAL_LIMITS[plan] || 1;
      const userRules = await db.getRulesByUser(userId);
      const activeCount = userRules.filter(r => r.isActive && r.id !== ruleId).length;

      if (activeCount >= maxLimit) {
        res.status(403).json({
          success: false,
          error: `Gói tài khoản ${plan.toUpperCase()} chỉ cho phép tối đa ${maxLimit === Infinity ? 'vô hạn' : maxLimit} tín hiệu kích hoạt đồng thời. Vui lòng tắt bớt bot hoặc nâng cấp gói để tiếp tục!`,
          plan,
          maxLimit,
          activeCount
        });
        return;
      }
    }

    const updatedRule: AutomationRule = {
      ...existing,
      userId: existing.userId || userId,
      signalId: signalId !== undefined ? signalId : existing.signalId,
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
      isActive: targetActive,
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
router.delete('/:id', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: 'Vui lòng đăng nhập để xoá yêu cầu tự động' });
      return;
    }

    const ruleId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const existing = await db.getRuleById(ruleId);
    if (!existing) {
      res.status(404).json({ success: false, error: 'Không tìm thấy yêu cầu tự động' });
      return;
    }

    if (existing.userId && existing.userId !== userId) {
      res.status(403).json({ success: false, error: 'Bạn không có quyền xoá yêu cầu này' });
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
