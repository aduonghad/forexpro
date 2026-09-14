import React, { useState, useEffect, useCallback } from 'react';
import { ExnessAccount } from '../../types';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { 
  Wallet, 
  Plus, 
  CheckCircle2, 
  Trash2, 
  Edit3, 
  RefreshCw, 
  Server, 
  Shield, 
  Activity, 
  Zap, 
  Layers, 
  Key, 
  ExternalLink, 
  AlertCircle,
  Clock,
  Radio, 
  X, 
  Star,
  Lock,
  UserCheck,
  Users,
  LogIn
} from 'lucide-react';

interface ExnessAccountsManagerProps {
  onAccountSwitched?: (account: ExnessAccount) => void;
}

// Popular Exness servers for auto-complete/quick pick
const COMMON_EXNESS_SERVERS = [
  'Exness-Real',
  'Exness-Real1',
  'Exness-Real2',
  'Exness-Real3',
  'Exness-Real5',
  'Exness-Real10',
  'Exness-Real15',
  'Exness-Real20',
  'Exness-Real25',
  'Exness-Trial',
  'Exness-Trial2',
  'Exness-MT5Real',
  'Exness-MT5Trial'
];

export const ExnessAccountsManager: React.FC<ExnessAccountsManagerProps> = ({ onAccountSwitched }) => {
  const { user, isAuthenticated, openAuthModal } = useAuth();
  const [accounts, setAccounts] = useState<ExnessAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<ExnessAccount | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ id: string; success: boolean; message: string; latency?: number } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form states
  const [formName, setFormName] = useState('');
  const [formLogin, setFormLogin] = useState('');
  const [formServer, setFormServer] = useState('Exness-Real25');
  const [formType, setFormType] = useState<'REAL' | 'DEMO'>('REAL');
  const [formPlatform, setFormPlatform] = useState<'MT5' | 'MT4'>('MT5');
  const [formPassword, setFormPassword] = useState('');
  const [formInvestorPassword, setFormInvestorPassword] = useState('');
  const [formLeverage, setFormLeverage] = useState(500);
  const [formBalance, setFormBalance] = useState('10000');
  const [formSetAsActive, setFormSetAsActive] = useState(true);

  const loadAccounts = useCallback(async () => {
    if (!isAuthenticated) {
      setAccounts([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const data = await api.getExnessAccounts();
      setAccounts(data || []);
    } catch (err: any) {
      console.error('Lỗi khi tải danh sách tài khoản Exness:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  const handleOpenCreateModal = () => {
    if (!isAuthenticated) {
      openAuthModal('login');
      return;
    }
    setEditingAccount(null);
    setFormName('Tài Khoản Exness ' + (accounts.length + 1));
    setFormLogin('');
    setFormServer('Exness-Real25');
    setFormType('REAL');
    setFormPlatform('MT5');
    setFormPassword('');
    setFormInvestorPassword('');
    setFormLeverage(500);
    setFormBalance('10000');
    setFormSetAsActive(accounts.length === 0);
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (acc: ExnessAccount) => {
    setEditingAccount(acc);
    setFormName(acc.accountName);
    setFormLogin(acc.login);
    setFormServer(acc.server);
    setFormType(acc.accountType);
    setFormPlatform(acc.platform || 'MT5');
    setFormPassword(acc.password || '');
    setFormInvestorPassword(acc.investorPassword || '');
    setFormLeverage(acc.leverage || 500);
    setFormBalance(acc.balance.toString());
    setFormSetAsActive(acc.isActive);
    setErrorMsg(null);
    setIsModalOpen(true);
  };

  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formLogin.trim() || !formServer.trim()) {
      setErrorMsg('Vui lòng nhập đầy đủ Tên tài khoản, Số MT5 Login và Server!');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      if (editingAccount) {
        const res = await api.updateExnessAccount(editingAccount.id, {
          accountName: formName.trim(),
          login: formLogin.trim(),
          server: formServer.trim(),
          accountType: formType,
          platform: formPlatform,
          password: formPassword.trim() || undefined,
          investorPassword: formInvestorPassword.trim() || undefined,
          leverage: Number(formLeverage),
          balance: parseFloat(formBalance) || 10000,
          isActive: formSetAsActive
        });
        await loadAccounts();
        if (formSetAsActive && res.data && onAccountSwitched) {
          onAccountSwitched(res.data);
        }
      } else {
        const res = await api.createExnessAccount({
          accountName: formName.trim(),
          login: formLogin.trim(),
          server: formServer.trim(),
          accountType: formType,
          platform: formPlatform,
          password: formPassword.trim() || undefined,
          investorPassword: formInvestorPassword.trim() || undefined,
          leverage: Number(formLeverage),
          balance: parseFloat(formBalance) || 10000,
          setAsActive: formSetAsActive
        });
        await loadAccounts();
        if (formSetAsActive && res.data && onAccountSwitched) {
          onAccountSwitched(res.data);
        }
      }

      setIsModalOpen(false);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || err.message || 'Lỗi lưu tài khoản');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAccount = async (id: string, name: string) => {
    if (window.confirm(`Bạn có chắc chắn muốn xoá tài khoản "${name}" không?`)) {
      try {
        await api.deleteExnessAccount(id);
        await loadAccounts();
      } catch (err: any) {
        alert('Lỗi xoá tài khoản: ' + (err.response?.data?.error || err.message));
      }
    }
  };

  const handleSelectActive = async (id: string) => {
    try {
      const res = await api.selectExnessAccount(id);
      await loadAccounts();
      if (res.data && onAccountSwitched) {
        onAccountSwitched(res.data);
      }
    } catch (err: any) {
      alert('Lỗi kích hoạt tài khoản: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleTestConnection = async (id: string) => {
    setTestingId(id);
    setTestResult(null);
    try {
      const res = await api.testExnessAccount(id);
      setTestResult({
        id,
        success: true,
        message: res.data.message,
        latency: res.data.latencyMs
      });
      await loadAccounts();
    } catch (err: any) {
      setTestResult({
        id,
        success: false,
        message: err.response?.data?.error || err.message || 'Không thể kết nối máy chủ'
      });
    } finally {
      setTestingId(null);
    }
  };

  if (!isAuthenticated || !user) {
    return (
      <div className="py-14 px-6 text-center max-w-xl mx-auto bg-slate-900/70 rounded-3xl border border-slate-800 backdrop-blur-md shadow-2xl my-6">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-500/20 to-cyan-500/20 border border-indigo-500/30 flex items-center justify-center mx-auto mb-4 text-indigo-400 shadow-lg shadow-indigo-500/10">
          <Lock className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-white mb-2">
          Quản Lý Tài Khoản Exness Riêng Biệt Cho Từng Người Dùng
        </h3>
        <p className="text-xs text-slate-400 leading-relaxed mb-6 max-w-md mx-auto">
          Mỗi thành viên sở hữu kho tài khoản Exness MT5/MT4 riêng biệt và được bảo vệ độc lập. Vui lòng đăng nhập để xem, thêm mới hoặc chọn tài khoản Exness chạy Auto Bot của bạn.
        </p>
        <button
          onClick={() => openAuthModal('login')}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-lg shadow-cyan-500/25 transition cursor-pointer"
        >
          <LogIn className="w-4 h-4" />
          <span>Đăng Nhập / Đăng Ký Tài Khoản</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* User Scope Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-sm">
        <div className="flex items-center gap-3.5">
          <img
            src={user.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(user.email)}`}
            alt="avatar"
            className="w-11 h-11 rounded-xl bg-slate-800 border border-slate-700 object-cover shrink-0"
          />
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold text-white">{user.name}</span>
              <span className="text-[11px] px-2 py-0.5 rounded-md font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                {user.email}
              </span>
              <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase border ${
                user.plan === 'ultra' ? 'bg-purple-500/20 text-purple-300 border-purple-500/40' :
                user.plan === 'pro' ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' :
                user.plan === 'plus' ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' :
                'bg-slate-800 text-slate-300 border-slate-700'
              }`}>
                Gói {user.plan || 'Free'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Danh sách tài khoản Exness (Real/Demo) của bạn. Chọn tài khoản đang kích hoạt để chạy Auto Bot.
            </p>
          </div>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-indigo-500 via-blue-600 to-cyan-500 hover:from-indigo-400 hover:to-cyan-400 shadow-md shadow-indigo-500/20 transition whitespace-nowrap cursor-pointer self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Thêm Tài Khoản</span>
        </button>
      </div>

      {/* Account Cards Grid */}
      {isLoading ? (
        <div className="py-20 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span>Đang tải danh sách tài khoản Exness...</span>
        </div>
      ) : accounts.length === 0 ? (
        <div className="py-16 text-center text-slate-400 text-xs bg-slate-900/40 rounded-2xl border border-slate-800 flex flex-col items-center justify-center gap-3 p-6">
          <Wallet className="w-12 h-12 text-slate-600" />
          <p className="text-base font-bold text-slate-200">Chưa có tài khoản Exness nào được kết nối</p>
          <p className="text-xs text-slate-500 max-w-md">
            Nhấn vào nút bên dưới để thêm tài khoản Exness MT5/MT4 đầu tiên của bạn vào hệ thống tự động giao dịch.
          </p>
          <button
            onClick={handleOpenCreateModal}
            className="mt-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition shadow-lg shadow-indigo-500/20"
          >
            + Thêm Tài Khoản Exness Đầu Tiên
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {accounts.map(acc => {
            const isAccActive = acc.isActive;
            const isTesting = testingId === acc.id;
            const hasTest = testResult?.id === acc.id;

            return (
              <div
                key={acc.id}
                className={`
                  relative rounded-2xl p-5 transition-all duration-200 flex flex-col justify-between
                  ${isAccActive 
                    ? 'bg-gradient-to-b from-indigo-950/40 via-slate-900/90 to-slate-950 border-2 border-indigo-500/60 shadow-xl shadow-indigo-950/40 ring-1 ring-indigo-500/30' 
                    : 'bg-slate-900/70 hover:bg-slate-900/90 border border-slate-800 hover:border-slate-700 shadow-lg'
                  }
                `}
              >
                {/* Active Glowing Pin */}
                {isAccActive && (
                  <div className="absolute -top-3 left-4 px-3 py-0.5 rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 font-black text-[10px] uppercase tracking-wider flex items-center gap-1 shadow-md shadow-emerald-500/30">
                    <Star className="w-3 h-3 fill-slate-950" />
                    <span>Đang Giao Dịch Chính</span>
                  </div>
                )}

                <div>
                  {/* Top Row: Account Type & Platform Badge + Server */}
                  <div className="flex items-center justify-between gap-2 pt-1 mb-3">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider ${
                        acc.accountType === 'REAL'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      }`}>
                        {acc.accountType}
                      </span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                        {acc.platform || 'MT5'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-slate-400 text-xs font-mono">
                      <Server className="w-3.5 h-3.5 text-indigo-400" />
                      <span className="font-semibold text-slate-300">{acc.server}</span>
                    </div>
                  </div>

                  {/* Account Name & Login ID */}
                  <div className="mb-4">
                    <h3 className="text-base font-bold text-white flex items-center justify-between gap-2">
                      <span className="truncate">{acc.accountName}</span>
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-slate-400">ID MT5:</span>
                      <span className="font-mono font-bold text-sm text-cyan-300 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-800/40">
                        #{acc.login}
                      </span>
                    </div>
                  </div>

                  {/* Financial Stats Bar (Balance, Equity, Leverage) */}
                  <div className="grid grid-cols-2 gap-2.5 p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 mb-4 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Số dư (Balance)</span>
                      <span className="font-mono text-sm font-bold text-slate-100">
                        ${acc.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Đòn bẩy (Leverage)</span>
                      <span className="font-mono text-xs font-semibold text-indigo-300">
                        1:{acc.leverage || 500}
                      </span>
                    </div>
                  </div>

                  {/* Test Result Message if triggered */}
                  {hasTest && testResult && (
                    <div className={`p-2.5 rounded-xl text-xs mb-3 flex items-start gap-2 border ${
                      testResult.success 
                        ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' 
                        : 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                    }`}>
                      {testResult.success ? <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" /> : <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />}
                      <span className="leading-tight">{testResult.message}</span>
                    </div>
                  )}
                </div>

                {/* Bottom Action Controls */}
                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2 mt-2">
                  <div className="flex items-center gap-1.5">
                    {isAccActive ? (
                      <span className="text-xs font-bold text-emerald-400 flex items-center gap-1 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Đang Chọn</span>
                      </span>
                    ) : (
                      <button
                        onClick={() => handleSelectActive(acc.id)}
                        className="text-xs font-bold text-indigo-300 hover:text-white bg-indigo-500/15 hover:bg-indigo-600 px-3 py-1.5 rounded-lg border border-indigo-500/30 transition shadow-sm"
                      >
                        Kích Hoạt
                      </button>
                    )}

                    <button
                      onClick={() => handleTestConnection(acc.id)}
                      disabled={isTesting}
                      title="Kiểm tra kết nối tới máy chủ Exness"
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
                    >
                      <Activity className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin text-cyan-400' : ''}`} />
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEditModal(acc)}
                      title="Chỉnh sửa thông tin"
                      className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handleDeleteAccount(acc.id, acc.accountName)}
                      title="Xoá tài khoản này"
                      className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Add / Edit Exness Account */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto animate-fadeIn">
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {editingAccount ? 'Chỉnh Sửa Tài Khoản Exness' : 'Thêm Tài Khoản Exness Mới'}
                  </h3>
                  <p className="text-xs text-slate-400">Kết nối nền tảng MetaTrader 5 / MT4</p>
                </div>
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form Content */}
            <form onSubmit={handleSaveAccount} className="p-6 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Owner Info Box */}
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-slate-400">
                  <UserCheck className="w-4 h-4 text-indigo-400" />
                  <span>Tài khoản gán cho:</span>
                </div>
                <span className="font-semibold text-white font-mono truncate max-w-[220px]">
                  {editingAccount ? (editingAccount.userName || user.name) : user.name} ({editingAccount ? (editingAccount.userEmail || user.email) : user.email})
                </span>
              </div>

              {/* Tên gợi nhớ */}
              <div>
                <label className="text-xs font-semibold text-slate-300 mb-1.5 block">
                  Tên Gợi Nhớ Tài Khoản <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  placeholder="Ví dụ: Tài Khoản Scalping Vàng, Exness Real..."
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-indigo-500 transition"
                />
              </div>

              {/* Loại Tài Khoản & Nền Tảng */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 mb-1.5 block">
                    Loại Tài Khoản
                  </label>
                  <div className="grid grid-cols-2 gap-1 p-1 bg-slate-950 rounded-xl border border-slate-800">
                    <button
                      type="button"
                      onClick={() => setFormType('REAL')}
                      className={`py-1.5 rounded-lg text-xs font-bold transition ${
                        formType === 'REAL' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      REAL
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormType('DEMO')}
                      className={`py-1.5 rounded-lg text-xs font-bold transition ${
                        formType === 'DEMO' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      DEMO
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 mb-1.5 block">
                    Nền Tảng
                  </label>
                  <div className="grid grid-cols-2 gap-1 p-1 bg-slate-950 rounded-xl border border-slate-800">
                    <button
                      type="button"
                      onClick={() => setFormPlatform('MT5')}
                      className={`py-1.5 rounded-lg text-xs font-bold transition ${
                        formPlatform === 'MT5' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      MT5
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormPlatform('MT4')}
                      className={`py-1.5 rounded-lg text-xs font-bold transition ${
                        formPlatform === 'MT4' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      MT4
                    </button>
                  </div>
                </div>
              </div>

              {/* Số MT5 Login & Server */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 mb-1.5 block">
                    Số MT5 Login (Account ID) <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formLogin}
                    onChange={e => setFormLogin(e.target.value)}
                    placeholder="Ví dụ: 88392011"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 mb-1.5 block">
                    Máy Chủ (Server Exness) <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    list="exness-server-list"
                    value={formServer}
                    onChange={e => setFormServer(e.target.value)}
                    placeholder="Ví dụ: Exness-Real25"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:outline-none focus:border-indigo-500 transition"
                  />
                  <datalist id="exness-server-list">
                    {COMMON_EXNESS_SERVERS.map(srv => (
                      <option key={srv} value={srv} />
                    ))}
                  </datalist>
                </div>
              </div>

              {/* Đòn bẩy & Số dư ban đầu */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 mb-1.5 block">
                    Đòn Bẩy (Leverage)
                  </label>
                  <select
                    value={formLeverage}
                    onChange={e => setFormLeverage(Number(e.target.value))}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-indigo-500 transition"
                  >
                    <option value={200}>1:200</option>
                    <option value={500}>1:500 (Mặc định)</option>
                    <option value={1000}>1:1000</option>
                    <option value={2000}>1:2000 (Exness High)</option>
                    <option value={0}>1:Không giới hạn</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 mb-1.5 block">
                    Số Dư Ban Đầu (USD)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formBalance}
                    onChange={e => setFormBalance(e.target.value)}
                    placeholder="10000"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>
              </div>

              {/* Mật khẩu giao dịch (Tùy chọn) */}
              <div>
                <label className="text-xs font-semibold text-slate-300 mb-1.5 block">
                  Mật Khẩu Giao Dịch MT5 (Tùy chọn - Lưu mã hóa)
                </label>
                <input
                  type="password"
                  value={formPassword}
                  onChange={e => setFormPassword(e.target.value)}
                  placeholder="Điền mật khẩu giao dịch nếu muốn tự động khớp lệnh..."
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-indigo-500 transition"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Nếu chỉ muốn theo dõi số dư & nến, bạn có thể để trống hoặc chỉ nhập mật khẩu Investor.
                </p>
              </div>

              {/* Checkbox Đặt làm tài khoản chính */}
              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300 select-none">
                  <input
                    type="checkbox"
                    checked={formSetAsActive}
                    onChange={e => setFormSetAsActive(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-950 text-indigo-500 focus:ring-0 w-4 h-4"
                  />
                  <span>Đặt làm tài khoản giao dịch chính cho Auto Bot ngay sau khi lưu</span>
                </label>
              </div>

              {/* Modal Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-400 hover:to-blue-500 text-white text-xs font-bold transition shadow-md shadow-indigo-500/20 disabled:opacity-50"
                >
                  {isSubmitting ? 'Đang Lưu...' : editingAccount ? 'Cập Nhật Tài Khoản' : 'Lưu Tài Khoản'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
