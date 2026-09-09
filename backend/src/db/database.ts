import BetterSqlite from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import { CONFIG } from '../config.js';
import { AutomationRule, Order, BotMessage, AccountInfo } from '../types/index.js';

function getDatabaseEngine() {
  try {
    // If running on Node 22+ with node:sqlite
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const sqliteModule = eval('require')('node:sqlite');
    if (sqliteModule && sqliteModule.DatabaseSync) {
      return sqliteModule.DatabaseSync;
    }
  } catch (e) {}

  return BetterSqlite;
}

const DbEngine: any = getDatabaseEngine();

class DatabaseService {
  private db: any;

  constructor() {
    this.db = new DbEngine(CONFIG.DB_PATH);
    this.initTables();
    this.seedDefaultData();
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
    `);
  }

  private seedDefaultData() {
    const existingRules = this.db.prepare('SELECT COUNT(*) as count FROM automation_rules').get() as { count: number };
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
  }

  // --- Rules CRUD ---
  getAllRules(): AutomationRule[] {
    const stmt = this.db.prepare('SELECT * FROM automation_rules ORDER BY created_at DESC');
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
    const stmt = this.db.prepare('SELECT * FROM automation_rules WHERE id = ?');
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
    const stmt = this.db.prepare(`
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
    const stmt = this.db.prepare('DELETE FROM automation_rules WHERE id = ?');
    stmt.run(id);
    return true;
  }

  // --- Orders ---
  getOpenOrders(): Order[] {
    const stmt = this.db.prepare("SELECT * FROM orders WHERE status = 'OPEN' ORDER BY open_time DESC");
    const rows = stmt.all() as any[];
    return rows.map(this.mapOrder);
  }

  getAllOrders(): Order[] {
    const stmt = this.db.prepare('SELECT * FROM orders ORDER BY open_time DESC LIMIT 100');
    const rows = stmt.all() as any[];
    return rows.map(this.mapOrder);
  }

  getOrderById(id: string): Order | null {
    const stmt = this.db.prepare('SELECT * FROM orders WHERE id = ?');
    const r = stmt.get(id) as any;
    if (!r) return null;
    return this.mapOrder(r);
  }

  saveOrder(order: Order): Order {
    const stmt = this.db.prepare(`
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
    const stmt = this.db.prepare('SELECT * FROM bot_messages ORDER BY timestamp DESC LIMIT ?');
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
    const stmt = this.db.prepare(`
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
    const stmt = this.db.prepare('SELECT value FROM account_settings WHERE key = ?');
    const row = stmt.get(key) as { value: string } | undefined;
    return row ? row.value : null;
  }

  setSetting(key: string, value: string) {
    const stmt = this.db.prepare(`
      INSERT INTO account_settings (key, value) VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `);
    stmt.run(key, value);
  }
}

export const db = new DatabaseService();
