import React, { useState, useEffect } from 'react';
import { TradingSignalConfig } from '../../types';
import { api } from '../../services/api';
import { SignalModal } from './SignalModal';
import { 
  Zap, 
  ArrowUpRight, 
  ArrowDownRight, 
  Power, 
  Edit2, 
  Trash2, 
  Plus, 
  RotateCcw, 
  Layers, 
  Clock, 
  ShieldCheck, 
  Sliders, 
  CheckCircle2, 
  TrendingUp, 
  TrendingDown,
  AlertCircle
} from 'lucide-react';

export const SignalsManagement: React.FC = () => {
  const [signals, setSignals] = useState<TradingSignalConfig[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingSignal, setEditingSignal] = useState<TradingSignalConfig | null>(null);
  const [actionFilter, setActionFilter] = useState<'ALL' | 'BUY' | 'SELL'>('ALL');

  const loadSignals = async () => {
    setIsLoading(true);
    try {
      const data = await api.getSignals();
      setSignals(data);
    } catch (err) {
      console.error('Lỗi khi tải danh sách tín hiệu:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSignals();
  }, []);

  const handleToggle = async (id: string, active: boolean) => {
    try {
      const updated = await api.updateSignal(id, { isActive: active });
      setSignals(prev => prev.map(s => s.id === id ? updated : s));
    } catch (err: any) {
      alert('Lỗi bật/tắt tín hiệu: ' + (err?.message || err));
    }
  };

  const handleCreate = () => {
    setEditingSignal(null);
    setIsModalOpen(true);
  };

  const handleEdit = (signal: TradingSignalConfig) => {
    setEditingSignal(signal);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xoá chiến lược tín hiệu này không?')) {
      try {
        await api.deleteSignal(id);
        setSignals(prev => prev.filter(s => s.id !== id));
      } catch (err: any) {
        alert('Lỗi xoá tín hiệu: ' + (err?.message || err));
      }
    }
  };

  const handleSave = async (signalData: Partial<TradingSignalConfig>) => {
    if (signalData.id) {
      const updated = await api.updateSignal(signalData.id, signalData);
      setSignals(prev => prev.map(s => s.id === updated.id ? updated : s));
    } else {
      const created = await api.createSignal(signalData);
      setSignals(prev => [created, ...prev]);
    }
  };

  const handleReset = async () => {
    if (window.confirm('Bạn có chắc chắn muốn khôi phục 6 chiến lược tín hiệu chuẩn mặc định không?')) {
      try {
        const fresh = await api.resetSignals();
        setSignals(fresh);
        alert('Đã khôi phục thành công các tín hiệu chuẩn!');
      } catch (err: any) {
        alert('Lỗi khôi phục tín hiệu: ' + (err?.message || err));
      }
    }
  };

  const activeCount = signals.filter(s => s.isActive).length;
  const buyCount = signals.filter(s => s.action === 'BUY').length;
  const sellCount = signals.filter(s => s.action === 'SELL').length;
  const totalTriggers = signals.reduce((acc, s) => acc + (s.totalTriggers || 0), 0);

  const filteredSignals = signals.filter(s => {
    if (actionFilter === 'BUY') return s.action === 'BUY';
    if (actionFilter === 'SELL') return s.action === 'SELL';
    return true;
  });

  const getIndicatorBadge = (type: string) => {
    switch (type) {
      case 'RSI':
        return <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">RSI</span>;
      case 'EMA_CROSS':
        return <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">EMA Cross</span>;
      case 'BOLLINGER':
        return <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">Bollinger</span>;
      case 'DYNAMIC_SWING':
        return <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">Swing</span>;
      case 'MACD':
        return <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">MACD</span>;
      default:
        return <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">{type}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Explanation */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-blue-950/30 border border-blue-500/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/30 shadow-lg shadow-blue-500/10">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white">
                Chiến Lược Tín Hiệu Giao Dịch (Trading Signals & Bot Execution)
              </h2>
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold">
                {activeCount}/{signals.length} Tín Hiệu Đang Bật
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
              Mỗi tín hiệu dựa vào <strong>1 chỉ báo</strong> hoặc <strong>sự kết hợp của 2 hoặc nhiều chỉ báo</strong> (logic AND/OR). 
              Bot giao dịch tự động liên tục quét các tín hiệu đang BẬT ở đây để khớp lệnh MUA hoặc BÁN lên sàn Exness MT5.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-end md:self-auto">
          <button
            onClick={handleReset}
            title="Khôi phục 6 chiến lược tín hiệu chuẩn"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 text-xs font-semibold transition"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Khôi Phục Chuẩn</span>
          </button>

          <button
            onClick={handleCreate}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-md shadow-cyan-500/20 transition whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Tạo Tín Hiệu Mới</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs & Metrics Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800 self-start">
          <button
            onClick={() => setActionFilter('ALL')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
              actionFilter === 'ALL'
                ? 'bg-slate-800 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Tất Cả ({signals.length})
          </button>
          <button
            onClick={() => setActionFilter('BUY')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
              actionFilter === 'BUY'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            <span>Tín Hiệu MUA ({buyCount})</span>
          </button>
          <button
            onClick={() => setActionFilter('SELL')}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 ${
              actionFilter === 'SELL'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
            <span>Tín Hiệu BÁN ({sellCount})</span>
          </button>
        </div>

        <div className="text-xs text-slate-400 flex items-center gap-2">
          <span>Tổng lượt khớp tự động:</span>
          <span className="font-mono font-bold text-cyan-400 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-800/40">
            {totalTriggers} lệnh
          </span>
        </div>
      </div>

      {/* Signals Grid */}
      {isLoading ? (
        <div className="py-16 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2">
          <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          <span>Đang tải danh sách chiến lược tín hiệu...</span>
        </div>
      ) : filteredSignals.length === 0 ? (
        <div className="py-16 text-center text-slate-400 text-xs bg-slate-900/40 rounded-2xl border border-slate-800 flex flex-col items-center justify-center gap-3">
          <AlertCircle className="w-10 h-10 text-amber-400" />
          <p className="text-sm font-semibold text-slate-200">Không có tín hiệu nào phù hợp</p>
          <p className="text-xs text-slate-500">Hãy tạo tín hiệu mới hoặc bấm nút "Khôi Phục Chuẩn"</p>
          <button
            onClick={handleReset}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-500 transition"
          >
            Khôi phục 6 chiến lược tín hiệu chuẩn
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {filteredSignals.map(sig => (
            <div
              key={sig.id}
              className={`flex flex-col justify-between p-5 rounded-2xl border transition-all duration-300 ${
                sig.isActive
                  ? 'bg-slate-900/80 border-slate-800 hover:border-cyan-500/40 shadow-lg shadow-cyan-950/10 hover:shadow-cyan-500/10'
                  : 'bg-slate-950/50 border-slate-900 opacity-65 hover:opacity-100'
              }`}
            >
              <div>
                {/* Header: Title, Action Badge, Logic Badge, Toggle */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <h3 className="font-bold text-slate-100 text-base">
                        {sig.name}
                      </h3>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Action Badge */}
                      {sig.action === 'BUY' ? (
                        <span className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                          <ArrowUpRight className="w-3.5 h-3.5" /> MUA (BUY)
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30">
                          <ArrowDownRight className="w-3.5 h-3.5" /> BÁN (SELL)
                        </span>
                      )}

                      {/* Combination Logic Badge */}
                      {sig.conditions.length > 1 ? (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                          sig.logicOperator === 'AND'
                            ? 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
                            : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                        }`}>
                          {sig.logicOperator === 'AND' ? 'TỔ HỢP ĐỒNG THỜI (AND)' : 'TỔ HỢP HOẶC (OR)'}
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                          1 CHỈ BÁO ĐƠN LẺ
                        </span>
                      )}

                      {/* Symbol & Timeframe */}
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950 text-slate-300 border border-slate-800 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-cyan-400" />
                        {sig.symbol} • {sig.timeframe}
                      </span>
                    </div>
                  </div>

                  {/* Active Toggle */}
                  <button
                    onClick={() => handleToggle(sig.id, !sig.isActive)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                      sig.isActive
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                        : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700'
                    }`}
                  >
                    <Power className="w-3 h-3" />
                    <span>{sig.isActive ? 'BẬT' : 'TẮT'}</span>
                  </button>
                </div>

                {/* Description */}
                {sig.description && (
                  <p className="text-xs text-slate-300 leading-relaxed mb-3">
                    {sig.description}
                  </p>
                )}

                {/* Conditions Breakdown Box */}
                <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-2 mb-3.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Điều Kiện Chỉ Báo Kích Hoạt ({sig.conditions.length} điều kiện):
                  </span>
                  <div className="space-y-1.5">
                    {sig.conditions.map((cond, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs">
                        {idx > 0 && (
                          <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded font-mono ${
                            sig.logicOperator === 'AND' ? 'bg-cyan-500/20 text-cyan-300' : 'bg-amber-500/20 text-amber-300'
                          }`}>
                            {sig.logicOperator}
                          </span>
                        )}
                        <div className="flex items-center gap-2 flex-wrap flex-1 p-1.5 rounded-lg bg-slate-900/90 border border-slate-800/70">
                          {getIndicatorBadge(cond.indicatorType)}
                          <span className="text-slate-200 font-medium">
                            {cond.description || `${cond.operator} ${cond.value || ''}`}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Trade Execution Chips */}
                <div className="pt-3 border-t border-slate-800/80 flex items-center gap-2 flex-wrap text-[11px] font-mono">
                  <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300">
                    Khối lượng: <span className="text-cyan-400 font-bold">{sig.lot} lot</span>
                  </span>
                  <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300">
                    SL: <span className="text-rose-400 font-bold">{sig.slPips} pips</span>
                  </span>
                  <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300">
                    TP: <span className="text-emerald-400 font-bold">{sig.tpPips} pips</span>
                  </span>
                  {sig.trailingStopPips ? (
                    <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-300">
                      Trailing: <span className="text-amber-400 font-bold">{sig.trailingStopPips} pips</span>
                    </span>
                  ) : null}
                  <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-slate-400 ml-auto">
                    Đã khớp: <span className="text-slate-200 font-bold">{sig.totalTriggers || 0} lần</span>
                  </span>
                </div>
              </div>

              {/* Card Actions */}
              <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-slate-800/80">
                <button
                  onClick={() => handleEdit(sig)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 hover:text-white transition"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Sửa</span>
                </button>

                <button
                  onClick={() => handleDelete(sig.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Xoá</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Signal Create/Edit Modal */}
      <SignalModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
        editingSignal={editingSignal}
      />
    </div>
  );
};
