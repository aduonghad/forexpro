import React, { useState, useEffect } from 'react';
import { User } from '../../types';
import { api } from '../../services/api';
import {
  Users,
  Shield,
  Plus,
  Lock,
  Check,
  Clock,
  RefreshCw,
  Trash2,
  Search,
  Mail,
  UserCheck,
  AlertCircle,
  X
} from 'lucide-react';

export const UsersRoadmap: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'admin' | 'user'>('ALL');

  // Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'user' | 'admin'>('user');
  const [newPlan, setNewPlan] = useState<'free' | 'plus' | 'pro' | 'ultra'>('free');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.auth.getUsers();
      setUsers(data);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Lỗi tải danh sách người dùng từ database');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleRoleChange = async (userId: string, targetRole: 'user' | 'admin') => {
    setActionLoadingId(userId);
    setError(null);
    setSuccessMsg(null);
    try {
      const updated = await api.auth.updateUserRole(userId, targetRole);
      setUsers(prev => prev.map(u => (u.id === userId ? updated : u)));
      setSuccessMsg(`Đã cập nhật vai trò người dùng thành "${targetRole.toUpperCase()}" thành công!`);
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Lỗi cập nhật vai trò');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handlePlanChange = async (userId: string, targetPlan: string) => {
    setActionLoadingId(userId);
    setError(null);
    setSuccessMsg(null);
    try {
      const updated = await api.auth.updateUserPlan(userId, targetPlan);
      setUsers(prev => prev.map(u => (u.id === userId ? updated : u)));
      setSuccessMsg(`Đã cập nhật gói dịch vụ thành "${targetPlan.toUpperCase()}" thành công!`);
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Lỗi cập nhật gói dịch vụ');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeleteUser = async (user: User) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xoá tài khoản "${user.name} (${user.email})" khỏi cơ sở dữ liệu MongoDB?`)) {
      return;
    }

    setActionLoadingId(user.id);
    setError(null);
    setSuccessMsg(null);
    try {
      await api.auth.deleteUser(user.id);
      setUsers(prev => prev.filter(u => u.id !== user.id));
      setSuccessMsg(`Đã xoá tài khoản ${user.email} khỏi database thành công!`);
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Lỗi xoá người dùng');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCreateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim()) {
      alert('Vui lòng nhập địa chỉ email');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const created = await api.auth.createUser({
        email: newEmail.trim(),
        name: newName.trim(),
        password: newPassword.trim() || undefined,
        role: newRole,
        plan: newPlan
      });
      setUsers(prev => [created, ...prev]);
      setSuccessMsg(`Đã thêm tài khoản "${created.email}" (${newPlan.toUpperCase()}) vào database thành công!`);
      setIsAddModalOpen(false);
      setNewEmail('');
      setNewName('');
      setNewPassword('');
      setNewRole('user');
      setNewPlan('free');
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (err: any) {
      alert(err.response?.data?.error || err.message || 'Lỗi tạo tài khoản');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered users
  const filteredUsers = users.filter(u => {
    const matchSearch =
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchRole = roleFilter === 'ALL' || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  // Summary Metrics
  const totalUsers = users.length;
  const googleUsers = users.filter(u => u.authProvider === 'google').length;
  const localUsers = users.filter(u => u.authProvider === 'local').length;
  const adminUsers = users.filter(u => u.role === 'admin').length;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Alert Banners */}
      {error && (
        <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Summary Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
          <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">Tổng Người Dùng</span>
          <span className="text-xl font-extrabold text-white font-mono mt-1 block">{totalUsers}</span>
          <span className="text-[10px] text-cyan-400 mt-0.5 block">Đã lưu trong MongoDB</span>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
          <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">Tài Khoản Google</span>
          <span className="text-xl font-extrabold text-sky-400 font-mono mt-1 block">{googleUsers}</span>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Xác thực qua Google API</span>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
          <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">Tài Khoản Email</span>
          <span className="text-xl font-extrabold text-emerald-400 font-mono mt-1 block">{localUsers}</span>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Mã hóa Bcrypt an toàn</span>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
          <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">Quản Trị Viên</span>
          <span className="text-xl font-extrabold text-amber-400 font-mono mt-1 block">{adminUsers}</span>
          <span className="text-[10px] text-slate-400 mt-0.5 block">Toàn quyền hệ thống</span>
        </div>
      </div>

      {/* Main Users Table Card */}
      <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Users className="w-4 h-4 text-cyan-400" />
              <span>Danh Sách Người Dùng Cơ Sở Dữ Liệu ({filteredUsers.length}/{totalUsers})</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Dữ liệu người dùng được đồng bộ và cập nhật trực tiếp từ bộ sưu tập <code className="text-cyan-300 font-mono">users</code> trong MongoDB
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchUsers}
              disabled={loading}
              title="Tải lại danh sách từ MongoDB"
              className="p-2 rounded-xl text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
            </button>

            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-md shadow-cyan-600/20 transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Thêm Thành Viên</span>
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm theo tên hoặc email..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setRoleFilter('ALL')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${
                roleFilter === 'ALL' ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Tất Cả ({totalUsers})
            </button>
            <button
              onClick={() => setRoleFilter('admin')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${
                roleFilter === 'admin' ? 'bg-amber-500/20 text-amber-300' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Admin ({adminUsers})
            </button>
            <button
              onClick={() => setRoleFilter('user')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${
                roleFilter === 'user' ? 'bg-emerald-500/20 text-emerald-300' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              User ({totalUsers - adminUsers})
            </button>
          </div>
        </div>

        {/* Users Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="py-3 px-3">Người Dùng</th>
                <th className="py-3 px-3">Email</th>
                <th className="py-3 px-3">Phương Thức</th>
                <th className="py-3 px-3">Vai Trò</th>
                <th className="py-3 px-3">Gói Dịch Vụ</th>
                <th className="py-3 px-3">Ngày Tạo</th>
                <th className="py-3 px-3 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading && users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto text-cyan-400 mb-2" />
                    <span>Đang tải danh sách người dùng từ MongoDB...</span>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    Không tìm thấy người dùng phù hợp trong database.
                  </td>
                </tr>
              ) : (
                filteredUsers.map(u => (
                  <tr key={u.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-3 font-semibold text-slate-100">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={u.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(u.email)}`}
                          alt={u.name}
                          className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 object-cover shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="font-bold text-slate-200 truncate">{u.name}</p>
                          <p className="text-[10px] text-slate-500 font-mono truncate">ID: {u.id.substring(0, 8)}...</p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-3 font-mono text-slate-300">{u.email}</td>

                    <td className="py-3 px-3">
                      {u.authProvider === 'google' ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/15 text-sky-300 border border-sky-500/30">
                          <svg className="w-3 h-3" viewBox="0 0 24 24">
                            <path
                              fill="#4285F4"
                              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                            />
                            <path
                              fill="#34A853"
                              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                            />
                            <path
                              fill="#FBBC05"
                              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                            />
                            <path
                              fill="#EA4335"
                              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                            />
                          </svg>
                          <span>Google OAuth</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                          <Mail className="w-3 h-3 text-emerald-400" />
                          <span>Gmail & Mật Khẩu</span>
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-3">
                      <select
                        value={u.role}
                        disabled={actionLoadingId === u.id}
                        onChange={(e) => handleRoleChange(u.id, e.target.value as 'user' | 'admin')}
                        className={`text-xs font-bold rounded-lg px-2 py-1 bg-slate-950 border transition cursor-pointer ${
                          u.role === 'admin'
                            ? 'text-amber-400 border-amber-500/40 bg-amber-500/10'
                            : 'text-slate-300 border-slate-700 hover:border-slate-500'
                        }`}
                      >
                        <option value="user" className="bg-slate-900 text-slate-200">
                          User (Người Dùng)
                        </option>
                        <option value="admin" className="bg-slate-900 text-amber-300">
                          Admin (Quản Trị)
                        </option>
                      </select>
                    </td>

                    <td className="py-3 px-3">
                      <select
                        value={u.plan || 'free'}
                        disabled={actionLoadingId === u.id}
                        onChange={(e) => handlePlanChange(u.id, e.target.value)}
                        className={`text-xs font-bold rounded-lg px-2 py-1 bg-slate-950 border transition cursor-pointer ${
                          u.plan === 'ultra' ? 'text-purple-300 border-purple-500/40 bg-purple-500/10' :
                          u.plan === 'pro' ? 'text-amber-300 border-amber-500/40 bg-amber-500/10' :
                          u.plan === 'plus' ? 'text-cyan-300 border-cyan-500/40 bg-cyan-500/10' :
                          'text-slate-400 border-slate-700 bg-slate-900'
                        }`}
                      >
                        <option value="free" className="bg-slate-900 text-slate-300">FREE (1 tín hiệu)</option>
                        <option value="plus" className="bg-slate-900 text-cyan-300">PLUS (3 tín hiệu)</option>
                        <option value="pro" className="bg-slate-900 text-amber-300">PRO (10 tín hiệu + Bot)</option>
                        <option value="ultra" className="bg-slate-900 text-purple-300">ULTRA (Không giới hạn)</option>
                      </select>
                    </td>

                    <td className="py-3 px-3 text-slate-400 font-mono text-[11px]">
                      {new Date(u.createdAt).toLocaleDateString('vi-VN', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                      })}
                    </td>

                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => handleDeleteUser(u)}
                        disabled={actionLoadingId === u.id}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                        title="Xoá người dùng này khỏi Database"
                      >
                        <Trash2 className="w-3.5 h-3.5 inline" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Permissions Matrix */}
      <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
        <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
          <Shield className="w-4 h-4 text-emerald-400" />
          Bảng Quyền Hạn Chi Tiết (Role Permission Matrix)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2">
            <h4 className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
              <span>👑 Administrator</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-normal">Toàn quyền</span>
            </h4>
            <ul className="text-xs text-slate-300 space-y-1.5">
              <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-400" /> Quản lý danh sách người dùng trong MongoDB</li>
              <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-400" /> Thêm, sửa, xoá Yêu cầu tự động & Nến</li>
              <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-400" /> Cấu hình Telegram & Webhook Secret</li>
              <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-400" /> Đóng lệnh khẩn cấp & Reset số dư demo</li>
            </ul>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2">
            <h4 className="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
              <span>⚡ Trader / User</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 font-normal">Tiêu chuẩn</span>
            </h4>
            <ul className="text-xs text-slate-300 space-y-1.5">
              <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-400" /> Xem biểu đồ nến, phân tích kỹ thuật và lệnh mở</li>
              <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-400" /> Đóng lệnh thủ công & Trò chuyện với Bot Chat</li>
              <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-400" /> Lưu hồ sơ cá nhân và lịch sử đăng nhập</li>
              <li className="flex items-center gap-1.5 text-slate-500"><Lock className="w-3.5 h-3.5" /> Không có quyền thay đổi cấu hình cổng quản trị</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Modal Thêm Thành Viên Mới */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6 overflow-hidden">
            <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-cyan-400" />
                Thêm Thành Viên Vào Database
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateUserSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Họ và Tên</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Nguyễn Văn A"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Địa chỉ Email / Gmail</label>
                <input
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="trader@gmail.com"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Mật khẩu ban đầu</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Để trống sẽ lấy mặc định: Exness@2026"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Vai Trò</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as 'user' | 'admin')}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="user">User (Người Dùng Tiêu Chuẩn)</option>
                  <option value="admin">Admin (Quản Trị Viên Hệ Thống)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Gói Dịch Vụ Cấp Phát</label>
                <select
                  value={newPlan}
                  onChange={(e) => setNewPlan(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="free">FREE - 1 tín hiệu tự động</option>
                  <option value="plus">PLUS - 3 tín hiệu tự động</option>
                  <option value="pro">PRO - 10 tín hiệu + Bot Telegram</option>
                  <option value="ultra">ULTRA - Không giới hạn + Bot Telegram</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white bg-slate-800 transition"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl text-white font-bold bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 transition shadow-md shadow-cyan-500/20 disabled:opacity-50"
                >
                  {isSubmitting ? 'Đang lưu...' : 'Tạo Người Dùng'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
