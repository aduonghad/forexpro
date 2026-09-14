import mongoose, { Schema, Document } from 'mongoose';
import {
  AutomationRule,
  Order,
  BotMessage,
  CandlestickPattern,
  IndicatorConfig,
  TradingSignalConfig,
  User
} from '../types/index.js';

// --- AutomationRule Schema ---
const AutomationRuleSchema = new Schema<AutomationRule>(
  {
    id: { type: String, required: true, unique: true, index: true },
    userId: { type: String, index: true },
    signalId: { type: String, index: true },
    isDefaultRule: { type: Boolean, default: false },
    name: { type: String, required: true },
    symbol: { type: String, required: true },
    timeframe: { type: String, required: true },
    indicator: { type: String, required: true },
    condition: { type: Schema.Types.Mixed, required: true },
    action: { type: String, required: true },
    lot: { type: Number, required: true },
    slPips: { type: Number, required: true },
    tpPips: { type: Number, required: true },
    trailingStopPips: { type: Number, default: 0 },
    maxOpenPositions: { type: Number, default: 1 },
    isActive: { type: Boolean, default: true },
    totalTrades: { type: Number, default: 0 },
    winTrades: { type: Number, default: 0 },
    totalProfit: { type: Number, default: 0 },
    lastTriggeredAt: { type: Number },
    createdAt: { type: Number, required: true },
    updatedAt: { type: Number, required: true }
  },
  {
    versionKey: false,
    toJSON: {
      transform: (_, ret) => {
        delete (ret as any)._id;
        return ret;
      }
    }
  }
);

export const RuleModel = mongoose.model<AutomationRule>('AutomationRule', AutomationRuleSchema, 'automation_rules');

// --- Order Schema ---
const OrderSchema = new Schema<Order>(
  {
    id: { type: String, required: true, unique: true, index: true },
    userId: { type: String, index: true },
    ruleId: { type: String },
    ruleName: { type: String },
    symbol: { type: String, required: true },
    type: { type: String, required: true },
    lot: { type: Number, required: true },
    openPrice: { type: Number, required: true },
    currentPrice: { type: Number, required: true },
    closePrice: { type: Number },
    sl: { type: Number },
    tp: { type: Number },
    trailingStop: { type: Number },
    highestPrice: { type: Number },
    lowestPrice: { type: Number },
    pnl: { type: Number, default: 0 },
    status: { type: String, required: true, index: true },
    openTime: { type: Number, required: true, index: true },
    closeTime: { type: Number },
    closeReason: { type: String }
  },
  {
    versionKey: false,
    toJSON: {
      transform: (_, ret) => {
        delete (ret as any)._id;
        return ret;
      }
    }
  }
);

export const OrderModel = mongoose.model<Order>('Order', OrderSchema, 'orders');

// --- BotMessage Schema ---
const BotMessageSchema = new Schema<BotMessage>(
  {
    id: { type: String, required: true, unique: true, index: true },
    userId: { type: String, index: true },
    type: { type: String, required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    symbol: { type: String },
    orderId: { type: String },
    data: { type: Schema.Types.Mixed },
    timestamp: { type: Number, required: true, index: true }
  },
  {
    versionKey: false,
    toJSON: {
      transform: (_, ret) => {
        delete (ret as any)._id;
        return ret;
      }
    }
  }
);

export const BotMessageModel = mongoose.model<BotMessage>('BotMessage', BotMessageSchema, 'bot_messages');

// --- AccountSetting Schema ---
export interface AccountSettingDoc {
  key: string;
  value: string;
}

const AccountSettingSchema = new Schema<AccountSettingDoc>(
  {
    key: { type: String, required: true, unique: true, index: true },
    value: { type: String, required: true }
  },
  {
    versionKey: false,
    toJSON: {
      transform: (_, ret) => {
        delete (ret as any)._id;
        return ret;
      }
    }
  }
);

export const SettingModel = mongoose.model<AccountSettingDoc>('AccountSetting', AccountSettingSchema, 'account_settings');

// --- CandlestickPattern Schema ---
const CandlestickPatternSchema = new Schema<CandlestickPattern>(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    category: { type: String, required: true },
    signal: { type: String },
    candleCount: { type: Number, required: true },
    description: { type: String, default: '' },
    candles: { type: [Schema.Types.Mixed] as any, required: true },
    isActive: { type: Boolean, default: true },
    isPredefined: { type: Boolean, default: false },
    createdAt: { type: Number, required: true },
    updatedAt: { type: Number, required: true }
  },
  {
    versionKey: false,
    toJSON: {
      transform: (_, ret) => {
        delete (ret as any)._id;
        return ret;
      }
    }
  }
);

export const PatternModel = mongoose.model<CandlestickPattern>('CandlestickPattern', CandlestickPatternSchema, 'candlestick_patterns');

// --- IndicatorConfig Schema ---
const IndicatorConfigSchema = new Schema<IndicatorConfig>(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    type: { type: String, required: true },
    category: { type: String, required: true },
    description: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
    timeframe: { type: String, required: true },
    parameters: { type: Schema.Types.Mixed, required: true },
    priority: { type: Number, default: 1 },
    buyCondition: { type: Schema.Types.Mixed },
    sellCondition: { type: Schema.Types.Mixed },
    updatedAt: { type: Number, required: true }
  },
  {
    versionKey: false,
    toJSON: {
      transform: (_, ret) => {
        delete (ret as any)._id;
        return ret;
      }
    }
  }
);

export const IndicatorConfigModel = mongoose.model<IndicatorConfig>('IndicatorConfig', IndicatorConfigSchema, 'indicator_configs');

// --- TradingSignalConfig Schema ---
const TradingSignalSchema = new Schema<TradingSignalConfig>(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    description: { type: String, default: '' },
    action: { type: String, required: true },
    symbol: { type: String, required: true },
    timeframe: { type: String, required: true },
    logicOperator: { type: String, required: true },
    conditions: { type: [Schema.Types.Mixed] as any, required: true },
    lot: { type: Number, required: true },
    slPips: { type: Number, required: true },
    tpPips: { type: Number, required: true },
    trailingStopPips: { type: Number, default: 0 },
    maxOpenPositions: { type: Number, default: 1 },
    cooldownSeconds: { type: Number, default: 45 },
    isActive: { type: Boolean, default: true },
    totalTriggers: { type: Number, default: 0 },
    lastTriggeredAt: { type: Number },
    updatedAt: { type: Number, required: true }
  },
  {
    versionKey: false,
    toJSON: {
      transform: (_, ret) => {
        delete (ret as any)._id;
        return ret;
      }
    }
  }
);

export const TradingSignalModel = mongoose.model<TradingSignalConfig>('TradingSignal', TradingSignalSchema, 'trading_signals');

// --- User Schema ---
const UserSchema = new Schema<User>(
  {
    id: { type: String, required: true, unique: true, index: true },
    email: { type: String, required: true, unique: true, index: true, lowercase: true, trim: true },
    name: { type: String, required: true },
    avatar: { type: String },
    passwordHash: { type: String },
    googleId: { type: String, index: true },
    authProvider: { type: String, required: true, enum: ['local', 'google'], default: 'local' },
    role: { type: String, required: true, enum: ['user', 'admin'], default: 'user' },
    plan: { type: String, required: true, enum: ['free', 'plus', 'pro', 'ultra'], default: 'free' },
    lastSymbol: { type: String, default: 'XAUUSD' },
    lastTimeframe: { type: String, default: 'M1' },
    telegramBotToken: { type: String },
    telegramChatId: { type: String },
    telegramAlertsActive: { type: Boolean, default: true },
    createdAt: { type: Number, required: true },
    updatedAt: { type: Number, required: true }
  },
  {
    versionKey: false,
    toJSON: {
      transform: (_, ret) => {
        delete (ret as any)._id;
        delete (ret as any).passwordHash;
        return ret;
      }
    }
  }
);

export const UserModel = mongoose.model<User>('User', UserSchema, 'users');
