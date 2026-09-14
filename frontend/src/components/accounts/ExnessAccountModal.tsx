import React from 'react';
import { createPortal } from 'react-dom';
import { ExnessAccountsManager } from './ExnessAccountsManager';
import { X, Wallet } from 'lucide-react';
import { ExnessAccount } from '../../types';

interface ExnessAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccountSwitched?: (account: ExnessAccount) => void;
}

export const ExnessAccountModal: React.FC<ExnessAccountModalProps> = ({
  isOpen,
  onClose,
  onAccountSwitched
}) => {
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9998] flex items-center justify-center p-3 md:p-6 bg-black/80 backdrop-blur-md overflow-y-auto animate-fadeIn">
      <div className="relative w-full max-w-5xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800/80 flex items-center justify-between bg-slate-950/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-md shadow-indigo-500/10">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Quản Lý Tài Khoản Exness
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono font-bold">
                  MULTI-ACCOUNT
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Thêm nhiều tài khoản MT5/MT4, xem số dư và chọn tài khoản chạy Auto Bot
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
          <ExnessAccountsManager
            onAccountSwitched={(acc) => {
              if (onAccountSwitched) onAccountSwitched(acc);
            }}
          />
        </div>
      </div>
    </div>,
    document.body
  );
};
