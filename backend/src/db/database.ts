import { v4 as uuidv4 } from 'uuid';
import { CONFIG } from '../config.js';
import { AutomationRule, Order, BotMessage, AccountInfo, CandlestickPattern, IndicatorConfig, TradingSignalConfig } from '../types/index.js';
import { DEFAULT_PATTERNS } from './defaultPatterns.js';

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

function getDatabaseEngine(): any {
  // 1. Thử node:sqlite tích hợp sẵn trong Node.js 22+ (chạy native 100% trên cả Windows và Mac, không cần trình biên dịch C++)
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const sqliteModule = eval('require')('node:sqlite');
    if (sqliteModule && sqliteModule.DatabaseSync) {
      return sqliteModule.DatabaseSync;
    }
  } catch (e) {}

  // 2. Thử better-sqlite3 nếu có
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const betterSqlite = eval('require')('better-sqlite3');
    return betterSqlite;
  } catch (e) {}

  throw new Error(
    'Không tìm thấy SQLite engine. Vui lòng sử dụng Node.js v22+ (đã có sẵn node:sqlite) hoặc cài đặt better-sqlite3.'
  );
}

const DbEngine: any = getDatabaseEngine();

class DatabaseService {
  private db: any;

  constructor() {
    this.db = new DbEngine(CONFIG.DB_PATH);
    this.initTables();
    this.seedDefaultData();
  }

  // Wrapper chuẩn hoá tham số undefined -> null tương thích 100% trên cả Windows và Mac giữa node:sqlite & better-sqlite3
  private prepare(sql: string) {
    const rawStmt = this.db.prepare(sql);
    return {
      get: (...args: any[]) => {
        const sanitized = args.map(a => (a === undefined ? null : a));
        return rawStmt.get(...sanitized);
      },
      all: (...args: any[]) => {
        const sanitized = args.map(a => (a === undefined ? null : a));
        return rawStmt.all(...sanitized);
      },
      run: (...args: any[]) => {
        const sanitized = args.map(a => (a === undefined ? null : a));
        return rawStmt.run(...sanitized);
      }
    };
  }

  private initTables() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS automation_rules (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        symbol TEXT NOT NULL,
        timeframe TEXT NOT NULL,
        indicator TEXT NOT NULL,
        condition_json TEXT NOT NULL,
        action TEXT NOT NULL,
        lot REAL NOT NULL,
        sl_pips REAL NOT NULL,
        tp_pips REAL NOT NULL,
        trailing_stop_pips REAL DEFAULT 0,
        max_open_positions INTEGER DEFAULT 1,
        is_active INTEGER DEFAULT 1,
        total_trades INTEGER DEFAULT 0,
        win_trades INTEGER DEFAULT 0,
        total_profit REAL DEFAULT 0,
        last_triggered_at INTEGER,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        rule_id TEXT,
        rule_name TEXT,
        symbol TEXT NOT NULL,
        type TEXT NOT NULL,
        lot REAL NOT NULL,
        open_price REAL NOT NULL,
        current_price REAL NOT NULL,
        close_price REAL,
        sl REAL,
        tp REAL,
        trailing_stop REAL,
        highest_price REAL,
        lowest_price REAL,
        pnl REAL DEFAULT 0,
        status TEXT NOT NULL,
        open_time INTEGER NOT NULL,
        close_time INTEGER,
        close_reason TEXT
      );

      CREATE TABLE IF NOT EXISTS bot_messages (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        symbol TEXT,
        order_id TEXT,
        data_json TEXT,
        timestamp INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS account_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS candlestick_patterns (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        signal TEXT NOT NULL,
        candle_count INTEGER NOT NULL,
        description TEXT,
        candles_json TEXT NOT NULL,
        is_active INTEGER DEFAULT 1,
        is_predefined INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS indicator_configs (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        category TEXT NOT NULL,
        description TEXT,
        is_active INTEGER DEFAULT 1,
        timeframe TEXT NOT NULL,
        parameters_json TEXT NOT NULL,
        priority INTEGER DEFAULT 1,
        buy_condition_json TEXT,
        sell_condition_json TEXT,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS trading_signals (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        action TEXT NOT NULL,
        symbol TEXT NOT NULL,
        timeframe TEXT NOT NULL,
        logic_operator TEXT NOT NULL,
        conditions_json TEXT NOT NULL,
        lot REAL NOT NULL,
        sl_pips REAL NOT NULL,
        tp_pips REAL NOT NULL,
        trailing_stop_pips REAL,
        max_open_positions INTEGER DEFAULT 1,
        cooldown_seconds INTEGER DEFAULT 45,
        is_active INTEGER DEFAULT 1,
        total_triggers INTEGER DEFAULT 0,
        last_triggered_at INTEGER,
        updated_at INTEGER NOT NULL
      );
    `);
  }

  private seedDefaultData() {
    const existingRules = this.prepare('SELECT COUNT(*) as count FROM automation_rules').get() as { count: number };
    if (existingRules.count === 0) {
      const now = Date.now();
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
        this.saveRule(rule);
      }

      // Seed some initial bot messages
      this.addBotMessage({
        id: uuidv4(),
        type: 'INFO',
        title: 'Hệ Thống Khởi Động',
        message: 'Khởi chạy Exness Pro Auto Trading Bot thành công. Kết nối WebSocket hoạt động bình thường.',
        timestamp: now - 1000 * 60 * 15
      });
      this.addBotMessage({
        id: uuidv4(),
        type: 'ANALYSIS',
        title: 'Phân Tích Thị Trường XAU/USD',
        message: 'XAU/USD đang tích lũy biên độ 2362 - 2366. RSI 14 ở mức 42.1 (Trung tính). Chờ tín hiệu bứt phá.',
        symbol: 'XAUUSD',
        timestamp: now - 1000 * 60 * 10
      });
      this.addBotMessage({
        id: uuidv4(),
        type: 'ORDER',
        title: 'Khớp Lệnh Tự Động BUY XAU/USD',
        message: 'Khớp lệnh BUY 0.05 lot XAU/USD tại 2363.80 từ Yêu cầu: Scalping Vàng RSI Quá Bán M1.',
        symbol: 'XAUUSD',
        timestamp: now - 1000 * 60 * 5
      });
    }

    // Initialize account settings if not present
    const balanceSetting = this.getSetting('balance');
    if (!balanceSetting) {
      this.setSetting('balance', CONFIG.EXNESS.STARTING_BALANCE.toString());
      this.setSetting('server', CONFIG.EXNESS.SERVER);
      this.setSetting('login', CONFIG.EXNESS.LOGIN);
      this.setSetting('botActive', 'true');
    }

    // Seed default candlestick patterns if table is empty
    const existingPatterns = this.prepare('SELECT COUNT(*) as count FROM candlestick_patterns').get() as { count: number };
    if (existingPatterns.count === 0) {
      for (const pattern of DEFAULT_PATTERNS) {
        this.savePattern(pattern);
      }
    }

    // Seed default indicator configs if table is empty
    const existingIndicators = this.prepare('SELECT COUNT(*) as count FROM indicator_configs').get() as { count: number };
    if (existingIndicators.count === 0) {
      for (const ind of DEFAULT_INDICATOR_CONFIGS) {
        this.saveIndicatorConfig(ind);
      }
    }

    // Seed default trading signals if table is empty
    const existingSignals = this.prepare('SELECT COUNT(*) as count FROM trading_signals').get() as { count: number };
    if (existingSignals.count === 0) {
      for (const sig of DEFAULT_TRADING_SIGNALS) {
        this.saveTradingSignal(sig);
      }
    }
  }

  // --- Rules CRUD ---
  getAllRules(): AutomationRule[] {
    const stmt = this.prepare('SELECT * FROM automation_rules ORDER BY created_at DESC');
    const rows = stmt.all() as any[];
    return rows.map(r => ({
      id: r.id,
      name: r.name,
      symbol: r.symbol,
      timeframe: r.timeframe,
      indicator: r.indicator,
      condition: JSON.parse(r.condition_json),
      action: r.action,
      lot: Number(r.lot),
      slPips: Number(r.sl_pips),
      tpPips: Number(r.tp_pips),
      trailingStopPips: Number(r.trailing_stop_pips || 0),
      maxOpenPositions: Number(r.max_open_positions || 1),
      isActive: Boolean(r.is_active),
      totalTrades: Number(r.total_trades || 0),
      winTrades: Number(r.win_trades || 0),
      totalProfit: Number(r.total_profit || 0),
      lastTriggeredAt: r.last_triggered_at ? Number(r.last_triggered_at) : undefined,
      createdAt: Number(r.created_at),
      updatedAt: Number(r.updated_at)
    }));
  }

  getRuleById(id: string): AutomationRule | null {
    const stmt = this.prepare('SELECT * FROM automation_rules WHERE id = ?');
    const r = stmt.get(id) as any;
    if (!r) return null;
    return {
      id: r.id,
      name: r.name,
      symbol: r.symbol,
      timeframe: r.timeframe,
      indicator: r.indicator,
      condition: JSON.parse(r.condition_json),
      action: r.action,
      lot: Number(r.lot),
      slPips: Number(r.sl_pips),
      tpPips: Number(r.tp_pips),
      trailingStopPips: Number(r.trailing_stop_pips || 0),
      maxOpenPositions: Number(r.max_open_positions || 1),
      isActive: Boolean(r.is_active),
      totalTrades: Number(r.total_trades || 0),
      winTrades: Number(r.win_trades || 0),
      totalProfit: Number(r.total_profit || 0),
      lastTriggeredAt: r.last_triggered_at ? Number(r.last_triggered_at) : undefined,
      createdAt: Number(r.created_at),
      updatedAt: Number(r.updated_at)
    };
  }

  saveRule(rule: AutomationRule): AutomationRule {
    const stmt = this.prepare(`
      INSERT INTO automation_rules (
        id, name, symbol, timeframe, indicator, condition_json,
        action, lot, sl_pips, tp_pips, trailing_stop_pips,
        max_open_positions, is_active, total_trades, win_trades,
        total_profit, last_triggered_at, created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?
      )
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        symbol = excluded.symbol,
        timeframe = excluded.timeframe,
        indicator = excluded.indicator,
        condition_json = excluded.condition_json,
        action = excluded.action,
        lot = excluded.lot,
        sl_pips = excluded.sl_pips,
        tp_pips = excluded.tp_pips,
        trailing_stop_pips = excluded.trailing_stop_pips,
        max_open_positions = excluded.max_open_positions,
        is_active = excluded.is_active,
        total_trades = excluded.total_trades,
        win_trades = excluded.win_trades,
        total_profit = excluded.total_profit,
        last_triggered_at = excluded.last_triggered_at,
        updated_at = excluded.updated_at
    `);

    stmt.run(
      rule.id,
      rule.name,
      rule.symbol,
      rule.timeframe,
      rule.indicator,
      JSON.stringify(rule.condition),
      rule.action,
      rule.lot,
      rule.slPips,
      rule.tpPips,
      rule.trailingStopPips,
      rule.maxOpenPositions,
      rule.isActive ? 1 : 0,
      rule.totalTrades,
      rule.winTrades,
      rule.totalProfit,
      rule.lastTriggeredAt || null,
      rule.createdAt,
      rule.updatedAt
    );

    return rule;
  }

  deleteRule(id: string): boolean {
    const stmt = this.prepare('DELETE FROM automation_rules WHERE id = ?');
    stmt.run(id);
    return true;
  }

  // --- Orders ---
  getOpenOrders(): Order[] {
    const stmt = this.prepare("SELECT * FROM orders WHERE status = 'OPEN' ORDER BY open_time DESC");
    const rows = stmt.all() as any[];
    return rows.map(this.mapOrder);
  }

  getAllOrders(): Order[] {
    const stmt = this.prepare('SELECT * FROM orders ORDER BY open_time DESC LIMIT 100');
    const rows = stmt.all() as any[];
    return rows.map(this.mapOrder);
  }

  getOrderById(id: string): Order | null {
    const stmt = this.prepare('SELECT * FROM orders WHERE id = ?');
    const r = stmt.get(id) as any;
    if (!r) return null;
    return this.mapOrder(r);
  }

  saveOrder(order: Order): Order {
    const stmt = this.prepare(`
      INSERT INTO orders (
        id, rule_id, rule_name, symbol, type, lot,
        open_price, current_price, close_price, sl, tp,
        trailing_stop, highest_price, lowest_price, pnl,
        status, open_time, close_time, close_reason
      ) VALUES (
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?
      )
      ON CONFLICT(id) DO UPDATE SET
        current_price = excluded.current_price,
        close_price = excluded.close_price,
        sl = excluded.sl,
        tp = excluded.tp,
        trailing_stop = excluded.trailing_stop,
        highest_price = excluded.highest_price,
        lowest_price = excluded.lowest_price,
        pnl = excluded.pnl,
        status = excluded.status,
        close_time = excluded.close_time,
        close_reason = excluded.close_reason
    `);

    stmt.run(
      order.id,
      order.ruleId || null,
      order.ruleName || null,
      order.symbol,
      order.type,
      order.lot,
      order.openPrice,
      order.currentPrice,
      order.closePrice || null,
      order.sl || null,
      order.tp || null,
      order.trailingStop || null,
      order.highestPrice || order.openPrice,
      order.lowestPrice || order.openPrice,
      order.pnl,
      order.status,
      order.openTime,
      order.closeTime || null,
      order.closeReason || null
    );

    return order;
  }

  private mapOrder(r: any): Order {
    return {
      id: r.id,
      ruleId: r.rule_id || undefined,
      ruleName: r.rule_name || undefined,
      symbol: r.symbol,
      type: r.type,
      lot: Number(r.lot),
      openPrice: Number(r.open_price),
      currentPrice: Number(r.current_price),
      closePrice: r.close_price ? Number(r.close_price) : undefined,
      sl: r.sl ? Number(r.sl) : undefined,
      tp: r.tp ? Number(r.tp) : undefined,
      trailingStop: r.trailing_stop ? Number(r.trailing_stop) : undefined,
      highestPrice: r.highest_price ? Number(r.highest_price) : undefined,
      lowestPrice: r.lowest_price ? Number(r.lowest_price) : undefined,
      pnl: Number(r.pnl),
      status: r.status,
      openTime: Number(r.open_time),
      closeTime: r.close_time ? Number(r.close_time) : undefined,
      closeReason: r.close_reason || undefined,
    };
  }

  // --- Bot Messages ---
  getBotMessages(limit: number = 50): BotMessage[] {
    const stmt = this.prepare('SELECT * FROM bot_messages ORDER BY timestamp DESC LIMIT ?');
    const rows = stmt.all(limit) as any[];
    return rows.reverse().map(r => ({
      id: r.id,
      type: r.type,
      title: r.title,
      message: r.message,
      symbol: r.symbol || undefined,
      orderId: r.order_id || undefined,
      data: r.data_json ? JSON.parse(r.data_json) : undefined,
      timestamp: Number(r.timestamp)
    }));
  }

  addBotMessage(msg: BotMessage): BotMessage {
    const stmt = this.prepare(`
      INSERT INTO bot_messages (id, type, title, message, symbol, order_id, data_json, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      msg.id,
      msg.type,
      msg.title,
      msg.message,
      msg.symbol || null,
      msg.orderId || null,
      msg.data ? JSON.stringify(msg.data) : null,
      msg.timestamp
    );
    return msg;
  }

  // --- Settings ---
  getSetting(key: string): string | null {
    const stmt = this.prepare('SELECT value FROM account_settings WHERE key = ?');
    const row = stmt.get(key) as { value: string } | undefined;
    return row ? row.value : null;
  }

  setSetting(key: string, value: string) {
    const stmt = this.prepare(`
      INSERT INTO account_settings (key, value) VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `);
    stmt.run(key, value);
  }

  // --- Candlestick Patterns CRUD ---
  getAllPatterns(filter?: { category?: string; signal?: string; isActive?: boolean }): CandlestickPattern[] {
    let sql = 'SELECT * FROM candlestick_patterns WHERE 1=1';
    const params: any[] = [];

    if (filter?.category && filter.category !== 'ALL') {
      sql += ' AND category = ?';
      params.push(filter.category);
    }
    if (filter?.signal && filter.signal !== 'ALL') {
      sql += ' AND signal = ?';
      params.push(filter.signal);
    }
    if (filter?.isActive !== undefined) {
      sql += ' AND is_active = ?';
      params.push(filter.isActive ? 1 : 0);
    }

    sql += ' ORDER BY candle_count ASC, name ASC';
    const stmt = this.prepare(sql);
    const rows = stmt.all(...params) as any[];
    return rows.map(r => ({
      id: r.id,
      name: r.name,
      category: r.category,
      signal: r.signal,
      candleCount: Number(r.candle_count),
      description: r.description || '',
      candles: JSON.parse(r.candles_json),
      isActive: Boolean(r.is_active),
      isPredefined: Boolean(r.is_predefined),
      createdAt: Number(r.created_at),
      updatedAt: Number(r.updated_at)
    }));
  }

  getPatternById(id: string): CandlestickPattern | null {
    const stmt = this.prepare('SELECT * FROM candlestick_patterns WHERE id = ?');
    const r = stmt.get(id) as any;
    if (!r) return null;
    return {
      id: r.id,
      name: r.name,
      category: r.category,
      signal: r.signal,
      candleCount: Number(r.candle_count),
      description: r.description || '',
      candles: JSON.parse(r.candles_json),
      isActive: Boolean(r.is_active),
      isPredefined: Boolean(r.is_predefined),
      createdAt: Number(r.created_at),
      updatedAt: Number(r.updated_at)
    };
  }

  savePattern(pattern: CandlestickPattern): CandlestickPattern {
    const stmt = this.prepare(`
      INSERT INTO candlestick_patterns (
        id, name, category, signal, candle_count, description,
        candles_json, is_active, is_predefined, created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?
      )
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        category = excluded.category,
        signal = excluded.signal,
        candle_count = excluded.candle_count,
        description = excluded.description,
        candles_json = excluded.candles_json,
        is_active = excluded.is_active,
        is_predefined = excluded.is_predefined,
        updated_at = excluded.updated_at
    `);

    stmt.run(
      pattern.id,
      pattern.name,
      pattern.category,
      pattern.signal,
      pattern.candleCount,
      pattern.description || '',
      JSON.stringify(pattern.candles),
      pattern.isActive ? 1 : 0,
      pattern.isPredefined ? 1 : 0,
      pattern.createdAt || Date.now(),
      pattern.updatedAt || Date.now()
    );

    return pattern;
  }

  deletePattern(id: string): boolean {
    const stmt = this.prepare('DELETE FROM candlestick_patterns WHERE id = ?');
    stmt.run(id);
    return true;
  }

  resetPatternsToDefault(): void {
    this.db.exec('DELETE FROM candlestick_patterns');
    for (const p of DEFAULT_PATTERNS) {
      this.savePattern(p);
    }
  }

  // --- Indicators Configuration CRUD ---
  getAllIndicatorConfigs(): IndicatorConfig[] {
    const stmt = this.prepare('SELECT * FROM indicator_configs ORDER BY priority ASC');
    const rows = stmt.all() as any[];
    return rows.map(r => ({
      id: r.id,
      name: r.name,
      type: r.type,
      category: r.category || 'MOMENTUM',
      description: r.description,
      isActive: Boolean(r.is_active),
      timeframe: r.timeframe,
      buyCondition: JSON.parse(r.buy_condition_json || '{}'),
      sellCondition: JSON.parse(r.sell_condition_json || '{}'),
      parameters: JSON.parse(r.parameters_json || '{}'),
      priority: Number(r.priority || 1),
      updatedAt: Number(r.updated_at || Date.now())
    }));
  }

  getIndicatorConfigById(id: string): IndicatorConfig | null {
    const r = this.prepare('SELECT * FROM indicator_configs WHERE id = ?').get(id) as any;
    if (!r) return null;
    return {
      id: r.id,
      name: r.name,
      type: r.type,
      category: r.category || 'MOMENTUM',
      description: r.description,
      isActive: Boolean(r.is_active),
      timeframe: r.timeframe,
      buyCondition: JSON.parse(r.buy_condition_json || '{}'),
      sellCondition: JSON.parse(r.sell_condition_json || '{}'),
      parameters: JSON.parse(r.parameters_json || '{}'),
      priority: Number(r.priority || 1),
      updatedAt: Number(r.updated_at || Date.now())
    };
  }

  saveIndicatorConfig(config: IndicatorConfig): IndicatorConfig {
    const stmt = this.prepare(`
      INSERT INTO indicator_configs (
        id, name, type, category, description, is_active, timeframe,
        buy_condition_json, sell_condition_json, parameters_json, priority, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?
      )
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        type = excluded.type,
        category = excluded.category,
        description = excluded.description,
        is_active = excluded.is_active,
        timeframe = excluded.timeframe,
        buy_condition_json = excluded.buy_condition_json,
        sell_condition_json = excluded.sell_condition_json,
        parameters_json = excluded.parameters_json,
        priority = excluded.priority,
        updated_at = excluded.updated_at
    `);

    stmt.run(
      config.id,
      config.name,
      config.type,
      config.category || 'MOMENTUM',
      config.description || '',
      config.isActive ? 1 : 0,
      config.timeframe || 'M1',
      JSON.stringify(config.buyCondition || {}),
      JSON.stringify(config.sellCondition || {}),
      JSON.stringify(config.parameters || {}),
      config.priority || 1,
      config.updatedAt || Date.now()
    );

    return config;
  }

  updateIndicatorConfig(id: string, updates: Partial<IndicatorConfig>): IndicatorConfig {
    const current = this.getIndicatorConfigById(id);
    if (!current) throw new Error(`Không tìm thấy cấu hình chỉ báo với ID ${id}`);

    const updated: IndicatorConfig = {
      ...current,
      ...updates,
      updatedAt: Date.now()
    };

    return this.saveIndicatorConfig(updated);
  }

  resetIndicatorConfigsToDefault(): IndicatorConfig[] {
    this.db.exec('DELETE FROM indicator_configs');
    for (const ind of DEFAULT_INDICATOR_CONFIGS) {
      this.saveIndicatorConfig(ind);
    }
    return this.getAllIndicatorConfigs();
  }

  // --- Trading Signals CRUD ---
  getAllTradingSignals(): TradingSignalConfig[] {
    const stmt = this.prepare('SELECT * FROM trading_signals ORDER BY updated_at DESC');
    const rows = stmt.all() as any[];
    return rows.map(r => ({
      id: r.id,
      name: r.name,
      description: r.description || '',
      action: r.action as 'BUY' | 'SELL',
      symbol: r.symbol,
      timeframe: r.timeframe,
      logicOperator: r.logic_operator as 'AND' | 'OR',
      conditions: JSON.parse(r.conditions_json || '[]'),
      lot: Number(r.lot),
      slPips: Number(r.sl_pips),
      tpPips: Number(r.tp_pips),
      trailingStopPips: Number(r.trailing_stop_pips || 0),
      maxOpenPositions: Number(r.max_open_positions || 1),
      cooldownSeconds: Number(r.cooldown_seconds || 45),
      isActive: Boolean(r.is_active),
      totalTriggers: Number(r.total_triggers || 0),
      lastTriggeredAt: r.last_triggered_at ? Number(r.last_triggered_at) : undefined,
      updatedAt: Number(r.updated_at || Date.now())
    }));
  }

  getTradingSignalById(id: string): TradingSignalConfig | null {
    const r = this.prepare('SELECT * FROM trading_signals WHERE id = ?').get(id) as any;
    if (!r) return null;
    return {
      id: r.id,
      name: r.name,
      description: r.description || '',
      action: r.action as 'BUY' | 'SELL',
      symbol: r.symbol,
      timeframe: r.timeframe,
      logicOperator: r.logic_operator as 'AND' | 'OR',
      conditions: JSON.parse(r.conditions_json || '[]'),
      lot: Number(r.lot),
      slPips: Number(r.sl_pips),
      tpPips: Number(r.tp_pips),
      trailingStopPips: Number(r.trailing_stop_pips || 0),
      maxOpenPositions: Number(r.max_open_positions || 1),
      cooldownSeconds: Number(r.cooldown_seconds || 45),
      isActive: Boolean(r.is_active),
      totalTriggers: Number(r.total_triggers || 0),
      lastTriggeredAt: r.last_triggered_at ? Number(r.last_triggered_at) : undefined,
      updatedAt: Number(r.updated_at || Date.now())
    };
  }

  saveTradingSignal(signal: TradingSignalConfig): TradingSignalConfig {
    const stmt = this.prepare(`
      INSERT INTO trading_signals (
        id, name, description, action, symbol, timeframe,
        logic_operator, conditions_json, lot, sl_pips, tp_pips,
        trailing_stop_pips, max_open_positions, cooldown_seconds,
        is_active, total_triggers, last_triggered_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?, ?
      )
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        description = excluded.description,
        action = excluded.action,
        symbol = excluded.symbol,
        timeframe = excluded.timeframe,
        logic_operator = excluded.logic_operator,
        conditions_json = excluded.conditions_json,
        lot = excluded.lot,
        sl_pips = excluded.sl_pips,
        tp_pips = excluded.tp_pips,
        trailing_stop_pips = excluded.trailing_stop_pips,
        max_open_positions = excluded.max_open_positions,
        cooldown_seconds = excluded.cooldown_seconds,
        is_active = excluded.is_active,
        total_triggers = excluded.total_triggers,
        last_triggered_at = excluded.last_triggered_at,
        updated_at = excluded.updated_at
    `);

    stmt.run(
      signal.id,
      signal.name,
      signal.description || '',
      signal.action,
      signal.symbol,
      signal.timeframe,
      signal.logicOperator || 'AND',
      JSON.stringify(signal.conditions || []),
      signal.lot,
      signal.slPips,
      signal.tpPips,
      signal.trailingStopPips || 0,
      signal.maxOpenPositions || 1,
      signal.cooldownSeconds || 45,
      signal.isActive ? 1 : 0,
      signal.totalTriggers || 0,
      signal.lastTriggeredAt || null,
      signal.updatedAt || Date.now()
    );

    return signal;
  }

  updateTradingSignal(id: string, updates: Partial<TradingSignalConfig>): TradingSignalConfig {
    const current = this.getTradingSignalById(id);
    if (!current) throw new Error(`Không tìm thấy tín hiệu với ID ${id}`);

    const updated: TradingSignalConfig = {
      ...current,
      ...updates,
      updatedAt: Date.now()
    };

    return this.saveTradingSignal(updated);
  }

  deleteTradingSignal(id: string): boolean {
    const stmt = this.prepare('DELETE FROM trading_signals WHERE id = ?');
    stmt.run(id);
    return true;
  }

  resetTradingSignalsToDefault(): TradingSignalConfig[] {
    this.db.exec('DELETE FROM trading_signals');
    for (const sig of DEFAULT_TRADING_SIGNALS) {
      this.saveTradingSignal(sig);
    }
    return this.getAllTradingSignals();
  }
}

export const db = new DatabaseService();
