import React from 'react';
import { CandlestickPattern, CandleDefinition } from '../../types';
import { CandleVisual } from './CandleVisual';
import { Edit2, Trash2, Power, Layers, Sparkles } from 'lucide-react';

interface PatternCardProps {
  pattern: CandlestickPattern;
  onToggle: (id: string, active: boolean) => void;
  onEdit: (pattern: CandlestickPattern) => void;
  onDelete: (id: string) => void;
}

export const PatternCard: React.FC<PatternCardProps> = ({
  pattern,
  onToggle,
  onEdit,
  onDelete,
}) => {
  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case 'SINGLE': return 'Nến Đơn (1 nến)';
      case 'DOUBLE': return 'Nến Đôi (2 nến)';
      case 'TRIPLE': return 'Nến Ba (3 nến)';
      case 'MULTI': return 'Đa Nến (4+ nến)';
      default: return cat;
    }
  };


  const formatMetricRule = (rule: any, type: 'body' | 'upper' | 'lower') => {
    if (!rule || rule.mode === 'ANY') return 'Tùy ý';
    const op = rule.operator;
    const val = rule.value;

    switch (rule.mode) {
      case 'SPECIFIC_VALUE':
        return `${op} ${val} pips`;
      case 'RATIO_TO_RANGE':
        return `${op} ${val}% chiều dài nến`;
      case 'RATIO_TO_BODY':
        return `${op} ${val}x thân nến`;
      case 'PERCENT_OF_RANGE':
        return `${op} ${val}% biên độ nến`;
      case 'PERCENT_OF_PREVIOUS_BODY':
        return `${op} ${val}% thân nến trước`;
      case 'PERCENT_OF_PREVIOUS_TOTAL':
        return `${op} ${val}% tổng dài nến trước`;
      case 'PERCENT_OF_PREVIOUS_UPPER':
        return `${op} ${val}% râu trên nến trước`;
      case 'PERCENT_OF_PREVIOUS_LOWER':
        return `${op} ${val}% râu dưới nến trước`;
      default:
        return `${op} ${val}`;
    }
  };

  return (
    <div className={`relative flex flex-col justify-between p-5 rounded-2xl border transition-all duration-300 ${
      pattern.isActive
        ? 'bg-slate-900/80 border-slate-800 hover:border-cyan-500/40 shadow-lg shadow-cyan-950/10 hover:shadow-cyan-500/10'
        : 'bg-slate-950/50 border-slate-900 opacity-65 hover:opacity-100'
    }`}>
      {/* Top Header */}
      <div>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-bold text-slate-100 text-base leading-tight">
                {pattern.name}
              </h3>
              {pattern.isPredefined && (
                <span title="Mẫu chuẩn hệ thống" className="text-amber-400">
                  <Sparkles className="w-3.5 h-3.5" />
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700/60 flex items-center gap-1">
                <Layers className="w-3 h-3 text-cyan-400" />
                {getCategoryLabel(pattern.category)}
              </span>
            </div>
          </div>

          {/* Active Switch Toggle */}
          <button
            onClick={() => onToggle(pattern.id, !pattern.isActive)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold transition-all ${
              pattern.isActive
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700'
            }`}
          >
            <Power className="w-3 h-3" />
            <span>{pattern.isActive ? 'BẬT' : 'TẮT'}</span>
          </button>
        </div>

        {/* Visual Preview Centered */}
        <div className="my-3 flex flex-col items-center">
          <div className="w-full flex items-center justify-center py-4 px-4 rounded-xl bg-slate-950/70 border border-slate-800/80 shadow-inner group-hover:border-cyan-500/30 transition-colors">
            <CandleVisual
              candles={pattern.candles}
              size="md"
              className="border-0 bg-transparent p-0 shadow-none"
            />
          </div>
          {pattern.description && (
            <p className="text-xs text-slate-300 text-center leading-relaxed mt-2.5 px-2 line-clamp-2">
              {pattern.description}
            </p>
          )}
        </div>

        {/* Rules breakdown per candle */}
        <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Điều Kiện Hình Thái Nến:
          </span>
          {pattern.candles.map((c: CandleDefinition, idx: number) => (
            <div key={idx} className="text-xs p-2 rounded-lg bg-slate-950/70 border border-slate-800/60 flex flex-col gap-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-cyan-300">
                  {c.label || `Nến #${c.position}`}
                </span>
                <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${
                  c.direction === 'BULLISH' ? 'text-emerald-400 bg-emerald-500/10' :
                  c.direction === 'BEARISH' ? 'text-rose-400 bg-rose-500/10' :
                  'text-slate-300 bg-slate-800'
                }`}>
                  {c.direction === 'BULLISH' ? 'XANH' : c.direction === 'BEARISH' ? 'ĐỎ' : 'BẤT KỲ'}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-1 text-[10px] text-slate-400 pt-1">
                <div>
                  <span className="text-slate-400 block">Thân:</span>
                  <span className="text-slate-200 font-mono">{formatMetricRule(c.body, 'body')}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Râu trên:</span>
                  <span className="text-slate-200 font-mono">{formatMetricRule(c.upperWick, 'upper')}</span>
                </div>
                <div>
                  <span className="text-slate-400 block">Râu dưới:</span>
                  <span className="text-slate-200 font-mono">{formatMetricRule(c.lowerWick, 'lower')}</span>
                </div>
              </div>
              {c.relative && (c.relative.engulfsPrevious || c.relative.insidePreviousBar || c.relative.higherHigh || c.relative.lowerLow) && (
                <div className="text-[10px] text-amber-300/90 pt-1 border-t border-slate-800/50 flex flex-wrap gap-1.5">
                  {c.relative.engulfsPrevious && <span>• Nhấn chìm nến trước</span>}
                  {c.relative.insidePreviousBar && <span>• Nằm lọt trong nến trước (Harami)</span>}
                  {c.relative.higherHigh && <span>• Đỉnh cao hơn nến trước</span>}
                  {c.relative.lowerLow && <span>• Đáy thấp hơn nến trước</span>}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Card Actions */}
      <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-slate-800/80">
        <button
          onClick={() => onEdit(pattern)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 hover:text-white transition"
        >
          <Edit2 className="w-3.5 h-3.5" />
          <span>Sửa</span>
        </button>

        <button
          onClick={() => onDelete(pattern.id)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Xoá</span>
        </button>
      </div>
    </div>
  );
};
