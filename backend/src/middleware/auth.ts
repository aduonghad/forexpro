import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/authService.js';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
}

export function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    res.status(401).json({
      success: false,
      error: 'Yêu cầu đăng nhập để truy cập tính năng này'
    });
    return;
  }

  const decoded = authService.verifyToken(token);
  if (!decoded) {
    res.status(403).json({
      success: false,
      error: 'Phiên đăng nhập đã hết hạn hoặc không hợp lệ'
    });
    return;
  }

  req.user = decoded;
  next();
}

export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({
      success: false,
      error: 'Bạn không có quyền quản trị viên'
    });
    return;
  }
  next();
}
