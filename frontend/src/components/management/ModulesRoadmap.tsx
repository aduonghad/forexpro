import React, { useState } from 'react';
import { SystemModule } from '../../types';
import { Cpu, Globe, Bot, Copy, ShieldAlert, Zap, Sliders, ToggleLeft, ToggleRight, Sparkles } from 'lucide-react';

export const ModulesRoadmap: React.FC = () => {
  const [modules, setModules] = useState<SystemModule[]>([
    {
      id: 'mod-1',
      name: 'Engine Nhận Diện Mô Hình Nến Price Action',
      key: 'candlestick_engine',
      description: 'Quét và nhận diện tự động các mẫu nến đảo chiều (Hammer, Engulfing, Morning Star...) theo thời gian thực để kích hoạt lệnh.',
      status: 'ACTIVE',
      isEnabled: true,
      iconName: 'Zap',
      badge: 'Đang hoạt động'
    },
    {
      id: 'mod-2',
      name: 'Bộ Lọc Tin Tức Kinh Tế (Forex Factory News Filter)',
      key: 'news_filter',
      description: 'Tự động tạm dừng bot trước và sau 30 phút khi có tin tức đỏ cực mạnh (Non-Farm, CPI, Lãi suất FED) để tránh trượt giá dãn spread.',
      status: 'BETA',
      isEnabled: true,
      iconName: 'Globe',
      badge: 'Bản thử nghiệm'
    },
    {
      id: 'mod-3',
      name: 'AI Copilot Phân Tích Đa Khung Thời Gian (Claude & GPT-4o)',
      key: 'ai_copilot',
      description: 'Sử dụng LLM phân tích cấu trúc thị trường Top-Down (H4 -> H1 -> M15) và đưa ra nhận định tóm tắt trực tiếp trên thanh Chat.',
      status: 'COMING_SOON',
      isEnabled: false,
      iconName: 'Bot',
      badge: 'Sắp ra mắt'
    },
    {
      id: 'mod-4',
      name: 'Copy Trading Đa Tài Khoản Exness MT5',
      key: 'multi_account_copy',
      description: 'Đồng bộ tín hiệu từ tài khoản Master sang hàng loạt tài khoản Slave theo tỷ lệ đòn bẩy và vốn tương ứng.',
      status: 'COMING_SOON',
      isEnabled: false,
      iconName: 'Copy',
      badge: 'Sắp ra mắt'
    },
    {
      id: 'mod-5',
      name: 'Quản Lý Rủi Ro Động (Kelly Criterion & ATR Stop Loss)',
      key: 'dynamic_risk',
      description: 'Tự động co giãn Lot size và khoảng cách SL theo biên độ dao động ATR của thị trường trong 20 nến gần nhất.',
      status: 'BETA',
      isEnabled: true,
      iconName: 'ShieldAlert',
      badge: 'Bản thử nghiệm'
    }
  ]);

  const handleToggleModule = (id: string) => {
    setModules(prev =>
      prev.map(m => {
        if (m.id === id) {
          if (m.status === 'COMING_SOON') {
            alert(`Chức năng "${m.name}" đang trong lộ trình phát triển và sẽ sớm được kích hoạt trong bản cập nhật kế tiếp!`);
            return m;
          }
          return { ...m, isEnabled: !m.isEnabled };
        }
        return m;
      })
    );
  };

  const getModuleIcon = (key: string) => {
    switch (key) {
      case 'candlestick_engine': return <Zap className="w-5 h-5 text-amber-400" />;
      case 'news_filter': return <Globe className="w-5 h-5 text-cyan-400" />;
      case 'ai_copilot': return <Bot className="w-5 h-5 text-purple-400" />;
      case 'multi_account_copy': return <Copy className="w-5 h-5 text-emerald-400" />;
      default: return <ShieldAlert className="w-5 h-5 text-rose-400" />;
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header Banner */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <Cpu className="w-4 h-4 text-cyan-400" />
            Lộ Trình & Quản Lý Các Module Hệ Thống (Feature Flags)
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Bật / Tắt các phân hệ công nghệ mở rộng cho Bot giao dịch
          </p>
        </div>
        <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5" />
          <span>V2.0 Architecture</span>
        </span>
      </div>

      {/* Modules Cards List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {modules.map(mod => (
          <div
            key={mod.id}
            className={`p-5 rounded-2xl border transition-all duration-300 flex flex-col justify-between ${
              mod.isEnabled
                ? 'bg-slate-900/80 border-slate-800 hover:border-cyan-500/40 shadow-lg'
                : 'bg-slate-950/60 border-slate-900 opacity-70'
            }`}
          >
            <div>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                    {getModuleIcon(mod.key)}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-100 leading-tight">
                      {mod.name}
                    </h4>
                    <span className={`inline-block mt-1 text-[10px] font-bold px-2 py-0.2 rounded-full uppercase tracking-wider ${
                      mod.status === 'ACTIVE' ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30' :
                      mod.status === 'BETA' ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30' :
                      'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}>
                      {mod.badge}
                    </span>
                  </div>
                </div>

                {/* Switch button */}
                <button
                  onClick={() => handleToggleModule(mod.id)}
                  className={`p-1 rounded-lg transition ${
                    mod.isEnabled ? 'text-cyan-400 hover:text-cyan-300' : 'text-slate-600 hover:text-slate-400'
                  }`}
                  title={mod.isEnabled ? 'Bấm để tắt module' : 'Bấm để bật module'}
                >
                  {mod.isEnabled ? (
                    <ToggleRight className="w-7 h-7" />
                  ) : (
                    <ToggleLeft className="w-7 h-7" />
                  )}
                </button>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed pt-1">
                {mod.description}
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
              <span>Trạng thái: <strong className={mod.isEnabled ? 'text-emerald-400' : 'text-slate-500'}>{mod.isEnabled ? 'ĐANG BẬT' : 'ĐANG TẮT'}</strong></span>
              <span className="font-mono text-[10px] text-slate-400">{mod.key}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
