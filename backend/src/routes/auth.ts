import { Router } from 'express';
import { authService } from '../services/authService.js';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth.js';
import { CONFIG } from '../config.js';

export const authRouter = Router();

/**
 * Public route to provide frontend with OAuth configuration
 */
authRouter.get('/config', (_req, res) => {
  res.json({
    success: true,
    data: {
      googleClientId: CONFIG.GOOGLE_CLIENT_ID || '',
      isGoogleAuthEnabled: Boolean(CONFIG.GOOGLE_CLIENT_ID)
    }
  });
});

/**
 * Register with Email/Gmail & Password
 */
authRouter.post('/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    const result = await authService.registerWithEmail({ email, password, name });
    res.status(201).json({
      success: true,
      data: result
    });
  } catch (err: any) {
    res.status(400).json({
      success: false,
      error: err.message || 'Đăng ký không thành công'
    });
  }
});

/**
 * Login with Email & Password
 */
authRouter.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await authService.loginWithEmail({ email, password });
    res.json({
      success: true,
      data: result
    });
  } catch (err: any) {
    res.status(400).json({
      success: false,
      error: err.message || 'Đăng nhập không thành công'
    });
  }
});

/**
 * Login / Register with Google OAuth / ID Token
 */
authRouter.post('/google', async (req, res) => {
  try {
    const { credential, accessToken } = req.body;
    if (!credential && !accessToken) {
      res.status(400).json({
        success: false,
        error: 'Vui lòng cung cấp Google credential token'
      });
      return;
    }

    const result = await authService.loginWithGoogle({ credential, accessToken });
    res.json({
      success: true,
      data: result
    });
  } catch (err: any) {
    res.status(400).json({
      success: false,
      error: err.message || 'Xác thực Google thất bại'
    });
  }
});

/**
 * Get current authenticated user profile
 */
authRouter.get('/me', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Chưa đăng nhập' });
      return;
    }

    const user = await authService.getUserById(req.user.id);
    if (!user) {
      res.status(404).json({ success: false, error: 'Không tìm thấy thông tin tài khoản' });
      return;
    }

    res.json({
      success: true,
      data: { user }
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err.message || 'Lỗi lấy thông tin tài khoản'
    });
  }
});

/**
 * Get all users in database (Admin)
 */
authRouter.get('/users', async (_req, res) => {
  try {
    const users = await authService.getAllUsers();
    res.json({
      success: true,
      data: users
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err.message || 'Lỗi lấy danh sách người dùng'
    });
  }
});

/**
 * Create user from admin
 */
authRouter.post('/users', async (req, res) => {
  try {
    const { email, name, role, password } = req.body;
    if (!email) {
      res.status(400).json({ success: false, error: 'Email không được để trống' });
      return;
    }
    const user = await authService.createUser({ email, name, role, password });
    res.status(201).json({
      success: true,
      data: user
    });
  } catch (err: any) {
    res.status(400).json({
      success: false,
      error: err.message || 'Lỗi tạo người dùng'
    });
  }
});

/**
 * Update current user preferences (lastSymbol, lastTimeframe)
 */
authRouter.patch('/preferences', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Chưa đăng nhập' });
      return;
    }

    const { symbol, timeframe } = req.body;
    const updates: any = {};
    if (symbol) updates.lastSymbol = symbol;
    if (timeframe) updates.lastTimeframe = timeframe;

    const updated = await authService.updateUserPreferences(req.user.id, updates);
    res.json({
      success: true,
      data: updated
    });
  } catch (err: any) {
    res.status(400).json({
      success: false,
      error: err.message || 'Lỗi cập nhật cấu hình người dùng'
    });
  }
});

/**
 * Update user role (admin vs user)
 */
authRouter.put('/users/:id/role', async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    if (!['user', 'admin'].includes(role)) {
      res.status(400).json({ success: false, error: 'Vai trò không hợp lệ (chỉ chấp nhận "user" hoặc "admin")' });
      return;
    }
    const updated = await authService.updateUserRole(id, role);
    res.json({
      success: true,
      data: updated
    });
  } catch (err: any) {
    res.status(400).json({
      success: false,
      error: err.message || 'Lỗi cập nhật vai trò người dùng'
    });
  }
});

/**
 * Update user plan (free, plus, pro, ultra)
 */
authRouter.put('/users/:id/plan', async (req, res) => {
  try {
    const { id } = req.params;
    const { plan } = req.body;
    if (!['free', 'plus', 'pro', 'ultra'].includes(plan)) {
      res.status(400).json({ success: false, error: 'Gói dịch vụ không hợp lệ (free, plus, pro, ultra)' });
      return;
    }
    const updated = await authService.updateUserPlan(id, plan);
    res.json({
      success: true,
      data: updated
    });
  } catch (err: any) {
    res.status(400).json({
      success: false,
      error: err.message || 'Lỗi cập nhật gói dịch vụ'
    });
  }
});

/**
 * Delete user from database
 */
authRouter.delete('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const success = await authService.deleteUser(id);
    if (!success) {
      res.status(404).json({ success: false, error: 'Không tìm thấy người dùng để xoá' });
      return;
    }
    res.json({
      success: true,
      message: 'Xoá người dùng thành công'
    });
  } catch (err: any) {
    res.status(400).json({
      success: false,
      error: err.message || 'Lỗi xoá người dùng'
    });
  }
});
