import React, { useState, useRef, useEffect } from 'react';
import { Bot, Activity, BarChart3, Sliders, RefreshCw, Zap, Wifi, WifiOff, Play, Pause, Shield, LogIn, LogOut, ChevronDown, UserCheck } from 'lucide-react';
import { AccountInfo } from '../types';
import { useAuth } from '../context/AuthContext';

interface NavbarProps {
  activeTab: 'dashboard' | 'automations';
  setActiveTab: (tab: 'dashboard' | 'automations') => void;
  account: AccountInfo | null;
  isConnected: boolean;
  onToggleBot: () => void;
  onResetBalance: () => void;
  activeRulesCount: number;
  onNavigateAdmin: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  account,
  isConnected,
  onToggleBot,
  onResetBalance,
  activeRulesCount,
  onNavigateAdmin
}) => {
  const { user, isAuthenticated, logout, openAuthModal } = useAuth();
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setUserDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const pnl = account?.floatingPnl ?? 0;
  const isProfit = pnl >= 0;

  return (
    <header className="sticky top-0 z-50 glass-panel border-b border-slate-800/80 px-4 py-2.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Left: Brand Logo & Navigation */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2.5">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 shadow-lg shadow-cyan-500/20 text-white">
              <Bot className="w-5 h-5" />
              {account?.botActive && (
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 border-2 border-slate-900 rounded-full animate-ping" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold tracking-wider text-base bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-sky-300 to-blue-400">
                  EXNESS PRO
                </span>
                <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  MT5 Bot
                </span>
              </div>
              <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
                <span>{account?.server || 'Exness-Real25'}</span>
                <span>•</span>
                <span className="font-mono text-slate-300">ID: {account?.login || '88392011'}</span>
              </p>
            </div>
          </div>

          {/* Trader Navigation Menus (2 Main Menus) */}
          <nav className="flex items-center bg-slate-900/80 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/25'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Trang Chủ</span>
            </button>

            <button
              onClick={() => setActiveTab('automations')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'automations'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/25'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Sliders className="w-4 h-4" />
              <span>Yêu Cầu Tự Động</span>
              <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                {activeRulesCount}
              </span>
            </button>
          </nav>
        </div>

        {/* Right: Live Exness Account Stats & Bot Status */}
        <div className="flex items-center gap-3">
          {/* Account Metrics Bar */}
          <div className="hidden md:flex items-center gap-3 bg-slate-900/90 border border-slate-800/90 rounded-xl px-3.5 py-1.5 shadow-inner">
            <div>
              <span className="text-[10px] uppercase tracking-wider text-slate-400 block leading-tight">Số dư</span>
              <span className="font-mono text-xs font-semibold text-slate-200">
                ${account?.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="w-px h-6 bg-slate-800" />

            <div>
              <span className="text-[10px] uppercase tracking-wider text-slate-400 block leading-tight">Tài sản (Equity)</span>
              <span className="font-mono text-xs font-semibold text-cyan-400">
                ${account?.equity.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="w-px h-6 bg-slate-800" />

            <div>
              <span className="text-[10px] uppercase tracking-wider text-slate-400 block leading-tight">Lãi / Lỗ tạm tính</span>
              <span className={`font-mono text-xs font-bold ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                {isProfit ? '+' : ''}${pnl.toFixed(2)}
              </span>
            </div>

            <button
              onClick={onResetBalance}
              title="Khôi phục số dư $10,000 demo"
              className="p-1 rounded text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Bot State Master Toggle */}
          <button
            onClick={onToggleBot}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-semibold text-xs transition-all shadow-md ${
              account?.botActive
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                : 'bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30'
            }`}
          >
            {account?.botActive ? (
              <>
                <Play className="w-3.5 h-3.5 fill-emerald-400 text-emerald-400" />
                <span>BOT: ĐANG CHẠY</span>
              </>
            ) : (
              <>
                <Pause className="w-3.5 h-3.5 fill-rose-400 text-rose-400" />
                <span>BOT: TẠM DỪNG</span>
              </>
            )}
          </button>

          {/* Connection Status indicator */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[11px]">
            {isConnected ? (
              <>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-emerald-400 font-medium hidden sm:inline">LIVE</span>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                <span className="text-rose-400 font-medium hidden sm:inline">MẤT KẾT NỐI</span>
              </>
            )}
          </div>

          {/* User Auth Section */}
          {isAuthenticated && user ? (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-2 py-1 px-2 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-cyan-500/40 hover:bg-slate-800/60 transition shadow-sm"
              >
                <img
                  src={user.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(user.email)}`}
                  alt="avatar"
                  className="w-6 h-6 rounded-lg bg-slate-800 border border-slate-700 object-cover"
                />
                <div className="text-left hidden md:block">
                  <div className="text-[11px] font-semibold text-slate-200 leading-tight max-w-[90px] truncate">
                    {user.name}
                  </div>
                  <div className="text-[9px] text-cyan-400 font-bold uppercase tracking-wider flex items-center gap-1">
                    <span>{user.authProvider === 'google' ? 'Google' : 'Gmail'}</span>
                    {user.role === 'admin' && (
                      <span className="text-amber-400 font-extrabold">• Admin</span>
                    )}
                  </div>
                </div>
                <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${userDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {userDropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-slate-900/95 border border-slate-800 rounded-2xl shadow-2xl shadow-black/80 p-3 z-50 animate-in fade-in slide-in-from-top-2 backdrop-blur-md">
                  <div className="flex items-center gap-3 p-2 bg-slate-800/60 rounded-xl mb-2.5">
                    <img
                      src={user.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(user.email)}`}
                      alt="avatar"
                      className="w-9 h-9 rounded-xl bg-slate-700 border border-slate-600 object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-white truncate">{user.name}</p>
                      <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.2 mt-0.5 rounded text-[9px] bg-cyan-500/20 text-cyan-300 font-medium border border-cyan-500/30">
                        {user.authProvider === 'google' ? 'Đăng nhập Google API' : 'Tài khoản Email'}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <button
                      onClick={() => {
                        setUserDropdownOpen(false);
                        onNavigateAdmin();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:text-cyan-400 hover:bg-slate-800/80 rounded-xl transition"
                    >
                      <Shield className="w-3.5 h-3.5" />
                      <span>Cổng Quản Trị Hệ Thống</span>
                    </button>

                    <button
                      onClick={() => {
                        setUserDropdownOpen(false);
                        logout();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-rose-400 hover:bg-rose-500/10 rounded-xl transition font-medium"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Đăng Xuất Khỏi Thiết Bị</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => openAuthModal('login')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white transition text-xs font-semibold shadow-md shadow-cyan-500/25"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Đăng Nhập</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
