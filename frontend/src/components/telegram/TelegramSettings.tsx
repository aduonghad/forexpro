import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Send, Bell, BellOff, ShieldCheck, CheckCircle2, AlertCircle, RefreshCw, Key, MessageSquare, ExternalLink, Bot, X } from 'lucide-react';

export const TelegramSettings: React.FC = () => {
  const [status, setStatus] = useState<{
    botTokenConfigured: boolean;
    botTokenMasked: string;
    chatId: string;
    notificationsEnabled: boolean;
    botUsername?: string;
    botFirstName?: string;
  } | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isToggling, setIsToggling] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [saveResult, setSaveResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Edit credentials state
  const [isEditing, setIsEditing] = useState(false);
  const [customToken, setCustomToken] = useState('');
  const [customChatId, setCustomChatId] = useState('');
  const [isSavingCreds, setIsSavingCreds] = useState(false);

  // Notification types toggles (stored in localStorage)
  const [eventSettings, setEventSettings] = useState({
    orders: true,
    closeTrades: true,
    indicators: true,
    volatilityAlerts: true,
    webhooks: true
  });

  const loadStatus = async () => {
    setIsLoading(true);
    try {
      const data = await api.getTelegramFullStatus();
      setStatus(data);
      if (data.chatId) setCustomChatId(data.chatId);
    } catch (err) {
      console.error('Lỗi khi tải cấu hình Telegram:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const handleToggle = async () => {
    setIsToggling(true);
    setSaveResult(null);
    try {
      const nextState = !status?.notificationsEnabled;
      const res = await api.toggleTelegramAlerts(nextState);
      setStatus(prev => prev ? { ...prev, notificationsEnabled: res.notificationsEnabled } : null);
      setSaveResult({
        type: 'success',
        message: res.message || (nextState ? 'Đã BẬT thông báo Telegram hệ thống' : 'Đã TẮT thông báo Telegram hệ thống')
      });
    } catch (err: any) {
      setSaveResult({
        type: 'error',
        message: 'Lỗi khi bật/tắt thông báo: ' + (err?.response?.data?.error || err?.message || err)
      });
    } finally {
      setIsToggling(false);
    }
  };

  const handleSendTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await api.sendTelegramTest();
      setTestResult({ type: 'success', message: res.message || 'Đã gửi tin nhắn thử nghiệm thành công' });
    } catch (err: any) {
      setTestResult({
        type: 'error',
        message: err?.response?.data?.error || err?.message || 'Gửi tin nhắn thử nghiệm thất bại'
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customToken.trim() || !customChatId.trim()) {
      setSaveResult({ type: 'error', message: 'Vui lòng điền đầy đủ Bot Token và Chat ID' });
      return;
    }
    setIsSavingCreds(true);
    setSaveResult(null);
    try {
      const res = await api.saveTelegramCredentials(customToken.trim(), customChatId.trim());
      setIsEditing(false);
      setCustomToken('');
      await loadStatus();
      setSaveResult({
        type: 'success',
        message: res.message || 'Đã cập nhật thông tin Telegram Bot thành công!'
      });
    } catch (err: any) {
      setSaveResult({
        type: 'error',
        message: err?.response?.data?.error || err?.message || 'Lỗi lưu thông tin Telegram'
      });
    } finally {
      setIsSavingCreds(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Master Toggle Banner */}
      <div className={`p-6 rounded-2xl border transition-all duration-300 shadow-xl ${
        status?.notificationsEnabled
          ? 'bg-gradient-to-r from-emerald-950/40 via-slate-900 to-cyan-950/40 border-emerald-500/40 shadow-emerald-950/20'
          : 'bg-slate-900/60 border-slate-800'
      }`}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={`p-3.5 rounded-2xl border ${
              status?.notificationsEnabled
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}>
              {status?.notificationsEnabled ? <Bell className="w-7 h-7 animate-pulse" /> : <BellOff className="w-7 h-7" />}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-lg font-bold text-white">
                  Thông Báo Telegram Đang: {status?.notificationsEnabled ? 'BẬT (HOẠT ĐỘNG)' : 'TẮT (TẠM DỪNG)'}
                </h2>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                  status?.notificationsEnabled
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-slate-800 text-slate-400'
                }`}>
                  {status?.notificationsEnabled ? 'Active' : 'Paused'}
                </span>
              </div>
              <p className="text-xs text-slate-300">
                {status?.notificationsEnabled
                  ? 'Bot đang tự động gửi thông báo lệnh, chốt lời, cắt lỗ và tín hiệu trực tiếp về Telegram của bạn.'
                  : 'Hệ thống đang tạm dừng gửi tin nhắn về Telegram. Nhấn nút bên phải để bật lại bất cứ lúc nào.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-center">
            {/* Master Switch */}
            <button
              onClick={handleToggle}
              disabled={isToggling || isLoading}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs transition-all shadow-lg ${
                status?.notificationsEnabled
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/25'
                  : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
              }`}
            >
              {isToggling ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : status?.notificationsEnabled ? (
                <Bell className="w-4 h-4" />
              ) : (
                <BellOff className="w-4 h-4" />
              )}
              <span>{status?.notificationsEnabled ? 'ĐANG BẬT - BẤM ĐỂ TẮT' : 'ĐANG TẮT - BẤM ĐỂ BẬT'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Bot Info & Test Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left: Connected Bot Profile */}
        <div className="md:col-span-2 p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Bot className="w-4 h-4 text-cyan-400" />
              Thông Tin Bot Telegram Kết Nối
            </h3>
            <button
              onClick={() => {
                setIsEditing(!isEditing);
                setSaveResult(null);
              }}
              className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold transition"
            >
              {isEditing ? 'Hủy sửa' : 'Thay đổi Token / Chat ID'}
            </button>
          </div>

          {/* Save feedback banner */}
          {saveResult && (
            <div className={`p-3.5 rounded-xl text-xs flex items-center justify-between gap-2.5 border transition-all shadow-md ${
              saveResult.type === 'success'
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 shadow-emerald-500/10'
                : 'bg-rose-500/15 border-rose-500/40 text-rose-300 shadow-rose-500/10'
            }`}>
              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                {saveResult.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                )}
                <span className="font-medium break-words">{saveResult.message}</span>
              </div>
              <button
                type="button"
                onClick={() => setSaveResult(null)}
                className="p-1 rounded text-slate-400 hover:text-white transition shrink-0"
                title="Đóng thông báo"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {!isEditing ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Tên Bot</span>
                <span className="text-sm font-semibold text-white flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  {status?.botFirstName || 'Joun9 Trade Bot'}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Username Bot</span>
                <a
                  href={`https://t.me/${status?.botUsername || 'juon9_trade_bot'}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-semibold text-cyan-400 hover:underline flex items-center gap-1.5"
                >
                  @{status?.botUsername || 'juon9_trade_bot'}
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Bot Token</span>
                <span className="text-xs font-mono text-slate-300">
                  {status?.botTokenMasked || '8872933961:AAHnEnpe...GI0'}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80">
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Chat ID Của Bạn</span>
                <span className="text-xs font-mono font-bold text-emerald-400">
                  {status?.chatId || '2115888410'}
                </span>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSaveCredentials} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
              <div>
                <label className="text-xs text-slate-300 block mb-1">Bot Token mới:</label>
                <input
                  type="text"
                  required
                  value={customToken}
                  onChange={e => setCustomToken(e.target.value)}
                  placeholder="Điền Telegram Bot Token..."
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 block mb-1">Chat ID mới:</label>
                <input
                  type="text"
                  required
                  value={customChatId}
                  onChange={e => setCustomChatId(e.target.value)}
                  placeholder="Điền Telegram Chat ID..."
                  className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSavingCreds}
                  className="px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-500 transition"
                >
                  {isSavingCreds ? 'Đang lưu...' : 'Lưu Thay Đổi'}
                </button>
              </div>
            </form>
          )}

          {/* Test connection trigger */}
          <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-t border-slate-800/80">
            <span className="text-xs text-slate-400">
              Kiểm tra nhanh xem tin nhắn có gửi về điện thoại được không:
            </span>
            <button
              onClick={handleSendTest}
              disabled={isTesting || !status?.notificationsEnabled}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-500 shadow-md shadow-cyan-600/20 transition disabled:opacity-40"
            >
              {isTesting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              <span>{isTesting ? 'Đang gửi test...' : 'Gửi Tin Nhắn Thử Nghiệm'}</span>
            </button>
          </div>

          {/* Test feedback banner */}
          {testResult && (
            <div className={`p-3.5 rounded-xl text-xs flex items-center justify-between gap-2.5 border transition-all shadow-md ${
              testResult.type === 'success'
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 shadow-emerald-500/10'
                : 'bg-rose-500/15 border-rose-500/40 text-rose-300 shadow-rose-500/10'
            }`}>
              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                {testResult.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                )}
                <span className="font-medium break-words">{testResult.message}</span>
              </div>
              <button
                type="button"
                onClick={() => setTestResult(null)}
                className="p-1 rounded text-slate-400 hover:text-white transition shrink-0"
                title="Đóng thông báo"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Right: Notification Event Filters */}
        <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
          <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-cyan-400" />
            Loại Sự Kiện Nhận Báo
          </h3>
          <p className="text-xs text-slate-400">
            Tùy chỉnh các loại tin nhắn bot sẽ gửi về Telegram của bạn:
          </p>

          <div className="space-y-2.5 pt-1">
            <label className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 cursor-pointer hover:border-slate-700">
              <span className="text-xs text-slate-200">⚡ Khớp lệnh MUA / BÁN mới</span>
              <input
                type="checkbox"
                checked={eventSettings.orders}
                onChange={e => setEventSettings(prev => ({ ...prev, orders: e.target.checked }))}
                className="rounded text-cyan-500 focus:ring-0"
              />
            </label>

            <label className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 cursor-pointer hover:border-slate-700">
              <span className="text-xs text-slate-200">🏁 Chốt lời (TP) / Cắt lỗ (SL)</span>
              <input
                type="checkbox"
                checked={eventSettings.closeTrades}
                onChange={e => setEventSettings(prev => ({ ...prev, closeTrades: e.target.checked }))}
                className="rounded text-cyan-500 focus:ring-0"
              />
            </label>

            <label className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 cursor-pointer hover:border-slate-700">
              <span className="text-xs text-slate-200">📊 Phân tích kỹ thuật & Tín hiệu nến</span>
              <input
                type="checkbox"
                checked={eventSettings.indicators}
                onChange={e => setEventSettings(prev => ({ ...prev, indicators: e.target.checked }))}
                className="rounded text-cyan-500 focus:ring-0"
              />
            </label>

            <label className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 cursor-pointer hover:border-slate-700">
              <span className="text-xs text-slate-200">🚨 Cảnh báo biến động giá mạnh</span>
              <input
                type="checkbox"
                checked={eventSettings.volatilityAlerts}
                onChange={e => setEventSettings(prev => ({ ...prev, volatilityAlerts: e.target.checked }))}
                className="rounded text-cyan-500 focus:ring-0"
              />
            </label>

            <label className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 cursor-pointer hover:border-slate-700">
              <span className="text-xs text-slate-200">📡 Tín hiệu Webhook TradingView</span>
              <input
                type="checkbox"
                checked={eventSettings.webhooks}
                onChange={e => setEventSettings(prev => ({ ...prev, webhooks: e.target.checked }))}
                className="rounded text-cyan-500 focus:ring-0"
              />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};
