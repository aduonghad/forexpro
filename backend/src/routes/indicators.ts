import { Router, Request, Response } from 'express';
import { db } from '../db/database.js';

const router = Router();

// GET /api/indicators/config - List all indicator signal configurations
router.get('/config', async (req: Request, res: Response) => {
  try {
    const configs = await db.getAllIndicatorConfigs();
    res.json({ success: true, data: configs });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/indicators/config/:id
router.get('/config/:id', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const config = await db.getIndicatorConfigById(id);
    if (!config) {
      return res.status(404).json({ success: false, error: 'Không tìm thấy cấu hình chỉ báo này' });
    }
    res.json({ success: true, data: config });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/indicators/config/:id - Update indicator settings & signal conditions
router.put('/config/:id', async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const updates = req.body;
    const updated = await db.updateIndicatorConfig(id, updates);
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// POST /api/indicators/config/reset - Reset indicator settings to default
router.post('/config/reset', async (req: Request, res: Response) => {
  try {
    const resetList = await db.resetIndicatorConfigsToDefault();
    res.json({ success: true, data: resetList });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
