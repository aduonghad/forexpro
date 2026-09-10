import React, { useState, useEffect } from 'react';
import { CandlestickPattern, PatternCategory } from '../types';
import { api } from '../services/api';
import { PatternCard } from '../components/patterns/PatternCard';
import { PatternModal } from '../components/patterns/PatternModal';
import { TelegramSettings } from '../components/telegram/TelegramSettings';
import { UsersRoadmap } from '../components/management/UsersRoadmap';
import { ModulesRoadmap } from '../components/management/ModulesRoadmap';
import { IndicatorsManagement } from '../components/indicators/IndicatorsManagement';
import { SignalsManagement } from '../components/signals/SignalsManagement';
import { 
  Sliders, 
  Bell, 
  Users, 
  Cpu, 
  Plus, 
  RotateCcw, 
  Search, 
  Filter, 
  Sparkles, 
  CheckCircle2, 
  Layers, 
  Activity,
  Zap,
  ArrowLeft,
  LogOut,
  ShieldCheck
} from 'lucide-react';

interface ManagementPageProps {
  onBackToTrading?: () => void;
  onLogoutAdmin?: () => void;
}

export const ManagementPage: React.FC<ManagementPageProps> = ({ onBackToTrading, onLogoutAdmin }) => {
  const [activeSection, setActiveSection] = useState<'patterns' | 'indicators' | 'signals' | 'telegram' | 'users' | 'modules'>('patterns');

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
    // Category Filter
    if (selectedFilter === 'SINGLE' && p.category !== 'SINGLE') return false;
    if (selectedFilter === 'DOUBLE' && p.category !== 'DOUBLE') return false;
    if (selectedFilter === 'TRIPLE' && p.category !== 'TRIPLE') return false;
    if (selectedFilter === 'MULTI' && p.category !== 'MULTI') return false;

    // Text Search
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

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      {/* Admin Top Action Bar */}
      {(onBackToTrading || onLogoutAdmin) && (
        <div className="flex items-center justify-between p-3.5 bg-slate-900/90 border border-cyan-500/20 rounded-2xl shadow-lg shadow-cyan-950/20">
          <div className="flex items-center gap-3">
            {onBackToTrading && (
              <button
                onClick={onBackToTrading}
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-cyan-300 hover:text-white border border-slate-700/80 text-xs font-bold transition shadow-sm"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Quay Lại Sàn Giao Dịch</span>
              </button>
            )}
            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400 border-l border-slate-800 pl-3">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Chế độ Quản Trị Hệ Thống (<span className="font-mono text-cyan-400">/admin</span>)</span>
            </div>
          </div>

          {onLogoutAdmin && (
            <button
              onClick={onLogoutAdmin}
              title="Đăng xuất phiên quản trị"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/25 text-xs font-semibold transition"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Đăng Xuất Admin</span>
            </button>
          )}
        </div>
      )}

      {/* Page Title & Navigation Tabs */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-xl md:text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
            <Sliders className="w-6 h-6 text-cyan-400" />
            <span>Quản Lý Hệ Thống & Cấu Hình Nâng Cao</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Quản lý thông báo Telegram, định nghĩa mô hình nến Price Action và lộ trình tính năng
          </p>
        </div>

        {/* 4 Main Sub-Navigation Tabs */}
        <div className="flex items-center gap-1.5 p-1.5 rounded-xl bg-slate-900 border border-slate-800 self-stretch md:self-auto overflow-x-auto">
          <button
            onClick={() => setActiveSection('patterns')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              activeSection === 'patterns'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/25'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Mô Hình Nến</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-950/80 text-cyan-300">
              {patterns.length}
            </span>
          </button>

          <button
            onClick={() => setActiveSection('indicators')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              activeSection === 'indicators'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/25'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Chỉ Báo Kỹ Thuật</span>
            <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-cyan-500/20 text-cyan-300 font-mono">
              Params
            </span>
          </button>

          <button
            onClick={() => setActiveSection('signals')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              activeSection === 'signals'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/25'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Zap className="w-4 h-4 text-amber-300" />
            <span>Tín Hiệu Giao Dịch</span>
            <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-bold">
              Bot Trade
            </span>
          </button>

          <button
            onClick={() => setActiveSection('telegram')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              activeSection === 'telegram'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/25'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Bell className="w-4 h-4" />
            <span>Thông Báo Telegram</span>
          </button>

          <button
            onClick={() => setActiveSection('users')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              activeSection === 'users'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/25'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Người Dùng</span>
            <span className="text-[9px] px-1 py-0.2 rounded bg-cyan-500/20 text-cyan-300">V2</span>
          </button>

          <button
            onClick={() => setActiveSection('modules')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              activeSection === 'modules'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/25'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Cpu className="w-4 h-4" />
            <span>Chức Năng</span>
            <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-300">Beta</span>
          </button>
        </div>
      </div>

      {/* SECTION 1: CANDLESTICK PATTERNS */}
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

      {/* SECTION 2: PURE TECHNICAL INDICATORS */}
      {activeSection === 'indicators' && <IndicatorsManagement />}

      {/* SECTION 3: TRADING SIGNALS (BOT EXECUTION STRATEGIES) */}
      {activeSection === 'signals' && <SignalsManagement />}

      {/* SECTION 4: TELEGRAM SETTINGS */}
      {activeSection === 'telegram' && <TelegramSettings />}

      {/* SECTION 3: USERS & ROLES ROADMAP */}
      {activeSection === 'users' && <UsersRoadmap />}

      {/* SECTION 4: SYSTEM MODULES ROADMAP */}
      {activeSection === 'modules' && <ModulesRoadmap />}

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
