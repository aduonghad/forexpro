import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Bot, Send, ShieldAlert, CheckCircle2, AlertCircle, RefreshCw, Key, MessageSquare, ExternalLink, X, Crown } from 'lucide-react';

interface UserTelegramModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UserTelegramModal: React.FC<UserTelegramModalProps> = ({ isOpen, onClose }) => {
  const { user, userPlan, isProOrUltra } = useAuth();
  const [token, setToken] = useState('');
  const [chatId, setChatId] = useState('');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [statusData, setStatusData] = useState<any>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (isOpen && isProOrUltra) {
      loadConfig();
    }
  }, [isOpen, isProOrUltra]);

  const loadConfig = async (preserveFeedback = false) => {
    setLoading(true);
    if (!preserveFeedback) {
      setFeedback(null);
    }
    try {
      const data = await api.getUserTelegramStatus();
      setStatusData(data);
      setNotificationsEnabled(data.notificationsEnabled !== false);
    } catch (err: any) {
      console.warn('Lỗi tải cấu hình Telegram cá nhân:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);
    try {
      const res = await api.saveUserTelegramConfig({
        botToken: token ? token.trim() : undefined,
        chatId: chatId ? chatId.trim() : undefined,
        notificationsEnabled
      });
      setFeedback({ type: 'success', message: res.message || 'Đã lưu cấu hình Telegram cá nhân thành công!' });
      setToken('');
      setChatId('');
      await loadConfig(true);
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.error || err.message || 'Lỗi lưu thông tin Telegram'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setFeedback(null);
    try {
      const res = await api.sendUserTelegramTest({
        botToken: token ? token.trim() : undefined,
        chatId: chatId ? chatId.trim() : undefined
      });
      setFeedback({ type: 'success', message: res.message || 'Đã gửi tin nhắn thử nghiệm thành công!' });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.error || err.message || 'Không thể gửi tin nhắn thử nghiệm'
      });
    } finally {
      setTesting(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto animate-fadeIn">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Telegram Bot Cá Nhân
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                  isProOrUltra ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-slate-800 text-slate-400'
                }`}>
                  Gói {userPlan}
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Nhận thông báo đặt lệnh và đóng lệnh bot riêng của bạn
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {!isProOrUltra ? (
            /* Locked State for Free & Plus accounts */
            <div className="text-center py-6 space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
                <Crown className="w-7 h-7" />
              </div>
              <div className="space-y-1.5">
                <h4 className="text-base font-bold text-white">Tính Năng Dành Riêng Cho Gói PRO & ULTRA</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                  Tài khoản hiện tại của bạn là <strong className="text-cyan-300 uppercase">{userPlan}</strong>. Vui lòng liên hệ Quản trị viên để nâng cấp lên tài khoản <strong className="text-amber-300">PRO (10 tín hiệu)</strong> hoặc <strong className="text-purple-300">ULTRA (Không giới hạn)</strong> để liên kết Bot Telegram riêng của bạn.
                </p>
              </div>

              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-left text-xs space-y-1.5 text-slate-400">
                <div className="flex items-center gap-2 text-slate-300 font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Đặc quyền gói PRO & ULTRA:</span>
                </div>
                <div className="pl-6 space-y-1">
                  <div>• Bắn tín hiệu vào/đóng lệnh tức thì về kênh Telegram riêng</div>
                  <div>• Quản lý 10 tới không giới hạn số lượng bot tự động</div>
                  <div>• Tùy biến API Bot Token và Chat ID không giới hạn</div>
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition"
              >
                Đã Hiểu & Đóng
              </button>
            </div>
          ) : (
            /* Config Form for Pro & Ultra */
            <form onSubmit={handleSave} className="space-y-4">
              {feedback && (
                <div className={`p-3.5 rounded-xl border text-xs flex items-center justify-between gap-2.5 transition-all shadow-lg ${
                  feedback.type === 'success'
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 shadow-emerald-500/10'
                    : 'bg-rose-500/15 border-rose-500/40 text-rose-300 shadow-rose-500/10'
                }`}>
                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    {feedback.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    )}
                    <span className="font-medium break-words">{feedback.message}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFeedback(null)}
                    className="p-1 rounded text-slate-400 hover:text-white transition shrink-0"
                    title="Đóng thông báo"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Telegram Bot Token riêng của bạn:</span>
                </label>
                <input
                  type="password"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder={statusData?.botTokenConfigured ? `Đã lưu (${statusData.botTokenMasked}) - Nhập mới để đổi` : 'Ví dụ: 7891234567:AAHk1_...'}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
                />
                <p className="text-[10px] text-slate-400">
                  Tạo bot miễn phí bằng cách chat với <a href="https://t.me/BotFather" target="_blank" rel="noreferrer" className="text-cyan-400 hover:underline inline-flex items-center gap-0.5">@BotFather <ExternalLink className="w-2.5 h-2.5" /></a> trên Telegram.
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Chat ID hoặc ID Kênh của bạn:</span>
                </label>
                <input
                  type="text"
                  value={chatId}
                  onChange={(e) => setChatId(e.target.value)}
                  placeholder={statusData?.chatId ? `Đã lưu (${statusData.chatId}) - Nhập mới để đổi` : 'Ví dụ: 123456789 hoặc -1001234567890'}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
                />
                <p className="text-[10px] text-slate-400">
                  Lấy Chat ID bằng cách chat với bot <a href="https://t.me/userinfobot" target="_blank" rel="noreferrer" className="text-cyan-400 hover:underline inline-flex items-center gap-0.5">@userinfobot <ExternalLink className="w-2.5 h-2.5" /></a>.
                </p>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-950/80 rounded-xl border border-slate-800 text-xs">
                <div>
                  <span className="font-semibold text-slate-200 block">Kích hoạt thông báo tự động</span>
                  <span className="text-[11px] text-slate-400">Gửi thông báo mỗi khi bot đặt lệnh và đóng lệnh</span>
                </div>
                <button
                  type="button"
                  onClick={() => setNotificationsEnabled(!notificationsEnabled)}
                  className={`w-11 h-6 rounded-full transition-colors relative flex items-center px-0.5 ${
                    notificationsEnabled ? 'bg-cyan-500' : 'bg-slate-800'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white transition-transform ${
                    notificationsEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </button>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleTest}
                  disabled={testing || (!token && !statusData?.botTokenConfigured) || (!chatId && !statusData?.chatId)}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{testing ? 'Đang gửi test...' : 'Gửi Thử Nghiệm'}</span>
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold transition shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{saving ? 'Đang lưu...' : 'Lưu Cấu Hình'}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
