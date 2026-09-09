import React, { useState, useRef, useEffect } from 'react';
import { Bot, Send, Sparkles, AlertTriangle, TrendingUp, TrendingDown, Target, Info, Check, User, ArrowRight, Bell, BellOff, BarChart3 } from 'lucide-react';
import { BotMessage, BotMessageType } from '../../types';
import { api } from '../../services/api';

interface BotChatProps {
  messages: BotMessage[];
  onSendMessage: (text: string) => void;
  botActive: boolean;
}

export const BotChat: React.FC<BotChatProps> = ({ messages, onSendMessage, botActive }) => {
  const [inputText, setInputText] = useState('');
  const [filterType, setFilterType] = useState<string>('ALL');
  const [telegramActive, setTelegramActive] = useState<boolean>(false);
  const [telegramEnabled, setTelegramEnabled] = useState<boolean>(true);
  const [loadingTelegram, setLoadingTelegram] = useState<boolean>(false);
  const [analysisEnabled, setAnalysisEnabled] = useState<boolean>(true);
  const [loadingAnalysis, setLoadingAnalysis] = useState<boolean>(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.getTelegramConfig().then(data => {
      setTelegramActive(data.active);
      setTelegramEnabled(data.notificationsEnabled);
    }).catch(() => {});

    api.getBotStatus().then(status => {
      setAnalysisEnabled(status.analysisAlertsActive);
    }).catch(() => {});
  }, []);

  const handleToggleTelegram = async () => {
    setLoadingTelegram(true);
    try {
      const newStatus = await api.toggleTelegramNotifications();
      setTelegramEnabled(newStatus);
    } catch (err) {
      console.error('Failed to toggle Telegram notifications:', err);
    } finally {
      setLoadingTelegram(false);
    }
  };

  const handleToggleAnalysis = async () => {
    setLoadingAnalysis(true);
    try {
      const newStatus = await api.toggleAnalysisAlerts();
      setAnalysisEnabled(newStatus);
    } catch (err) {
      console.error('Failed to toggle Analysis alerts:', err);
    } finally {
      setLoadingAnalysis(false);
    }
  };

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, filterType]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText.trim());
    setInputText('');
  };

  const handleQuickPrompt = (prompt: string) => {
    onSendMessage(prompt);
  };

  const filteredMessages = messages.filter(m => {
    if (filterType === 'ALL') return true;
    if (filterType === 'ORDER') return m.type === 'ORDER' || m.type === 'CLOSE';
    if (filterType === 'SIGNAL') return m.type === 'SIGNAL';
    if (filterType === 'ANALYSIS') return m.type === 'ANALYSIS';
    return true;
  });

  const renderBadge = (type: BotMessageType, data?: any) => {
    if (data?.type === 'SWING_PEAK') {
      return (
        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1">
          <span>🔻</span> ĐỈNH SÓNG
        </span>
      );
    }
    if (data?.type === 'SWING_TROUGH') {
      return (
        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
          <span>🔺</span> ĐÁY SÓNG
        </span>
      );
    }
    switch (type) {
      case 'ORDER':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">LỆNH MỚI</span>;
      case 'CLOSE':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">CHỐT LỆNH</span>;
      case 'SIGNAL':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">TÍN HIỆU</span>;
      case 'ANALYSIS':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30">PHÂN TÍCH</span>;
      case 'ALERT':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">CẢNH BÁO</span>;
      case 'USER':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">NGƯỜI DÙNG</span>;
      default:
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-400">THÔNG TIN</span>;
    }
  };

  return (
    <div className="glass-panel rounded-2xl flex flex-col h-full border border-slate-800 shadow-2xl overflow-hidden">
      {/* Chat Header */}
      <div className="border-b border-slate-800/80 bg-slate-900/80">
        {/* Row 1: Bot Title & Telegram Toggle */}
        <div className="p-3.5 flex items-center justify-between gap-2 border-b border-slate-800/50">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-white shadow-md shadow-cyan-500/30 shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-slate-100 truncate">Thông Báo & Chat Bot</h3>
                <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {botActive ? 'Đang quét' : 'Tạm dừng'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate">Nhật ký quyết định & lệnh thời gian thực</p>
            </div>
          </div>

          {/* Control Buttons (Row 1 Top Right) */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Market Analysis Toggle Button */}
            <button
              onClick={handleToggleAnalysis}
              disabled={loadingAnalysis}
              title={analysisEnabled ? 'Tắt tự động phân tích thị trường kỹ thuật định kỳ' : 'Bật tự động phân tích thị trường kỹ thuật định kỳ'}
              className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold flex items-center gap-1.5 transition border ${
                analysisEnabled
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 hover:bg-cyan-500/30 shadow-sm shadow-cyan-500/20'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              <BarChart3 className={`w-3.5 h-3.5 ${analysisEnabled ? 'text-cyan-400 animate-pulse' : 'text-slate-400'}`} />
              <span>Phân tích: {analysisEnabled ? 'BẬT' : 'TẮT'}</span>
            </button>

            {/* Telegram Notifications Toggle Button */}
            <button
              onClick={handleToggleTelegram}
              disabled={loadingTelegram}
              title={telegramActive ? (telegramEnabled ? 'Tắt đẩy thông báo tự động sang Telegram' : 'Bật đẩy thông báo tự động sang Telegram') : 'Chưa cấu hình Telegram Token & Chat ID trong backend/.env'}
              className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold flex items-center gap-1.5 transition border ${
                !telegramActive
                  ? 'bg-slate-950 text-slate-500 border-slate-800 cursor-not-allowed opacity-60'
                  : telegramEnabled
                  ? 'bg-sky-500/20 text-sky-300 border-sky-500/40 hover:bg-sky-500/30 shadow-sm shadow-sky-500/20'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              {telegramActive && telegramEnabled ? (
                <Bell className="w-3.5 h-3.5 text-sky-400 animate-pulse" />
              ) : (
                <BellOff className="w-3.5 h-3.5 text-slate-400" />
              )}
              <span>Telegram: {telegramActive ? (telegramEnabled ? 'BẬT' : 'TẮT') : 'Chưa nối'}</span>
            </button>
          </div>
        </div>

        {/* Row 2: Message Filter Toolbar (Separate Row Below) */}
        <div className="px-3.5 py-2 bg-slate-950/60 flex items-center justify-between text-[11px] gap-2">
          <span className="text-[11px] text-slate-400 font-medium shrink-0">Lọc thông báo:</span>
          <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800 overflow-x-auto">
            <button
              onClick={() => setFilterType('ALL')}
              className={`px-2.5 py-0.5 rounded transition whitespace-nowrap ${filterType === 'ALL' ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Tất cả
            </button>
            <button
              onClick={() => setFilterType('ORDER')}
              className={`px-2.5 py-0.5 rounded transition whitespace-nowrap ${filterType === 'ORDER' ? 'bg-emerald-500/20 text-emerald-300 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Lệnh
            </button>
            <button
              onClick={() => setFilterType('SIGNAL')}
              className={`px-2.5 py-0.5 rounded transition whitespace-nowrap ${filterType === 'SIGNAL' ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
            >
              TopDown
            </button>
            <button
              onClick={() => setFilterType('ANALYSIS')}
              className={`px-2.5 py-0.5 rounded transition whitespace-nowrap ${filterType === 'ANALYSIS' ? 'bg-sky-500/20 text-sky-300 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Phân tích
            </button>
          </div>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3.5 space-y-3">
        {filteredMessages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 text-xs py-10 gap-2">
            <Info className="w-6 h-6 text-slate-600" />
            <p>Chưa có thông báo nào trong mục này.</p>
          </div>
        ) : (
          filteredMessages.map((msg) => {
            const isUser = msg.type === 'USER';
            const isOrder = msg.type === 'ORDER';
            const isClose = msg.type === 'CLOSE';
            const isPeak = msg.data?.type === 'SWING_PEAK';
            const isTrough = msg.data?.type === 'SWING_TROUGH';
            const isSignal = msg.type === 'SIGNAL';

            if (isUser) {
              return (
                <div key={msg.id} className="flex items-end justify-end gap-2">
                  <div className="max-w-[85%] bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-2xl rounded-br-none px-3.5 py-2 shadow-md">
                    <p className="text-xs leading-relaxed">{msg.message}</p>
                    <span className="text-[10px] text-white/60 block text-right mt-1 font-mono">
                      {new Date(msg.timestamp).toLocaleTimeString('vi-VN')}
                    </span>
                  </div>
                  <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 shrink-0">
                    <User className="w-3.5 h-3.5" />
                  </div>
                </div>
              );
            }

            return (
              <div
                key={msg.id}
                className={`p-3 rounded-xl border transition-all text-xs ${
                  isOrder
                    ? 'bg-emerald-950/25 border-emerald-500/40 shadow-sm shadow-emerald-500/10'
                    : isClose
                    ? 'bg-purple-950/25 border-purple-500/40'
                    : isPeak
                    ? 'bg-rose-950/25 border-rose-500/40 shadow-sm shadow-rose-500/10'
                    : isTrough
                    ? 'bg-emerald-950/25 border-emerald-500/40 shadow-sm shadow-emerald-500/10'
                    : isSignal
                    ? 'bg-cyan-950/25 border-cyan-500/40 shadow-sm shadow-cyan-500/10'
                    : msg.type === 'ANALYSIS'
                    ? 'bg-slate-900/80 border-slate-800'
                    : 'bg-slate-900/60 border-slate-800/80'
                }`}
              >
                {/* Header */}
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    {renderBadge(msg.type, msg.data)}
                    <span className="font-bold text-slate-200 text-xs">{msg.title}</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {new Date(msg.timestamp).toLocaleTimeString('vi-VN')}
                  </span>
                </div>

                {/* Message Body */}
                <div className="text-slate-300 whitespace-pre-line leading-relaxed text-[11.5px]">
                  {msg.message}
                </div>

                {/* Optional Tag / Symbol pill */}
                {msg.symbol && (
                  <div className="mt-2 pt-1.5 border-t border-slate-800/60 flex items-center justify-between text-[10px] text-slate-400">
                    <span className="font-mono bg-slate-800/80 px-1.5 py-0.5 rounded text-cyan-300">
                      #{msg.symbol}
                    </span>
                    {isOrder && (
                      <span className="text-emerald-400 font-semibold flex items-center gap-1">
                        <Check className="w-3 h-3" /> Đã khớp lệnh
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Quick Prompts Bar */}
      <div className="px-3 pt-2 border-t border-slate-800/60 bg-slate-900/40 flex items-center gap-1.5 overflow-x-auto text-[11px]">
        <button
          onClick={() => handleQuickPrompt('topdown')}
          className="px-2.5 py-1 rounded-lg bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 whitespace-nowrap transition flex items-center gap-1 font-semibold"
        >
          TopDown
        </button>
        <button
          onClick={() => handleQuickPrompt('phân tích vàng')}
          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 whitespace-nowrap transition"
        >
          📊 Phân tích Vàng
        </button>
        <button
          onClick={() => handleQuickPrompt('trạng thái tài khoản')}
          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 whitespace-nowrap transition"
        >
          🔍 Trạng thái
        </button>
        <button
          onClick={() => handleQuickPrompt('đóng hết lệnh')}
          className="px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 whitespace-nowrap transition"
        >
          🛑 Đóng hết
        </button>
        <button
          onClick={() => handleQuickPrompt(botActive ? 'tắt bot' : 'bật bot')}
          className="px-2.5 py-1 rounded-lg bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 whitespace-nowrap transition"
        >
          {botActive ? '⏸️ Tạm dừng' : '▶️ Bật bot'}
        </button>
      </div>

      {/* Input Chat Bar */}
      <form onSubmit={handleSend} className="p-3 bg-slate-900/90 border-t border-slate-800 flex items-center gap-2">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Nhập lệnh hoặc câu hỏi cho Bot..."
          className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition"
        />
        <button
          type="submit"
          disabled={!inputText.trim()}
          className="p-2 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 text-white disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-md hover:shadow-cyan-500/25 transition shrink-0"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
