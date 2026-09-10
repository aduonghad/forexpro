import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Copy, Check, ExternalLink, Zap, HelpCircle } from 'lucide-react';
import { api } from '../../services/api';

interface TradingViewGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TradingViewGuideModal: React.FC<TradingViewGuideModalProps> = ({ isOpen, onClose }) => {
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);
  const [config, setConfig] = useState<{ webhookUrl: string; secret: string; samplePayload: any; instructions: string[] } | null>(null);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      api.getWebhookConfig().then(setConfig).catch(console.error);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const webhookUrl = config?.webhookUrl || `http://${window.location.hostname}:3001/api/webhook/tradingview`;
  const jsonString = config ? JSON.stringify(config.samplePayload, null, 2) : JSON.stringify({
    secret: "exness-pro-secret-2026",
    ticker: "{{ticker}}",
    action: "BUY",
    lot: 0.1,
    sl_pips: 25,
    tp_pips: 50,
    message: "Tín hiệu MUA từ TradingView PineScript"
  }, null, 2);

  const copyToClipboard = (text: string, type: 'URL' | 'JSON') => {
    navigator.clipboard.writeText(text);
    if (type === 'URL') {
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } else {
      setCopiedJson(true);
      setTimeout(() => setCopiedJson(false), 2000);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] w-screen h-screen overflow-y-auto overflow-x-hidden bg-black/85 backdrop-blur-md flex items-start justify-center p-4 sm:p-6 animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] my-auto">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Hướng Dẫn Kết Nối TradingView Webhook</h3>
              <p className="text-xs text-slate-400">Tự động hóa giao dịch Exness theo tín hiệu PineScript Alerts</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">
          {/* Step 1: Webhook URL */}
          <div>
            <label className="text-slate-300 font-semibold block mb-1">
              1. Địa Chỉ Webhook URL (Dán vào mục Webhook URL trên TradingView)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={webhookUrl}
                className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 font-mono text-cyan-400 focus:outline-none"
              />
              <button
                onClick={() => copyToClipboard(webhookUrl, 'URL')}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
                  copiedUrl ? 'bg-emerald-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                }`}
              >
                {copiedUrl ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedUrl ? 'Đã sao chép' : 'Sao chép'}</span>
              </button>
            </div>
          </div>

          {/* Step 2: Message Payload */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-slate-300 font-semibold">
                2. Cấu Trúc Bản Tin (Dán vào ô Message của Alert trên TradingView)
              </label>
              <button
                onClick={() => copyToClipboard(jsonString, 'JSON')}
                className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
              >
                {copiedJson ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                <span>{copiedJson ? 'Đã chép' : 'Sao chép JSON'}</span>
              </button>
            </div>
            <pre className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 font-mono text-slate-300 overflow-x-auto text-[11px] leading-relaxed">
              {jsonString}
            </pre>
          </div>

          {/* Step 3: Instructions */}
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px] block mb-2">
              Các bước thực hiện nhanh trên TradingView:
            </span>
            <ol className="space-y-1.5 list-decimal list-inside text-[11.5px] text-slate-300 leading-relaxed">
              <li>Mở biểu đồ bất kỳ trên TradingView (ví dụ: <strong className="text-white">XAUUSD</strong> hoặc <strong className="text-white">EURUSD</strong>).</li>
              <li>Nhấn tổ hợp phím <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700">Alt + A</kbd> để tạo Cảnh Báo mới.</li>
              <li>Chọn tab <strong className="text-cyan-400">Notifications</strong>, tích bật ô <strong className="text-cyan-400">Webhook URL</strong> và dán URL ở bước 1.</li>
              <li>Chuyển sang tab <strong className="text-cyan-400">Settings</strong>, dán đoạn JSON ở bước 2 vào ô <strong className="text-cyan-400">Message</strong>.</li>
              <li>Nhấn <strong className="text-emerald-400">Create / Lưu</strong>. Khi chỉ báo kích hoạt, lệnh sẽ lập tức được vào trên sàn Exness!</li>
            </ol>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 flex items-center justify-end bg-slate-950/60">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 transition"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
