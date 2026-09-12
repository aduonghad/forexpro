import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/database.js';
import { CandlestickPattern, PatternCategory, PatternSignal } from '../types/index.js';

const router = Router();

// GET /api/patterns - List patterns with optional filtering
router.get('/', async (req: Request, res: Response) => {
  try {
    const { category, signal, active } = req.query;
    const filter: { category?: string; signal?: string; isActive?: boolean } = {};

    if (category && typeof category === 'string') filter.category = category;
    if (signal && typeof signal === 'string') filter.signal = signal;
    if (active !== undefined) filter.isActive = active === 'true';

    const patterns = await db.getAllPatterns(filter);
    res.json({ success: true, data: patterns });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/patterns/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const pattern = await db.getPatternById(id);
    if (!pattern) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy mẫu nến này' });
    }
    res.json({ success: true, data: pattern });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/patterns - Create pattern
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, category, signal, candleCount, description, candles, isActive } = req.body;

    if (!name || !category || !signal || !candleCount || !Array.isArray(candles)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Thiếu thông tin bắt buộc (name, category, signal, candleCount, candles)' 
      });
    }

    const now = Date.now();
    const newPattern: CandlestickPattern = {
      id: uuidv4(),
      name: String(name).trim(),
      category: category as PatternCategory,
      signal: signal as PatternSignal,
      candleCount: Number(candleCount),
      description: description ? String(description).trim() : '',
      candles: candles,
      isActive: isActive !== undefined ? Boolean(isActive) : true,
      isPredefined: false,
      createdAt: now,
      updatedAt: now
    };

    const saved = await db.savePattern(newPattern);
    res.status(201).json({ success: true, data: saved });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/patterns/:id - Update pattern
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const existing = await db.getPatternById(id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy mẫu nến cần sửa' });
    }

    const { name, category, signal, candleCount, description, candles, isActive } = req.body;

    const updated: CandlestickPattern = {
      ...existing,
      name: name !== undefined ? String(name).trim() : existing.name,
      category: category !== undefined ? (category as PatternCategory) : existing.category,
      signal: signal !== undefined ? (signal as PatternSignal) : existing.signal,
      candleCount: candleCount !== undefined ? Number(candleCount) : existing.candleCount,
      description: description !== undefined ? String(description).trim() : existing.description,
      candles: candles !== undefined ? candles : existing.candles,
      isActive: isActive !== undefined ? Boolean(isActive) : existing.isActive,
      updatedAt: Date.now()
    };

    const saved = await db.savePattern(updated);
    res.json({ success: true, data: saved });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/patterns/:id - Delete pattern
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const existing = await db.getPatternById(id);
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy mẫu nến cần xoá' });
    }

    await db.deletePattern(id);
    res.json({ success: true, message: 'Đã xoá mẫu nến thành công', id });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/patterns/reset - Reset to factory templates
router.post('/reset', async (_req: Request, res: Response) => {
  try {
    await db.resetPatternsToDefault();
    const patterns = await db.getAllPatterns();
    res.json({ success: true, message: 'Đã khôi phục toàn bộ danh sách nến mẫu chuẩn', data: patterns });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
