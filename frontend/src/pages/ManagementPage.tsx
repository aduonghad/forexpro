import React, { useState, useEffect } from 'react';
import { CandlestickPattern, PatternCategory } from '../types';
import { api } from '../services/api';
import { PatternCard } from '../components/patterns/PatternCard';
import { PatternModal } from '../components/patterns/PatternModal';
import { UsersRoadmap } from '../components/management/UsersRoadmap';
import { ModulesRoadmap } from '../components/management/ModulesRoadmap';
import { IndicatorsManagement } from '../components/indicators/IndicatorsManagement';
import { SignalsManagement } from '../components/signals/SignalsManagement';
import { 
  Sliders, 
  Users, 
  Cpu, 
  Plus, 
  RotateCcw, 
  Search, 
  Layers, 
  Activity,
  Zap,
  ArrowLeft,
  LogOut,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Menu,
  X
} from 'lucide-react';

interface ManagementPageProps {
  onBackToTrading?: () => void;
  onLogoutAdmin?: () => void;
}

type AdminSection = 'signals' | 'patterns' | 'indicators' | 'users' | 'modules';

export const ManagementPage: React.FC<ManagementPageProps> = ({ onBackToTrading, onLogoutAdmin }) => {
  const [activeSection, setActiveSection] = useState<AdminSection>('signals');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  // Pattern states
  const [patterns, setPatterns] = useState<CandlestickPattern[]>([]);
  const [isLoadingPatterns, setIsLoadingPatterns] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState<'ALL' | 'SINGLE' | 'DOUBLE' | 'TRIPLE' | 'MULTI'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPattern, setEditingPattern] = useState<CandlestickPattern | null>(null);

  const loadPatterns = async () => {
    setIsLoadingPatterns(true);
    try {
      const data = await api.getPatterns();
      setPatterns(data);
    } catch (err) {
      console.error('Lỗi khi tải danh sách mẫu nến:', err);
    } finally {
      setIsLoadingPatterns(false);
    }
  };

  useEffect(() => {
    loadPatterns();
  }, []);

  const handleTogglePattern = async (id: string, active: boolean) => {
    try {
      const updated = await api.updatePattern(id, { isActive: active });
      setPatterns(prev => prev.map(p => p.id === id ? updated : p));
    } catch (err: any) {
      alert('Lỗi khi bật/tắt mẫu nến: ' + (err?.message || err));
    }
  };

  const handleEditPattern = (pattern: CandlestickPattern) => {
    setEditingPattern(pattern);
    setIsModalOpen(true);
  };

  const handleCreatePattern = () => {
    setEditingPattern(null);
    setIsModalOpen(true);
  };

  const handleDeletePattern = async (id: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xoá định nghĩa mẫu nến này không?')) {
      try {
        await api.deletePattern(id);
        setPatterns(prev => prev.filter(p => p.id !== id));
      } catch (err: any) {
        alert('Lỗi xoá mẫu nến: ' + (err?.message || err));
      }
    }
  };

  const handleSavePattern = async (patternData: Partial<CandlestickPattern>) => {
    if (patternData.id) {
      const updated = await api.updatePattern(patternData.id, patternData);
      setPatterns(prev => prev.map(p => p.id === updated.id ? updated : p));
    } else {
      const created = await api.createPattern(patternData);
      setPatterns(prev => [created, ...prev]);
    }
  };

  const handleResetPatterns = async () => {
    if (window.confirm('Bạn có chắc chắn muốn khôi phục toàn bộ danh sách nến về bộ mẫu chuẩn 16+ nến mặc định không?')) {
      try {
        const fresh = await api.resetPatterns();
        setPatterns(fresh);
        alert('Đã khôi phục thành công danh sách mẫu nến chuẩn!');
      } catch (err: any) {
        alert('Lỗi khôi phục mẫu nến: ' + (err?.message || err));
      }
    }
  };

  // Filter & Search logic
  const filteredPatterns = patterns.filter(p => {
    if (selectedFilter === 'SINGLE' && p.category !== 'SINGLE') return false;
    if (selectedFilter === 'DOUBLE' && p.category !== 'DOUBLE') return false;
    if (selectedFilter === 'TRIPLE' && p.category !== 'TRIPLE') return false;
    if (selectedFilter === 'MULTI' && p.category !== 'MULTI') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q);
    }
    return true;
  });

  const singleCount = patterns.filter(p => p.category === 'SINGLE').length;
  const doubleCount = patterns.filter(p => p.category === 'DOUBLE').length;
  const tripleCount = patterns.filter(p => p.category === 'TRIPLE').length;
  const multiCount = patterns.filter(p => p.category === 'MULTI').length;

  // Navigation Items Definition with Categorized Groups
  const navGroups = [
    {
      groupTitle: 'CHIẾN LƯỢC & TÍN HIỆU',
      items: [
        {
          id: 'signals' as AdminSection,
          label: 'Tín Hiệu Giao Dịch',
          subtitle: 'Kho chiến lược & bot tự động',
          icon: Zap,
          badge: 'Bot Trade',
          badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
        },
        {
          id: 'patterns' as AdminSection,
          label: 'Mô Hình Nến',
          subtitle: 'Phân tích Price Action 16+ mẫu',
          icon: Layers,
          badge: `${patterns.length}`,
          badgeClass: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
        },
        {
          id: 'indicators' as AdminSection,
          label: 'Chỉ Báo Kỹ Thuật',
          subtitle: 'Cấu hình RSI, EMA, BB, MACD',
          icon: Activity,
          badge: 'Params',
          badgeClass: 'bg-blue-500/20 text-blue-300 border-blue-500/30'
        }
      ]
    },
    {
      groupTitle: 'HỆ THỐNG & NGƯỜI DÙNG',
      items: [
        {
          id: 'users' as AdminSection,
          label: 'Quản Trị Người Dùng',
          subtitle: 'Phân quyền & gói cước Pro/Ultra',
          icon: Users,
          badge: 'V2',
          badgeClass: 'bg-purple-500/20 text-purple-300 border-purple-500/30'
        },
        {
          id: 'modules' as AdminSection,
          label: 'Module Chức Năng',
          subtitle: 'Lộ trình mở rộng hệ thống',
          icon: Cpu,
          badge: 'Beta',
          badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/30'
        }
      ]
    }
  ];

  const getSectionMeta = (sec: AdminSection) => {
    switch (sec) {
      case 'signals':
        return {
          title: 'Chiến Lược Tín Hiệu Giao Dịch & Bot Tự Động',
          description: 'Quản lý các kịch bản tín hiệu kỹ thuật (1 chỉ báo hoặc đa chỉ báo AND/OR). Bot tự động liên tục đối soát điều kiện để khớp lệnh.',
          icon: Zap
        };
      case 'patterns':
        return {
          title: 'Định Nghĩa Mô Hình Nến Price Action',
          description: 'Hệ thống nhận diện tự động 16+ mô hình nến Nhật Bản (Single, Double, Triple, Multi) hỗ trợ phân tích xu hướng đảo chiều.',
          icon: Layers
        };
      case 'indicators':
        return {
          title: 'Tham Số Chỉ Báo Kỹ Thuật (Indicators Parameters)',
          description: 'Hiệu chỉnh các ngưỡng RSI (Quá Mua / Quá Bán), chu kỳ EMA ngắn/dài, độ lệch chuẩn Bollinger Bands và chỉ báo MACD.',
          icon: Activity
        };
      case 'users':
        return {
          title: 'Quản Lý Người Dùng & Phân Quyền Tài Khoản',
          description: 'Quản lý danh sách thành viên, hạn mức bot theo gói Free, Pro, Ultra và phân quyền vận hành hệ thống.',
          icon: Users
        };
      case 'modules':
        return {
          title: 'Lộ Trình Nâng Cấp & Module Hệ Thống',
          description: 'Các tính năng mở rộng: Tích hợp PineScript Webhook TradingView, quản lý rủi ro nâng cao và kiểm thử Backtest dữ liệu.',
          icon: Cpu
        };
    }
  };

  const currentMeta = getSectionMeta(activeSection);

  return (
    <div className="flex-1 flex flex-col md:flex-row min-h-screen bg-[#070b14] text-slate-100">
      {/* Mobile Top Header */}
      <div className="md:hidden flex items-center justify-between p-3.5 bg-slate-950/90 border-b border-slate-800 sticky top-0 z-30 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsMobileDrawerOpen(true)}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-md shadow-cyan-500/20">
              <Sliders className="w-3.5 h-3.5" />
            </div>
            <span className="font-bold text-sm text-white">ForexPro Admin</span>
          </div>
        </div>

        {onBackToTrading && (
          <button
            onClick={onBackToTrading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-cyan-300 text-xs font-semibold hover:bg-slate-800 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Về Sàn</span>
          </button>
        )}
      </div>

      {/* Mobile Backdrop Overlay */}
      {isMobileDrawerOpen && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 md:hidden animate-fadeIn"
          onClick={() => setIsMobileDrawerOpen(false)}
        />
      )}

      {/* Modern Left Navigation Sidebar */}
      <aside
        className={`
          fixed md:sticky top-0 h-screen z-50
          ${isMobileDrawerOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          ${isSidebarCollapsed ? 'md:w-20' : 'md:w-72'}
          w-72 shrink-0
          bg-[#080d1a] border-r border-slate-800/80
          flex flex-col justify-between
          transition-all duration-300 ease-in-out
          shadow-2xl md:shadow-none
        `}
      >
        {/* Sidebar Top: Logo & Navigation */}
        <div className="flex-1 min-h-0 flex flex-col">
          {/* Header Branding */}
          <div className="p-4 border-b border-slate-800/80 flex items-center justify-between shrink-0 bg-slate-950/40">
            {!isSidebarCollapsed ? (
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 via-blue-600 to-indigo-600 p-0.5 shadow-lg shadow-cyan-500/20">
                  <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                    <Sliders className="w-4 h-4 text-cyan-400" />
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-sm text-white tracking-wide">FOREXPRO</span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                      ADMIN
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">Bảng Quản Trị Hệ Thống</p>
                </div>
              </div>
            ) : (
              <div className="mx-auto w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
                <Sliders className="w-4 h-4 text-white" />
              </div>
            )}

            {/* Desktop Collapse / Mobile Close */}
            <div className="flex items-center">
              <button
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                title={isSidebarCollapsed ? "Mở rộng thanh điều hướng" : "Thu gọn thanh điều hướng"}
                className="hidden md:flex p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-850 transition"
              >
                {isSidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
              </button>
              <button
                onClick={() => setIsMobileDrawerOpen(false)}
                className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-850 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Navigation Links Grouped */}
          <nav className="flex-1 overflow-y-auto p-3 space-y-6">
            {navGroups.map((group, gIdx) => (
              <div key={gIdx} className="space-y-1.5">
                {!isSidebarCollapsed && (
                  <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {group.groupTitle}
                  </div>
                )}
                <div className="space-y-1">
                  {group.items.map((item) => {
                    const IconComp = item.icon;
                    const isActive = activeSection === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          setActiveSection(item.id);
                          setIsMobileDrawerOpen(false);
                        }}
                        title={isSidebarCollapsed ? `${item.label} - ${item.subtitle}` : undefined}
                        className={`
                          w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all group
                          ${isActive 
                            ? 'bg-gradient-to-r from-cyan-500/20 via-blue-600/10 to-transparent text-white border-l-4 border-cyan-400 shadow-md shadow-cyan-950/20' 
                            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/80'
                          }
                          ${isSidebarCollapsed ? 'justify-center px-2' : ''}
                        `}
                      >
                        <div className={`
                          p-2 rounded-lg shrink-0 transition-colors
                          ${isActive 
                            ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' 
                            : 'bg-slate-900 text-slate-400 group-hover:text-slate-300 group-hover:bg-slate-800'
                          }
                        `}>
                          <IconComp className="w-4 h-4" />
                        </div>

                        {!isSidebarCollapsed && (
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1.5">
                              <span className={`text-xs truncate ${isActive ? 'text-white font-bold' : 'font-semibold'}`}>
                                {item.label}
                              </span>
                              {item.badge && (
                                <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full border ${item.badgeClass} shrink-0`}>
                                  {item.badge}
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-slate-400 truncate mt-0.5">
                              {item.subtitle}
                            </p>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </div>

        {/* Sidebar Bottom: System Status & Action Controls */}
        <div className="p-3 border-t border-slate-800/80 space-y-2 bg-slate-950/50 shrink-0">
          {!isSidebarCollapsed && (
            <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/60 flex items-center justify-between text-[11px] mb-1">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-slate-400">Trạng Thái:</span>
              </div>
              <span className="font-semibold text-emerald-400">Trực Tuyến</span>
            </div>
          )}

          {onBackToTrading && (
            <button
              onClick={onBackToTrading}
              title={isSidebarCollapsed ? "Quay lại sàn giao dịch" : undefined}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-850 text-cyan-300 hover:text-white border border-slate-800 text-xs font-bold transition shadow-sm ${isSidebarCollapsed ? 'justify-center px-0' : ''}`}
            >
              <ArrowLeft className="w-4 h-4 shrink-0" />
              {!isSidebarCollapsed && <span>Về Sàn Giao Dịch</span>}
            </button>
          )}

          {onLogoutAdmin && (
            <button
              onClick={onLogoutAdmin}
              title={isSidebarCollapsed ? "Đăng xuất phiên Admin" : undefined}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/25 text-xs font-semibold transition ${isSidebarCollapsed ? 'justify-center px-0' : ''}`}
            >
              <LogOut className="w-4 h-4 shrink-0" />
              {!isSidebarCollapsed && <span>Đăng Xuất Admin</span>}
            </button>
          )}
        </div>
      </aside>

      {/* Main Content View (Right Area) */}
      <main className="flex-1 min-w-0 flex flex-col overflow-y-auto">
        {/* Top Sticky Header */}
        <header className="px-5 py-4 md:px-8 md:py-5 border-b border-slate-800/80 bg-slate-950/40 backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-3 sticky top-0 z-20">
          <div>
            <div className="flex items-center gap-2 text-[11px] text-slate-400 font-medium">
              <span className="text-slate-400">Quản Trị</span>
              <span>/</span>
              <span className="text-cyan-400 font-bold">{currentMeta.title.split('&')[0].trim()}</span>
            </div>
            <h1 className="text-base md:text-xl font-black text-white mt-1 flex items-center gap-2.5">
              <currentMeta.icon className="w-5 h-5 text-cyan-400 shrink-0" />
              <span>{currentMeta.title}</span>
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-3xl leading-relaxed">
              {currentMeta.description}
            </p>
          </div>

          {/* Quick Badges in Header */}
          <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
            <span className="text-xs px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 font-mono flex items-center gap-2 shadow-sm">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Admin Mode</span>
            </span>
          </div>
        </header>

        {/* Dynamic Section Content Container */}
        <div className="p-4 md:p-6 lg:p-8 flex-1 space-y-6">
          {/* SECTION 1: TRADING SIGNALS (BOT EXECUTION STRATEGIES) */}
          {activeSection === 'signals' && <SignalsManagement />}

          {/* SECTION 2: CANDLESTICK PATTERNS */}
          {activeSection === 'patterns' && (
            <div className="space-y-6">
              {/* Action Toolbar: Search + Filter Tabs + Create Button */}
              <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
                {/* Filter Tabs */}
                <div className="flex items-center gap-1 overflow-x-auto pb-2 lg:pb-0 scrollbar-none">
                  <button
                    onClick={() => setSelectedFilter('ALL')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                      selectedFilter === 'ALL'
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                        : 'bg-slate-900 text-slate-400 border border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    Tất Cả ({patterns.length})
                  </button>

                  <button
                    onClick={() => setSelectedFilter('SINGLE')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                      selectedFilter === 'SINGLE'
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                        : 'bg-slate-900 text-slate-400 border border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    Nến Đơn ({singleCount})
                  </button>

                  <button
                    onClick={() => setSelectedFilter('DOUBLE')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                      selectedFilter === 'DOUBLE'
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                        : 'bg-slate-900 text-slate-400 border border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    Nến Đôi ({doubleCount})
                  </button>

                  <button
                    onClick={() => setSelectedFilter('TRIPLE')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                      selectedFilter === 'TRIPLE'
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                        : 'bg-slate-900 text-slate-400 border border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    Nến Ba ({tripleCount})
                  </button>

                  <button
                    onClick={() => setSelectedFilter('MULTI')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                      selectedFilter === 'MULTI'
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                        : 'bg-slate-900 text-slate-400 border border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    Đa Nến ({multiCount})
                  </button>
                </div>

                {/* Right: Search & Action Buttons */}
                <div className="flex items-center gap-2.5">
                  {/* Search input */}
                  <div className="relative flex-1 lg:w-56">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder="Tìm kiếm mẫu nến..."
                      className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-cyan-500 transition"
                    />
                  </div>

                  {/* Reset to defaults button */}
                  <button
                    onClick={handleResetPatterns}
                    title="Khôi phục về bộ nến mẫu chuẩn ban đầu"
                    className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>

                  {/* Create new pattern button */}
                  <button
                    onClick={handleCreatePattern}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-md shadow-cyan-500/20 transition whitespace-nowrap"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Thêm Mẫu Nến Mới</span>
                  </button>
                </div>
              </div>

              {/* Patterns Grid Cards */}
              {isLoadingPatterns ? (
                <div className="py-16 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2">
                  <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                  <span>Đang tải danh sách định nghĩa mô hình nến...</span>
                </div>
              ) : filteredPatterns.length === 0 ? (
                <div className="py-16 text-center text-slate-400 text-xs bg-slate-900/40 rounded-2xl border border-slate-800 flex flex-col items-center justify-center gap-3">
                  <Layers className="w-10 h-10 text-slate-600" />
                  <p className="text-sm font-semibold text-slate-300">Không tìm thấy mô hình nến nào phù hợp</p>
                  <p className="text-xs text-slate-500">Hãy thử đổi từ khóa tìm kiếm hoặc bấm nút "Thêm Mẫu Nến Mới"</p>
                  <button
                    onClick={handleResetPatterns}
                    className="mt-2 px-4 py-2 rounded-xl text-xs font-bold text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 hover:bg-cyan-500/20 transition"
                  >
                    Khôi phục 16+ mẫu nến chuẩn
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {filteredPatterns.map(p => (
                    <PatternCard
                      key={p.id}
                      pattern={p}
                      onToggle={handleTogglePattern}
                      onEdit={handleEditPattern}
                      onDelete={handleDeletePattern}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* SECTION 3: PURE TECHNICAL INDICATORS */}
          {activeSection === 'indicators' && <IndicatorsManagement />}

          {/* SECTION 4: USERS & ROLES ROADMAP */}
          {activeSection === 'users' && <UsersRoadmap />}

          {/* SECTION 5: SYSTEM MODULES ROADMAP */}
          {activeSection === 'modules' && <ModulesRoadmap />}
        </div>
      </main>

      {/* Candlestick Pattern Add / Edit Modal */}
      <PatternModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSavePattern}
        editingPattern={editingPattern}
      />
    </div>
  );
};
