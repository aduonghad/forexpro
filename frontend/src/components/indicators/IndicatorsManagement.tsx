import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { IndicatorConfig, Timeframe } from '../../types';
import { api } from '../../services/api';
import { 
  Activity, 
  Settings, 
  Power, 
  RotateCcw, 
  Sliders, 
  CheckCircle2, 
  Zap, 
  X, 
  Edit2,
  AlertCircle,
  Clock,
  Info
} from 'lucide-react';

interface IndicatorEditModalProps {
  isOpen: boolean;
  indicator: IndicatorConfig | null;
  onClose: () => void;
  onSave: (id: string, updated: Partial<IndicatorConfig>) => Promise<void>;
}

const IndicatorEditModal: React.FC<IndicatorEditModalProps> = ({
  isOpen,
  indicator,
  onClose,
  onSave
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
  const [priority, setPriority] = useState(1);
  const [timeframe, setTimeframe] = useState<Timeframe>('M1');
  const [parameters, setParameters] = useState<Record<string, any>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (indicator) {
      setName(indicator.name);
      setDescription(indicator.description || '');
      setPriority(indicator.priority || 1);
      setTimeframe(indicator.timeframe || 'M1');
      setParameters(indicator.parameters ? JSON.parse(JSON.stringify(indicator.parameters)) : {});
    }
  }, [indicator]);

  if (!isOpen || !indicator) return null;

  const handleParamChange = (key: string, val: any) => {
    setParameters(prev => ({
      ...prev,
      [key]: isNaN(Number(val)) ? val : Number(val)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSave(indicator.id, {
        name: name.trim(),
        description: description.trim(),
        priority,
        timeframe,
        parameters
      });
      onClose();
    } catch (err: any) {
      alert('Lỗi lưu cấu hình chỉ báo: ' + (err?.message || err));
    } finally {
      setIsSaving(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] w-screen h-screen bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-fadeIn">
      <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/90 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                Hiệu Chỉnh Tham Số: {indicator.name}
              </h2>
              <p className="text-xs text-slate-400">
                Cài đặt chu kỳ, độ lệch và tham số thuật toán tính toán của chỉ báo
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

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Name & Priority */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Tên hiển thị chỉ báo
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-cyan-500 transition"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Khung nến quét
              </label>
              <select
                value={timeframe}
                onChange={e => setTimeframe(e.target.value as Timeframe)}
                className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white focus:outline-none focus:border-cyan-500 transition"
              >
                <option value="M1">M1 (1 Phút)</option>
                <option value="M5">M5 (5 Phút)</option>
                <option value="M15">M15 (15 Phút)</option>
                <option value="M30">M30 (30 Phút)</option>
                <option value="H1">H1 (1 Giờ)</option>
                <option value="H4">H4 (4 Giờ)</option>
                <option value="D1">D1 (1 Ngày)</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">
              Mô tả thuật toán
            </label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-500 transition"
            />
          </div>

          {/* Dynamic Technical Parameters */}
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800/90 space-y-3">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Tham Số Thuật Toán Kỹ Thuật:
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              {Object.entries(parameters).map(([paramKey, paramVal]) => (
                <div key={paramKey}>
                  <label className="text-[11px] font-mono font-medium text-slate-400 block mb-1 capitalize">
                    {paramKey.replace(/([A-Z])/g, ' $1')}:
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={paramVal}
                    onChange={e => handleParamChange(paramKey, e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 font-mono text-sm text-cyan-300 focus:outline-none focus:border-cyan-500 transition"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-cyan-950/20 border border-cyan-500/20 text-xs text-cyan-300/90 flex items-start gap-2">
            <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <span>
              Chỉ báo này sẽ được tính toán liên tục trong nền. Để thiết lập điều kiện kích hoạt lệnh MUA/BÁN cho Bot bằng chỉ báo này (hoặc kết hợp với các chỉ báo khác), vui lòng sang tab <strong>Tín Hiệu Giao Dịch</strong>.
            </span>
          </div>

          {/* Modal Actions Footer */}
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
              <span>{isSaving ? 'Đang lưu...' : 'Lưu Thay Đổi'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export const IndicatorsManagement: React.FC = () => {
  const [indicators, setIndicators] = useState<IndicatorConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingIndicator, setEditingIndicator] = useState<IndicatorConfig | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadIndicators = async () => {
    setIsLoading(true);
    try {
      const data = await api.getIndicatorConfigs();
      setIndicators(data);
    } catch (err) {
      console.error('Lỗi khi tải danh sách chỉ báo:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadIndicators();
  }, []);

  const handleToggle = async (id: string, active: boolean) => {
    try {
      const updated = await api.updateIndicatorConfig(id, { isActive: active });
      setIndicators(prev => prev.map(ind => ind.id === id ? updated : ind));
      window.dispatchEvent(new CustomEvent('indicators_updated'));
    } catch (err: any) {
      alert('Lỗi khi bật/tắt chỉ báo: ' + (err?.message || err));
    }
  };

  const handleEdit = (ind: IndicatorConfig) => {
    setEditingIndicator(ind);
    setIsModalOpen(true);
  };

  const handleSave = async (id: string, updated: Partial<IndicatorConfig>) => {
    const res = await api.updateIndicatorConfig(id, updated);
    setIndicators(prev => prev.map(ind => ind.id === id ? res : ind));
    window.dispatchEvent(new CustomEvent('indicators_updated'));
  };

  const handleReset = async () => {
    if (window.confirm('Bạn có chắc chắn muốn khôi phục toàn bộ cấu hình tham số chỉ báo về mặc định của hệ thống không?')) {
      try {
        const fresh = await api.resetIndicatorConfigs();
        setIndicators(fresh);
        window.dispatchEvent(new CustomEvent('indicators_updated'));
        alert('Đã khôi phục thành công các chỉ báo chuẩn!');
      } catch (err: any) {
        alert('Lỗi khôi phục chỉ báo: ' + (err?.message || err));
      }
    }
  };

  const activeCount = indicators.filter(i => i.isActive).length;

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'RSI':
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-500/15 text-purple-300 border border-purple-500/30">MOMENTUM (RSI)</span>;
      case 'EMA_CROSS':
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">TREND (EMA CROSS)</span>;
      case 'BOLLINGER':
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/30">VOLATILITY (BOLLINGER)</span>;
      case 'DYNAMIC_SWING':
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">SWING HIGH/LOW</span>;
      case 'MACD':
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-500/15 text-blue-300 border border-blue-500/30">CONVERGENCE (MACD)</span>;
      default:
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">{type}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Explanation */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-cyan-950/30 border border-cyan-500/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 shadow-lg shadow-cyan-500/10">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white">
                Quản Lý Chỉ Báo Kỹ Thuật (Technical Indicators)
              </h2>
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold">
                {activeCount}/{indicators.length} Chỉ Báo Đang Bật
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
              Các chỉ báo kỹ thuật cung cấp thông số động lượng, xu hướng, và biên độ nến. 
              Các chỉ báo được tính toán thuần túy độc lập; để cấu hình tín hiệu <strong>MUA (BUY)</strong> hoặc <strong>BÁN (SELL)</strong> bằng 1 chỉ báo hoặc kết hợp nhiều chỉ báo, hãy truy cập tab <strong>Tín Hiệu Giao Dịch</strong>.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-end md:self-auto">
          <button
            onClick={handleReset}
            title="Khôi phục các chỉ báo về thông số chuẩn ban đầu"
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 text-xs font-semibold transition"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Khôi Phục Chuẩn</span>
          </button>
        </div>
      </div>

      {/* Indicators Grid */}
      {isLoading ? (
        <div className="py-16 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2">
          <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          <span>Đang tải danh sách chỉ báo kỹ thuật...</span>
        </div>
      ) : indicators.length === 0 ? (
        <div className="py-16 text-center text-slate-400 text-xs bg-slate-900/40 rounded-2xl border border-slate-800 flex flex-col items-center justify-center gap-3">
          <AlertCircle className="w-10 h-10 text-amber-400" />
          <p className="text-sm font-semibold text-slate-200">Chưa có chỉ báo nào trong cơ sở dữ liệu</p>
          <button
            onClick={handleReset}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-500 transition"
          >
            Khởi tạo 5 chỉ báo chuẩn mặc định
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {indicators.map(ind => (
            <div
              key={ind.id}
              className={`flex flex-col justify-between p-5 rounded-2xl border transition-all duration-300 ${
                ind.isActive
                  ? 'bg-slate-900/80 border-slate-800 hover:border-cyan-500/40 shadow-lg shadow-cyan-950/10 hover:shadow-cyan-500/10'
                  : 'bg-slate-950/50 border-slate-900 opacity-65 hover:opacity-100'
              }`}
            >
              <div>
                {/* Card Top: Indicator Name, Category, Switch */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold text-slate-100 text-base">
                        {ind.name}
                      </h3>
                      <span className="text-[11px] font-mono text-cyan-400 bg-cyan-950/60 px-2 py-0.2 rounded border border-cyan-800/50">
                        {ind.type}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {getTypeBadge(ind.type)}
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800/90 text-slate-400 border border-slate-700/60 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-cyan-400" />
                        {ind.timeframe || 'M1'}
                      </span>
                    </div>
                  </div>

                  {/* Toggle Button */}
                  <button
                    onClick={() => handleToggle(ind.id, !ind.isActive)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                      ind.isActive
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                        : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700'
                    }`}
                  >
                    <Power className="w-3 h-3" />
                    <span>{ind.isActive ? 'BẬT' : 'TẮT'}</span>
                  </button>
                </div>

                {/* Description */}
                {ind.description && (
                  <p className="text-xs text-slate-300 leading-relaxed mb-4">
                    {ind.description}
                  </p>
                )}

                {/* Parameters Chips */}
                <div className="mt-3 pt-3 border-t border-slate-800/80">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                    Thông Số Kỹ Thuật (Calculation Parameters):
                  </span>
                  <div className="flex items-center gap-2 flex-wrap">
                    {Object.entries(ind.parameters || {}).map(([key, val]) => (
                      <span
                        key={key}
                        className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 flex items-center gap-1.5"
                      >
                        <span className="text-slate-400">{key}:</span>
                        <span className="text-cyan-400 font-bold">{String(val)}</span>
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action: Edit indicator */}
              <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-slate-800/80">
                <button
                  onClick={() => handleEdit(ind)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium text-cyan-300 bg-cyan-950/40 hover:bg-cyan-900/50 border border-cyan-800/50 hover:text-white transition"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Chỉnh Sửa Tham Số Kỹ Thuật</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal */}
      <IndicatorEditModal
        isOpen={isModalOpen}
        indicator={editingIndicator}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
      />
    </div>
  );
};
