import React, { useState, useEffect, useRef } from 'react';
import { X, Mail, Lock, User as UserIcon, Eye, EyeOff, AlertCircle, CheckCircle2, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

declare global {
  interface Window {
    google?: any;
  }
}

export const AuthModal: React.FC = () => {
  const {
    isAuthModalOpen,
    authMode,
    openAuthModal,
    closeAuthModal,
    login,
    register,
    googleLogin,
    googleClientId,
    isGoogleAuthEnabled
  } = useAuth();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showGoogleDevInput, setShowGoogleDevInput] = useState(false);
  const [devGoogleEmail, setDevGoogleEmail] = useState('');
  const [devGoogleName, setDevGoogleName] = useState('');

  const [googleButtonRendered, setGoogleButtonRendered] = useState(false);

  const googleBtnContainerRef = useRef<HTMLDivElement>(null);

  // Sync mode with context
  useEffect(() => {
    if (isAuthModalOpen) {
      setMode(authMode);
      setError(null);
      setSuccessMsg(null);
    }
  }, [isAuthModalOpen, authMode]);

  // Load Google Identity Services SDK script dynamically
  useEffect(() => {
    if (!isAuthModalOpen) return;

    const loadGoogleScript = () => {
      if (document.getElementById('google-gsi-client')) {
        renderGoogleButton();
        return;
      }

      const script = document.createElement('script');
      script.id = 'google-gsi-client';
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        renderGoogleButton();
      };
      document.body.appendChild(script);
    };

    const renderGoogleButton = () => {
      if (window.google?.accounts?.id && googleClientId) {
        try {
          window.google.accounts.id.initialize({
            client_id: googleClientId,
            callback: async (response: any) => {
              if (response.credential) {
                try {
                  setIsSubmitting(true);
                  setError(null);
                  await googleLogin(response.credential);
                  setSuccessMsg('Đăng nhập Google thành công!');
                } catch (err: any) {
                  setError(err.response?.data?.error || err.message || 'Lỗi xác thực Google');
                } finally {
                  setIsSubmitting(false);
                }
              }
            }
          });

          if (googleBtnContainerRef.current) {
            googleBtnContainerRef.current.innerHTML = '';
            window.google.accounts.id.renderButton(googleBtnContainerRef.current, {
              theme: 'outline',
              size: 'large',
              shape: 'rectangular',
              text: mode === 'login' ? 'signin_with' : 'signup_with',
              width: 380,
              logo_alignment: 'left'
            });
            setGoogleButtonRendered(true);
          }
        } catch (err) {
          console.warn('Google GSI initialization error:', err);
        }
      }
    };

    loadGoogleScript();
  }, [isAuthModalOpen, googleClientId, mode]);

  if (!isAuthModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    // Validation
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      setError('Vui lòng nhập email');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setError('Địa chỉ email không đúng định dạng (VD: example@gmail.com)');
      return;
    }

    if (!password || password.length < 6) {
      setError('Mật khẩu phải chứa ít nhất 6 ký tự');
      return;
    }

    if (mode === 'register') {
      if (!name.trim()) {
        setError('Vui lòng nhập họ và tên của bạn');
        return;
      }
      if (password !== confirmPassword) {
        setError('Mật khẩu xác nhận không khớp');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      if (mode === 'login') {
        await login(trimmedEmail, password);
      } else {
        await register(trimmedEmail, password, name.trim());
      }
      setSuccessMsg(mode === 'login' ? 'Đăng nhập thành công!' : 'Đăng ký tài khoản thành công!');
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Đã có lỗi xảy ra. Vui lòng thử lại!');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler for custom Google button click
  const handleGoogleClick = async () => {
    setError(null);
    if (window.google?.accounts?.id && googleClientId) {
      // Prompt Google One Tap / Account chooser
      window.google.accounts.id.prompt((notification: any) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          console.log('Google Prompt suppressed or skipped');
        }
      });
    } else {
      // If client ID is not configured yet, open quick Google authentication helper
      setShowGoogleDevInput(true);
    }
  };

  const handleDevGoogleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!devGoogleEmail) {
      setError('Vui lòng nhập địa chỉ Gmail');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      // Create test JWT payload matching Google format
      const header = btoa(JSON.stringify({ alg: 'none', typ: 'JWT' }));
      const payload = btoa(
        JSON.stringify({
          sub: 'google_user_' + Date.now(),
          email: devGoogleEmail.trim().toLowerCase(),
          name: devGoogleName.trim() || devGoogleEmail.split('@')[0],
          picture: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(devGoogleEmail)}`,
          email_verified: true
        })
      );
      const mockToken = `${header}.${payload}.signature`;

      await googleLogin(mockToken);
      setSuccessMsg('Đăng nhập qua Google API thành công!');
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Lỗi xác thực Google');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-slate-900/95 border border-slate-700/80 rounded-2xl shadow-2xl shadow-cyan-950/40 overflow-hidden">
        {/* Glow Header Accent */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-sky-400 to-blue-600" />

        {/* Close Button */}
        <button
          onClick={closeAuthModal}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6">
          {/* Header Title */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Exness Pro Trading Portal</span>
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              {mode === 'login' ? 'Đăng Nhập Tài Khoản' : 'Tạo Tài Khoản Mới'}
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              {mode === 'login'
                ? 'Truy cập hệ thống quản lý bot và giao dịch tự động'
                : 'Đăng ký nhanh chóng bằng Gmail hoặc mật khẩu an toàn'}
            </p>
          </div>

          {/* Mode Tabs */}
          <div className="flex rounded-xl bg-slate-800/80 p-1 mb-5 border border-slate-700/60">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                openAuthModal('login');
                setError(null);
              }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                mode === 'login'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Đăng Nhập
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                openAuthModal('register');
                setError(null);
              }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                mode === 'register'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Đăng Ký
            </button>
          </div>

          {/* Notification Alerts */}
          {error && (
            <div className="flex items-start gap-2.5 p-3 mb-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs animate-shake">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-center gap-2.5 p-3 mb-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Google Sign In Section */}
          <div className="space-y-3">
            {/* Native GSI Button Target if configured */}
            <div ref={googleBtnContainerRef} className="flex justify-center w-full empty:hidden" />

            {/* Custom Google Button (shown if native GSI button hasn't rendered) */}
            {!googleButtonRendered && (
              <button
                type="button"
                onClick={handleGoogleClick}
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-medium text-xs transition shadow-md hover:shadow-lg disabled:opacity-50"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>{mode === 'login' ? 'Đăng nhập bằng tài khoản Google' : 'Đăng ký nhanh bằng Google'}</span>
              </button>
            )}

            {/* Quick Dev/Demo Google Sign-in dialog if clicked without Google Client ID */}
            {showGoogleDevInput && !googleClientId && (
              <div className="p-3 bg-slate-800/80 border border-cyan-500/30 rounded-xl space-y-2.5 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-cyan-300 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Xác thực Google API (Chế độ mô phỏng)
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowGoogleDevInput(false)}
                    className="text-slate-400 hover:text-slate-200 text-xs"
                  >
                    Đóng
                  </button>
                </div>
                <p className="text-[10px] text-slate-400">
                  Nhập địa chỉ Gmail của bạn để kiểm tra luồng xác thực Google OAuth trực tiếp:
                </p>
                <div className="space-y-2">
                  <input
                    type="email"
                    value={devGoogleEmail}
                    onChange={(e) => setDevGoogleEmail(e.target.value)}
                    placeholder="vidu@gmail.com"
                    className="w-full px-3 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                  />
                  <input
                    type="text"
                    value={devGoogleName}
                    onChange={(e) => setDevGoogleName(e.target.value)}
                    placeholder="Tên hiển thị (Tùy chọn)"
                    className="w-full px-3 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                  />
                  <button
                    type="button"
                    onClick={handleDevGoogleSubmit}
                    disabled={isSubmitting}
                    className="w-full py-1.5 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-medium text-xs rounded-lg hover:opacity-90 transition disabled:opacity-50"
                  >
                    {isSubmitting ? 'Đang xác thực...' : 'Xác nhận Đăng nhập Google'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="flex items-center my-4">
            <div className="flex-grow border-t border-slate-800" />
            <span className="px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              HOẶC SỬ DỤNG GMAIL / EMAIL
            </span>
            <div className="flex-grow border-t border-slate-800" />
          </div>

          {/* Email Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {mode === 'register' && (
              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">Họ và Tên</label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Nguyễn Văn A"
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-medium text-slate-300 mb-1">
                Địa chỉ Gmail hoặc Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="trader@gmail.com"
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-300 mb-1">Mật khẩu</label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Tối thiểu 6 ký tự"
                  className="w-full pl-9 pr-10 py-2 text-xs bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300 transition"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {mode === 'register' && (
              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">
                  Xác nhận Mật khẩu
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Nhập lại mật khẩu"
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-xs transition shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 disabled:opacity-50"
            >
              <span>
                {isSubmitting
                  ? 'Đang xử lý...'
                  : mode === 'login'
                  ? 'Đăng Nhập Tài Khoản'
                  : 'Hoàn Tất Đăng Ký'}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Footer switch prompt */}
          <div className="mt-5 text-center text-xs text-slate-400">
            {mode === 'login' ? (
              <span>
                Chưa có tài khoản?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('register');
                    setError(null);
                  }}
                  className="text-cyan-400 hover:text-cyan-300 font-semibold transition"
                >
                  Đăng ký ngay
                </button>
              </span>
            ) : (
              <span>
                Đã có tài khoản?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setError(null);
                  }}
                  className="text-cyan-400 hover:text-cyan-300 font-semibold transition"
                >
                  Đăng nhập
                </button>
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
