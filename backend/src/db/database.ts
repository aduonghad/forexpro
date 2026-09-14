import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { CONFIG } from '../config.js';
import {
  AutomationRule,
  Order,
  BotMessage,
  CandlestickPattern,
  IndicatorConfig,
  TradingSignalConfig,
  User
} from '../types/index.js';
import { DEFAULT_PATTERNS } from './defaultPatterns.js';
import {
  RuleModel,
  OrderModel,
  BotMessageModel,
  SettingModel,
  PatternModel,
  IndicatorConfigModel,
  TradingSignalModel,
  UserModel
} from './schemas.js';

export const DEFAULT_INDICATOR_CONFIGS: IndicatorConfig[] = [
  {
    id: 'rsi_14',
    name: 'RSI (Relative Strength Index)',
    type: 'RSI',
    category: 'MOMENTUM',
    description: 'Chỉ báo dao động động lượng đo lường tốc độ và sự thay đổi của biến động giá theo chu kỳ 14 nến chuẩn Wilder.',
    isActive: true,
    timeframe: 'M1',
    parameters: {
      period: 14,
      oversold: 30,
      overbought: 70
    },
    priority: 1,
    updatedAt: Date.now()
  },
  {
    id: 'ema_cross_20_50',
    name: 'EMA Cross (Đường Trung Bình Động Luỹ Thừa)',
    type: 'EMA_CROSS',
    category: 'TREND',
    description: 'Hệ thống theo xu hướng kinh điển dựa trên sự tương quan và điểm giao cắt giữa EMA nhanh (20) và EMA chậm (50).',
    isActive: true,
    timeframe: 'M1',
    parameters: {
      fastPeriod: 20,
      slowPeriod: 50,
      trendFilterPeriod: 200
    },
    priority: 2,
    updatedAt: Date.now()
  },
  {
    id: 'bollinger_bands_20_2',
    name: 'Bollinger Bands (Dải Biến Động Chuẩn 20, 2.0)',
    type: 'BOLLINGER',
    category: 'VOLATILITY',
    description: 'Đo lường độ lệch chuẩn và biên độ biến động giá, cung cấp các dải biên trên (Upper) và biên dưới (Lower).',
    isActive: true,
    timeframe: 'M1',
    parameters: {
      period: 20,
      stdDev: 2.0
    },
    priority: 3,
    updatedAt: Date.now()
  },
  {
    id: 'dynamic_swings',
    name: 'Dynamic Price Action Swings (Cấu Trúc Sóng Đỉnh / Đáy)',
    type: 'DYNAMIC_SWING',
    category: 'SUPPORT_RESISTANCE',
    description: 'Quét tự động các nhịp sóng thị trường, nhận diện cấu trúc Đỉnh (Swing High) và Đáy (Swing Low) kết thúc nhịp sóng.',
    isActive: true,
    timeframe: 'M1',
    parameters: {
      pivotLookback: 5,
      minAmplitudePips: 15
    },
    priority: 4,
    updatedAt: Date.now()
  },
  {
    id: 'macd_12_26_9',
    name: 'MACD (Hội Tụ / Phân Kỳ Trung Bình Động)',
    type: 'MACD',
    category: 'MOMENTUM',
    description: 'Đo lường mối liên hệ giữa hai đường trung bình động hàm mũ để phát hiện xung lực dòng tiền qua histogram và đường tín hiệu.',
    isActive: true,
    timeframe: 'M5',
    parameters: {
      fastEMA: 12,
      slowEMA: 26,
      signalPeriod: 9
    },
    priority: 5,
    updatedAt: Date.now()
  }
];

export const DEFAULT_TRADING_SIGNALS: TradingSignalConfig[] = [
  {
    id: 'sig_gold_reversal_buy',
    name: 'Bắt Đáy Đảo Chiều Vàng (RSI + Bollinger Bands)',
    description: 'Kết hợp 2 chỉ báo: RSI chạm vùng quá bán (< 30) đồng thời nến chạm dải dưới Bollinger Bands tạo tín hiệu MUA đảo chiều cực mạnh.',
    action: 'BUY',
    symbol: 'XAUUSD',
    timeframe: 'M1',
    logicOperator: 'AND',
    conditions: [
      {
        indicatorType: 'RSI',
        operator: '<',
        value: 30,
        description: 'RSI(14) < 30 (Vùng Quá Bán)'
      },
      {
        indicatorType: 'BOLLINGER',
        operator: 'TOUCH_LOWER',
        value: 'Lower Band',
        description: 'Giá chạm dải dưới Bollinger Bands'
      }
    ],
    lot: 0.05,
    slPips: 30,
    tpPips: 60,
    trailingStopPips: 15,
    maxOpenPositions: 1,
    cooldownSeconds: 60,
    isActive: true,
    totalTriggers: 8,
    lastTriggeredAt: Date.now() - 1000 * 60 * 45,
    updatedAt: Date.now()
  },
  {
    id: 'sig_gold_reject_sell',
    name: 'Chốt Đỉnh Đảo Chiều Vàng (RSI + Bollinger Bands)',
    description: 'Kết hợp 2 chỉ báo: RSI vượt vùng quá mua (> 70) đồng thời nến chạm dải trên Bollinger Bands tạo tín hiệu BÁN đảo chiều giảm.',
    action: 'SELL',
    symbol: 'XAUUSD',
    timeframe: 'M1',
    logicOperator: 'AND',
    conditions: [
      {
        indicatorType: 'RSI',
        operator: '>',
        value: 70,
        description: 'RSI(14) > 70 (Vùng Quá Mua)'
      },
      {
        indicatorType: 'BOLLINGER',
        operator: 'TOUCH_UPPER',
        value: 'Upper Band',
        description: 'Giá chạm dải trên Bollinger Bands'
      }
    ],
    lot: 0.05,
    slPips: 30,
    tpPips: 60,
    trailingStopPips: 15,
    maxOpenPositions: 1,
    cooldownSeconds: 60,
    isActive: true,
    totalTriggers: 6,
    lastTriggeredAt: Date.now() - 1000 * 60 * 75,
    updatedAt: Date.now()
  },
  {
    id: 'sig_ema_macd_trend_buy',
    name: 'Follow Trend Tăng (EMA Cross + MACD Expansion)',
    description: 'Kết hợp 2 chỉ báo: Giao cắt vàng EMA 20 cắt lên EMA 50 được xác nhận bởi Histogram MACD chuyển giá trị dương.',
    action: 'BUY',
    symbol: 'XAUUSD',
    timeframe: 'M5',
    logicOperator: 'AND',
    conditions: [
      {
        indicatorType: 'EMA_CROSS',
        operator: 'CROSS_ABOVE',
        value: 'EMA20 > EMA50',
        description: 'EMA 20 cắt lên trên EMA 50 (Golden Cross)'
      },
      {
        indicatorType: 'MACD',
        operator: 'HISTOGRAM_POSITIVE',
        value: 'MACD > Signal',
        description: 'Histogram MACD chuyển giá trị dương'
      }
    ],
    lot: 0.05,
    slPips: 40,
    tpPips: 80,
    trailingStopPips: 20,
    maxOpenPositions: 1,
    cooldownSeconds: 120,
    isActive: true,
    totalTriggers: 5,
    lastTriggeredAt: Date.now() - 1000 * 60 * 180,
    updatedAt: Date.now()
  },
  {
    id: 'sig_ema_macd_trend_sell',
    name: 'Follow Trend Giảm (EMA Cross + MACD Contraction)',
    description: 'Kết hợp 2 chỉ báo: Giao cắt tử thần EMA 20 cắt xuống EMA 50 được xác nhận bởi Histogram MACD chuyển giá trị âm.',
    action: 'SELL',
    symbol: 'XAUUSD',
    timeframe: 'M5',
    logicOperator: 'AND',
    conditions: [
      {
        indicatorType: 'EMA_CROSS',
        operator: 'CROSS_BELOW',
        value: 'EMA20 < EMA50',
        description: 'EMA 20 cắt xuống dưới EMA 50 (Death Cross)'
      },
      {
        indicatorType: 'MACD',
        operator: 'HISTOGRAM_NEGATIVE',
        value: 'MACD < Signal',
        description: 'Histogram MACD chuyển giá trị âm'
      }
    ],
    lot: 0.05,
    slPips: 40,
    tpPips: 80,
    trailingStopPips: 20,
    maxOpenPositions: 1,
    cooldownSeconds: 120,
    isActive: true,
    totalTriggers: 4,
    lastTriggeredAt: Date.now() - 1000 * 60 * 240,
    updatedAt: Date.now()
  },
  {
    id: 'sig_dynamic_swing_buy',
    name: 'Dynamic Swing Tín Hiệu Tạo Đáy (Đơn Chỉ Báo)',
    description: 'Dựa trên 1 chỉ báo cấu trúc sóng: Xác nhận nhịp tạo Đáy Swing Low hoàn tất để vào lệnh Mua đón đầu con sóng tăng mới.',
    action: 'BUY',
    symbol: 'XAUUSD',
    timeframe: 'M1',
    logicOperator: 'AND',
    conditions: [
      {
        indicatorType: 'DYNAMIC_SWING',
        operator: 'SWING_LOW',
        value: 'Confirmed Trough',
        description: 'Xác nhận tạo Đáy sóng (Swing Low) thành công'
      }
    ],
    lot: 0.05,
    slPips: 25,
    tpPips: 50,
    trailingStopPips: 15,
    maxOpenPositions: 1,
    cooldownSeconds: 90,
    isActive: true,
    totalTriggers: 11,
    lastTriggeredAt: Date.now() - 1000 * 60 * 20,
    updatedAt: Date.now()
  },
  {
    id: 'sig_dynamic_swing_sell',
    name: 'Dynamic Swing Tín Hiệu Tạo Đỉnh (Đơn Chỉ Báo)',
    description: 'Dựa trên 1 chỉ báo cấu trúc sóng: Xác nhận nhịp tạo Đỉnh Swing High hoàn tất để vào lệnh Bán đón đầu con sóng giảm mới.',
    action: 'SELL',
    symbol: 'XAUUSD',
    timeframe: 'M1',
    logicOperator: 'AND',
    conditions: [
      {
        indicatorType: 'DYNAMIC_SWING',
        operator: 'SWING_HIGH',
        value: 'Confirmed Peak',
        description: 'Xác nhận tạo Đỉnh sóng (Swing High) thành công'
      }
    ],
    lot: 0.05,
    slPips: 25,
    tpPips: 50,
    trailingStopPips: 15,
    maxOpenPositions: 1,
    cooldownSeconds: 90,
    isActive: true,
    totalTriggers: 9,
    lastTriggeredAt: Date.now() - 1000 * 60 * 50,
    updatedAt: Date.now()
  }
];

function cleanDoc<T>(doc: any): T | null {
  if (!doc) return null;
  const obj = typeof doc.toObject === 'function' ? doc.toObject() : { ...doc };
  delete obj._id;
  delete obj.__v;
  return obj as T;
}

function cleanDocs<T>(docs: any[]): T[] {
  return docs.map(d => {
    const obj = typeof d.toObject === 'function' ? d.toObject() : { ...d };
    delete obj._id;
    delete obj.__v;
    return obj as T;
  });
}

class DatabaseService {
  private isConnected: boolean = false;

  async connect(): Promise<void> {
    if (this.isConnected) return;
    try {
      console.log(`🔌 Đang kết nối tới MongoDB: ${CONFIG.MONGODB_URI}...`);
      await mongoose.connect(CONFIG.MONGODB_URI, {
        serverSelectionTimeoutMS: 5000
      });
      this.isConnected = true;
      console.log(`✅ Đã kết nối thành công tới MongoDB: ${CONFIG.MONGODB_URI}`);

      await this.seedDefaultData();
    } catch (err: any) {
      console.error(`❌ Lỗi kết nối MongoDB: ${err.message}`);
      throw err;
    }
  }

  async disconnect(): Promise<void> {
    if (!this.isConnected) return;
    await mongoose.disconnect();
    this.isConnected = false;
    console.log('🛑 Đã ngắt kết nối MongoDB.');
  }

  async seedDefaultData(): Promise<void> {
    const now = Date.now();

    // 1. Seed Default Automation Rules
    const rulesCount = await RuleModel.countDocuments();
    if (rulesCount === 0) {
      const defaultRules: AutomationRule[] = [
        {
          id: uuidv4(),
          name: 'Scalping Vàng RSI Quá Bán M1',
          symbol: 'XAUUSD',
          timeframe: 'M1',
          indicator: 'RSI',
          condition: { operator: '<', value: 30, period: 14 },
          action: 'BUY',
          lot: 0.05,
          slPips: 25,
          tpPips: 50,
          trailingStopPips: 15,
          maxOpenPositions: 1,
          isActive: true,
          totalTrades: 12,
          winTrades: 9,
          totalProfit: 345.50,
          lastTriggeredAt: now - 1000 * 60 * 30,
          createdAt: now,
          updatedAt: now
        },
        {
          id: uuidv4(),
          name: 'RSI Quá Mua Chốt Đỉnh XAUUSD',
          symbol: 'XAUUSD',
          timeframe: 'M1',
          indicator: 'RSI',
          condition: { operator: '>', value: 70, period: 14 },
          action: 'SELL',
          lot: 0.05,
          slPips: 25,
          tpPips: 50,
          trailingStopPips: 15,
          maxOpenPositions: 1,
          isActive: true,
          totalTrades: 8,
          winTrades: 6,
          totalProfit: 210.00,
          lastTriggeredAt: now - 1000 * 60 * 65,
          createdAt: now,
          updatedAt: now
        },
        {
          id: uuidv4(),
          name: 'Trend Following EURUSD EMA Cross M5',
          symbol: 'EURUSD',
          timeframe: 'M5',
          indicator: 'EMA_CROSS',
          condition: { operator: 'CROSS_ABOVE', fastPeriod: 20, slowPeriod: 50 },
          action: 'BUY',
          lot: 0.1,
          slPips: 20,
          tpPips: 45,
          trailingStopPips: 10,
          maxOpenPositions: 1,
          isActive: true,
          totalTrades: 15,
          winTrades: 11,
          totalProfit: 420.00,
          lastTriggeredAt: now - 1000 * 60 * 120,
          createdAt: now,
          updatedAt: now
        },
        {
          id: uuidv4(),
          name: 'TradingView Webhook Alert XAUUSD',
          symbol: 'XAUUSD',
          timeframe: 'M5',
          indicator: 'WEBHOOK',
          condition: { operator: 'WEBHOOK_SIGNAL' },
          action: 'BUY',
          lot: 0.1,
          slPips: 30,
          tpPips: 60,
          trailingStopPips: 20,
          maxOpenPositions: 2,
          isActive: true,
          totalTrades: 5,
          winTrades: 4,
          totalProfit: 190.00,
          createdAt: now,
          updatedAt: now
        }
      ];

      for (const rule of defaultRules) {
        await this.saveRule(rule);
      }

      await this.addBotMessage({
        id: uuidv4(),
        type: 'INFO',
        title: 'Hệ Thống Khởi Động',
        message: 'Khởi chạy Exness Pro Auto Trading Bot thành công với MongoDB. Kết nối WebSocket hoạt động bình thường.',
        timestamp: now - 1000 * 60 * 15
      });
      await this.addBotMessage({
        id: uuidv4(),
        type: 'ANALYSIS',
        title: 'Phân Tích Thị Trường XAU/USD',
        message: 'XAU/USD đang tích lũy biên độ 2362 - 2366. RSI 14 ở mức 42.1 (Trung tính). Chờ tín hiệu bứt phá.',
        symbol: 'XAUUSD',
        timestamp: now - 1000 * 60 * 10
      });
      await this.addBotMessage({
        id: uuidv4(),
        type: 'ORDER',
        title: 'Khớp Lệnh Tự Động BUY XAU/USD',
        message: 'Khớp lệnh BUY 0.05 lot XAU/USD tại 2363.80 từ Yêu cầu: Scalping Vàng RSI Quá Bán M1.',
        symbol: 'XAUUSD',
        timestamp: now - 1000 * 60 * 5
      });
    }

    // 2. Seed Default Account Settings
    const balanceSetting = await this.getSetting('balance');
    if (!balanceSetting) {
      await this.setSetting('balance', CONFIG.EXNESS.STARTING_BALANCE.toString());
      await this.setSetting('server', CONFIG.EXNESS.SERVER);
      await this.setSetting('login', CONFIG.EXNESS.LOGIN);
      await this.setSetting('botActive', 'true');
    }

    // 3. Seed Default Candlestick Patterns
    const patternsCount = await PatternModel.countDocuments();
    if (patternsCount === 0) {
      for (const pattern of DEFAULT_PATTERNS) {
        await this.savePattern(pattern);
      }
    }

    // 4. Seed Default Indicator Configs
    const indicatorsCount = await IndicatorConfigModel.countDocuments();
    if (indicatorsCount === 0) {
      for (const ind of DEFAULT_INDICATOR_CONFIGS) {
        await this.saveIndicatorConfig(ind);
      }
    }

    // 5. Seed Default Trading Signals
    const signalsCount = await TradingSignalModel.countDocuments();
    if (signalsCount === 0) {
      for (const sig of DEFAULT_TRADING_SIGNALS) {
        await this.saveTradingSignal(sig);
      }
    }
  }

  // --- Rules CRUD ---
  async getAllRules(): Promise<AutomationRule[]> {
    const docs = await RuleModel.find({}).sort({ createdAt: -1 }).lean();
    return cleanDocs<AutomationRule>(docs);
  }

  async getRulesByUser(userId?: string): Promise<AutomationRule[]> {
    let filter: any = {};
    if (userId) {
      const count = await RuleModel.countDocuments({ userId });
      if (count === 0) {
        await this.createDefaultRuleForUser(userId);
      }
      filter = { userId };
    }
    const docs = await RuleModel.find(filter).sort({ createdAt: -1 }).lean();
    return cleanDocs<AutomationRule>(docs);
  }

  async getRuleById(id: string): Promise<AutomationRule | null> {
    const doc = await RuleModel.findOne({ id }).lean();
    return cleanDoc<AutomationRule>(doc);
  }

  async saveRule(rule: AutomationRule): Promise<AutomationRule> {
    await RuleModel.findOneAndUpdate(
      { id: rule.id },
      { $set: rule },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    return rule;
  }

  async deleteRule(id: string): Promise<boolean> {
    const res = await RuleModel.deleteOne({ id });
    return res.deletedCount > 0;
  }

  async syncUserRulesWithUpdatedSignal(signalId: string, signalData: Partial<TradingSignalConfig>): Promise<void> {
    const updates: any = {};
    if (signalData.name) updates.name = signalData.name;
    if (signalData.symbol && signalData.symbol !== 'ALL') updates.symbol = signalData.symbol;
    if (signalData.timeframe) updates.timeframe = signalData.timeframe;
    if (signalData.action) updates.action = signalData.action;

    if (Object.keys(updates).length > 0) {
      updates.updatedAt = Date.now();
      await RuleModel.updateMany({ signalId }, { $set: updates });
    }
  }

  // --- Orders ---
  async getOpenOrders(userId?: string): Promise<Order[]> {
    const filter: any = { status: 'OPEN' };
    if (userId) {
      filter.$or = [{ userId }, { userId: { $exists: false } }, { userId: null }];
    }
    const docs = await OrderModel.find(filter).sort({ openTime: -1 }).lean();
    return cleanDocs<Order>(docs);
  }

  async getAllOrders(userId?: string): Promise<Order[]> {
    const filter: any = {};
    if (userId) {
      filter.$or = [{ userId }, { userId: { $exists: false } }, { userId: null }];
    }
    const docs = await OrderModel.find(filter).sort({ openTime: -1 }).limit(100).lean();
    return cleanDocs<Order>(docs);
  }

  async getOrderById(id: string): Promise<Order | null> {
    const doc = await OrderModel.findOne({ id }).lean();
    return cleanDoc<Order>(doc);
  }

  async saveOrder(order: Order): Promise<Order> {
    await OrderModel.findOneAndUpdate(
      { id: order.id },
      { $set: order },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    return order;
  }

  // --- Bot Messages ---
  async getBotMessages(limit: number = 100, userId?: string): Promise<BotMessage[]> {
    const filter: any = {};
    if (userId) {
      filter.userId = userId;
    } else {
      filter.$or = [{ userId: { $exists: false } }, { userId: null }];
    }
    const docs = await BotMessageModel.find(filter).sort({ timestamp: -1 }).limit(limit).lean();
    return cleanDocs<BotMessage>(docs.reverse());
  }

  async addBotMessage(msg: BotMessage): Promise<BotMessage> {
    await BotMessageModel.create(msg);
    try {
      // Enforce max 100 messages per user (or max 100 for global messages)
      const filter = msg.userId
        ? { userId: msg.userId }
        : { $or: [{ userId: { $exists: false } }, { userId: null }] };
      const count = await BotMessageModel.countDocuments(filter);
      if (count > 100) {
        const excess = count - 100;
        const oldest = await BotMessageModel.find(filter)
          .sort({ timestamp: 1 })
          .limit(excess)
          .select('_id')
          .lean();
        if (oldest.length > 0) {
          await BotMessageModel.deleteMany({ _id: { $in: oldest.map(d => d._id) } });
        }
      }
    } catch (err: any) {
      console.error('Lỗi khi tỉa giới hạn 100 tin nhắn bot:', err.message);
    }
    return msg;
  }

  // --- Settings ---
  async getSetting(key: string): Promise<string | null> {
    const doc = await SettingModel.findOne({ key }).lean();
    return doc ? doc.value : null;
  }

  async setSetting(key: string, value: string): Promise<void> {
    await SettingModel.findOneAndUpdate(
      { key },
      { $set: { key, value } },
      { upsert: true, new: true }
    );
  }

  // --- Candlestick Patterns CRUD ---
  async getAllPatterns(filter?: { category?: string; signal?: string; isActive?: boolean }): Promise<CandlestickPattern[]> {
    const query: any = {};
    if (filter?.category && filter.category !== 'ALL') {
      query.category = filter.category;
    }
    if (filter?.signal && filter.signal !== 'ALL') {
      query.signal = filter.signal;
    }
    if (filter?.isActive !== undefined) {
      query.isActive = filter.isActive;
    }

    const docs = await PatternModel.find(query).sort({ candleCount: 1, name: 1 }).lean();
    return cleanDocs<CandlestickPattern>(docs);
  }

  async getPatternById(id: string): Promise<CandlestickPattern | null> {
    const doc = await PatternModel.findOne({ id }).lean();
    return cleanDoc<CandlestickPattern>(doc);
  }

  async savePattern(pattern: CandlestickPattern): Promise<CandlestickPattern> {
    await PatternModel.findOneAndUpdate(
      { id: pattern.id },
      { $set: pattern },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    return pattern;
  }

  async deletePattern(id: string): Promise<boolean> {
    const res = await PatternModel.deleteOne({ id });
    return res.deletedCount > 0;
  }

  async resetPatternsToDefault(): Promise<void> {
    await PatternModel.deleteMany({});
    for (const p of DEFAULT_PATTERNS) {
      await this.savePattern(p);
    }
  }

  // --- Indicators Configuration CRUD ---
  async getAllIndicatorConfigs(): Promise<IndicatorConfig[]> {
    const docs = await IndicatorConfigModel.find({}).sort({ priority: 1 }).lean();
    return cleanDocs<IndicatorConfig>(docs);
  }

  async getIndicatorConfigById(id: string): Promise<IndicatorConfig | null> {
    const doc = await IndicatorConfigModel.findOne({ id }).lean();
    return cleanDoc<IndicatorConfig>(doc);
  }

  async saveIndicatorConfig(config: IndicatorConfig): Promise<IndicatorConfig> {
    await IndicatorConfigModel.findOneAndUpdate(
      { id: config.id },
      { $set: config },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    return config;
  }

  async updateIndicatorConfig(id: string, updates: Partial<IndicatorConfig>): Promise<IndicatorConfig> {
    const current = await this.getIndicatorConfigById(id);
    if (!current) throw new Error(`Không tìm thấy cấu hình chỉ báo với ID ${id}`);

    const updated: IndicatorConfig = {
      ...current,
      ...updates,
      updatedAt: Date.now()
    };

    return this.saveIndicatorConfig(updated);
  }

  async resetIndicatorConfigsToDefault(): Promise<IndicatorConfig[]> {
    await IndicatorConfigModel.deleteMany({});
    for (const ind of DEFAULT_INDICATOR_CONFIGS) {
      await this.saveIndicatorConfig(ind);
    }
    return this.getAllIndicatorConfigs();
  }

  // --- Trading Signals CRUD ---
  async getAllTradingSignals(): Promise<TradingSignalConfig[]> {
    const docs = await TradingSignalModel.find({}).sort({ updatedAt: -1 }).lean();
    return cleanDocs<TradingSignalConfig>(docs);
  }

  async getTradingSignalById(id: string): Promise<TradingSignalConfig | null> {
    const doc = await TradingSignalModel.findOne({ id }).lean();
    return cleanDoc<TradingSignalConfig>(doc);
  }

  async saveTradingSignal(signal: TradingSignalConfig): Promise<TradingSignalConfig> {
    await TradingSignalModel.findOneAndUpdate(
      { id: signal.id },
      { $set: signal },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    return signal;
  }

  async updateTradingSignal(id: string, updates: Partial<TradingSignalConfig>): Promise<TradingSignalConfig> {
    const current = await this.getTradingSignalById(id);
    if (!current) throw new Error(`Không tìm thấy tín hiệu với ID ${id}`);

    const updated: TradingSignalConfig = {
      ...current,
      ...updates,
      updatedAt: Date.now()
    };

    return this.saveTradingSignal(updated);
  }

  async deleteTradingSignal(id: string): Promise<boolean> {
    const res = await TradingSignalModel.deleteOne({ id });
    return res.deletedCount > 0;
  }

  async resetTradingSignalsToDefault(): Promise<TradingSignalConfig[]> {
    await TradingSignalModel.deleteMany({});
    for (const sig of DEFAULT_TRADING_SIGNALS) {
      await this.saveTradingSignal(sig);
    }
    return this.getAllTradingSignals();
  }

  // --- Users & Auth ---
  async findUserByEmail(email: string): Promise<User | null> {
    const doc = await UserModel.findOne({ email: email.toLowerCase().trim() }).lean();
    return cleanDoc<User>(doc);
  }

  async findUserById(id: string): Promise<User | null> {
    const doc = await UserModel.findOne({ id }).lean();
    return cleanDoc<User>(doc);
  }

  async findUserByGoogleId(googleId: string): Promise<User | null> {
    const doc = await UserModel.findOne({ googleId }).lean();
    return cleanDoc<User>(doc);
  }

  async saveUser(user: User): Promise<User> {
    await UserModel.findOneAndUpdate(
      { id: user.id },
      { $set: user },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    const current = await this.findUserById(id);
    if (!current) throw new Error(`Không tìm thấy người dùng với ID ${id}`);

    const updated: User = {
      ...current,
      ...updates,
      updatedAt: Date.now()
    };

    return this.saveUser(updated);
  }

  async getAllUsers(): Promise<User[]> {
    const docs = await UserModel.find({}).sort({ createdAt: -1 }).lean();
    return cleanDocs<User>(docs);
  }

  async deleteUser(id: string): Promise<boolean> {
    const res = await UserModel.deleteOne({ id });
    return res.deletedCount > 0;
  }

  async updateUserPreferences(userId: string, prefs: { lastSymbol?: any; lastTimeframe?: any }): Promise<User> {
    return this.updateUser(userId, prefs);
  }

  async updateUserPlan(userId: string, plan: any): Promise<User> {
    return this.updateUser(userId, { plan });
  }

  async updateUserTelegram(userId: string, telegramData: { telegramBotToken?: string; telegramChatId?: string; telegramAlertsActive?: boolean }): Promise<User> {
    return this.updateUser(userId, telegramData);
  }

  async createDefaultRuleForUser(userId: string): Promise<AutomationRule | null> {
    // Check if user already has rules
    const existingRules = await RuleModel.find({ userId }).lean();
    if (existingRules.length > 0) return null;

    // Find the first active trading signal from admin catalog
    const signals = await this.getAllTradingSignals();
    const defaultSignal = signals.find(s => s.isActive) || signals[0];
    if (!defaultSignal) return null;

    const defaultRule: AutomationRule = {
      id: uuidv4(),
      userId,
      signalId: defaultSignal.id,
      isDefaultRule: true,
      name: `[Mặc định] ${defaultSignal.name}`,
      symbol: (defaultSignal.symbol === 'ALL' ? 'XAUUSD' : defaultSignal.symbol) as any,
      timeframe: defaultSignal.timeframe,
      indicator: (defaultSignal.conditions[0]?.indicatorType as any) || 'RSI',
      condition: {
        operator: defaultSignal.conditions[0]?.operator === '<' ? '<' : '>',
        value: Number(defaultSignal.conditions[0]?.value) || 30
      },
      action: defaultSignal.action,
      lot: defaultSignal.lot || 0.05,
      slPips: defaultSignal.slPips || 30,
      tpPips: defaultSignal.tpPips || 60,
      trailingStopPips: defaultSignal.trailingStopPips || 0,
      maxOpenPositions: defaultSignal.maxOpenPositions || 1,
      isActive: true,
      totalTrades: 0,
      winTrades: 0,
      totalProfit: 0,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    return this.saveRule(defaultRule);
  }
}

export const db = new DatabaseService();
