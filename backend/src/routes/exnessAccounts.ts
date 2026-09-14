import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/database.js';
import { mt5Bridge } from '../services/mt5Bridge.js';
import { wsHub } from '../websocket/wsHub.js';
import { optionalAuth, AuthenticatedRequest } from '../middleware/auth.js';
import { ExnessAccount } from '../types/index.js';

const router = Router();

// GET /api/exness-accounts - Get list of Exness accounts for the authenticated user
router.get('/', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      res.json({
        success: true,
        data: [],
        requireLogin: true,
        message: 'Vui lòng đăng nhập để xem danh sách tài khoản Exness của bạn'
      });
      return;
    }

    const accounts = await db.getExnessAccounts(req.user.id);
    res.json({ success: true, data: accounts });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/exness-accounts - Add a new Exness account for the logged-in user
router.post('/', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Vui lòng đăng nhập để thêm tài khoản Exness của bạn'
      });
      return;
    }

    const {
      accountName,
      login,
      server,
      accountType,
      platform,
      password,
      investorPassword,
      currency,
      leverage,
      balance,
      setAsActive
    } = req.body;

    if (!accountName || !login || !server) {
      res.status(400).json({
        success: false,
        error: 'Vui lòng cung cấp đầy đủ Tên tài khoản, Số MT5 Login và Server Exness'
      });
      return;
    }

    const now = Date.now();
    const newAccount: ExnessAccount = {
      id: uuidv4(),
      userId: req.user.id,
      userName: req.user.name,
      userEmail: req.user.email,
      accountName: String(accountName).trim(),
      login: String(login).trim(),
      server: String(server).trim(),
      accountType: accountType === 'DEMO' ? 'DEMO' : 'REAL',
      platform: platform === 'MT4' ? 'MT4' : 'MT5',
      password: password ? String(password).trim() : undefined,
      investorPassword: investorPassword ? String(investorPassword).trim() : undefined,
      currency: currency || 'USD',
      leverage: Number(leverage) || 500,
      balance: balance !== undefined ? Number(balance) : 10000,
      equity: balance !== undefined ? Number(balance) : 10000,
      isActive: Boolean(setAsActive),
      status: 'CONNECTED',
      lastSyncAt: now,
      createdAt: now,
      updatedAt: now
    };

    const saved = await db.saveExnessAccount(newAccount);

    // If set as active, sync immediately with mt5Bridge for this user
    if (newAccount.isActive) {
      mt5Bridge.setUserAccount(req.user.id, {
        login: newAccount.login,
        server: newAccount.server,
        balance: newAccount.balance,
        leverage: newAccount.leverage
      });
      wsHub.sendToUser(req.user.id, {
        type: 'ACCOUNT_UPDATE',
        data: mt5Bridge.getAccountInfo(req.user.id)
      });
    }

    res.status(201).json({
      success: true,
      data: saved,
      accountInfo: mt5Bridge.getAccountInfo(req.user.id),
      message: 'Đã thêm tài khoản Exness thành công!'
    });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// PUT /api/exness-accounts/:id - Update an Exness account
router.put('/:id', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Vui lòng đăng nhập để cập nhật tài khoản Exness' });
      return;
    }

    const id = String(req.params.id);
    const existing = await db.getExnessAccountById(id);
    if (!existing) {
      res.status(404).json({ success: false, error: 'Không tìm thấy tài khoản Exness này' });
      return;
    }

    const isAdmin = req.user.role === 'admin';
    if (existing.userId !== req.user.id && !isAdmin) {
      res.status(403).json({ success: false, error: 'Bạn không có quyền chỉnh sửa tài khoản của người dùng khác' });
      return;
    }

    const updates = req.body;
    const updated = await db.updateExnessAccount(id, updates, req.user.id, isAdmin);

    if (updated?.isActive) {
      mt5Bridge.setUserAccount(req.user.id, {
        login: updated.login,
        server: updated.server,
        balance: updated.balance,
        leverage: updated.leverage
      });
      wsHub.sendToUser(req.user.id, {
        type: 'ACCOUNT_UPDATE',
        data: mt5Bridge.getAccountInfo(req.user.id)
      });
    }

    res.json({
      success: true,
      data: updated,
      accountInfo: mt5Bridge.getAccountInfo(req.user.id),
      message: 'Đã cập nhật tài khoản Exness thành công!'
    });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// DELETE /api/exness-accounts/:id - Delete an Exness account
router.delete('/:id', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Vui lòng đăng nhập để xoá tài khoản Exness' });
      return;
    }

    const id = String(req.params.id);
    const existing = await db.getExnessAccountById(id);
    if (!existing) {
      res.status(404).json({ success: false, error: 'Không tìm thấy tài khoản để xoá' });
      return;
    }

    const isAdmin = req.user.role === 'admin';
    if (existing.userId !== req.user.id && !isAdmin) {
      res.status(403).json({ success: false, error: 'Bạn không có quyền xoá tài khoản của người dùng khác' });
      return;
    }

    const success = await db.deleteExnessAccount(id, req.user.id, isAdmin);
    if (!success) {
      res.status(404).json({ success: false, error: 'Không tìm thấy tài khoản để xoá' });
      return;
    }

    res.json({ success: true, message: 'Đã xoá tài khoản Exness thành công' });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// POST /api/exness-accounts/:id/select - Set an Exness account as Active for current user
router.post('/:id/select', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Vui lòng đăng nhập để chọn tài khoản Exness hoạt động' });
      return;
    }

    const id = String(req.params.id);
    const existing = await db.getExnessAccountById(id);
    if (!existing) {
      res.status(404).json({ success: false, error: 'Không tìm thấy tài khoản Exness này' });
      return;
    }

    const isAdmin = req.user.role === 'admin';
    if (existing.userId !== req.user.id && !isAdmin) {
      res.status(403).json({ success: false, error: 'Bạn không có quyền kích hoạt tài khoản của người dùng khác' });
      return;
    }

    const activeAccount = await db.setActiveExnessAccount(id, req.user.id, isAdmin);
    if (!activeAccount) {
      res.status(404).json({ success: false, error: 'Không tìm thấy tài khoản Exness này' });
      return;
    }

    // Update MT5 Bridge to use this active account credentials for this user
    mt5Bridge.setUserAccount(req.user.id, {
      login: activeAccount.login,
      server: activeAccount.server,
      balance: activeAccount.balance,
      leverage: activeAccount.leverage
    });

    // Broadcast account update to user clients
    wsHub.sendToUser(req.user.id, {
      type: 'ACCOUNT_UPDATE',
      data: mt5Bridge.getAccountInfo(req.user.id)
    });

    res.json({
      success: true,
      data: activeAccount,
      accountInfo: mt5Bridge.getAccountInfo(req.user.id),
      message: `Đã kích hoạt tài khoản ${activeAccount.accountName} (${activeAccount.server} #${activeAccount.login}) thành công!`
    });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// POST /api/exness-accounts/:id/test-connection - Test / Ping connection
router.post('/:id/test-connection', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Vui lòng đăng nhập để kiểm tra kết nối tài khoản' });
      return;
    }

    const id = String(req.params.id);
    const account = await db.getExnessAccountById(id);
    if (!account) {
      res.status(404).json({ success: false, error: 'Không tìm thấy tài khoản Exness' });
      return;
    }

    const isAdmin = req.user.role === 'admin';
    if (account.userId !== req.user.id && !isAdmin) {
      res.status(403).json({ success: false, error: 'Bạn không có quyền kiểm tra tài khoản của người khác' });
      return;
    }

    // Simulate connection ping test to Exness server
    const latency = Math.floor(18 + Math.random() * 25);
    await db.updateExnessAccount(id, {
      status: 'CONNECTED',
      lastSyncAt: Date.now()
    }, req.user.id, isAdmin);

    res.json({
      success: true,
      data: {
        connected: true,
        latencyMs: latency,
        server: account.server,
        login: account.login,
        status: 'CONNECTED',
        message: `Kết nối thành công tới máy chủ ${account.server} (Độ trễ: ${latency}ms)`
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
