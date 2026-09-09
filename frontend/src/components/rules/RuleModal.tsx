import React, { useState, useEffect } from 'react';
import { AutomationRule, TradingSymbol, Timeframe, IndicatorType, OrderType, RuleCondition } from '../../types';
import { X, Sparkles, Check, Sliders, Shield, Zap } from 'lucide-react';

interface RuleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (ruleData: Partial<AutomationRule>) => void;
  initialRule?: AutomationRule | null;
}

export const RuleModal: React.FC<RuleModalProps> = ({ isOpen, onClose, onSave, initialRule }) => {
  const [name, setName] = useState('');
  const [symbol, setSymbol] = useState<TradingSymbol>('XAUUSD');
  const [timeframe, setTimeframe] = useState<Timeframe>('M1');
  const [indicator, setIndicator] = useState<IndicatorType>('RSI');
  const [operator, setOperator] = useState<RuleCondition['operator']>('<');
  const [rsiValue, setRsiValue] = useState<number>(30);
  const [action, setAction] = useState<OrderType>('BUY');
  const [lot, setLot] = useState<number>(0.05);
  const [slPips, setSlPips] = useState<number>(25);
  const [tpPips, setTpPips] = useState<number>(50);
  const [trailingStopPips, setTrailingStopPips] = useState<number>(15);
  const [maxOpenPositions, setMaxOpenPositions] = useState<number>(1);
  const [isActive, setIsActive] = useState<boolean>(true);

  useEffect(() => {
    if (initialRule) {
      setName(initialRule.name);
      setSymbol(initialRule.symbol);
      setTimeframe(initialRule.timeframe);
      setIndicator(initialRule.indicator);
      setOperator(initialRule.condition.operator);
      setRsiValue(initialRule.condition.value || 30);
      setAction(initialRule.action);
      setLot(initialRule.lot);
      setSlPips(initialRule.slPips);
      setTpPips(initialRule.tpPips);
      setTrailingStopPips(initialRule.trailingStopPips);
      setMaxOpenPositions(initialRule.maxOpenPositions);
      setIsActive(initialRule.isActive);
    } else {
      // Defaults
      setName('');
      setSymbol('XAUUSD');
      setTimeframe('M1');
      setIndicator('RSI');
      setOperator('<');
      setRsiValue(30);
      setAction('BUY');
      setLot(0.05);
      setSlPips(25);
      setTpPips(50);
      setTrailingStopPips(15);
      setMaxOpenPositions(1);
      setIsActive(true);
    }
  }, [initialRule, isOpen]);

  if (!isOpen) return null;

  const applyPreset = (type: 'RSI_BUY' | 'RSI_SELL' | 'EMA_CROSS' | 'WEBHOOK' | 'SWING_REVERSAL') => {
    switch (type) {
      case 'RSI_BUY':
        setName('Scalping Vàng RSI Quá Bán M1');
        setSymbol('XAUUSD');
        setTimeframe('M1');
        setIndicator('RSI');
        setOperator('<');
        setRsiValue(30);
        setAction('BUY');
        setLot(0.05);
        setSlPips(25);
        setTpPips(50);
        setTrailingStopPips(15);
        break;
      case 'RSI_SELL':
        setName('RSI Quá Mua Chốt Đỉnh XAUUSD');
        setSymbol('XAUUSD');
        setTimeframe('M1');
        setIndicator('RSI');
        setOperator('>');
        setRsiValue(70);
        setAction('SELL');
        setLot(0.05);
        setSlPips(25);
        setTpPips(50);
        setTrailingStopPips(15);
        break;
      case 'EMA_CROSS':
        setName('Trend Following EURUSD EMA Cross M5');
        setSymbol('EURUSD');
        setTimeframe('M5');
        setIndicator('EMA_CROSS');
        setOperator('CROSS_ABOVE');
        setAction('BUY');
        setLot(0.1);
        setSlPips(20);
        setTpPips(45);
        setTrailingStopPips(10);
        break;
      case 'WEBHOOK':
        setName('Tín Hiệu TradingView PineScript XAUUSD');
        setSymbol('XAUUSD');
        setTimeframe('M5');
        setIndicator('WEBHOOK');
        setOperator('WEBHOOK_SIGNAL');
        setAction('BUY');
        setLot(0.1);
        setSlPips(30);
        setTpPips(60);
        setTrailingStopPips(20);
        break;
      case 'SWING_REVERSAL':
        setName('Bắt Đáy Nhịp Sóng XAUUSD M1');
        setSymbol('XAUUSD');
        setTimeframe('M1');
        setIndicator('DYNAMIC_SWING');
        setOperator('SWING_LOW');
        setAction('BUY');
        setLot(0.05);
        setSlPips(20);
        setTpPips(40);
        setTrailingStopPips(15);
        break;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    let condition: any = { operator };
    if (indicator === 'RSI') {
      condition.value = rsiValue;
      condition.period = 14;
    } else if (indicator === 'EMA_CROSS') {
      condition.fastPeriod = 20;
      condition.slowPeriod = 50;
    }

    onSave({
      name: name.trim(),
      symbol,
      timeframe,
      indicator,
      condition,
      action,
      lot: Number(lot),
      slPips: Number(slPips),
      tpPips: Number(tpPips),
      trailingStopPips: Number(trailingStopPips),
      maxOpenPositions: Number(maxOpenPositions),
      isActive
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {initialRule ? 'Chỉnh Sửa Yêu Cầu Tự Động' : 'Thêm Yêu Cầu Tự Động Mới'}
              </h3>
              <p className="text-xs text-slate-400">Thiết lập chiến lược, chỉ báo và quản lý rủi ro</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Quick Presets */}
          {!initialRule && (
            <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
              <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5 mb-2">
                <Sparkles className="w-3.5 h-3.5" /> Mẫu Chiến Lược Có Sẵn (Gợi Ý)
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                <button
                  type="button"
                  onClick={() => applyPreset('RSI_BUY')}
                  className="px-2 py-1.5 rounded-lg text-[11px] font-medium bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-cyan-300 text-left transition"
                >
                  🟢 RSI Quá Bán (Buy)
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('RSI_SELL')}
                  className="px-2 py-1.5 rounded-lg text-[11px] font-medium bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-rose-300 text-left transition"
                >
                  🔴 RSI Quá Mua (Sell)
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('EMA_CROSS')}
                  className="px-2 py-1.5 rounded-lg text-[11px] font-medium bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-amber-300 text-left transition"
                >
                  📈 EMA 20/50 Cross
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('SWING_REVERSAL')}
                  className="px-2 py-1.5 rounded-lg text-[11px] font-medium bg-cyan-950/60 hover:bg-cyan-900/60 border border-cyan-500/40 text-cyan-300 hover:text-white text-left transition"
                >
                  ⚡ Bắt Đỉnh Đáy Nhịp
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('WEBHOOK')}
                  className="px-2 py-1.5 rounded-lg text-[11px] font-medium bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-purple-300 text-left transition"
                >
                  📡 TradingView Alert
                </button>
              </div>
            </div>
          )}

          {/* Rule Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Tên Yêu Cầu Tự Động *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="VD: Scalping Vàng RSI M1 Quá Bán"
              className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition"
            />
          </div>

          {/* Symbol & Timeframe */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Cặp Giao Dịch (Symbol)</label>
              <select
                value={symbol}
                onChange={(e) => setSymbol(e.target.value as TradingSymbol)}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 transition"
              >
                <option value="XAUUSD">XAU/USD (Vàng)</option>
                <option value="EURUSD">EUR/USD</option>
                <option value="GBPUSD">GBP/USD</option>
                <option value="USDJPY">USD/JPY</option>
                <option value="BTCUSD">BTC/USD</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">Khung Thời Gian (Timeframe)</label>
              <select
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value as Timeframe)}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 transition"
              >
                <option value="M1">M1 (1 Phút - Scalping)</option>
                <option value="M5">M5 (5 Phút)</option>
                <option value="M15">M15 (15 Phút)</option>
                <option value="H1">H1 (1 Giờ - Xu hướng)</option>
              </select>
            </div>
          </div>

          {/* Strategy & Indicators */}
          <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 space-y-3">
            <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider">Cấu Hình Chỉ Báo & Điều Kiện</h4>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Loại Chỉ Báo</label>
                <select
                  value={indicator}
                  onChange={(e) => {
                    const ind = e.target.value as IndicatorType;
                    setIndicator(ind);
                    if (ind === 'RSI') setOperator('<');
                    else if (ind === 'EMA_CROSS') setOperator('CROSS_ABOVE');
                    else if (ind === 'BOLLINGER') setOperator('TOUCH_LOWER');
                    else if (ind === 'DYNAMIC_SWING') setOperator('SWING_LOW');
                    else if (ind === 'WEBHOOK') setOperator('WEBHOOK_SIGNAL');
                  }}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
                >
                  <option value="RSI">RSI (Relative Strength Index)</option>
                  <option value="EMA_CROSS">Giao cắt EMA (20 & 50)</option>
                  <option value="BOLLINGER">Bollinger Bands (20, 2)</option>
                  <option value="DYNAMIC_SWING">⚡ Bắt Đỉnh Đáy Nhịp Sóng (Dynamic Swing)</option>
                  <option value="WEBHOOK">TradingView Webhook Alert</option>
                </select>
              </div>

              {indicator === 'RSI' && (
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Điều Kiện RSI</label>
                  <div className="flex items-center gap-2">
                    <select
                      value={operator}
                      onChange={(e) => setOperator(e.target.value as any)}
                      className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white"
                    >
                      <option value="<">Dưới (&lt;)</option>
                      <option value=">">Vượt (&gt;)</option>
                    </select>
                    <input
                      type="number"
                      value={rsiValue}
                      onChange={(e) => setRsiValue(Number(e.target.value))}
                      className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white font-mono"
                    />
                  </div>
                </div>
              )}

              {indicator === 'EMA_CROSS' && (
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Hướng Giao Cắt</label>
                  <select
                    value={operator}
                    onChange={(e) => setOperator(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
                  >
                    <option value="CROSS_ABOVE">EMA 20 cắt LÊN EMA 50 (Tăng)</option>
                    <option value="CROSS_BELOW">EMA 20 cắt XUỐNG EMA 50 (Giảm)</option>
                  </select>
                </div>
              )}

              {indicator === 'BOLLINGER' && (
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Chạm Dải Bollinger</label>
                  <select
                    value={operator}
                    onChange={(e) => setOperator(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
                  >
                    <option value="TOUCH_LOWER">Chạm Dải Dưới (Bật Tăng)</option>
                    <option value="TOUCH_UPPER">Chạm Dải Trên (Đảo Chiều Giảm)</option>
                  </select>
                </div>
              )}

              {indicator === 'DYNAMIC_SWING' && (
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Tín Hiệu Nhịp Sóng</label>
                  <select
                    value={operator}
                    onChange={(e) => {
                      const op = e.target.value as any;
                      setOperator(op);
                      if (op === 'SWING_LOW') setAction('BUY');
                      else if (op === 'SWING_HIGH') setAction('SELL');
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
                  >
                    <option value="SWING_LOW">Xác nhận ĐÁY nhịp giảm (Vào MUA)</option>
                    <option value="SWING_HIGH">Xác nhận ĐỈNH nhịp tăng (Vào BÁN)</option>
                  </select>
                </div>
              )}

              {indicator === 'WEBHOOK' && (
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Tín Hiệu</label>
                  <span className="text-xs text-purple-300 block py-1.5 font-mono">
                    Lắng nghe Alert từ TradingView
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Action & Risk Management */}
          <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 space-y-3">
            <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider">Hành Động & Quản Lý Rủi Ro</h4>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Hành Động</label>
                <select
                  value={action}
                  onChange={(e) => setAction(e.target.value as OrderType)}
                  className={`w-full font-bold rounded-lg px-3 py-1.5 text-xs ${
                    action === 'BUY'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  }`}
                >
                  <option value="BUY" className="bg-slate-900 text-emerald-400">MUA (BUY)</option>
                  <option value="SELL" className="bg-slate-900 text-rose-400">BÁN (SELL)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Khối Lượng (Lot)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max="10.0"
                  value={lot}
                  onChange={(e) => setLot(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Cắt Lỗ (SL pips)</label>
                <input
                  type="number"
                  value={slPips}
                  onChange={(e) => setSlPips(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Chốt Lời (TP pips)</label>
                <input
                  type="number"
                  value={tpPips}
                  onChange={(e) => setTpPips(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Trailing Stop (pips, 0 = Tắt)</label>
                <input
                  type="number"
                  value={trailingStopPips}
                  onChange={(e) => setTrailingStopPips(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Số Vị Thế Mở Tối Đa</label>
                <input
                  type="number"
                  min="1"
                  max="5"
                  value={maxOpenPositions}
                  onChange={(e) => setMaxOpenPositions(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono"
                />
              </div>
            </div>
          </div>

          {/* Active status */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="isActiveCheck"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 rounded text-cyan-500 bg-slate-900 border-slate-700 focus:ring-cyan-500"
            />
            <label htmlFor="isActiveCheck" className="text-xs text-slate-300 font-medium cursor-pointer">
              Kích hoạt ngay sau khi lưu (Bật tự động quét lệnh)
            </label>
          </div>

          {/* Footer Buttons */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition"
            >
              Huỷ
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-lg shadow-cyan-500/25 transition"
            >
              {initialRule ? 'Lưu Thay Đổi' : 'Tạo Yêu Cầu Tự Động'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
