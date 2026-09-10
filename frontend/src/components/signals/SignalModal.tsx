import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { TradingSignalConfig, SignalCondition, Timeframe, TradingSymbol } from '../../types';
import { X, Plus, Trash2, CheckCircle2, Sliders, Zap, ArrowUpRight, ArrowDownRight, Layers, HelpCircle } from 'lucide-react';

interface SignalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (signalData: Partial<TradingSignalConfig>) => Promise<void>;
  editingSignal: TradingSignalConfig | null;
}

export const SignalModal: React.FC<SignalModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingSignal
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

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [action, setAction] = useState<'BUY' | 'SELL'>('BUY');
  const [symbol, setSymbol] = useState<TradingSymbol | 'ALL'>('XAUUSD');
  const [timeframe, setTimeframe] = useState<Timeframe>('M1');
  const [logicOperator, setLogicOperator] = useState<'AND' | 'OR'>('AND');
  const [conditions, setConditions] = useState<SignalCondition[]>([]);
  const [lot, setLot] = useState<number>(0.05);
  const [slPips, setSlPips] = useState<number>(30);
  const [tpPips, setTpPips] = useState<number>(60);
  const [trailingStopPips, setTrailingStopPips] = useState<number>(15);
  const [maxOpenPositions, setMaxOpenPositions] = useState<number>(1);
  const [cooldownSeconds, setCooldownSeconds] = useState<number>(60);
  const [isActive, setIsActive] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    if (editingSignal) {
      setName(editingSignal.name);
      setDescription(editingSignal.description || '');
      setAction(editingSignal.action);
      setSymbol(editingSignal.symbol);
      setTimeframe(editingSignal.timeframe);
      setLogicOperator(editingSignal.logicOperator);
      setConditions(JSON.parse(JSON.stringify(editingSignal.conditions || [])));
      setLot(editingSignal.lot || 0.05);
      setSlPips(editingSignal.slPips || 30);
      setTpPips(editingSignal.tpPips || 60);
      setTrailingStopPips(editingSignal.trailingStopPips || 15);
      setMaxOpenPositions(editingSignal.maxOpenPositions || 1);
      setCooldownSeconds(editingSignal.cooldownSeconds || 60);
      setIsActive(editingSignal.isActive !== false);
    } else {
      setName('');
      setDescription('');
      setAction('BUY');
      setSymbol('XAUUSD');
      setTimeframe('M1');
      setLogicOperator('AND');
      setConditions([
        {
          indicatorType: 'RSI',
          operator: '<',
          value: 30,
          description: 'RSI(14) < 30 (Vùng Quá Bán)'
        }
      ]);
      setLot(0.05);
      setSlPips(30);
      setTpPips(60);
      setTrailingStopPips(15);
      setMaxOpenPositions(1);
      setCooldownSeconds(60);
      setIsActive(true);
    }
  }, [isOpen, editingSignal]);

  if (!isOpen) return null;

  const handleAddCondition = () => {
    setConditions(prev => [
      ...prev,
      {
        indicatorType: 'BOLLINGER',
        operator: action === 'BUY' ? 'TOUCH_LOWER' : 'TOUCH_UPPER',
        value: action === 'BUY' ? 'Lower Band' : 'Upper Band',
        description: action === 'BUY' ? 'Chạm dải Bollinger dưới' : 'Chạm dải Bollinger trên'
      }
    ]);
  };

  const handleRemoveCondition = (index: number) => {
    if (conditions.length <= 1) {
      alert('Tín hiệu phải có ít nhất 1 điều kiện chỉ báo.');
      return;
    }
    setConditions(prev => prev.filter((_, i) => i !== index));
  };

  const handleConditionChange = (index: number, field: keyof SignalCondition, value: any) => {
    setConditions(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };

      // Auto update default operator if indicatorType changes
      if (field === 'indicatorType') {
        switch (value) {
          case 'RSI':
            copy[index].operator = action === 'BUY' ? '<' : '>';
            copy[index].value = action === 'BUY' ? 30 : 70;
            copy[index].description = action === 'BUY' ? 'RSI(14) < 30 (Quá Bán)' : 'RSI(14) > 70 (Quá Mua)';
            break;
          case 'EMA_CROSS':
            copy[index].operator = action === 'BUY' ? 'CROSS_ABOVE' : 'CROSS_BELOW';
            copy[index].value = action === 'BUY' ? 'EMA20 > EMA50' : 'EMA20 < EMA50';
            copy[index].description = action === 'BUY' ? 'EMA 20 cắt lên EMA 50' : 'EMA 20 cắt xuống EMA 50';
            break;
          case 'BOLLINGER':
            copy[index].operator = action === 'BUY' ? 'TOUCH_LOWER' : 'TOUCH_UPPER';
            copy[index].value = action === 'BUY' ? 'Lower Band' : 'Upper Band';
            copy[index].description = action === 'BUY' ? 'Giá chạm dải dưới' : 'Giá chạm dải trên';
            break;
          case 'DYNAMIC_SWING':
            copy[index].operator = action === 'BUY' ? 'SWING_LOW' : 'SWING_HIGH';
            copy[index].value = action === 'BUY' ? 'Confirmed Trough' : 'Confirmed Peak';
            copy[index].description = action === 'BUY' ? 'Xác nhận tạo Đáy sóng' : 'Xác nhận tạo Đỉnh sóng';
            break;
          case 'MACD':
            copy[index].operator = action === 'BUY' ? 'HISTOGRAM_POSITIVE' : 'HISTOGRAM_NEGATIVE';
            copy[index].value = action === 'BUY' ? 'MACD > Signal' : 'MACD < Signal';
            copy[index].description = action === 'BUY' ? 'Histogram MACD dương' : 'Histogram MACD âm';
            break;
        }
      }

      return copy;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Vui lòng nhập tên chiến lược tín hiệu!');
      return;
    }

    if (conditions.length === 0) {
      alert('Vui lòng thiết lập ít nhất 1 chỉ báo điều kiện!');
      return;
    }

    setIsSaving(true);
    try {
      await onSave({
        id: editingSignal?.id,
        name: name.trim(),
        description: description.trim(),
        action,
        symbol,
        timeframe,
        logicOperator,
        conditions,
        lot,
        slPips,
        tpPips,
        trailingStopPips,
        maxOpenPositions,
        cooldownSeconds,
        isActive
      });
      onClose();
    } catch (err: any) {
      alert('Lỗi khi lưu tín hiệu: ' + (err?.message || err));
    } finally {
      setIsSaving(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] w-screen h-screen bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-fadeIn">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/90 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl border ${
              action === 'BUY' 
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25' 
                : 'bg-rose-500/10 text-rose-400 border-rose-500/25'
            }`}>
              {action === 'BUY' ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                {editingSignal ? 'Chỉnh Sửa Tín Hiệu Giao Dịch' : 'Tạo Chiến Lược Tín Hiệu Mới'}
              </h2>
              <p className="text-xs text-slate-400">
                Định nghĩa điều kiện 1 chỉ báo hoặc kết hợp đa chỉ báo để Bot tự động khớp lệnh
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

        {/* Form Body - Scrollable */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Signal Name & Action Type */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Tên chiến lược tín hiệu <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="VD: Bắt Đáy Đảo Chiều (RSI + Bollinger Bands)"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-cyan-500 transition"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Hành động lệnh (Action) <span className="text-rose-400">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setAction('BUY')}
                  className={`py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 ${
                    action === 'BUY'
                      ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25'
                      : 'bg-slate-950 text-slate-400 border border-slate-800 hover:bg-slate-800'
                  }`}
                >
                  <ArrowUpRight className="w-4 h-4" />
                  <span>MUA</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAction('SELL')}
                  className={`py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 ${
                    action === 'SELL'
                      ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/25'
                      : 'bg-slate-950 text-slate-400 border border-slate-800 hover:bg-slate-800'
                  }`}
                >
                  <ArrowDownRight className="w-4 h-4" />
                  <span>BÁN</span>
                </button>
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">
              Mô tả chiến lược & kịch bản thị trường
            </label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="VD: Kết hợp RSI vùng quá bán với nến bật tăng tại dải dưới Bollinger Bands..."
              className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-500 transition"
            />
          </div>

          {/* Market & Timeframe */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Cặp tiền áp dụng
              </label>
              <select
                value={symbol}
                onChange={e => setSymbol(e.target.value as any)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-500 transition"
              >
                <option value="XAUUSD">XAUUSD (Vàng Đô La)</option>
                <option value="EURUSD">EURUSD (Euro Đô La)</option>
                <option value="GBPUSD">GBPUSD (Bảng Anh Đô La)</option>
                <option value="USDJPY">USDJPY (Đô La Yên Nhật)</option>
                <option value="BTCUSD">BTCUSD (Bitcoin Đô La)</option>
                <option value="ALL">Tất Cả Cặp Tiền Đang Chọn (ALL)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Khung nến quét (Timeframe)
              </label>
              <select
                value={timeframe}
                onChange={e => setTimeframe(e.target.value as Timeframe)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-500 transition"
              >
                <option value="M1">M1 (1 Phút - Siêu nhanh)</option>
                <option value="M5">M5 (5 Phút - Tiêu chuẩn)</option>
                <option value="M15">M15 (15 Phút - Xu hướng ngắn)</option>
                <option value="M30">M30 (30 Phút)</option>
                <option value="H1">H1 (1 Giờ - Xu hướng trung)</option>
                <option value="H4">H4 (4 Giờ)</option>
                <option value="D1">D1 (1 Ngày)</option>
              </select>
            </div>
          </div>

          {/* COMBINATION LOGIC & CONDITIONS BUILDER */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-white">
                    Tổ Hợp Chỉ Báo Quyết Định Tín Hiệu ({conditions.length} chỉ báo)
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Chọn phương thức kết hợp và định nghĩa các điều kiện chỉ báo
                </p>
              </div>

              {/* Combination Logic Selector */}
              <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-900 border border-slate-800">
                <button
                  type="button"
                  onClick={() => setLogicOperator('AND')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                    logicOperator === 'AND'
                      ? 'bg-cyan-500 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Tất cả các chỉ báo bên dưới đều phải thỏa mãn cùng một lúc"
                >
                  AND (Đồng Thuận Cả {conditions.length})
                </button>
                <button
                  type="button"
                  onClick={() => setLogicOperator('OR')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                    logicOperator === 'OR'
                      ? 'bg-amber-500 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title="Chỉ cần một trong các chỉ báo bên dưới thỏa mãn"
                >
                  OR (Chỉ Cần 1 Chỉ Báo)
                </button>
              </div>
            </div>

            {/* List of Indicator Conditions */}
            <div className="space-y-3">
              {conditions.map((cond, idx) => (
                <div key={idx} className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <span className="w-6 h-6 rounded-full bg-slate-800 border border-slate-700 text-cyan-300 text-xs font-bold flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>

                    {/* Indicator Selector */}
                    <select
                      value={cond.indicatorType}
                      onChange={e => handleConditionChange(idx, 'indicatorType', e.target.value)}
                      className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs font-semibold text-white focus:outline-none"
                    >
                      <option value="RSI">RSI (Relative Strength Index)</option>
                      <option value="EMA_CROSS">EMA Cross (Giao cắt 20/50)</option>
                      <option value="BOLLINGER">Bollinger Bands (Dải 20, 2.0)</option>
                      <option value="DYNAMIC_SWING">Dynamic Swings (Sóng Đỉnh/Đáy)</option>
                      <option value="MACD">MACD (Hội tụ / Phân kỳ)</option>
                    </select>
                  </div>

                  {/* Operator & Value */}
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2 w-full sm:w-auto">
                    {cond.indicatorType === 'RSI' && (
                      <>
                        <select
                          value={cond.operator}
                          onChange={e => handleConditionChange(idx, 'operator', e.target.value)}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-slate-200"
                        >
                          <option value="<">&lt; (Nhỏ hơn / Quá bán)</option>
                          <option value=">">&gt; (Lớn hơn / Quá mua)</option>
                        </select>
                        <input
                          type="number"
                          value={cond.value || 30}
                          onChange={e => handleConditionChange(idx, 'value', Number(e.target.value))}
                          placeholder="Ngưỡng (VD: 30 hoặc 70)"
                          className="px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs font-mono text-cyan-300"
                        />
                      </>
                    )}

                    {cond.indicatorType === 'EMA_CROSS' && (
                      <>
                        <select
                          value={cond.operator}
                          onChange={e => handleConditionChange(idx, 'operator', e.target.value)}
                          className="col-span-2 px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-slate-200"
                        >
                          <option value="CROSS_ABOVE">CROSS_ABOVE: EMA 20 vừa cắt lên trên EMA 50 (Golden Cross)</option>
                          <option value="CROSS_BELOW">CROSS_BELOW: EMA 20 vừa cắt xuống dưới EMA 50 (Death Cross)</option>
                          <option value="FAST_ABOVE_SLOW">TREND: EMA 20 đang nằm trên EMA 50 (Xu hướng tăng)</option>
                          <option value="FAST_BELOW_SLOW">TREND: EMA 20 đang nằm dưới EMA 50 (Xu hướng giảm)</option>
                        </select>
                      </>
                    )}

                    {cond.indicatorType === 'BOLLINGER' && (
                      <>
                        <select
                          value={cond.operator}
                          onChange={e => handleConditionChange(idx, 'operator', e.target.value)}
                          className="col-span-2 px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-slate-200"
                        >
                          <option value="TOUCH_LOWER">TOUCH_LOWER: Giá chạm dải dưới Bollinger Band</option>
                          <option value="TOUCH_UPPER">TOUCH_UPPER: Giá chạm dải trên Bollinger Band</option>
                        </select>
                      </>
                    )}

                    {cond.indicatorType === 'DYNAMIC_SWING' && (
                      <>
                        <select
                          value={cond.operator}
                          onChange={e => handleConditionChange(idx, 'operator', e.target.value)}
                          className="col-span-2 px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-slate-200"
                        >
                          <option value="SWING_LOW">SWING_LOW: Xác nhận tạo Đáy sóng giảm hoàn tất</option>
                          <option value="SWING_HIGH">SWING_HIGH: Xác nhận tạo Đỉnh sóng tăng hoàn tất</option>
                        </select>
                      </>
                    )}

                    {cond.indicatorType === 'MACD' && (
                      <>
                        <select
                          value={cond.operator}
                          onChange={e => handleConditionChange(idx, 'operator', e.target.value)}
                          className="col-span-2 px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-slate-200"
                        >
                          <option value="HISTOGRAM_POSITIVE">HISTOGRAM_POSITIVE: Histogram chuyển giá trị dương</option>
                          <option value="HISTOGRAM_NEGATIVE">HISTOGRAM_NEGATIVE: Histogram chuyển giá trị âm</option>
                          <option value="CROSS_ABOVE">CROSS_ABOVE: MACD cắt lên Signal Line</option>
                          <option value="CROSS_BELOW">CROSS_BELOW: MACD cắt xuống Signal Line</option>
                        </select>
                      </>
                    )}
                  </div>

                  {/* Remove Button */}
                  {conditions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveCondition(idx)}
                      className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/20 transition self-end sm:self-center"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Add Condition Button */}
            <button
              type="button"
              onClick={handleAddCondition}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-cyan-300 bg-cyan-950/40 hover:bg-cyan-900/50 border border-cyan-800/40 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm Chỉ Báo Điều Kiện Kết Hợp</span>
            </button>
          </div>

          {/* TRADE EXECUTION PARAMETERS */}
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300 block mb-3">
              Cấu Hình Vào Lệnh Khi Kích Hoạt Tín Hiệu:
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Khối lượng (Lot):</label>
                <input
                  type="number"
                  step="0.01"
                  value={lot}
                  onChange={e => setLot(Number(e.target.value))}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-cyan-300 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Cắt lỗ (SL Pips):</label>
                <input
                  type="number"
                  value={slPips}
                  onChange={e => setSlPips(Number(e.target.value))}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-rose-300 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Chốt lời (TP Pips):</label>
                <input
                  type="number"
                  value={tpPips}
                  onChange={e => setTpPips(Number(e.target.value))}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-emerald-300 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Trailing Stop (Pips):</label>
                <input
                  type="number"
                  value={trailingStopPips}
                  onChange={e => setTrailingStopPips(Number(e.target.value))}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-amber-300 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-3">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Hồi chiêu giữa 2 lần khớp (Giây):</label>
                <input
                  type="number"
                  value={cooldownSeconds}
                  onChange={e => setCooldownSeconds(Number(e.target.value))}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Lệnh mở tối đa cùng lúc:</label>
                <input
                  type="number"
                  value={maxOpenPositions}
                  onChange={e => setMaxOpenPositions(Number(e.target.value))}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-slate-300 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-lg shadow-cyan-500/20 transition disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSaving ? 'Đang lưu...' : 'Lưu Tín Hiệu Cho Bot'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
