import React, { useState, useEffect } from 'react';
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
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
            <label className="block font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
              <span>1. Webhook URL (Dán vào mục Webhook URL trên Alert TradingView)</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={webhookUrl}
                className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 font-mono text-cyan-300 text-xs select-all"
              />
              <button
                onClick={() => copyToClipboard(webhookUrl, 'URL')}
                className="px-3.5 py-2 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/30 flex items-center gap-1.5 font-semibold transition"
              >
                {copiedUrl ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedUrl ? 'Đã sao chép' : 'Sao chép'}</span>
              </button>
            </div>
          </div>

          {/* Step 2: Sample JSON Payload */}
          <div>
            <label className="block font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
              <span>2. Nội Dung Cảnh Báo (Dán vào ô Message của Alert)</span>
              <button
                onClick={() => copyToClipboard(jsonString, 'JSON')}
                className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-mono text-[11px]"
              >
                {copiedJson ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedJson ? 'Đã sao chép JSON' : 'Sao chép mẫu'}</span>
              </button>
            </label>
            <pre className="bg-slate-950 border border-slate-800 rounded-xl p-3 font-mono text-amber-300/90 text-[11.5px] overflow-x-auto">
              {jsonString}
            </pre>
          </div>

          {/* Step 3: Instructions Walkthrough */}
          <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 space-y-2 text-slate-300">
            <h4 className="font-bold text-slate-100 flex items-center gap-1.5 mb-2">
              <HelpCircle className="w-4 h-4 text-cyan-400" /> Các Bước Thiết Lập Trên TradingView
            </h4>
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
    </div>
  );
};
