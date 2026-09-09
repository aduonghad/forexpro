import React from 'react';
import { Order } from '../../types';
import { TrendingUp, TrendingDown, XCircle, AlertOctagon, CheckCircle2 } from 'lucide-react';

interface OpenPositionsProps {
  orders: Order[];
  onCloseOrder: (orderId: string) => void;
  onCloseAll: () => void;
}

export const OpenPositions: React.FC<OpenPositionsProps> = ({ orders, onCloseOrder, onCloseAll }) => {
  const openOrders = orders.filter(o => o.status === 'OPEN');
  const totalFloatingPnl = openOrders.reduce((sum, o) => sum + o.pnl, 0);
  const isProfit = totalFloatingPnl >= 0;

  return (
    <div className="glass-panel rounded-2xl p-4 border border-slate-800 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <span>Vị Thế Đang Mở (Open Positions)</span>
            <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-slate-800 text-cyan-300">
              {openOrders.length}
            </span>
          </h3>
        </div>

        {openOrders.length > 0 && (
          <div className="flex items-center gap-4">
            <div className="text-xs">
              <span className="text-slate-400 mr-2">Tổng PnL:</span>
              <span className={`font-mono font-extrabold text-sm ${isProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                {isProfit ? '+' : ''}${totalFloatingPnl.toFixed(2)} USD
              </span>
            </div>

            <button
              onClick={onCloseAll}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30 transition"
            >
              <AlertOctagon className="w-3.5 h-3.5" />
              <span>Đóng Tất Cả</span>
            </button>
          </div>
        )}
      </div>

      {/* Table Content */}
      {openOrders.length === 0 ? (
        <div className="py-8 text-center text-slate-500 text-xs flex flex-col items-center justify-center gap-2">
          <CheckCircle2 className="w-8 h-8 text-slate-600" />
          <p>Hiện không có lệnh nào đang mở.</p>
          <p className="text-[11px] text-slate-600">Bot đang quét tín hiệu thị trường để vào lệnh tự động.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-slate-400 border-b border-slate-800/60 pb-2">
                <th className="pb-2 font-medium">Mã</th>
                <th className="pb-2 font-medium">Loại</th>
                <th className="pb-2 font-medium">Khối lượng</th>
                <th className="pb-2 font-medium">Giá vào</th>
                <th className="pb-2 font-medium">Giá hiện tại</th>
                <th className="pb-2 font-medium">Cắt lỗ (SL)</th>
                <th className="pb-2 font-medium">Chốt lời (TP)</th>
                <th className="pb-2 font-medium">Yêu cầu / Chiến lược</th>
                <th className="pb-2 font-medium text-right">Lãi / Lỗ</th>
                <th className="pb-2 font-medium text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40 font-mono">
              {openOrders.map(order => {
                const orderProfit = order.pnl >= 0;
                return (
                  <tr key={order.id} className="hover:bg-slate-900/40 transition">
                    <td className="py-2.5 font-bold text-slate-200">{order.symbol}</td>
                    <td className="py-2.5">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold ${
                          order.type === 'BUY'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        }`}
                      >
                        {order.type === 'BUY' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {order.type}
                      </span>
                    </td>
                    <td className="py-2.5 text-slate-300">{order.lot} Lot</td>
                    <td className="py-2.5 text-slate-300">{order.openPrice}</td>
                    <td className="py-2.5 text-slate-100 font-semibold">{order.currentPrice}</td>
                    <td className="py-2.5 text-rose-400/80">{order.sl ? order.sl : '---'}</td>
                    <td className="py-2.5 text-emerald-400/80">{order.tp ? order.tp : '---'}</td>
                    <td className="py-2.5 text-slate-400 text-[11px] font-sans truncate max-w-[140px]">
                      {order.ruleName || 'Thủ công'}
                    </td>
                    <td className={`py-2.5 text-right font-bold ${orderProfit ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {orderProfit ? '+' : ''}${order.pnl.toFixed(2)}
                    </td>
                    <td className="py-2.5 text-center">
                      <button
                        onClick={() => onCloseOrder(order.id)}
                        className="px-2 py-1 rounded bg-slate-800 hover:bg-rose-600/30 hover:text-rose-300 text-slate-400 transition text-[11px]"
                        title="Đóng lệnh này"
                      >
                        Đóng
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
