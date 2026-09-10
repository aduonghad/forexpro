import React, { useState } from 'react';
import { UserItem, UserRole } from '../../types';
import { Users, Shield, Plus, Lock, Check, Clock, UserCheck, Key } from 'lucide-react';

export const UsersRoadmap: React.FC = () => {
  const [users, setUsers] = useState<UserItem[]>([
    {
      id: 'u-1',
      name: 'Hoàng Dương (Administrator)',
      email: 'aduonghad@exness-pro.local',
      role: 'ADMIN',
      status: 'ACTIVE',
      lastLogin: Date.now() - 1000 * 60 * 15
    },
    {
      id: 'u-2',
      name: 'Trader Alex Nguyen',
      email: 'alex.nguyen@forexpro.io',
      role: 'TRADER',
      status: 'ACTIVE',
      lastLogin: Date.now() - 1000 * 60 * 60 * 5
    },
    {
      id: 'u-3',
      name: 'Auditor Minh Tran',
      email: 'minh.tran@audit.sec',
      role: 'VIEWER',
      status: 'PENDING',
      lastLogin: Date.now() - 1000 * 60 * 60 * 24
    }
  ]);

  const handleAddUserClick = () => {
    alert('Tính năng "Thêm Người Dùng Mới & Xác Thực 2 Lớp (2FA)" đang được phát triển và sẽ ra mắt trong bản cập nhật V2!');
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Notice Banner */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-blue-950/40 to-cyan-950/40 border border-cyan-500/30 flex items-start gap-3">
        <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 mt-0.5">
          <Clock className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-sm font-bold text-cyan-300">
            Roadmap Tính Năng: Quản Lý Phân Quyền Đa Người Dùng (Multi-User & RBAC)
          </h4>
          <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
            Hệ thống đang chuẩn bị cơ sở hạ tầng cho phép phân quyền tài khoản quản trị: 
            <strong> Administrator</strong> (Toàn quyền), 
            <strong> Trader</strong> (Chỉ thao tác bật/tắt bot và khớp lệnh), và 
            <strong> Viewer</strong> (Nhà đầu tư chỉ xem biểu đồ và PnL).
          </p>
        </div>
      </div>

      {/* Main Users Table */}
      <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Users className="w-4 h-4 text-cyan-400" />
              Danh Sách Tài Khoản Truy Cập ({users.length})
            </h3>
            <p className="text-xs text-slate-400">
              Quản lý tài khoản đăng nhập vào hệ thống Web Trading Bot
            </p>
          </div>

          <button
            onClick={handleAddUserClick}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-500 shadow-md shadow-cyan-600/20 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Thêm Thành Viên</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="py-3 px-3">Họ và Tên</th>
                <th className="py-3 px-3">Email</th>
                <th className="py-3 px-3">Vai Trò</th>
                <th className="py-3 px-3">Trạng Thái</th>
                <th className="py-3 px-3">Hoạt Động Gần Nhất</th>
                <th className="py-3 px-3 text-right">Hành Động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-slate-800/40 transition">
                  <td className="py-3 px-3 font-semibold text-slate-100 flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center font-bold text-white text-[11px]">
                      {u.name.charAt(0)}
                    </div>
                    <span>{u.name}</span>
                  </td>
                  <td className="py-3 px-3 font-mono text-slate-300">{u.email}</td>
                  <td className="py-3 px-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      u.role === 'ADMIN' ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30' :
                      u.role === 'TRADER' ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30' :
                      'bg-slate-700 text-slate-300'
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="py-3 px-3">
                    <span className={`inline-flex items-center gap-1 text-[11px] font-medium ${
                      u.status === 'ACTIVE' ? 'text-emerald-400' : 'text-amber-400'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        u.status === 'ACTIVE' ? 'bg-emerald-400' : 'bg-amber-400'
                      }`} />
                      {u.status === 'ACTIVE' ? 'Đang hoạt động' : 'Chờ duyệt'}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-slate-400 font-mono text-[11px]">
                    {new Date(u.lastLogin).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={handleAddUserClick}
                      className="text-slate-400 hover:text-cyan-400 transition"
                      title="Chỉnh sửa quyền"
                    >
                      <Key className="w-3.5 h-3.5 inline" />
                    </button>
                  </td>
                </tr>
              ))}
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2">
            <h4 className="text-xs font-bold text-amber-400">👑 Administrator</h4>
            <ul className="text-xs text-slate-300 space-y-1.5">
              <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-400" /> Bật / Tắt hệ thống giao dịch</li>
              <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-400" /> Thêm, sửa, xoá Yêu cầu tự động & Nến</li>
              <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-400" /> Cấu hình Telegram & Webhook Secret</li>
              <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-400" /> Đóng lệnh khẩn cấp & Reset số dư</li>
            </ul>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2">
            <h4 className="text-xs font-bold text-cyan-400">⚡ Trader</h4>
            <ul className="text-xs text-slate-300 space-y-1.5">
              <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-400" /> Bật / Tắt Yêu cầu tự động có sẵn</li>
              <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-400" /> Đóng lệnh thủ công & Xem PnL</li>
              <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-400" /> Trò chuyện trực tiếp với Bot Chat</li>
              <li className="flex items-center gap-1.5 text-slate-500"><Lock className="w-3.5 h-3.5" /> Không được đổi API Keys</li>
            </ul>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2">
            <h4 className="text-xs font-bold text-slate-400">👁️ Viewer (Nhà Đầu Tư)</h4>
            <ul className="text-xs text-slate-300 space-y-1.5">
              <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-400" /> Xem biểu đồ nến thời gian thực</li>
              <li className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-400" /> Xem lịch sử lệnh & Lợi nhuận</li>
              <li className="flex items-center gap-1.5 text-slate-500"><Lock className="w-3.5 h-3.5" /> Không được can thiệp vào lệnh</li>
              <li className="flex items-center gap-1.5 text-slate-500"><Lock className="w-3.5 h-3.5" /> Không xem được mã Webhook</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
