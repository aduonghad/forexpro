import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { DashboardPage } from './pages/DashboardPage';
import { AutomationsPage } from './pages/AutomationsPage';
import { ManagementPage } from './pages/ManagementPage';
import { AdminAuthModal } from './components/management/AdminAuthModal';
import { AuthModal } from './components/auth/AuthModal';
import { api } from './services/api';
import { wsClient } from './services/websocket';
import { AccountInfo, Order, AutomationRule, BotMessage, Candle, IndicatorSnapshot, TradingSymbol, Timeframe } from './types';

import { useAuth } from './context/AuthContext';

export const App: React.FC = () => {
  const { user, isAuthenticated, updatePreferences, openAuthModal } = useAuth();

  // Navigation & Routing state
  const [isAdminRoute, setIsAdminRoute] = useState<boolean>(() => {
    return typeof window !== 'undefined' && window.location.pathname.startsWith('/admin');
  });
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => {
    return typeof sessionStorage !== 'undefined' && sessionStorage.getItem('exness_admin_auth') === 'true';
  });

  const [activeTab, setActiveTab] = useState<'dashboard' | 'automations'>('dashboard');

  // Handle browser back/forward navigation
  useEffect(() => {
    const handleLocationChange = () => {
      setIsAdminRoute(window.location.pathname.startsWith('/admin'));
    };
    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  const navigateToAdmin = () => {
    if (!isAuthenticated) {
      openAuthModal('login');
      return;
    }
    window.history.pushState(null, '', '/admin');
    setIsAdminRoute(true);
  };

  const navigateToTrading = () => {
    window.history.pushState(null, '', '/');
    setIsAdminRoute(false);
  };

  const handleAdminLogout = () => {
    sessionStorage.removeItem('exness_admin_auth');
    setIsAdminAuthenticated(false);
    navigateToTrading();
  };

  // Core system state
  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [messages, setMessages] = useState<BotMessage[]>([]);
  const [isConnected, setIsConnected] = useState<boolean>(false);

  // Chart state with account persistence & localStorage fallback
  const [symbol, setSymbolState] = useState<TradingSymbol>(() => {
    try {
      const saved = localStorage.getItem('trading_symbol');
      if (saved && ['XAUUSD', 'EURUSD', 'GBPUSD', 'USDJPY', 'BTCUSD'].includes(saved)) {
        return saved as TradingSymbol;
      }
    } catch {}
    return 'XAUUSD';
  });

  const [timeframe, setTimeframeState] = useState<Timeframe>(() => {
    try {
      const saved = localStorage.getItem('trading_timeframe');
      if (saved && ['M1', 'M5', 'M15', 'H1'].includes(saved)) {
        return saved as Timeframe;
      }
    } catch {}
    return 'M1';
  });

  // Restore user saved preferences when logged in
  useEffect(() => {
    if (user?.lastSymbol && ['XAUUSD', 'EURUSD', 'GBPUSD', 'USDJPY', 'BTCUSD'].includes(user.lastSymbol)) {
      setSymbolState(user.lastSymbol as TradingSymbol);
    }
    if (user?.lastTimeframe && ['M1', 'M5', 'M15', 'H1'].includes(user.lastTimeframe)) {
      setTimeframeState(user.lastTimeframe as Timeframe);
    }
  }, [user?.id, user?.lastSymbol, user?.lastTimeframe]);

  const setSymbol = (s: TradingSymbol) => {
    setSymbolState(s);
    try {
      localStorage.setItem('trading_symbol', s);
    } catch {}
    if (isAuthenticated) {
      updatePreferences(s, timeframe);
    }
  };

  const setTimeframe = (tf: Timeframe) => {
    setTimeframeState(tf);
    try {
      localStorage.setItem('trading_timeframe', tf);
    } catch {}
    if (isAuthenticated) {
      updatePreferences(symbol, tf);
    }
  };

  const [candles, setCandles] = useState<Candle[]>([]);
  const [currentTick, setCurrentTick] = useState<{ bid: number; ask: number; spread: number } | null>(null);
  const [indicators, setIndicators] = useState<IndicatorSnapshot | null>(null);

  // Load initial candles when symbol or timeframe changes
  const loadCandles = useCallback(async (s: TradingSymbol, tf: Timeframe) => {
    try {
      const res = await api.getCandles(s, tf, 200);
      setCandles(res.data);
      const spreadVal = res.prices.spread ?? Number(Math.abs(res.prices.ask - res.prices.bid).toFixed(4));
      setCurrentTick({
        bid: res.prices.bid,
        ask: res.prices.ask,
        spread: spreadVal
      });
      const indRes = await api.getIndicators(s, tf);
      setIndicators(indRes);
    } catch (err) {
      console.error('Lỗi khi tải nến lịch sử:', err);
    }
  }, []);

  useEffect(() => {
    loadCandles(symbol, timeframe);
  }, [symbol, timeframe, loadCandles]);

  // Load rules, messages, open positions, and account info specifically for current user
  useEffect(() => {
    api.getRules().then(data => {
      if (Array.isArray(data)) setRules(data);
    }).catch(err => console.warn('Lỗi tải rules:', err));

    api.getBotMessages(100).then(msgs => {
      if (Array.isArray(msgs)) setMessages(msgs);
    }).catch(err => console.warn('Lỗi tải tin nhắn bot:', err));

    api.getOpenOrders().then(openOrders => {
      if (Array.isArray(openOrders)) setOrders(openOrders);
    }).catch(err => console.warn('Lỗi tải vị thế mở:', err));

    api.getAccount().then(acc => {
      if (acc) setAccount(acc);
    }).catch(err => console.warn('Lỗi tải thông tin tài khoản:', err));
  }, [user?.id]);

  // Sync active symbol & timeframe with backend & WebSocket hub
  useEffect(() => {
    wsClient.selectView(symbol, timeframe, user?.id);
  }, [symbol, timeframe, user?.id]);

  // WebSocket listeners
  useEffect(() => {
    const unsubConn = wsClient.on('connection', ({ connected }) => {
      setIsConnected(connected);
      if (connected) {
        wsClient.selectView(symbol, timeframe, user?.id);
      }
    });

    const unsubInit = wsClient.on('INIT_STATE', (data) => {
      if (data.openOrders) setOrders(data.openOrders);
      if (data.account) {
        if (data.openOrders && data.openOrders.length === 0) {
          data.account.floatingPnl = 0;
          data.account.openPositionsCount = 0;
          data.account.equity = data.account.balance;
        }
        setAccount(data.account);
      }
      if (data.messages && !user?.id) setMessages(data.messages.slice(-100));
      if (data.rules && !user?.id) setRules(data.rules);
    });

    const unsubInitMsgs = wsClient.on('INIT_MESSAGES', (data) => {
      if (Array.isArray(data)) {
        setMessages(data.slice(-100));
      }
    });

    const unsubTick = wsClient.on('TICK', (data) => {
      if (data.openOrders) setOrders(data.openOrders);
      if (data.account) {
        if (data.openOrders && data.openOrders.length === 0) {
          data.account.floatingPnl = 0;
          data.account.openPositionsCount = 0;
          data.account.equity = data.account.balance;
        }
        setAccount(data.account);
      }

      if (data.tick.symbol === symbol) {
        setCurrentTick({
          bid: data.tick.bid,
          ask: data.tick.ask,
          spread: data.tick.spread,
        });

        if (data.indicators) {
          setIndicators(data.indicators);
        }

        // Realtime update last candle or append new candle theo đúng khung thời gian đang chọn
        const tfSec = timeframe === 'M1' ? 60 : timeframe === 'M5' ? 300 : timeframe === 'M15' ? 900 : 3600;
        const nowSec = Math.floor(Date.now() / 1000);
        const candlePeriod = Math.floor(nowSec / tfSec) * tfSec;
        const curPrice = data.tick.bid;

        setCandles(prev => {
          if (prev.length === 0) return prev;
          const last = prev[prev.length - 1];
          if (last.time === candlePeriod) {
            const updated: Candle = {
              ...last,
              close: curPrice,
              high: Math.max(last.high, curPrice),
              low: Math.min(last.low, curPrice),
              volume: (last.volume || 1) + 1
            };
            return [...prev.slice(0, -1), updated];
          } else if (candlePeriod > last.time) {
            const newCandle: Candle = {
              time: candlePeriod,
              open: last.close,
              high: Math.max(last.close, curPrice),
              low: Math.min(last.close, curPrice),
              close: curPrice,
              volume: 1
            };
            return [...prev.slice(-250), newCandle];
          }
          return prev;
        });
      }
    });

    const unsubBotMsg = wsClient.on('BOT_MESSAGE', (msg: BotMessage) => {
      // If message is for another user, do not add
      if (msg.userId && user?.id && msg.userId !== user.id) return;
      setMessages(prev => {
        if (prev.some(m => m.id === msg.id)) return prev;
        const updated = [...prev, msg];
        return updated.length > 100 ? updated.slice(-100) : updated;
      });
    });

    const unsubOrderOpened = wsClient.on('ORDER_OPENED', (data) => {
      setOrders(prev => [data.order, ...prev.filter(o => o.id !== data.order.id)]);
      if (data.account) setAccount(data.account);
    });

    const unsubOrderClosed = wsClient.on('ORDER_CLOSED', (data) => {
      setOrders(prev => prev.filter(o => o.id !== data.order.id));
      if (data.account) setAccount(data.account);
    });

    const unsubAccount = wsClient.on('ACCOUNT_UPDATE', (acc: AccountInfo) => {
      setAccount(acc);
    });

    const unsubRuleCreated = wsClient.on('RULE_CREATED', (newRule: AutomationRule) => {
      setRules(prev => [newRule, ...prev.filter(r => r.id !== newRule.id)]);
    });

    const unsubRuleUpdated = wsClient.on('RULE_UPDATED', (updated: AutomationRule) => {
      setRules(prev => prev.map(r => r.id === updated.id ? updated : r));
    });

    const unsubRuleDeleted = wsClient.on('RULE_DELETED', ({ id }: { id: string }) => {
      setRules(prev => prev.filter(r => r.id !== id));
    });

    const unsubSignalsUpdated = wsClient.on('SIGNALS_UPDATED', async () => {
      try {
        const freshRules = await api.getRules();
        setRules(freshRules);
      } catch {}
    });

    return () => {
      unsubConn();
      unsubInit();
      unsubInitMsgs();
      unsubTick();
      unsubBotMsg();
      unsubOrderOpened();
      unsubOrderClosed();
      unsubAccount();
      unsubRuleCreated();
      unsubRuleUpdated();
      unsubRuleDeleted();
      unsubSignalsUpdated();
    };
  }, [symbol, timeframe, user?.id]);

  // User Actions
  const handleToggleBot = async () => {
    if (!isAuthenticated) {
      openAuthModal('login');
      return;
    }
    const nextState = !account?.botActive;
    wsClient.toggleBot(nextState);
  };

  const handleResetBalance = async () => {
    if (window.confirm('Bạn có muốn đặt lại tài khoản về $10,000 USD ban đầu? Tất cả vị thế đang mở sẽ được đóng.')) {
      try {
        const acc = await api.resetBalance(10000);
        setAccount(acc);
        setOrders([]);
      } catch (err) {
        console.error('Lỗi đặt lại tài khoản:', err);
      }
    }
  };

  const handleSendMessage = (text: string) => {
    wsClient.sendChat(text, {
      userId: user?.id,
      symbol,
      timeframe
    });
  };

  const handleCloseOrder = (orderId: string) => {
    if (!isAuthenticated) {
      openAuthModal('login');
      return;
    }
    wsClient.closeOrder(orderId);
  };

  const handleCloseAll = () => {
    if (!isAuthenticated) {
      openAuthModal('login');
      return;
    }
    if (window.confirm('Bạn có chắc chắn muốn đóng khẩn cấp toàn bộ các vị thế đang mở?')) {
      wsClient.closeAllOrders();
    }
  };

  const handleToggleRule = async (id: string, active: boolean) => {
    if (!isAuthenticated) {
      openAuthModal('login');
      return;
    }
    try {
      await api.updateRule(id, { isActive: active });
    } catch (err) {
      console.error('Lỗi khi bật/tắt yêu cầu:', err);
    }
  };

  const handleSaveRule = async (ruleData: Partial<AutomationRule>) => {
    if (!isAuthenticated) {
      openAuthModal('login');
      return;
    }
    try {
      if (ruleData.id) {
        await api.updateRule(ruleData.id, ruleData);
      } else {
        await api.createRule(ruleData);
      }
    } catch (err) {
      console.error('Lỗi khi lưu yêu cầu:', err);
    }
  };

  const handleDeleteRule = async (id: string) => {
    if (!isAuthenticated) {
      openAuthModal('login');
      return;
    }
    try {
      await api.deleteRule(id);
    } catch (err) {
      console.error('Lỗi khi xoá yêu cầu:', err);
    }
  };

  const activeRulesCount = rules.filter(r => r.isActive).length;

  // Render Admin View if current path is /admin
  if (isAdminRoute) {
    if (!isAuthenticated) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#080d1a] text-slate-100 p-4">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center space-y-4 shadow-2xl">
            <div className="w-16 h-16 mx-auto rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 text-2xl">
              🔒
            </div>
            <h2 className="text-xl font-bold text-white">Yêu Cầu Đăng Nhập</h2>
            <p className="text-sm text-slate-400">
              Bạn cần đăng nhập tài khoản hệ thống trước khi truy cập vào Bảng Quản Trị Admin.
            </p>
            <div className="flex gap-3 justify-center pt-2">
              <button
                onClick={navigateToTrading}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium transition-colors"
              >
                Về Trang Chủ
              </button>
              <button
                onClick={() => openAuthModal('login')}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition-colors"
              >
                Đăng Nhập Ngay
              </button>
            </div>
          </div>
          <AuthModal />
        </div>
      );
    }

    return (
      <div className="min-h-screen flex flex-col bg-[#080d1a] text-slate-100">
        {!isAdminAuthenticated ? (
          <AdminAuthModal
            onSuccess={() => setIsAdminAuthenticated(true)}
            onCancel={navigateToTrading}
          />
        ) : (
          <main className="flex-1 flex flex-col min-h-0">
            <ManagementPage
              onBackToTrading={navigateToTrading}
              onLogoutAdmin={handleAdminLogout}
            />
          </main>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#080d1a] text-slate-100">
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        account={account}
        isConnected={isConnected}
        onToggleBot={handleToggleBot}
        onResetBalance={handleResetBalance}
        activeRulesCount={activeRulesCount}
        onNavigateAdmin={navigateToAdmin}
      />

      {/* Main Views */}
      <main className="flex-1">
        {activeTab === 'dashboard' ? (
          <DashboardPage
            symbol={symbol}
            setSymbol={setSymbol}
            timeframe={timeframe}
            setTimeframe={setTimeframe}
            candles={candles}
            currentTick={currentTick}
            indicators={indicators}
            orders={orders}
            messages={messages}
            botActive={account?.botActive ?? true}
            onSendMessage={handleSendMessage}
            onCloseOrder={handleCloseOrder}
            onCloseAll={handleCloseAll}
          />
        ) : (
          <AutomationsPage
            rules={rules}
            onToggleRule={handleToggleRule}
            onSaveRule={handleSaveRule}
            onDeleteRule={handleDeleteRule}
          />
        )}
      </main>

      {/* Global User Authentication Modal */}
      <AuthModal />
    </div>
  );
};

export default App;
