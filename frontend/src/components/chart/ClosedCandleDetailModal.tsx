import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ClosedCandleAnalysis } from '../../utils/candleClassifier';
import { X, ArrowUpRight, ArrowDownRight, Minus, Sparkles, Activity, ShieldCheck, HelpCircle } from 'lucide-react';

interface ClosedCandleDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  analysis: ClosedCandleAnalysis | null;
}

export const ClosedCandleDetailModal: React.FC<ClosedCandleDetailModalProps> = ({
  isOpen,
  onClose,
  analysis
}) => {
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  if (!isOpen || !analysis) return null;

  const { metrics } = analysis;
  const isBullish = metrics.direction === 'BULLISH';
  const isBearish = metrics.direction === 'BEARISH';
  const isDoji = metrics.direction === 'DOJI';

  const candleColor = isBullish ? '#10b981' : isBearish ? '#f43f5e' : '#f59e0b';
  const candleFill = isBullish ? '#10b981' : isBearish ? '#f43f5e' : '#f59e0b';

  return createPortal(
    <div className="fixed inset-0 z-[100] w-screen h-screen bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-fadeIn">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/90 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl border ${
              isBullish ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
              isBearish ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' :
              'bg-amber-500/10 text-amber-400 border-amber-500/30'
            }`}>
              {isBullish ? <ArrowUpRight className="w-5 h-5" /> : isBearish ? <ArrowDownRight className="w-5 h-5" /> : <Minus className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">
                  Phân Tích Cấu Trúc Nến Đóng ({analysis.timeframe})
                </h2>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-cyan-300 border border-slate-700">
                  {analysis.symbol}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Đóng nến lúc {analysis.closeTimeFormatted} • Khung {analysis.timeframe}
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

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Main Pattern Name Banner */}
          <div className={`p-4 rounded-2xl border flex items-center justify-between gap-4 ${
            isBullish ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300' :
            isBearish ? 'bg-rose-950/30 border-rose-500/40 text-rose-300' :
            'bg-amber-950/30 border-amber-500/40 text-amber-300'
          }`}>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider opacity-80 block mb-0.5">
                Mô Hình Nến Định Danh:
              </span>
              <h3 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                <span>{analysis.patternName}</span>
                <Sparkles className="w-4 h-4 text-amber-400" />
              </h3>
              <p className="text-xs mt-1.5 leading-relaxed text-slate-200">
                {analysis.sentiment}
              </p>
            </div>

            <div className="flex flex-col items-end shrink-0">
              <span className={`text-[11px] font-extrabold px-2.5 py-1 rounded-lg border uppercase tracking-wider ${
                analysis.priceActionSignal === 'CANH_MUA' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' :
                analysis.priceActionSignal === 'CANH_BAN' ? 'bg-rose-500/20 text-rose-400 border-rose-500/40' :
                'bg-slate-800 text-slate-300 border-slate-700'
              }`}>
                {analysis.priceActionSignal === 'CANH_MUA' ? '🟢 CANH MUA (BUY)' :
                 analysis.priceActionSignal === 'CANH_BAN' ? '🔴 CANH BÁN (SELL)' :
                 '🟡 THEO DÕI'}
              </span>
              <span className="text-[10px] text-slate-400 mt-1">
                Độ tin cậy: {analysis.confidence === 'HIGH' ? 'Cao' : analysis.confidence === 'MEDIUM' ? 'Khá' : 'Vừa phải'}
              </span>
            </div>
          </div>

          {/* Visual SVG Candle Representation */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-around gap-4">
            {/* Candle Graphic */}
            <div className="flex flex-col items-center justify-center p-3 bg-slate-900/60 rounded-xl border border-slate-800/80 w-36 h-48">
              <svg width="60" height="150" viewBox="0 0 60 150">
                {/* Upper Wick */}
                <line
                  x1="30"
                  y1={Math.max(5, 5 + (140 * (1 - metrics.upperWickPercent / 100)) - (140 * (metrics.bodyPercent / 100)))}
                  x2="30"
                  y2="5"
                  stroke={candleColor}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />

                {/* Candle Body */}
                <rect
                  x="15"
                  y={5 + (140 * (metrics.upperWickPercent / 100))}
                  width="30"
                  height={Math.max(3, 140 * (metrics.bodyPercent / 100))}
                  fill={candleFill}
                  stroke={candleColor}
                  strokeWidth="1.5"
                  rx="2"
                />

                {/* Lower Wick */}
                <line
                  x1="30"
                  y1={5 + (140 * (metrics.upperWickPercent / 100)) + Math.max(3, 140 * (metrics.bodyPercent / 100))}
                  x2="30"
                  y2="145"
                  stroke={candleColor}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              </svg>
              <span className="text-[10px] font-mono text-slate-400 mt-1">
                {metrics.direction === 'BULLISH' ? 'Nến Tăng' : metrics.direction === 'BEARISH' ? 'Nến Giảm' : 'Doji'}
              </span>
            </div>

            {/* Proportion Bars */}
            <div className="flex-1 space-y-3 text-xs">
              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-slate-400">Râu trên (Upper Wick):</span>
                  <span className="font-mono font-bold text-slate-200">
                    {metrics.upperWickPips} pips ({metrics.upperWickPercent}%)
                  </span>
                </div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-sky-400 rounded-full" style={{ width: `${Math.min(100, metrics.upperWickPercent)}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-slate-400">Thân nến (Body Size):</span>
                  <span className={`font-mono font-bold ${isBullish ? 'text-emerald-400' : isBearish ? 'text-rose-400' : 'text-amber-400'}`}>
                    {metrics.bodyPips} pips ({metrics.bodyPercent}%)
                  </span>
                </div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${isBullish ? 'bg-emerald-500' : isBearish ? 'bg-rose-500' : 'bg-amber-500'}`} style={{ width: `${Math.min(100, metrics.bodyPercent)}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-slate-400">Râu dưới (Lower Wick):</span>
                  <span className="font-mono font-bold text-slate-200">
                    {metrics.lowerWickPips} pips ({metrics.lowerWickPercent}%)
                  </span>
                </div>
                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-purple-400 rounded-full" style={{ width: `${Math.min(100, metrics.lowerWickPercent)}%` }} />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800 flex justify-between text-[11px]">
                <span className="text-slate-400">Tổng biên độ (High - Low):</span>
                <span className="font-mono font-bold text-cyan-300">
                  {metrics.rangePips} pips
                </span>
              </div>
            </div>
          </div>

          {/* 4 OHLV Price Points Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs font-mono">
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-[10px] text-slate-500 block mb-0.5">Mở Cửa (Open):</span>
              <strong className="text-slate-200 text-sm">{metrics.open.toFixed(2)}</strong>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-[10px] text-slate-500 block mb-0.5">Đỉnh Cao Nhất (High):</span>
              <strong className="text-emerald-400 text-sm">{metrics.high.toFixed(2)}</strong>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-[10px] text-slate-500 block mb-0.5">Đáy Thấp Nhất (Low):</span>
              <strong className="text-rose-400 text-sm">{metrics.low.toFixed(2)}</strong>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-[10px] text-slate-500 block mb-0.5">Đóng Cửa (Close):</span>
              <strong className={`text-sm ${isBullish ? 'text-emerald-400' : isBearish ? 'text-rose-400' : 'text-amber-400'}`}>
                {metrics.close.toFixed(2)}
              </strong>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-3 border-t border-slate-800 bg-slate-950/80">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-slate-800 hover:bg-slate-700 transition"
          >
            Đóng Cửa Sổ
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
