import axios from 'axios';
import { AutomationRule, Order, AccountInfo, BotMessage, Candle, IndicatorSnapshot, TradingSymbol, Timeframe, IndicatorConfig, TradingSignalConfig, User } from '../types';

const API_BASE = '/api';

// Interceptor to inject JWT token into all requests
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('forexpro_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const api = {
  // Rules CRUD
  getRules: async () => {
    const res = await axios.get<{ success: boolean; data: AutomationRule[] }>(`${API_BASE}/rules`);
    return res.data.data;
  },
  createRule: async (rule: Partial<AutomationRule>) => {
    const res = await axios.post<{ success: boolean; data: AutomationRule }>(`${API_BASE}/rules`, rule);
    return res.data.data;
  },
  updateRule: async (id: string, rule: Partial<AutomationRule>) => {
    const res = await axios.put<{ success: boolean; data: AutomationRule }>(`${API_BASE}/rules/${id}`, rule);
    return res.data.data;
  },
  deleteRule: async (id: string) => {
    const res = await axios.delete<{ success: boolean; message: string }>(`${API_BASE}/rules/${id}`);
    return res.data;
  },

  // Trades
  getOpenOrders: async () => {
    const res = await axios.get<{ success: boolean; data: Order[] }>(`${API_BASE}/trades/open`);
    return res.data.data;
  },
  getTradeHistory: async () => {
    const res = await axios.get<{ success: boolean; data: Order[] }>(`${API_BASE}/trades/history`);
    return res.data.data;
  },
  closeOrder: async (orderId: string) => {
    const res = await axios.post<{ success: boolean; data: Order }>(`${API_BASE}/trades/close/${orderId}`);
    return res.data.data;
  },
  closeAllOrders: async () => {
    const res = await axios.post<{ success: boolean; count: number; data: Order[] }>(`${API_BASE}/trades/close-all`);
    return res.data;
  },
  getAccount: async () => {
    const res = await axios.get<{ success: boolean; data: AccountInfo }>(`${API_BASE}/trades/account`);
    return res.data.data;
  },
  resetBalance: async (amount: number = 10000) => {
    const res = await axios.post<{ success: boolean; data: AccountInfo }>(`${API_BASE}/trades/reset-balance`, { amount });
    return res.data.data;
  },

  // Chart & Indicators
  getCandles: async (symbol: TradingSymbol, timeframe: Timeframe, limit: number = 200) => {
    const res = await axios.get<{
      success: boolean;
      data: Candle[];
      prices: { bid: number; ask: number; lastPrice: number; spread?: number };
    }>(`${API_BASE}/chart/candles`, { params: { symbol, timeframe, limit } });
    return res.data;
  },
  getIndicators: async (symbol: TradingSymbol, timeframe: Timeframe = 'M1') => {
    const res = await axios.get<{ success: boolean; data: IndicatorSnapshot }>(
      `${API_BASE}/chart/indicators`,
      { params: { symbol, timeframe } }
    );
    return res.data.data;
  },

  // Bot & Chat
  getBotMessages: async (limit: number = 100) => {
    const res = await axios.get<{ success: boolean; data: BotMessage[] }>(`${API_BASE}/bot/messages`, { params: { limit } });
    return res.data.data;
  },
  sendChatMessage: async (text: string, symbol?: TradingSymbol, timeframe?: Timeframe) => {
    const res = await axios.post<{ success: boolean; data: BotMessage }>(`${API_BASE}/bot/chat`, { text, symbol, timeframe });
    return res.data.data;
  },
  toggleBot: async (active: boolean) => {
    const res = await axios.post<{ success: boolean; botActive: boolean }>(`${API_BASE}/bot/toggle`, { active });
    return res.data.botActive;
  },
  getTelegramConfig: async () => {
    const res = await axios.get<{ success: boolean; data: { botToken: string; chatId: string; active: boolean; notificationsEnabled: boolean } }>(`${API_BASE}/bot/telegram-config`);
    return res.data.data;
  },
  toggleTelegramNotifications: async (enabled?: boolean) => {
    const res = await axios.post<{ success: boolean; notificationsEnabled: boolean; message: string }>(`${API_BASE}/bot/telegram-toggle`, { enabled });
    return res.data.notificationsEnabled;
  },
  updateTelegramConfig: async (botToken: string, chatId: string) => {
    const res = await axios.post<{ success: boolean; message: string; data: any }>(`${API_BASE}/bot/telegram-config`, { botToken, chatId });
    return res.data;
  },
  getBotStatus: async () => {
    const res = await axios.get<{
      success: boolean;
      data: {
        botActive: boolean;
        swingAlertsActive: boolean;
        analysisAlertsActive: boolean;
        activeSymbol: TradingSymbol;
        activeTimeframe: Timeframe;
        telegramNotificationsEnabled: boolean;
        telegramConfigured: boolean;
      };
    }>(`${API_BASE}/bot/status`);
    return res.data.data;
  },
  toggleAnalysisAlerts: async (active?: boolean) => {
    const res = await axios.post<{ success: boolean; analysisActive: boolean; message: string }>(`${API_BASE}/bot/analysis-toggle`, { active });
    return res.data.analysisActive;
  },

  // Webhook
  getWebhookConfig: async () => {
    const res = await axios.get<{
      success: boolean;
      webhookUrl: string;
      secret: string;
      samplePayload: any;
      instructions: string[];
    }>(`${API_BASE}/webhook/config`);
    return res.data;
  },

  // Candlestick Patterns CRUD
  getPatterns: async (params?: { category?: string; signal?: string; active?: boolean }) => {
    const res = await axios.get<{ success: boolean; data: any[] }>(`${API_BASE}/patterns`, { params });
    return res.data.data;
  },
  createPattern: async (pattern: any) => {
    const res = await axios.post<{ success: boolean; data: any }>(`${API_BASE}/patterns`, pattern);
    return res.data.data;
  },
  updatePattern: async (id: string, pattern: any) => {
    const res = await axios.put<{ success: boolean; data: any }>(`${API_BASE}/patterns/${id}`, pattern);
    return res.data.data;
  },
  deletePattern: async (id: string) => {
    const res = await axios.delete<{ success: boolean; message: string }>(`${API_BASE}/patterns/${id}`);
    return res.data;
  },
  resetPatterns: async () => {
    const res = await axios.post<{ success: boolean; message: string; data: any[] }>(`${API_BASE}/patterns/reset`);
    return res.data.data;
  },

  // Indicator Configurations CRUD
  getIndicatorConfigs: async () => {
    const res = await axios.get<{ success: boolean; data: IndicatorConfig[] }>(`${API_BASE}/indicators/config`);
    return res.data.data;
  },
  getIndicatorConfigById: async (id: string) => {
    const res = await axios.get<{ success: boolean; data: IndicatorConfig }>(`${API_BASE}/indicators/config/${id}`);
    return res.data.data;
  },
  updateIndicatorConfig: async (id: string, config: Partial<IndicatorConfig>) => {
    const res = await axios.put<{ success: boolean; data: IndicatorConfig }>(`${API_BASE}/indicators/config/${id}`, config);
    return res.data.data;
  },
  resetIndicatorConfigs: async () => {
    const res = await axios.post<{ success: boolean; message: string; data: IndicatorConfig[] }>(`${API_BASE}/indicators/config/reset`);
    return res.data.data;
  },

  // Trading Signals (Combination of Indicators) CRUD
  getSignals: async () => {
    const res = await axios.get<{ success: boolean; data: TradingSignalConfig[] }>(`${API_BASE}/signals`);
    return res.data.data;
  },
  getSignalById: async (id: string) => {
    const res = await axios.get<{ success: boolean; data: TradingSignalConfig }>(`${API_BASE}/signals/${id}`);
    return res.data.data;
  },
  createSignal: async (signal: Partial<TradingSignalConfig>) => {
    const res = await axios.post<{ success: boolean; data: TradingSignalConfig }>(`${API_BASE}/signals`, signal);
    return res.data.data;
  },
  updateSignal: async (id: string, updates: Partial<TradingSignalConfig>) => {
    const res = await axios.put<{ success: boolean; data: TradingSignalConfig }>(`${API_BASE}/signals/${id}`, updates);
    return res.data.data;
  },
  deleteSignal: async (id: string) => {
    const res = await axios.delete<{ success: boolean; message: string }>(`${API_BASE}/signals/${id}`);
    return res.data;
  },
  resetSignals: async () => {
    const res = await axios.post<{ success: boolean; data: TradingSignalConfig[] }>(`${API_BASE}/signals/reset`);
    return res.data.data;
  },

  // Telegram Dedicated Management
  getTelegramFullStatus: async () => {
    const res = await axios.get<{ success: boolean; data: any }>(`${API_BASE}/telegram/status`);
    return res.data.data;
  },
  toggleTelegramAlerts: async (enabled?: boolean) => {
    const res = await axios.post<{ success: boolean; data: { notificationsEnabled: boolean; message: string } }>(
      `${API_BASE}/telegram/toggle`,
      { enabled }
    );
    return res.data.data;
  },
  sendTelegramTest: async () => {
    const res = await axios.post<{ success: boolean; message: string }>(`${API_BASE}/telegram/test`);
    return res.data;
  },
  saveTelegramCredentials: async (botToken: string, chatId: string) => {
    const res = await axios.post<{ success: boolean; message: string }>(`${API_BASE}/telegram/credentials`, { botToken, chatId });
    return res.data;
  },
  getUserTelegramStatus: async () => {
    const res = await axios.get<{ success: boolean; data: any }>(`${API_BASE}/telegram/user-status`);
    return res.data.data;
  },
  saveUserTelegramConfig: async (params: { botToken?: string; chatId?: string; notificationsEnabled?: boolean }) => {
    const res = await axios.put<{ success: boolean; message: string }>(`${API_BASE}/telegram/user-config`, params);
    return res.data;
  },
  sendUserTelegramTest: async (params?: { botToken?: string; chatId?: string }) => {
    const res = await axios.post<{ success: boolean; message: string }>(`${API_BASE}/telegram/user-test`, params || {});
    return res.data;
  },

  // Authentication & User Profile
  auth: {
    getConfig: async () => {
      const res = await axios.get<{ success: boolean; data: { googleClientId: string; isGoogleAuthEnabled: boolean } }>(`${API_BASE}/auth/config`);
      return res.data.data;
    },
    register: async (params: { email: string; password?: string; name: string }) => {
      const res = await axios.post<{ success: boolean; data: { user: User; token: string } }>(`${API_BASE}/auth/register`, params);
      return res.data.data;
    },
    login: async (params: { email: string; password?: string }) => {
      const res = await axios.post<{ success: boolean; data: { user: User; token: string } }>(`${API_BASE}/auth/login`, params);
      return res.data.data;
    },
    googleAuth: async (params: { credential?: string; accessToken?: string }) => {
      const res = await axios.post<{ success: boolean; data: { user: User; token: string } }>(`${API_BASE}/auth/google`, params);
      return res.data.data;
    },
    getMe: async () => {
      const res = await axios.get<{ success: boolean; data: { user: User } }>(`${API_BASE}/auth/me`);
      return res.data.data.user;
    },
    getUsers: async () => {
      const res = await axios.get<{ success: boolean; data: User[] }>(`${API_BASE}/auth/users`);
      return res.data.data;
    },
    createUser: async (params: { email: string; name: string; password?: string; role?: 'user' | 'admin'; plan?: any }) => {
      const res = await axios.post<{ success: boolean; data: User }>(`${API_BASE}/auth/users`, params);
      return res.data.data;
    },
    updateUserRole: async (id: string, role: 'user' | 'admin') => {
      const res = await axios.put<{ success: boolean; data: User }>(`${API_BASE}/auth/users/${id}/role`, { role });
      return res.data.data;
    },
    updateUserPlan: async (id: string, plan: string) => {
      const res = await axios.put<{ success: boolean; data: User }>(`${API_BASE}/auth/users/${id}/plan`, { plan });
      return res.data.data;
    },
    updatePreferences: async (params: { symbol?: string; timeframe?: string }) => {
      const res = await axios.patch<{ success: boolean; data: User }>(`${API_BASE}/auth/preferences`, params);
      return res.data.data;
    },
    deleteUser: async (id: string) => {
      const res = await axios.delete<{ success: boolean; message: string }>(`${API_BASE}/auth/users/${id}`);
      return res.data;
    }
  }
};
