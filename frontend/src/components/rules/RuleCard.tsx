import React from 'react';
import { AutomationRule } from '../../types';
import { Play, Pause, Edit3, Trash2, TrendingUp, TrendingDown, Target, Shield, Zap, CheckCircle2 } from 'lucide-react';

interface RuleCardProps {
  rule: AutomationRule;
  onToggle: (id: string, active: boolean) => void;
  onEdit: (rule: AutomationRule) => void;
  onDelete: (id: string) => void;
}

export const RuleCard: React.FC<RuleCardProps> = ({ rule, onToggle, onEdit, onDelete }) => {
  const winRate = rule.totalTrades > 0 ? ((rule.winTrades / rule.totalTrades) * 100).toFixed(0) : '0';
  const isProfit = rule.totalProfit >= 0;

  const getConditionText = () => {
    switch (rule.indicator) {
      case 'RSI':
        return `RSI(14) ${rule.condition.operator} ${rule.condition.value || 30}`;
      case 'EMA_CROSS':
        return rule.condition.operator === 'CROSS_ABOVE'
          ? 'EMA 20 cắt lên trên EMA 50'
          : 'EMA 20 cắt xuống dưới EMA 50';
      case 'BOLLINGER':
        return rule.condition.operator === 'TOUCH_LOWER'
          ? 'Giá chạm dải Bollinger Dưới'
          : 'Giá chạm dải Bollinger Trên';
      case 'DYNAMIC_SWING':
        return rule.condition.operator === 'SWING_LOW'
          ? '⚡ Xác nhận ĐÁY nhịp -> MUA'
          : '⚡ Xác nhận ĐỈNH nhịp -> BÁN';
      case 'WEBHOOK':
        return 'Tín hiệu Webhook từ TradingView';
      default:
        return 'Theo tín hiệu kỹ thuật';
    }
  };

  return (
    <div
      className={`glass-panel rounded-2xl p-4 border transition-all shadow-lg flex flex-col justify-between ${
        rule.isActive
          ? 'border-cyan-500/30 bg-slate-900/80 hover:border-cyan-500/50 shadow-cyan-500/5'
          : 'border-slate-800 bg-slate-900/40 opacity-75'
      }`}
    >
      <div>
        {/* Top Header: Symbol, Timeframe, Active Switch */}
        <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-800/80">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-extrabold text-white bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-700">
              {rule.symbol}
            </span>
            <span className="text-[11px] font-bold text-slate-400 font-mono bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
              {rule.timeframe}
            </span>
            <span
              className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[11px] font-bold ${
                rule.action === 'BUY'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
              }`}
            >
              {rule.action === 'BUY' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {rule.action}
            </span>
          </div>

          {/* Switch Active Toggle */}
          <button
            onClick={() => onToggle(rule.id, !rule.isActive)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition ${
              rule.isActive
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700'
            }`}
          >
            {rule.isActive ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>Đang BẬT</span>
              </>
            ) : (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                <span>Đang TẮT</span>
              </>
            )}
          </button>
        </div>

        {/* Rule Title & Condition */}
        <div className="mt-3">
          <h4 className="text-sm font-bold text-slate-100 line-clamp-1">{rule.name}</h4>
          <div className="mt-2 flex items-center gap-1.5 text-xs">
            <span className="text-slate-400">Điều kiện:</span>
            <span className="font-semibold text-cyan-300 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-500/20">
              {getConditionText()}
            </span>
          </div>
        </div>

        {/* Parameters Grid */}
        <div className="mt-3.5 grid grid-cols-3 gap-2 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80 text-[11px] font-mono">
          <div>
            <span className="text-slate-500 block leading-tight text-[10px]">Khối lượng</span>
            <span className="font-bold text-slate-200">{rule.lot} Lot</span>
          </div>
          <div>
            <span className="text-slate-500 block leading-tight text-[10px]">Cắt lỗ (SL)</span>
            <span className="font-semibold text-rose-400">{rule.slPips} pips</span>
          </div>
          <div>
            <span className="text-slate-500 block leading-tight text-[10px]">Chốt lời (TP)</span>
            <span className="font-semibold text-emerald-400">{rule.tpPips} pips</span>
          </div>
        </div>

        {/* Stats Row */}
        <div className="mt-3 flex items-center justify-between text-xs py-2 px-1 border-t border-slate-800/60">
          <div className="flex items-center gap-3 text-slate-400 text-[11px]">
            <span>Lệnh: <strong className="text-slate-200">{rule.totalTrades}</strong></span>
            <span>Thắng: <strong className="text-emerald-400">{winRate}%</strong></span>
          </div>
          <div className="font-mono text-xs font-bold">
            <span className="text-slate-400 text-[10px] mr-1">Lợi nhuận:</span>
            <span className={isProfit ? 'text-emerald-400' : 'text-rose-400'}>
              {isProfit ? '+' : ''}${rule.totalProfit.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-end gap-2">
        <button
          onClick={() => onEdit(rule)}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
        >
          <Edit3 className="w-3.5 h-3.5" />
          <span>Sửa</span>
        </button>
        <button
          onClick={() => onDelete(rule.id)}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 transition"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Xoá</span>
        </button>
      </div>
    </div>
  );
};
