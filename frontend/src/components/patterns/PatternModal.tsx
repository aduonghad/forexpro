import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CandlestickPattern, CandleDefinition, PatternCategory, PatternSignal, CandleDirection, BodySizeMode, WickSizeMode } from '../../types';
import { CandleVisual } from './CandleVisual';
import { X, Plus, Trash2, CheckCircle2, Sliders, Info, Eye } from 'lucide-react';

interface PatternModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (pattern: Partial<CandlestickPattern>) => Promise<void>;
  editingPattern: CandlestickPattern | null;
}

export const PatternModal: React.FC<PatternModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingPattern
}) => {
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

  const [name, setName] = useState('');
  const [category, setCategory] = useState<PatternCategory>('SINGLE');
  const [signal, setSignal] = useState<PatternSignal>('BUY');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [candles, setCandles] = useState<CandleDefinition[]>([]);
  const [activeCandleIndex, setActiveCandleIndex] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  // Initialize or reset state when modal opens
  useEffect(() => {
    if (!isOpen) return;

    if (editingPattern) {
      setName(editingPattern.name);
      setCategory(editingPattern.category);
      setSignal(editingPattern.signal);
      setDescription(editingPattern.description || '');
      setIsActive(editingPattern.isActive);
      setCandles(JSON.parse(JSON.stringify(editingPattern.candles)));
      setActiveCandleIndex(0);
    } else {
      setName('');
      setCategory('SINGLE');
      setSignal('BUY');
      setDescription('');
      setIsActive(true);
      setCandles([
        {
          position: 1,
          label: 'Nến #1',
          direction: 'BULLISH',
          body: { mode: 'RATIO_TO_RANGE', operator: '>=', value: 50 },
          upperWick: { mode: 'RATIO_TO_BODY', operator: '<=', value: 0.5 },
          lowerWick: { mode: 'RATIO_TO_BODY', operator: '>=', value: 1.5 },
        }
      ]);
      setActiveCandleIndex(0);
    }
  }, [isOpen, editingPattern]);

  // Adjust category automatically when candle count changes
  const updateCandleCount = (newCount: number) => {
    const current = [...candles];
    if (newCount > current.length) {
      for (let i = current.length + 1; i <= newCount; i++) {
        current.push({
          position: i,
          label: `Nến #${i}`,
          direction: 'BULLISH',
          body: { mode: 'PERCENT_OF_PREVIOUS_BODY', operator: '>=', value: 100 },
          upperWick: { mode: 'RATIO_TO_BODY', operator: '<=', value: 0.5 },
          lowerWick: { mode: 'RATIO_TO_BODY', operator: '<=', value: 0.5 },
          relative: { higherHigh: true }
        });
      }
    } else if (newCount < current.length) {
      current.splice(newCount);
    }

    setCandles(current);
    if (activeCandleIndex >= newCount) {
      setActiveCandleIndex(Math.max(0, newCount - 1));
    }

    if (newCount === 1) setCategory('SINGLE');
    else if (newCount === 2) setCategory('DOUBLE');
    else if (newCount === 3) setCategory('TRIPLE');
    else setCategory('MULTI');
  };

  const updateCurrentCandle = (field: string, value: any) => {
    setCandles(prev => {
      const updated = [...prev];
      const cur = { ...updated[activeCandleIndex] };
      (cur as any)[field] = value;
      updated[activeCandleIndex] = cur;
      return updated;
    });
  };

  const updateCandleMetric = (
    metricType: 'body' | 'upperWick' | 'lowerWick',
    subField: 'mode' | 'operator' | 'value',
    val: any
  ) => {
    setCandles(prev => {
      const updated = [...prev];
      const cur = { ...updated[activeCandleIndex] };
      cur[metricType] = {
        ...cur[metricType],
        [subField]: subField === 'value' ? parseFloat(val) || 0 : val
      };
      updated[activeCandleIndex] = cur;
      return updated;
    });
  };

  const updateRelativeRule = (ruleKey: string, checked: boolean) => {
    setCandles(prev => {
      const updated = [...prev];
      const cur = { ...updated[activeCandleIndex] };
      cur.relative = {
        ...(cur.relative || {}),
        [ruleKey]: checked
      };
      updated[activeCandleIndex] = cur;
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Vui lòng nhập tên mô hình nến!');
      return;
    }

    setIsSaving(true);
    try {
      await onSave({
        id: editingPattern?.id,
        name: name.trim(),
        category,
        signal,
        candleCount: candles.length,
        description: description.trim(),
        candles,
        isActive
      });
      onClose();
    } catch (err: any) {
      alert('Lỗi khi lưu mẫu nến: ' + (err?.message || err));
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  const activeCandle = candles[activeCandleIndex] || candles[0];

  return createPortal(
    <div className="fixed inset-0 z-[100] w-screen h-screen bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-fadeIn">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Modal Header - Fixed at Top */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/90 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                {editingPattern ? 'Chỉnh Sửa Mô Hình Nến' : 'Thêm Định Nghĩa Mô Hình Nến Mới'}
              </h2>
              <p className="text-xs text-slate-400">
                Cấu hình tỷ lệ thân nến, râu nến và so sánh tương quan với nến trước
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

        {/* Modal Body - Scrollable */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Top General Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Pattern Name */}
            <div className="md:col-span-1">
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Tên mô hình nến <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="VD: Hammer Siêu Búa M1"
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-cyan-500 transition"
              />
            </div>

            {/* Signal Action */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Tín hiệu hành động
              </label>
              <select
                value={signal}
                onChange={e => setSignal(e.target.value as PatternSignal)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-cyan-500 transition"
              >
                <option value="BUY">🟢 MUA (BUY) - Tín hiệu tăng</option>
                <option value="SELL">🔴 BÁN (SELL) - Tín hiệu giảm</option>
                <option value="NEUTRAL">⚪ LƯỠNG LỰ (NEUTRAL) - Giằng co</option>
              </select>
            </div>

            {/* Number of candles in sequence */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Số lượng nến trong mẫu
              </label>
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4].map(num => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => updateCandleCount(num)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition ${
                      candles.length === num
                        ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/20'
                        : 'bg-slate-950 text-slate-400 border border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    {num === 1 ? '1 (Đơn)' : num === 2 ? '2 (Đôi)' : num === 3 ? '3 (Ba)' : '4 (Bốn)'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">
              Mô tả ý nghĩa tâm lý & điểm vào lệnh
            </label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="VD: Râu nến dưới dài gấp 2 lần thân, lực bắt đáy áp đảo phe bán..."
              className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-500 transition"
            />
          </div>

          {/* Live Preview Bar */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Minh Họa Trực Quan Mô Hình ({candles.length} nến):
              </span>
            </div>
            <div className="flex items-center justify-center">
              <CandleVisual candles={candles} signal={signal} size="md" className="border-0 bg-transparent p-0 shadow-none" />
            </div>
          </div>

          {/* Candle Step Selector (Tab for each candle) */}
          <div>
            <div className="flex items-center gap-2 border-b border-slate-800 pb-2 mb-4">
              <span className="text-xs font-semibold text-slate-400">Chọn nến cần cấu hình:</span>
              <div className="flex items-center gap-1.5">
                {candles.map((c, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveCandleIndex(idx)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                      activeCandleIndex === idx
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                        : 'bg-slate-950 text-slate-400 border border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    <span>{c.label || `Nến #${idx + 1}`}</span>
                    {idx === candles.length - 1 && candles.length > 1 && (
                      <span className="text-[9px] px-1 py-0.2 rounded bg-cyan-500/20 text-cyan-300">Trigger</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Active Candle Configuration Panel */}
            {activeCandle && (
              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-4">
                {/* Candle Label & Direction */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-slate-300 block mb-1">
                      Tên nhãn cho cây nến này:
                    </label>
                    <input
                      type="text"
                      value={activeCandle.label}
                      onChange={e => updateCurrentCandle('label', e.target.value)}
                      placeholder="VD: Nến 1 (Giảm mạnh) hoặc Nến Xác Nhận"
                      className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-300 block mb-1">
                      Chiều nến (Màu sắc):
                    </label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {(['BULLISH', 'BEARISH', 'DOJI', 'ANY'] as CandleDirection[]).map(dir => (
                        <button
                          key={dir}
                          type="button"
                          onClick={() => updateCurrentCandle('direction', dir)}
                          className={`py-1 rounded-lg text-[11px] font-bold transition border ${
                            activeCandle.direction === dir
                              ? dir === 'BULLISH' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' :
                                dir === 'BEARISH' ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' :
                                'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                              : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'
                          }`}
                        >
                          {dir === 'BULLISH' ? 'Tăng (Xanh)' : dir === 'BEARISH' ? 'Giảm (Đỏ)' : dir === 'DOJI' ? 'Doji' : 'Bất Kỳ'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 3 Metric Configs: Body, Upper Wick, Lower Wick */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-slate-800/80">
                  {/* 1. Body Size */}
                  <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800/90 space-y-2">
                    <span className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                      <span>📏</span> Thân Nến (Body)
                    </span>
                    <div>
                      <span className="text-[10px] text-slate-400 block mb-1">Cách tính so sánh:</span>
                      <select
                        value={activeCandle.body.mode}
                        onChange={e => updateCandleMetric('body', 'mode', e.target.value as BodySizeMode)}
                        className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-800 text-xs text-white"
                      >
                        <option value="RATIO_TO_RANGE">% so với tổng chiều dài nến</option>
                        <option value="SPECIFIC_VALUE">Số pips cụ thể</option>
                        {activeCandleIndex > 0 && (
                          <>
                            <option value="PERCENT_OF_PREVIOUS_BODY">% so với thân nến trước</option>
                            <option value="PERCENT_OF_PREVIOUS_TOTAL">% so với tổng nến trước</option>
                          </>
                        )}
                        <option value="ANY">Bất kỳ</option>
                      </select>
                    </div>

                    {activeCandle.body.mode !== 'ANY' && (
                      <div className="grid grid-cols-2 gap-1.5">
                        <select
                          value={activeCandle.body.operator}
                          onChange={e => updateCandleMetric('body', 'operator', e.target.value)}
                          className="px-2 py-1 rounded bg-slate-950 border border-slate-800 text-xs text-white"
                        >
                          <option value=">=">&gt;= (Lớn hơn bằng)</option>
                          <option value="<=">&lt;= (Nhỏ hơn bằng)</option>
                          <option value=">">&gt; (Lớn hơn)</option>
                          <option value="<">&lt; (Nhỏ hơn)</option>
                        </select>
                        <input
                          type="number"
                          step="0.1"
                          value={activeCandle.body.value}
                          onChange={e => updateCandleMetric('body', 'value', e.target.value)}
                          className="px-2 py-1 rounded bg-slate-950 border border-slate-800 text-xs text-white text-right font-mono"
                        />
                      </div>
                    )}
                  </div>

                  {/* 2. Upper Wick */}
                  <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800/90 space-y-2">
                    <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                      <span>🔺</span> Râu Trên (Upper Wick)
                    </span>
                    <div>
                      <span className="text-[10px] text-slate-400 block mb-1">Cách tính so sánh:</span>
                      <select
                        value={activeCandle.upperWick.mode}
                        onChange={e => updateCandleMetric('upperWick', 'mode', e.target.value as WickSizeMode)}
                        className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-800 text-xs text-white"
                      >
                        <option value="RATIO_TO_BODY">Tỷ lệ so với thân (x lần)</option>
                        <option value="PERCENT_OF_RANGE">% so với tổng chiều dài nến</option>
                        <option value="SPECIFIC_VALUE">Số pips cụ thể</option>
                        {activeCandleIndex > 0 && (
                          <option value="PERCENT_OF_PREVIOUS_UPPER">% so với râu trên nến trước</option>
                        )}
                        <option value="ANY">Bất kỳ</option>
                      </select>
                    </div>

                    {activeCandle.upperWick.mode !== 'ANY' && (
                      <div className="grid grid-cols-2 gap-1.5">
                        <select
                          value={activeCandle.upperWick.operator}
                          onChange={e => updateCandleMetric('upperWick', 'operator', e.target.value)}
                          className="px-2 py-1 rounded bg-slate-950 border border-slate-800 text-xs text-white"
                        >
                          <option value="<=">&lt;= (Nhỏ hơn bằng)</option>
                          <option value=">=">&gt;= (Lớn hơn bằng)</option>
                          <option value="<">&lt; (Nhỏ hơn)</option>
                          <option value=">">&gt; (Lớn hơn)</option>
                        </select>
                        <input
                          type="number"
                          step="0.1"
                          value={activeCandle.upperWick.value}
                          onChange={e => updateCandleMetric('upperWick', 'value', e.target.value)}
                          className="px-2 py-1 rounded bg-slate-950 border border-slate-800 text-xs text-white text-right font-mono"
                        />
                      </div>
                    )}
                  </div>

                  {/* 3. Lower Wick */}
                  <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800/90 space-y-2">
                    <span className="text-xs font-bold text-sky-300 flex items-center gap-1.5">
                      <span>🔻</span> Râu Dưới (Lower Wick)
                    </span>
                    <div>
                      <span className="text-[10px] text-slate-400 block mb-1">Cách tính so sánh:</span>
                      <select
                        value={activeCandle.lowerWick.mode}
                        onChange={e => updateCandleMetric('lowerWick', 'mode', e.target.value as WickSizeMode)}
                        className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-800 text-xs text-white"
                      >
                        <option value="RATIO_TO_BODY">Tỷ lệ so với thân (x lần)</option>
                        <option value="PERCENT_OF_RANGE">% so với tổng chiều dài nến</option>
                        <option value="SPECIFIC_VALUE">Số pips cụ thể</option>
                        {activeCandleIndex > 0 && (
                          <option value="PERCENT_OF_PREVIOUS_LOWER">% so với râu dưới nến trước</option>
                        )}
                        <option value="ANY">Bất kỳ</option>
                      </select>
                    </div>

                    {activeCandle.lowerWick.mode !== 'ANY' && (
                      <div className="grid grid-cols-2 gap-1.5">
                        <select
                          value={activeCandle.lowerWick.operator}
                          onChange={e => updateCandleMetric('lowerWick', 'operator', e.target.value)}
                          className="px-2 py-1 rounded bg-slate-950 border border-slate-800 text-xs text-white"
                        >
                          <option value=">=">&gt;= (Lớn hơn bằng)</option>
                          <option value="<=">&lt;= (Nhỏ hơn bằng)</option>
                          <option value=">">&gt; (Lớn hơn)</option>
                          <option value="<">&lt; (Nhỏ hơn)</option>
                        </select>
                        <input
                          type="number"
                          step="0.1"
                          value={activeCandle.lowerWick.value}
                          onChange={e => updateCandleMetric('lowerWick', 'value', e.target.value)}
                          className="px-2 py-1 rounded bg-slate-950 border border-slate-800 text-xs text-white text-right font-mono"
                        />
                      </div>
                    )}
                  </div>
                </div>

                {/* Relative Position vs Previous Candle (Only for candle 2, 3, 4...) */}
                {activeCandleIndex > 0 && (
                  <div className="pt-3 border-t border-slate-800/80">
                    <span className="text-xs font-semibold text-amber-300 block mb-2">
                      ⚡ Tương Quan Vị Trí So Với Nến Liền Trước:
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <label className="flex items-center gap-2 p-2 rounded-lg bg-slate-900 border border-slate-800 cursor-pointer text-xs text-slate-300 hover:text-white">
                        <input
                          type="checkbox"
                          checked={Boolean(activeCandle.relative?.engulfsPrevious)}
                          onChange={e => updateRelativeRule('engulfsPrevious', e.target.checked)}
                          className="rounded text-cyan-500 focus:ring-0"
                        />
                        <span>Nhấn chìm (Engulfing)</span>
                      </label>

                      <label className="flex items-center gap-2 p-2 rounded-lg bg-slate-900 border border-slate-800 cursor-pointer text-xs text-slate-300 hover:text-white">
                        <input
                          type="checkbox"
                          checked={Boolean(activeCandle.relative?.insidePreviousBar)}
                          onChange={e => updateRelativeRule('insidePreviousBar', e.target.checked)}
                          className="rounded text-cyan-500 focus:ring-0"
                        />
                        <span>Nằm lọt trong (Harami)</span>
                      </label>

                      <label className="flex items-center gap-2 p-2 rounded-lg bg-slate-900 border border-slate-800 cursor-pointer text-xs text-slate-300 hover:text-white">
                        <input
                          type="checkbox"
                          checked={Boolean(activeCandle.relative?.higherHigh)}
                          onChange={e => updateRelativeRule('higherHigh', e.target.checked)}
                          className="rounded text-cyan-500 focus:ring-0"
                        />
                        <span>Đỉnh cao hơn (HH)</span>
                      </label>

                      <label className="flex items-center gap-2 p-2 rounded-lg bg-slate-900 border border-slate-800 cursor-pointer text-xs text-slate-300 hover:text-white">
                        <input
                          type="checkbox"
                          checked={Boolean(activeCandle.relative?.lowerLow)}
                          onChange={e => updateRelativeRule('lowerLow', e.target.checked)}
                          className="rounded text-cyan-500 focus:ring-0"
                        />
                        <span>Đáy thấp hơn (LL)</span>
                      </label>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Modal Footer Actions - Pinned to bottom */}
          <div className="sticky bottom-0 -mx-6 -mb-6 px-6 py-4 bg-slate-950/95 border-t border-slate-800 flex items-center justify-end gap-3 backdrop-blur-sm shrink-0">
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
              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-lg shadow-cyan-500/25 transition disabled:opacity-50"
            >
              {isSaving ? 'Đang lưu...' : editingPattern ? 'Cập Nhật Mô Hình' : 'Tạo Mô Hình Nến'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
