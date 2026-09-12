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
