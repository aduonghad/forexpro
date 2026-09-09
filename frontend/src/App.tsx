import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { DashboardPage } from './pages/DashboardPage';
import { AutomationsPage } from './pages/AutomationsPage';
import { api } from './services/api';
import { wsClient } from './services/websocket';
import { AccountInfo, Order, AutomationRule, BotMessage, Candle, IndicatorSnapshot, TradingSymbol, Timeframe } from './types';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'automations'>('dashboard');

  // Core system state
  const [account, setAccount] = useState<AccountInfo | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [messages, setMessages] = useState<BotMessage[]>([]);
  const [isConnected, setIsConnected] = useState<boolean>(false);

  // Chart state with localStorage persistence
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

  const setSymbol = (s: TradingSymbol) => {
    setSymbolState(s);
    try {
      localStorage.setItem('trading_symbol', s);
    } catch {}
  };

  const setTimeframe = (tf: Timeframe) => {
    setTimeframeState(tf);
    try {
      localStorage.setItem('trading_timeframe', tf);
    } catch {}
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

  // WebSocket listeners
  useEffect(() => {
    const unsubConn = wsClient.on('connection', ({ connected }) => {
      setIsConnected(connected);
    });

    const unsubInit = wsClient.on('INIT_STATE', (data) => {
      if (data.account) setAccount(data.account);
      if (data.openOrders) setOrders(data.openOrders);
      if (data.messages) setMessages(data.messages);
      if (data.rules) setRules(data.rules);
    });

    const unsubTick = wsClient.on('TICK', (data) => {
      if (data.account) setAccount(data.account);
      if (data.openOrders) setOrders(data.openOrders);

      if (data.tick.symbol === symbol) {
        setCurrentTick({
          bid: data.tick.bid,
          ask: data.tick.ask,
          spread: data.tick.spread,
        });

        if (data.indicators) {
          setIndicators(data.indicators);
        }

        // Realtime update last candle or append new candle
        if (data.tick.candle) {
          setCandles(prev => {
            if (prev.length === 0) return [data.tick.candle];
            const last = prev[prev.length - 1];
            if (last.time === data.tick.candle.time) {
              return [...prev.slice(0, -1), data.tick.candle];
            } else if (data.tick.candle.time > last.time) {
              return [...prev.slice(-250), data.tick.candle];
            }
            return prev;
          });
        }
      }
    });

    const unsubBotMsg = wsClient.on('BOT_MESSAGE', (msg: BotMessage) => {
      setMessages(prev => [...prev, msg]);
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

    return () => {
      unsubConn();
      unsubInit();
      unsubTick();
      unsubBotMsg();
      unsubOrderOpened();
      unsubOrderClosed();
      unsubAccount();
      unsubRuleCreated();
      unsubRuleUpdated();
      unsubRuleDeleted();
    };
  }, [symbol]);

  // User Actions
  const handleToggleBot = async () => {
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
    wsClient.sendChat(text);
  };

  const handleCloseOrder = (orderId: string) => {
    wsClient.closeOrder(orderId);
  };

  const handleCloseAll = () => {
    if (window.confirm('Bạn có chắc chắn muốn đóng khẩn cấp toàn bộ các vị thế đang mở?')) {
      wsClient.closeAllOrders();
    }
  };

  const handleToggleRule = async (id: string, active: boolean) => {
    try {
      await api.updateRule(id, { isActive: active });
    } catch (err) {
      console.error('Lỗi khi bật/tắt yêu cầu:', err);
    }
  };

  const handleSaveRule = async (ruleData: Partial<AutomationRule>) => {
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
    try {
      await api.deleteRule(id);
    } catch (err) {
      console.error('Lỗi khi xoá yêu cầu:', err);
    }
  };

  const activeRulesCount = rules.filter(r => r.isActive).length;

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
    </div>
  );
};

export default App;
