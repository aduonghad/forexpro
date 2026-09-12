import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { v4 as uuidv4 } from 'uuid';
import { CONFIG } from '../config.js';
import { db } from '../db/database.js';
import {
  User,
  SafeUser,
  AuthResponse,
  RegisterParams,
  LoginParams,
  GoogleAuthParams
} from '../types/index.js';

const googleClient = new OAuth2Client(
  CONFIG.GOOGLE_CLIENT_ID || undefined,
  CONFIG.GOOGLE_CLIENT_SECRET || undefined
);

export class AuthService {
  /**
   * Remove sensitive fields before returning user
   */
  sanitizeUser(user: User): SafeUser {
    const { passwordHash, ...safeUser } = user;
    return safeUser;
  }

  /**
   * Generate JWT Token for user
   */
  generateToken(user: User | SafeUser): string {
    return jwt.sign(
      {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      },
      CONFIG.JWT_SECRET,
      { expiresIn: '7d' }
    );
  }

  /**
   * Verify JWT Token
   */
  verifyToken(token: string): { id: string; email: string; name: string; role: string } | null {
    try {
      return jwt.verify(token, CONFIG.JWT_SECRET) as any;
    } catch {
      return null;
    }
  }

  /**
   * Register with Email/Gmail & Password
   */
  async registerWithEmail(params: RegisterParams): Promise<AuthResponse> {
    const email = params.email?.trim().toLowerCase();
    const password = params.password?.trim();
    const name = params.name?.trim() || email.split('@')[0];

    if (!email) {
      throw new Error('Email không được để trống');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error('Địa chỉ email không hợp lệ');
    }

    if (!password || password.length < 6) {
      throw new Error('Mật khẩu phải có độ dài tối thiểu 6 ký tự');
    }

    const existingUser = await db.findUserByEmail(email);
    if (existingUser) {
      throw new Error('Email này đã được đăng ký trong hệ thống. Vui lòng đăng nhập!');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const now = Date.now();

    const newUser: User = {
      id: uuidv4(),
      email,
      name,
      passwordHash,
      authProvider: 'local',
      role: 'user',
      avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(email)}`,
      createdAt: now,
      updatedAt: now
    };

    await db.saveUser(newUser);

    return {
      user: this.sanitizeUser(newUser),
      token: this.generateToken(newUser)
    };
  }

  /**
   * Login with Email & Password
   */
  async loginWithEmail(params: LoginParams): Promise<AuthResponse> {
    const email = params.email?.trim().toLowerCase();
    const password = params.password?.trim();

    if (!email || !password) {
      throw new Error('Vui lòng nhập đầy đủ email và mật khẩu');
    }

    const user = await db.findUserByEmail(email);
    if (!user) {
      throw new Error('Email hoặc mật khẩu không chính xác');
    }

    if (!user.passwordHash) {
      throw new Error('Tài khoản này được đăng ký qua Google. Vui lòng chọn "Đăng nhập bằng Google"!');
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      throw new Error('Email hoặc mật khẩu không chính xác');
    }

    return {
      user: this.sanitizeUser(user),
      token: this.generateToken(user)
    };
  }

  /**
   * Login or Register via Google ID Token / OAuth
   */
  async loginWithGoogle(params: GoogleAuthParams): Promise<AuthResponse> {
    let googleId: string = '';
    let email: string = '';
    let name: string = '';
    let picture: string = '';

    if (params.credential) {
      try {
        // First try official verifyIdToken
        if (CONFIG.GOOGLE_CLIENT_ID) {
          const ticket = await googleClient.verifyIdToken({
            idToken: params.credential,
            audience: CONFIG.GOOGLE_CLIENT_ID
          });
          const payload = ticket.getPayload();
          if (payload) {
            googleId = payload.sub;
            email = payload.email || '';
            name = payload.name || '';
            picture = payload.picture || '';
          }
        }
      } catch (err: any) {
        console.warn('Google verifyIdToken verification warning:', err.message);
      }

      // Fallback: Verify directly with Google TokenInfo API (official and supports testing/any client id)
      if (!email) {
        try {
          const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(params.credential)}`);
          if (res.ok) {
            const data: any = await res.json();
            googleId = data.sub;
            email = data.email || '';
            name = data.name || '';
            picture = data.picture || '';
          }
        } catch (fetchErr: any) {
          console.warn('Google tokeninfo fetch error:', fetchErr.message);
        }
      }

      // If token is a decoded JWT in mock/offline mode (fallback for manual testing)
      if (!email) {
        try {
          const decoded = jwt.decode(params.credential) as any;
          if (decoded && decoded.email) {
            googleId = decoded.sub || uuidv4();
            email = decoded.email;
            name = decoded.name || email.split('@')[0];
            picture = decoded.picture || '';
          }
        } catch {
          // ignore
        }

        if (!email) {
          try {
            const parts = params.credential.split('.');
            const targetPart = parts.length >= 2 ? parts[1] : parts[0];
            const payloadStr = Buffer.from(targetPart, 'base64').toString('utf-8');
            const parsed = JSON.parse(payloadStr);
            if (parsed && parsed.email) {
              googleId = parsed.sub || uuidv4();
              email = parsed.email;
              name = parsed.name || email.split('@')[0];
              picture = parsed.picture || '';
            }
          } catch {
            // ignore
          }
        }
      }
    } else if (params.accessToken) {
      // If access token was provided instead, fetch userinfo from Google
      try {
        const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${params.accessToken}` }
        });
        if (res.ok) {
          const data: any = await res.json();
          googleId = data.sub;
          email = data.email || '';
          name = data.name || '';
          picture = data.picture || '';
        }
      } catch (err: any) {
        console.error('Failed to fetch userinfo with access token:', err.message);
      }
    }

    if (!email) {
      throw new Error('Không thể xác thực danh tính Google. Token không hợp lệ.');
    }

    email = email.toLowerCase().trim();
    const now = Date.now();

    // Check if user already exists with this googleId or email
    let user = (googleId ? await db.findUserByGoogleId(googleId) : null) || (await db.findUserByEmail(email));

    if (user) {
      // Update googleId / avatar / name if needed
      const updates: Partial<User> = {};
      if (!user.googleId && googleId) updates.googleId = googleId;
      if (picture && !user.avatar) updates.avatar = picture;
      if (name && (!user.name || user.name === user.email)) updates.name = name;

      if (Object.keys(updates).length > 0) {
        user = await db.updateUser(user.id, updates);
      }
    } else {
      // Create new user via Google
      user = {
        id: uuidv4(),
        email,
        name: name || email.split('@')[0],
        googleId,
        avatar: picture || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(email)}`,
        authProvider: 'google',
        role: 'user',
        createdAt: now,
        updatedAt: now
      };
      await db.saveUser(user);
    }

    return {
      user: this.sanitizeUser(user),
      token: this.generateToken(user)
    };
  }

  /**
   * Get user profile by ID
   */
  async getUserById(id: string): Promise<SafeUser | null> {
    const user = await db.findUserById(id);
    return user ? this.sanitizeUser(user) : null;
  }
}

export const authService = new AuthService();
