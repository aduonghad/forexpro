import React, { useState, useEffect } from 'react';
import { TradingSignalConfig, AutomationRule } from '../../types';
import { api } from '../../services/api';
import { Zap, X, Check, ArrowUpRight, ArrowDownRight, Sliders, Shield, AlertTriangle } from 'lucide-react';

interface SignalSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSignal: (ruleData: Partial<AutomationRule>) => void;
  activeCount: number;
  maxLimit: number;
  userPlan: string;
}

export const SignalSelectorModal: React.FC<SignalSelectorModalProps> = ({
  isOpen,
  onClose,
  onSelectSignal,
  activeCount,
  maxLimit,
  userPlan
}) => {
  const [signals, setSignals] = useState<TradingSignalConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSignal, setSelectedSignal] = useState<TradingSignalConfig | null>(null);

  // Custom execution parameters (pre-filled with signal defaults)
  const [lot, setLot] = useState<number>(0.05);
  const [slPips, setSlPips] = useState<number>(30);
  const [tpPips, setTpPips] = useState<number>(60);
  const [trailingStopPips, setTrailingStopPips] = useState<number>(0);

  useEffect(() => {
    if (isOpen) {
      loadSignals();
    }
  }, [isOpen]);

  const loadSignals = async () => {
    setLoading(true);
    try {
      const data = await api.getSignals();
      setSignals(data.filter(s => s.isActive));
      if (data.length > 0) {
        const first = data[0];
        setSelectedSignal(first);
        setLot(first.lot || 0.05);
        setSlPips(first.slPips || 30);
        setTpPips(first.tpPips || 60);
        setTrailingStopPips(first.trailingStopPips || 0);
      }
    } catch (err) {
      console.error('Lỗi tải danh sách tín hiệu Admin:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePickSignal = (sig: TradingSignalConfig) => {
    setSelectedSignal(sig);
    setLot(sig.lot || 0.05);
    setSlPips(sig.slPips || 30);
    setTpPips(sig.tpPips || 60);
    setTrailingStopPips(sig.trailingStopPips || 0);
  };

  const handleConfirm = () => {
    if (!selectedSignal) return;

    const isLimitExceeded = activeCount >= maxLimit;
    const ruleData: Partial<AutomationRule> = {
      signalId: selectedSignal.id,
      name: `[Bot Tín Hiệu] ${selectedSignal.name}`,
      symbol: (selectedSignal.symbol === 'ALL' ? 'XAUUSD' : selectedSignal.symbol) as any,
      timeframe: selectedSignal.timeframe,
      indicator: (selectedSignal.conditions[0]?.indicatorType as any) || 'RSI',
      condition: {
        operator: selectedSignal.conditions[0]?.operator === '<' ? '<' : '>',
        value: Number(selectedSignal.conditions[0]?.value) || 30
      },
      action: selectedSignal.action,
      lot: Number(lot),
      slPips: Number(slPips),
      tpPips: Number(tpPips),
      trailingStopPips: Number(trailingStopPips),
      maxOpenPositions: selectedSignal.maxOpenPositions || 1,
      isActive: !isLimitExceeded
    };

    onSelectSignal(ruleData);
    onClose();
  };

  if (!isOpen) return null;

  const isLimitReached = activeCount >= maxLimit;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Kho Tín Hiệu Admin Cung Cấp
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-semibold border border-cyan-500/30">
                  Gói {userPlan.toUpperCase()} ({activeCount}/{maxLimit === Infinity ? '∞' : maxLimit})
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Chọn một tín hiệu chuẩn từ Admin để tự động tạo bot yêu cầu vào lệnh tức thì
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

        {/* Quota Limit Warning */}
        {isLimitReached && (
          <div className="px-6 py-2.5 bg-amber-500/10 border-b border-amber-500/20 flex items-center gap-2.5 text-xs text-amber-300">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              Tài khoản gói <strong>{userPlan.toUpperCase()}</strong> đã đạt giới hạn ({maxLimit} tín hiệu kích hoạt). Bot mới sẽ được tạo ở trạng thái <strong>Tạm dừng</strong>.
            </span>
          </div>
        )}

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {loading ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              Đang tải danh sách tín hiệu từ hệ thống Admin...
            </div>
          ) : signals.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              Hiện tại Admin chưa công bố tín hiệu nào. Vui lòng quay lại sau!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Left Column: Signal Selection List */}
              <div className="space-y-2.5">
                <label className="text-xs font-semibold text-slate-300">Chọn Tín Hiệu Giao Dịch:</label>
                <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                  {signals.map(sig => {
                    const isSelected = selectedSignal?.id === sig.id;
                    const isBuy = sig.action === 'BUY';
                    return (
                      <div
                        key={sig.id}
                        onClick={() => handlePickSignal(sig)}
                        className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-slate-800/90 border-cyan-500 shadow-md shadow-cyan-500/10'
                            : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center gap-1 text-[11px] font-extrabold px-2 py-0.5 rounded-md ${
                              isBuy ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            }`}>
                              {isBuy ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                              {sig.action}
                            </span>
                            <span className="font-semibold text-xs text-white">{sig.name}</span>
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-cyan-400 shrink-0" />}
                        </div>

                        <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-400">
                          <span className="font-mono text-slate-300 bg-slate-800 px-1.5 py-0.5 rounded">
                            {sig.symbol}
                          </span>
                          <span>•</span>
                          <span className="font-mono text-slate-300 bg-slate-800 px-1.5 py-0.5 rounded">
                            {sig.timeframe}
                          </span>
                          <span>•</span>
                          <span>{sig.conditions.length} điều kiện</span>
                        </div>

                        {sig.description && (
                          <p className="mt-1.5 text-[11px] text-slate-400 line-clamp-2">
                            {sig.description}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Column: Default Execution Rule Configuration */}
              <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 pb-3 border-b border-slate-800/80">
                    <Sliders className="w-4 h-4 text-cyan-400" />
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                      Yêu Cầu Tự Động Vào Lệnh Sẵn Có
                    </h4>
                  </div>

                  {selectedSignal ? (
                    <div className="mt-3 space-y-3 text-xs">
                      <div>
                        <span className="text-slate-400">Tên chiến lược:</span>
                        <div className="text-slate-200 font-semibold mt-0.5">{selectedSignal.name}</div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 pt-2">
                        <div>
                          <label className="text-[11px] text-slate-400 block mb-1">Khối lượng (Lot):</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0.01"
                            max="10"
                            value={lot}
                            onChange={(e) => setLot(parseFloat(e.target.value) || 0.01)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:border-cyan-500 outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] text-slate-400 block mb-1">Số lệnh tối đa:</label>
                          <input
                            type="number"
                            disabled
                            value={selectedSignal.maxOpenPositions || 1}
                            className="w-full bg-slate-900/50 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-400 font-mono"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] text-slate-400 block mb-1">Cắt lỗ (SL pips):</label>
                          <input
                            type="number"
                            step="1"
                            min="5"
                            value={slPips}
                            onChange={(e) => setSlPips(parseInt(e.target.value) || 0)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:border-cyan-500 outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] text-slate-400 block mb-1">Chốt lời (TP pips):</label>
                          <input
                            type="number"
                            step="1"
                            min="5"
                            value={tpPips}
                            onChange={(e) => setTpPips(parseInt(e.target.value) || 0)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:border-cyan-500 outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[11px] text-slate-400 block mb-1">Trailing Stop (pips, 0 = tắt):</label>
                        <input
                          type="number"
                          step="1"
                          min="0"
                          value={trailingStopPips}
                          onChange={(e) => setTrailingStopPips(parseInt(e.target.value) || 0)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono focus:border-cyan-500 outline-none"
                        />
                      </div>

                      <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800/80 text-[11px] text-slate-400 space-y-1">
                        <div className="flex items-center justify-between">
                          <span>Thông báo khi đặt lệnh:</span>
                          <span className="text-emerald-400 font-semibold">Web Chat & Telegram</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Đồng bộ cập nhật:</span>
                          <span className="text-cyan-400 font-semibold">Tự động từ Admin</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="py-8 text-center text-slate-500 text-xs">
                      Vui lòng chọn 1 tín hiệu bên trái
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-800">
                  <button
                    onClick={handleConfirm}
                    disabled={!selectedSignal}
                    className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-amber-500 to-cyan-500 hover:from-amber-400 hover:to-cyan-400 transition shadow-lg shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <Zap className="w-4 h-4" />
                    <span>Kích Hoạt Bot Tự Động Từ Tín Hiệu Này</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
