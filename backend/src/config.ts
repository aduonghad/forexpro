import path from 'path';
import dotenv from 'dotenv';
import { TradingSymbol } from './types/index.js';

dotenv.config();

export const CONFIG = {
  PORT: process.env.PORT ? parseInt(process.env.PORT, 10) : 3001,
  WS_PATH: '/ws',
  DB_PATH: path.resolve(process.cwd(), 'trading.db'),
  WEBHOOK_SECRET: process.env.WEBHOOK_SECRET || 'exness-pro-secret-2026',

  // Exness defaults
  EXNESS: {
    SERVER: process.env.EXNESS_SERVER || 'Exness-Real25',
    LOGIN: process.env.EXNESS_LOGIN || '88392011',
    LEVERAGE: 500, // 1:500
    STARTING_BALANCE: 10000.0, // $10,000 default balance
  },

  // Market Specs
  SYMBOLS: {
    XAUUSD: {
      name: 'Vàng / Đô la Mỹ (Gold)',
      pipSize: 0.1,
      pipValuePerLot: 10.0, // 100 oz contract
      digits: 2,
      baseSpread: 0.12,
      initialPrice: 2364.50,
      volatility: 0.8,
    },
    EURUSD: {
      name: 'Euro / Đô la Mỹ',
      pipSize: 0.0001,
      pipValuePerLot: 10.0, // 100,000 contract
      digits: 5,
      baseSpread: 0.00008,
      initialPrice: 1.08520,
      volatility: 0.00025,
    },
    GBPUSD: {
      name: 'Bảng Anh / Đô la Mỹ',
      pipSize: 0.0001,
      pipValuePerLot: 10.0,
      digits: 5,
      baseSpread: 0.00012,
      initialPrice: 1.27430,
      volatility: 0.00035,
    },
    USDJPY: {
      name: 'Đô la Mỹ / Yên Nhật',
      pipSize: 0.01,
      pipValuePerLot: 6.8,
      digits: 3,
      baseSpread: 0.015,
      initialPrice: 154.650,
      volatility: 0.06,
    },
    BTCUSD: {
      name: 'Bitcoin / Đô la Mỹ',
      pipSize: 1.0,
      pipValuePerLot: 1.0,
      digits: 2,
      baseSpread: 12.0,
      initialPrice: 68450.0,
      volatility: 35.0,
    }
  } as Record<TradingSymbol, {
    name: string;
    pipSize: number;
    pipValuePerLot: number;
    digits: number;
    baseSpread: number;
    initialPrice: number;
    volatility: number;
  }>
};
