import path from 'path';
import dotenv from 'dotenv';
import { TradingSymbol } from './types/index.js';

// backend root directory (parent of src/dist)
const BACKEND_DIR = typeof __dirname !== 'undefined'
  ? path.resolve(__dirname, '..')
  : process.cwd();

// Load environment variables from process.cwd() or backend directory
dotenv.config();
dotenv.config({ path: path.resolve(BACKEND_DIR, '.env') });

export const CONFIG = {
  PORT: process.env.PORT ? parseInt(process.env.PORT, 10) : 3001,
  WS_PATH: '/ws',
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/forexpro',
  WEBHOOK_SECRET: process.env.WEBHOOK_SECRET || 'exness-pro-secret-2026',
  JWT_SECRET: process.env.JWT_SECRET || 'forexpro-jwt-secret-key-2026',
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '314351424057-s3lami0923qkdmug3q5pgpe09bjb3ump.apps.googleusercontent.com',
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || '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',
  GOOGLE_PROJECT_ID: process.env.GOOGLE_PROJECT_ID || 'trade-pro-508404',

  // Telegram Bot Config
  TELEGRAM: {
    BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || '',
    CHAT_ID: process.env.TELEGRAM_CHAT_ID || '',
  },

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
