import axios from 'axios';
import { AutomationRule, Order, AccountInfo, BotMessage, Candle, IndicatorSnapshot, TradingSymbol, Timeframe } from '../types';

const API_BASE = '/api';

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
  getBotMessages: async (limit: number = 50) => {
    const res = await axios.get<{ success: boolean; data: BotMessage[] }>(`${API_BASE}/bot/messages`, { params: { limit } });
    return res.data.data;
  },
  sendChatMessage: async (text: string) => {
    const res = await axios.post<{ success: boolean; data: BotMessage }>(`${API_BASE}/bot/chat`, { text });
    return res.data.data;
  },
  toggleBot: async (active: boolean) => {
    const res = await axios.post<{ success: boolean; botActive: boolean }>(`${API_BASE}/bot/toggle`, { active });
    return res.data.botActive;
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
  }
};
