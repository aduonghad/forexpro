import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { CONFIG } from '../config.js';
import { db } from '../db/database.js';
import { marketData, TickData } from './marketData.js';
import { Order, OrderType, TradingSymbol, AccountInfo } from '../types/index.js';

export interface OpenOrderParams {
  userId?: string;
  symbol: TradingSymbol;
  type: OrderType;
  lot: number;
  slPips?: number;
  tpPips?: number;
  trailingStopPips?: number;
  ruleId?: string;
  ruleName?: string;
}

export class MT5BridgeService extends EventEmitter {
  private isConnectedToMT5: boolean = false;
  private isPaperTrading: boolean = true;
  private currentBalance: number = CONFIG.EXNESS.STARTING_BALANCE;
  private openOrdersMap: Map<string, Order> = new Map();
  private userAccountsMap: Map<string, { login: string; server: string; balance: number; leverage: number }> = new Map();
  private login: string = CONFIG.EXNESS.LOGIN;
  private server: string = CONFIG.EXNESS.SERVER;
  private botActive: boolean = true;

  constructor() {
    super();
    // Listen to market ticks to update positions & check SL/TP/Trailing Stop
    marketData.on('tick', (tick: TickData) => {
      this.handleTick(tick);
    });
  }

  async init(): Promise<void> {
    const savedBalance = await db.getSetting('balance');
    this.currentBalance = savedBalance ? parseFloat(savedBalance) : CONFIG.EXNESS.STARTING_BALANCE;

    const savedLogin = await db.getSetting('login');
    if (savedLogin) this.login = savedLogin;

    const savedServer = await db.getSetting('server');
    if (savedServer) this.server = savedServer;

    const savedBotActive = await db.getSetting('botActive');
    if (savedBotActive !== null) {
      this.botActive = savedBotActive !== 'false';
    }

    const orders = await db.getAllSystemOpenOrders();
    this.openOrdersMap.clear();
    for (const order of orders) {
      this.openOrdersMap.set(order.id, order);
    }

    try {
      const allAccounts = await db.getAllExnessAccounts();
      for (const acc of allAccounts) {
        if (acc.isActive && acc.userId) {
          this.userAccountsMap.set(acc.userId, {
            login: acc.login,
            server: acc.server,
            balance: acc.balance !== undefined ? acc.balance : this.currentBalance,
            leverage: acc.leverage || CONFIG.EXNESS.LEVERAGE
          });
        }
      }
    } catch (err) {
      console.warn('Không thể nạp trước danh sách tài khoản Exness:', err);
    }
  }

  setUserAccount(userId: string, account: { login: string; server: string; balance?: number; leverage?: number }) {
    const prev = this.userAccountsMap.get(userId);
    this.userAccountsMap.set(userId, {
      login: account.login,
      server: account.server,
      balance: account.balance !== undefined ? account.balance : (prev?.balance ?? this.currentBalance),
      leverage: account.leverage !== undefined ? account.leverage : (prev?.leverage ?? CONFIG.EXNESS.LEVERAGE)
    });
  }

  getOpenOrders(): Order[] {
    return Array.from(this.openOrdersMap.values());
  }

  getAccountInfo(userId?: string): AccountInfo {
    const allOpenOrders = this.getOpenOrders();
    let openOrders: Order[] = [];

    if (userId === 'ALL') {
      openOrders = allOpenOrders;
    } else if (userId) {
      openOrders = allOpenOrders.filter(o => o.userId === userId);
    } else {
      // Unauthenticated guest -> strictly 0 open positions and 0 floating PnL
      openOrders = [];
    }

    const userAcc = (userId && userId !== 'ALL') ? this.userAccountsMap.get(userId) : null;
    const balance = userAcc?.balance ?? this.currentBalance;
    const login = userAcc?.login || this.login;
    const server = userAcc?.server || this.server;
    const leverage = userAcc?.leverage || CONFIG.EXNESS.LEVERAGE;

    let floatingPnl = 0;
    let totalMargin = 0;

    for (const order of openOrders) {
      floatingPnl += order.pnl;
      // Exness margin estimation: lot * contractSize / leverage
      const spec = CONFIG.SYMBOLS[order.symbol];
      if (spec) {
        const nominal = order.lot * (spec.pipValuePerLot / spec.pipSize);
        totalMargin += nominal / leverage;
      }
    }

    const equity = Number((balance + floatingPnl).toFixed(2));
    const margin = Number(totalMargin.toFixed(2));
    const freeMargin = Number((equity - margin).toFixed(2));
    const marginLevel = margin > 0 ? Number(((equity / margin) * 100).toFixed(1)) : 9999.0;

    return {
      login,
      server,
      currency: 'USD',
      balance: Number(balance.toFixed(2)),
      equity,
      margin,
      freeMargin,
      marginLevel,
      openPositionsCount: openOrders.length,
      floatingPnl: Number(floatingPnl.toFixed(2)),
      isLive: !this.isPaperTrading,
      botActive: this.botActive
    };
  }

  async setBotActive(active: boolean): Promise<void> {
    this.botActive = active;
    await db.setSetting('botActive', active ? 'true' : 'false');
  }

  switchAccount(account: { login: string; server: string; balance?: number; leverage?: number }) {
    this.login = account.login;
    this.server = account.server;
    if (account.balance !== undefined && !isNaN(account.balance)) {
      this.currentBalance = account.balance;
      db.setSetting('balance', this.currentBalance.toString()).catch(() => {});
    }
    db.setSetting('login', this.login).catch(() => {});
    db.setSetting('server', this.server).catch(() => {});
    const updatedInfo = this.getAccountInfo();
    this.emit('accountUpdate', updatedInfo);
    return updatedInfo;
  }

  async openOrder(params: OpenOrderParams): Promise<Order> {
    const spec = CONFIG.SYMBOLS[params.symbol];
    const prices = marketData.getCurrentPrice(params.symbol);
    const openPrice = params.type === 'BUY' ? prices.ask : prices.bid;

    let sl: number | undefined = undefined;
    let tp: number | undefined = undefined;

    if (params.slPips && params.slPips > 0) {
      sl = params.type === 'BUY'
        ? Number((openPrice - params.slPips * spec.pipSize).toFixed(spec.digits))
        : Number((openPrice + params.slPips * spec.pipSize).toFixed(spec.digits));
    }

    if (params.tpPips && params.tpPips > 0) {
      tp = params.type === 'BUY'
        ? Number((openPrice + params.tpPips * spec.pipSize).toFixed(spec.digits))
        : Number((openPrice - params.tpPips * spec.pipSize).toFixed(spec.digits));
    }

    const newOrder: Order = {
      id: uuidv4(),
      userId: params.userId,
      ruleId: params.ruleId,
      ruleName: params.ruleName,
      symbol: params.symbol,
      type: params.type,
      lot: params.lot,
      openPrice,
      currentPrice: openPrice,
      sl,
      tp,
      trailingStop: params.trailingStopPips,
      highestPrice: openPrice,
      lowestPrice: openPrice,
      pnl: 0,
      status: 'OPEN',
      openTime: Date.now()
    };

    this.openOrdersMap.set(newOrder.id, newOrder);
    await db.saveOrder(newOrder);

    // Update rule stats if triggered from rule
    if (params.ruleId) {
      const rule = await db.getRuleById(params.ruleId);
      if (rule) {
        rule.totalTrades += 1;
        rule.lastTriggeredAt = Date.now();
        rule.updatedAt = Date.now();
        await db.saveRule(rule);
      }
    }

    this.emit('orderOpened', newOrder);
    return newOrder;
  }

  async closeOrder(orderId: string, reason: string = 'Thủ công'): Promise<Order | null> {
    let order = this.openOrdersMap.get(orderId);
    if (!order) {
      const fromDb = await db.getOrderById(orderId);
      if (fromDb) order = fromDb;
    }
    if (!order || order.status !== 'OPEN') return null;

    const prices = marketData.getCurrentPrice(order.symbol);
    const closePrice = order.type === 'BUY' ? prices.bid : prices.ask;
    const finalPnl = this.calculatePnl(order, closePrice);

    order.closePrice = closePrice;
    order.currentPrice = closePrice;
    order.pnl = finalPnl;
    order.status = 'CLOSED';
    order.closeTime = Date.now();
    order.closeReason = reason;

    this.openOrdersMap.delete(order.id);
    await db.saveOrder(order);

    // Update balance
    this.currentBalance += finalPnl;
    await db.setSetting('balance', this.currentBalance.toString());

    if (order.userId) {
      const userAcc = this.userAccountsMap.get(order.userId);
      if (userAcc) {
        userAcc.balance = Number((userAcc.balance + finalPnl).toFixed(2));
        this.userAccountsMap.set(order.userId, userAcc);
      }
      db.getActiveExnessAccountForUser(order.userId).then(async (activeAcc) => {
        if (activeAcc) {
          activeAcc.balance = Number((activeAcc.balance + finalPnl).toFixed(2));
          activeAcc.equity = activeAcc.balance;
          await db.saveExnessAccount(activeAcc);
        }
      }).catch(err => console.error('Lỗi cập nhật số dư tài khoản Exness:', err));
    }

    // Update rule win/loss stats
    if (order.ruleId) {
      const rule = await db.getRuleById(order.ruleId);
      if (rule) {
        rule.totalProfit += finalPnl;
        if (finalPnl > 0) {
          rule.winTrades += 1;
        }
        rule.updatedAt = Date.now();
        await db.saveRule(rule);
      }
    }

    this.emit('orderClosed', { order, pnl: finalPnl, reason });
    return order;
  }

  async closeAllOrders(reason: string = 'Đóng tất cả', userId?: string): Promise<Order[]> {
    let openOrders = Array.from(this.openOrdersMap.values());
    if (userId) {
      openOrders = openOrders.filter(o => o.userId === userId);
    }
    const openOrderIds = openOrders.map(o => o.id);
    const closed: Order[] = [];
    for (const ordId of openOrderIds) {
      const res = await this.closeOrder(ordId, reason);
      if (res) closed.push(res);
    }
    return closed;
  }

  private calculatePnl(order: Order, currentPrice: number): number {
    const spec = CONFIG.SYMBOLS[order.symbol];
    let priceDiff = 0;
    if (order.type === 'BUY') {
      priceDiff = currentPrice - order.openPrice;
    } else {
      priceDiff = order.openPrice - currentPrice;
    }

    const pips = priceDiff / spec.pipSize;
    const pnl = pips * spec.pipValuePerLot * order.lot;
    return Number(pnl.toFixed(2));
  }

  private handleTick(tick: TickData) {
    const openOrders = Array.from(this.openOrdersMap.values()).filter(o => o.symbol === tick.symbol);
    if (openOrders.length === 0) return;

    const spec = CONFIG.SYMBOLS[tick.symbol];

    for (const order of openOrders) {
      const currentPrice = order.type === 'BUY' ? tick.bid : tick.ask;
      order.currentPrice = currentPrice;
      order.pnl = this.calculatePnl(order, currentPrice);

      // Track extreme prices for trailing stop
      if (!order.highestPrice || currentPrice > order.highestPrice) order.highestPrice = currentPrice;
      if (!order.lowestPrice || currentPrice < order.lowestPrice) order.lowestPrice = currentPrice;

      // Trailing stop logic
      if (order.trailingStop && order.trailingStop > 0) {
        const trailDistance = order.trailingStop * spec.pipSize;
        if (order.type === 'BUY') {
          const newSl = Number((order.highestPrice - trailDistance).toFixed(spec.digits));
          if (!order.sl || newSl > order.sl) {
            order.sl = newSl;
          }
        } else {
          const newSl = Number((order.lowestPrice + trailDistance).toFixed(spec.digits));
          if (!order.sl || newSl < order.sl) {
            order.sl = newSl;
          }
        }
      }

      // Check Take Profit
      if (order.tp) {
        const isTpTriggered = order.type === 'BUY'
          ? currentPrice >= order.tp
          : currentPrice <= order.tp;

        if (isTpTriggered) {
          this.closeOrder(order.id, 'Chốt Lời (Take Profit)');
          continue;
        }
      }

      // Check Stop Loss
      if (order.sl) {
        const isSlTriggered = order.type === 'BUY'
          ? currentPrice <= order.sl
          : currentPrice >= order.sl;

        if (isSlTriggered) {
          this.closeOrder(order.id, 'Cắt Lỗ (Stop Loss)');
          continue;
        }
      }

      // Async write-through to MongoDB
      db.saveOrder(order).catch(err => {
        console.error('Lỗi cập nhật trạng thái order:', err.message);
      });
    }
  }

  async resetDemoBalance(amount: number = 10000.0): Promise<AccountInfo> {
    await this.closeAllOrders('Reset tài khoản');
    this.currentBalance = amount;
    await db.setSetting('balance', amount.toString());
    return this.getAccountInfo();
  }
}

export const mt5Bridge = new MT5BridgeService();
