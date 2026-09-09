import React, { useState } from 'react';
import { AutomationRule } from '../types';
import { RuleCard } from '../components/rules/RuleCard';
import { RuleModal } from '../components/rules/RuleModal';
import { TradingViewGuideModal } from '../components/rules/TradingViewGuideModal';
import { Plus, Zap, Sliders, ShieldCheck, CheckCircle2, Search, Filter } from 'lucide-react';

interface AutomationsPageProps {
  rules: AutomationRule[];
  onToggleRule: (id: string, active: boolean) => void;
  onSaveRule: (ruleData: Partial<AutomationRule>) => void;
  onDeleteRule: (id: string) => void;
}

export const AutomationsPage: React.FC<AutomationsPageProps> = ({
  rules,
  onToggleRule,
  onSaveRule,
  onDeleteRule
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<AutomationRule | null>(null);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSymbol, setFilterSymbol] = useState<string>('ALL');

  const totalRules = rules.length;
  const activeRules = rules.filter(r => r.isActive).length;
  const totalTrades = rules.reduce((acc, r) => acc + r.totalTrades, 0);
  const totalProfit = rules.reduce((acc, r) => acc + r.totalProfit, 0);

  const handleOpenAdd = () => {
    setEditingRule(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (rule: AutomationRule) => {
    setEditingRule(rule);
    setIsModalOpen(true);
  };

  const handleDeleteWithConfirm = (id: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xoá yêu cầu tự động này?')) {
      onDeleteRule(id);
    }
  };

  const filteredRules = rules.filter(r => {
    const matchesSearch = r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          r.symbol.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSymbol = filterSymbol === 'ALL' || r.symbol === filterSymbol;
    return matchesSearch && matchesSymbol;
  });

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 space-y-6">
      {/* Top Banner: Metrics & Actions */}
      <div className="glass-panel rounded-2xl p-6 border border-slate-800 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-500/20">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-white">Quản Lý Yêu Cầu Tự Động (Automation Rules)</h2>
              <p className="text-xs text-slate-400">
                Cài đặt chiến lược thuật toán vào lệnh tự động trên sàn Exness
              </p>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="mt-4 flex flex-wrap items-center gap-4 text-xs">
            <div className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-slate-400 mr-2">Tổng số yêu cầu:</span>
              <span className="font-mono font-bold text-slate-100">{totalRules}</span>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-slate-400 mr-2">Đang kích hoạt:</span>
              <span className="font-mono font-bold text-emerald-400">{activeRules}</span>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-slate-400 mr-2">Tổng lệnh khớp:</span>
              <span className="font-mono font-bold text-cyan-300">{totalTrades}</span>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-slate-400 mr-2">Lợi nhuận tích lũy:</span>
              <span className={`font-mono font-bold ${totalProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {totalProfit >= 0 ? '+' : ''}${totalProfit.toFixed(2)} USD
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            onClick={() => setIsGuideOpen(true)}
            className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30 hover:bg-purple-500/30 transition shadow-md"
          >
            <Zap className="w-4 h-4" />
            <span>Webhook TradingView</span>
          </button>

          <button
            onClick={handleOpenAdd}
            className="flex-1 md:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 transition shadow-lg shadow-cyan-500/25"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm Yêu Cầu Tự Động</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Tìm theo tên yêu cầu hoặc symbol..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-900/80 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition"
          />
        </div>

        <div className="flex items-center gap-1.5 self-end sm:self-auto overflow-x-auto text-xs">
          <span className="text-slate-500 text-[11px] mr-1">Lọc cặp:</span>
          {['ALL', 'XAUUSD', 'EURUSD', 'GBPUSD', 'USDJPY', 'BTCUSD'].map(sym => (
            <button
              key={sym}
              onClick={() => setFilterSymbol(sym)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                filterSymbol === sym
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {sym === 'ALL' ? 'Tất cả' : sym}
            </button>
          ))}
        </div>
      </div>

      {/* Rules Grid */}
      {filteredRules.length === 0 ? (
        <div className="glass-panel rounded-2xl py-16 text-center text-slate-500 text-xs flex flex-col items-center justify-center gap-3 border border-slate-800">
          <Sliders className="w-10 h-10 text-slate-600" />
          <p className="text-sm text-slate-300 font-semibold">Chưa có yêu cầu tự động nào phù hợp</p>
          <p className="text-slate-500 max-w-sm">
            Nhấn vào nút "Thêm Yêu Cầu Tự Động" để tạo chiến lược scalping RSI, giao cắt EMA hoặc nhận tín hiệu từ TradingView.
          </p>
          <button
            onClick={handleOpenAdd}
            className="mt-2 flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-500 transition shadow-md"
          >
            <Plus className="w-4 h-4" />
            <span>Tạo Yêu Cầu Đầu Tiên</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRules.map(rule => (
            <RuleCard
              key={rule.id}
              rule={rule}
              onToggle={onToggleRule}
              onEdit={handleOpenEdit}
              onDelete={handleDeleteWithConfirm}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      <RuleModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={(data) => {
          if (editingRule) {
            onSaveRule({ ...data, id: editingRule.id });
          } else {
            onSaveRule(data);
          }
        }}
        initialRule={editingRule}
      />

      <TradingViewGuideModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
      />
    </div>
  );
};
