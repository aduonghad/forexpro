import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { CONFIG } from '../config.js';
import { db } from '../db/database.js';
import { marketData, TickData } from './marketData.js';
import { Order, OrderType, TradingSymbol, AccountInfo } from '../types/index.js';

export interface OpenOrderParams {
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

    const orders = await db.getOpenOrders();
    this.openOrdersMap.clear();
    for (const order of orders) {
      this.openOrdersMap.set(order.id, order);
    }
  }

  getOpenOrders(): Order[] {
    return Array.from(this.openOrdersMap.values());
  }

  getAccountInfo(): AccountInfo {
    const openOrders = this.getOpenOrders();
    let floatingPnl = 0;
    let totalMargin = 0;

    for (const order of openOrders) {
      floatingPnl += order.pnl;
      // Exness margin estimation: lot * contractSize / leverage
      const spec = CONFIG.SYMBOLS[order.symbol];
      const nominal = order.lot * (spec.pipValuePerLot / spec.pipSize);
      totalMargin += nominal / CONFIG.EXNESS.LEVERAGE;
    }

    const equity = Number((this.currentBalance + floatingPnl).toFixed(2));
    const margin = Number(totalMargin.toFixed(2));
    const freeMargin = Number((equity - margin).toFixed(2));
    const marginLevel = margin > 0 ? Number(((equity / margin) * 100).toFixed(1)) : 9999.0;

    return {
      login: this.login,
      server: this.server,
      currency: 'USD',
      balance: Number(this.currentBalance.toFixed(2)),
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

  async closeAllOrders(reason: string = 'Đóng tất cả'): Promise<Order[]> {
    const openOrderIds = Array.from(this.openOrdersMap.keys());
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
