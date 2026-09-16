import React, { useState } from 'react';
import { X, Check, Copy, ExternalLink, Radio, Zap, ShieldCheck, HelpCircle } from 'lucide-react';

interface MT5ConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  isMT5Connected: boolean;
  secondsSinceLastTick?: number;
}

export const MT5ConnectModal: React.FC<MT5ConnectModalProps> = ({
  isOpen,
  onClose,
  isMT5Connected,
  secondsSinceLastTick
}) => {
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedPath, setCopiedPath] = useState(false);

  if (!isOpen) return null;

  const serverUrl = window.location.port === '5173'
    ? `${window.location.protocol}//${window.location.hostname}:3001`
    : window.location.origin;

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(serverUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const handleCopyPath = () => {
    navigator.clipboard.writeText('scripts/mt5/ForexPro_MT5_Bridge.mq5');
    setCopiedPath(true);
    setTimeout(() => setCopiedPath(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Kết Nối Biểu Đồ Thật MT5 Exness (0đ)
              </h2>
              <p className="text-xs text-slate-400">
                Đồng bộ nến & tick trực tiếp từ phần mềm MetaTrader 5 về Web App
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Status Banner */}
        <div className={`px-6 py-3 border-b flex items-center justify-between text-xs ${
          isMT5Connected
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
            : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
        }`}>
          <div className="flex items-center gap-2 font-medium">
            <span className="relative flex h-2.5 w-2.5">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                isMT5Connected ? 'bg-emerald-400' : 'bg-amber-400'
              }`} />
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                isMT5Connected ? 'bg-emerald-500' : 'bg-amber-500'
              }`} />
            </span>
            {isMT5Connected
              ? 'MT5 Live Feed: Đang nhận dữ liệu trực tiếp từ Exness MT5!'
              : 'Trạng thái: Chưa nhận được tick từ EA MT5 (Đang ở chế độ chờ / mô phỏng)'}
          </div>
          {isMT5Connected && secondsSinceLastTick !== undefined && (
            <span className="text-slate-400">Tick cuối: {secondsSinceLastTick}s trước</span>
          )}
        </div>

        {/* Body Steps */}
        <div className="p-6 overflow-y-auto space-y-5 text-sm text-slate-300">
          {/* Step 1 */}
          <div className="bg-slate-800/50 border border-slate-750 p-4 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-white flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 text-xs flex items-center justify-center font-bold">1</span>
                Chép file EA vào thư mục MT5
              </span>
              <button
                onClick={handleCopyPath}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-md transition-colors"
              >
                {copiedPath ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedPath ? 'Đã chép đường dẫn' : 'Chép vị trí file'}</span>
              </button>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              File EA đã được tạo sẵn tại: <code className="text-amber-300 font-mono">scripts/mt5/ForexPro_MT5_Bridge.mq5</code>.
            </p>
            <p className="text-xs text-slate-400 leading-relaxed">
              Trên MT5: Nhấn menu <strong className="text-white">File &rarr; Open Data Folder</strong>, mở thư mục <strong className="text-white">MQL5/Experts/</strong>.
            </p>
            <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-700/60 text-[11px] text-amber-300/90 leading-relaxed">
              🍎 <strong>Lưu ý trên macOS</strong>: Vì MT5 chạy qua Wine, bạn không thể Paste trực tiếp file từ Finder vào cửa sổ MT5.
              Thay vào đó, bạn chỉ cần chạy lệnh trong terminal: <code className="text-cyan-300 font-mono bg-slate-950 px-1 py-0.5 rounded">npm run copy-ea:mac</code> hoặc mở Finder nhấn <code className="text-cyan-300 font-mono">Cmd + Shift + G</code> dán đường dẫn MT5 để kéo thả file vào!
            </div>
          </div>

          {/* Step 2 */}
          <div className="bg-slate-800/50 border border-slate-750 p-4 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-white flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 text-xs flex items-center justify-center font-bold">2</span>
                Bật WebRequest trong MT5
              </span>
              <button
                onClick={handleCopyUrl}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-md transition-colors"
              >
                {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedUrl ? 'Đã chép URL' : 'Chép URL máy chủ'}</span>
              </button>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Trên thanh công cụ MT5: Vào <strong className="text-white">Tools &rarr; Options &rarr; Expert Advisors</strong>.
            </p>
            <ul className="text-xs text-slate-400 list-disc list-inside space-y-1">
              <li>Tích chọn <strong className="text-cyan-300">Allow WebRequest for listed URL</strong></li>
              <li>Nhấn đúp chuột thêm URL sau: <code className="text-emerald-400 font-mono bg-slate-900 px-1.5 py-0.5 rounded">{serverUrl}</code></li>
            </ul>
          </div>

          {/* Step 3 */}
          <div className="bg-slate-800/50 border border-slate-750 p-4 rounded-xl space-y-2">
            <span className="font-semibold text-white flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-cyan-500/20 text-cyan-400 text-xs flex items-center justify-center font-bold">3</span>
              Kéo EA vào biểu đồ MT5
            </span>
            <p className="text-xs text-slate-400 leading-relaxed">
              Mở biểu đồ bất kỳ (ví dụ <strong className="text-white">XAUUSD</strong> hoặc <strong className="text-white">EURUSD</strong>) trên MT5.
              Kéo bot <strong className="text-amber-300">ForexPro_MT5_Bridge</strong> thả vào chart và ấn <strong>OK</strong>.
            </p>
            <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800 text-xs text-emerald-400/90 font-mono">
              &rarr; EA sẽ tự động nạp 300 nến lịch sử và truyền từng tick giá nhảy trực tiếp về biểu đồ trên web!
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <div className="flex items-center text-xs text-slate-400 gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Miễn phí 100% &bull; Chuẩn giá khớp sàn Exness</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-medium text-xs rounded-xl shadow-lg transition-all"
          >
            Đã Hiểu & Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
