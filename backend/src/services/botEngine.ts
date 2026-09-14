import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/database.js';
import { marketData } from './marketData.js';
import { mt5Bridge } from './mt5Bridge.js';
import { IndicatorService } from './indicators.js';
import { CONFIG } from '../config.js';
import { AutomationRule, BotMessage, TradingSymbol, Timeframe, Order, Candle, TradingSignalConfig } from '../types/index.js';
import { CandleClassifier } from './candleClassifier.js';

export class BotEngineService extends EventEmitter {
  private isRunning: boolean = true;
  private swingAlertsActive: boolean = true;
  private analysisAlertsActive: boolean = true;
  private activeSymbol: TradingSymbol = 'XAUUSD';
  private activeTimeframe: Timeframe = 'M1';
  private evalTimer: NodeJS.Timeout | null = null;
  private analysisTimer: NodeJS.Timeout | null = null;
  private lastTriggerTimes: Map<string, number> = new Map(); // ruleId -> timestamp
  private lastNotifiedSwings: Map<string, { type: 'HIGH' | 'LOW'; time: number; price: number }> = new Map();

  constructor() {
    super();

    // Hook order close events from mt5Bridge to broadcast to chat
    mt5Bridge.on('orderClosed', async ({ order, pnl, reason }: { order: Order; pnl: number; reason: string }) => {
      const isProfit = pnl >= 0;
      const emoji = isProfit ? '🎯' : '🛑';
      const msg: BotMessage = {
        id: uuidv4(),
        userId: order.userId,
        type: 'CLOSE',
        title: `${emoji} Đóng Lệnh ${order.symbol} (${reason})`,
        message: `Lệnh ${order.type} ${order.lot} lot ${order.symbol} đã đóng tại giá ${order.closePrice}. Lợi nhuận: ${isProfit ? '+' : ''}$${pnl.toFixed(2)} USD.`,
        symbol: order.symbol,
        orderId: order.id,
        data: { pnl, reason, order },
        timestamp: Date.now()
      };
      db.addBotMessage(msg).catch(err => console.error('Lỗi lưu bot message:', err.message));
      this.emit('botMessage', msg);

      // Notify user on personal telegram if applicable
      if (order.userId) {
        try {
          const { telegramService } = await import('./telegramService.js');
          await telegramService.sendNotificationToUser(order.userId, msg.title, msg.message);
        } catch {}
      }
    });

    // Hook candle closed event from marketData to trigger market analysis on candle close
    marketData.on('candleClosed', ({ symbol, timeframe, closedCandle }: { symbol: TradingSymbol; timeframe: Timeframe; closedCandle: Candle }) => {
      this.handleCandleClosedAnalysis(symbol, timeframe, closedCandle).catch(err => {
        console.error('Lỗi khi xử lý phân tích đóng nến:', err.message);
      });
    });

    this.initDynamicSwingTrackers();
    this.startEngine();
  }

  async init(): Promise<void> {
    const savedBotActive = await db.getSetting('botActive');
    if (savedBotActive !== null) {
      this.isRunning = savedBotActive !== 'false';
    }
    const savedSwingAlerts = await db.getSetting('swingAlertsActive');
    if (savedSwingAlerts !== null) {
      this.swingAlertsActive = savedSwingAlerts !== 'false';
    }
    const savedAnalysisAlerts = await db.getSetting('analysisAlertsActive');
    if (savedAnalysisAlerts !== null) {
      this.analysisAlertsActive = savedAnalysisAlerts !== 'false';
    }

    const savedSymbol = (await db.getSetting('activeSymbol')) as TradingSymbol;
    const savedTf = (await db.getSetting('activeTimeframe')) as Timeframe;
    if (savedSymbol && CONFIG.SYMBOLS[savedSymbol]) {
      this.activeSymbol = savedSymbol;
    }
    if (savedTf && ['M1', 'M5', 'M15', 'H1'].includes(savedTf)) {
      this.activeTimeframe = savedTf;
    }
  }

  setBotActive(active: boolean) {
    this.isRunning = active;
    db.setSetting('botActive', active ? 'true' : 'false').catch(err => console.error(err.message));
    mt5Bridge.setBotActive(active).catch(err => console.error(err.message));
    const msg: BotMessage = {
      id: uuidv4(),
      type: 'INFO',
      title: active ? '🟢 Bot Đã Kích Hoạt' : '⏸️ Bot Đã Tạm Dừng',
      message: active
        ? 'Hệ thống giao dịch tự động đã sẵn sàng. Đang quét các yêu cầu tự động...'
        : 'Hệ thống giao dịch tự động đã tạm dừng quét điều kiện.',
      timestamp: Date.now()
    };
    db.addBotMessage(msg).catch(err => console.error(err.message));
    this.emit('botMessage', msg);
  }

  isBotActive(): boolean {
    return this.isRunning;
  }

  setSwingAlertsActive(active: boolean) {
    this.swingAlertsActive = active;
    db.setSetting('swingAlertsActive', active ? 'true' : 'false').catch(err => console.error(err.message));
    const msg: BotMessage = {
      id: uuidv4(),
      type: 'INFO',
      title: active ? 'Thông Báo TopDown: ĐÃ BẬT' : '⏸️ Thông Báo TopDown: TẠM DỪNG',
      message: active
        ? 'Bot sẽ tự động gửi thông báo lên chat ngay khi có tín hiệu TopDown mới được xác nhận thành công trên các cặp tiền.'
        : 'Đã tạm tắt thông báo tự động TopDown.',
      timestamp: Date.now()
    };
    db.addBotMessage(msg).catch(err => console.error(err.message));
    this.emit('botMessage', msg);
  }

  isSwingAlertsActive(): boolean {
    return this.swingAlertsActive;
  }

  setAnalysisAlertsActive(active: boolean) {
    this.analysisAlertsActive = active;
    db.setSetting('analysisAlertsActive', active ? 'true' : 'false').catch(err => console.error(err.message));
    const msg: BotMessage = {
      id: uuidv4(),
      type: 'INFO',
      title: active ? '📊 Phân Tích Tự Động: ĐÃ BẬT' : '⏸️ Phân Tích Tự Động: TẠM DỪNG',
      message: active
        ? `Đã BẬT tự động phân tích kỹ thuật định kỳ cho ${this.activeSymbol} (${this.activeTimeframe}).`
        : 'Đã tạm dừng tự động phân tích kỹ thuật định kỳ.',
      timestamp: Date.now()
    };
    db.addBotMessage(msg).catch(err => console.error(err.message));
    this.emit('botMessage', msg);
  }

  isAnalysisAlertsActive(): boolean {
    return this.analysisAlertsActive;
  }

  setActiveSymbolAndTimeframe(symbol: TradingSymbol, timeframe: Timeframe) {
    if (CONFIG.SYMBOLS[symbol]) {
      this.activeSymbol = symbol;
      db.setSetting('activeSymbol', symbol).catch(err => console.error(err.message));
    }
    if (['M1', 'M5', 'M15', 'H1'].includes(timeframe)) {
      this.activeTimeframe = timeframe;
      db.setSetting('activeTimeframe', timeframe).catch(err => console.error(err.message));
    }
  }

  getActiveSymbol(): TradingSymbol {
    return this.activeSymbol;
  }

  getActiveTimeframe(): Timeframe {
    return this.activeTimeframe;
  }

  private initDynamicSwingTrackers() {
    const symbols = Object.keys(CONFIG.SYMBOLS) as TradingSymbol[];
    const timeframes: Timeframe[] = ['M1', 'M5', 'M15', 'H1'];

    for (const symbol of symbols) {
      for (const tf of timeframes) {
        const key = `${symbol}_${tf}`;
        const candles = marketData.getCandles(symbol, tf, 100);
        if (candles.length >= 3) {
          const { swings } = IndicatorService.calculateDynamicSwings(candles);
          if (swings.length >= 2) {
            const lastConfirmed = swings[swings.length - 2];
            this.lastNotifiedSwings.set(key, {
              type: lastConfirmed.type,
              time: lastConfirmed.time,
              price: lastConfirmed.price
            });
          }
        }
      }
    }
  }

  private checkDynamicSwings() {
    if (!this.swingAlertsActive) return;

    // Only scan dynamic swings for the currently selected active symbol & timeframe
    const symbols: TradingSymbol[] = [this.activeSymbol];
    const timeframes: Timeframe[] = [this.activeTimeframe];

    for (const symbol of symbols) {
      for (const tf of timeframes) {
        const key = `${symbol}_${tf}`;
        const candles = marketData.getCandles(symbol, tf, 100);
        if (candles.length < 5) continue;

        const { swings, currentTrend } = IndicatorService.calculateDynamicSwings(candles);
        if (swings.length < 2) continue;

        const lastConfirmed = swings[swings.length - 2];
        const lastNotified = this.lastNotifiedSwings.get(key);

        const isNewSwing = !lastNotified || (
          lastConfirmed.type !== lastNotified.type &&
          lastConfirmed.time > lastNotified.time
        );

        if (!isNewSwing) continue;

        // Lưu trạng thái đỉnh đáy mới đã chốt
        this.lastNotifiedSwings.set(key, {
          type: lastConfirmed.type,
          time: lastConfirmed.time,
          price: lastConfirmed.price
        });

        const spec = CONFIG.SYMBOLS[symbol];
        const prevConfirmed = swings.length >= 3 ? swings[swings.length - 3] : null;
        const snapshot = IndicatorService.getSnapshot(candles);

        let amplitudeText = '';
        if (prevConfirmed) {
          const diff = lastConfirmed.price - prevConfirmed.price;
          const pips = Math.round(Math.abs(diff) / spec.pipSize);
          const duration = Math.max(1, Math.round((lastConfirmed.time - prevConfirmed.time) / 60));
          amplitudeText = `\n• Biên độ nhịp: ${diff >= 0 ? '+' : ''}${diff.toFixed(spec.digits)} (${pips} pips) qua ${duration} phút`;
        }

        const isPeak = lastConfirmed.type === 'HIGH';
        const formattedPrice = lastConfirmed.price.toLocaleString('en-US', { minimumFractionDigits: spec.digits });
        const timeStr = new Date(lastConfirmed.time * 1000).toLocaleTimeString('vi-VN');

        const title = isPeak
          ? `🔻 Xác Nhận ĐỈNH: ${symbol} (${tf})`
          : `🔺 Xác Nhận ĐÁY: ${symbol} (${tf})`;

        const transitionText = isPeak
          ? `📉 Đảo chiều sang nhịp GIẢM (Tìm Đáy mới)`
          : `📈 Đảo chiều sang nhịp TĂNG (Tìm Đỉnh mới)`;

        const rsiStatus = snapshot.rsi14 > 70 ? 'Quá mua' : snapshot.rsi14 < 30 ? 'Quá bán' : 'Cân bằng';

        const message = isPeak
          ? `Đã tạo ĐỈNH nhịp sóng thành công tại ${formattedPrice}.${amplitudeText}
• Xu hướng tiếp theo: ${transitionText}
• RSI(14): ${snapshot.rsi14} (${rsiStatus})
• Thời gian chốt đỉnh: ${timeStr}`
          : `Đã tạo ĐÁY nhịp sóng thành công tại ${formattedPrice}.${amplitudeText}
• Xu hướng tiếp theo: ${transitionText}
• RSI(14): ${snapshot.rsi14} (${rsiStatus})
• Thời gian chốt đáy: ${timeStr}`;

        const botMsg: BotMessage = {
          id: uuidv4(),
          type: 'SIGNAL',
          title,
          message,
          symbol,
          data: {
            type: isPeak ? 'SWING_PEAK' : 'SWING_TROUGH',
            price: lastConfirmed.price,
            timeframe: tf,
            time: lastConfirmed.time,
            rsi: snapshot.rsi14,
            currentTrend
          },
          timestamp: Date.now()
        };

        db.addBotMessage(botMsg).catch(err => console.error('Lỗi lưu swing alert:', err.message));
        this.emit('botMessage', botMsg);
      }
    }
  }

  private startEngine() {
    if (this.evalTimer) return;

    // Evaluate dynamic swings, active rules, and trading signals every 1500ms
    this.evalTimer = setInterval(async () => {
      this.checkDynamicSwings();
      if (!this.isRunning) return;
      await this.evaluateAllRules();
      await this.evaluateAllSignals();
    }, 1500);
  }

  private startPeriodicAnalysis() {
    if (this.analysisTimer) return;

    // Send technical analysis insight every 60 seconds
    this.analysisTimer = setInterval(() => {
      if (!this.isRunning) return;
      this.generatePeriodicAnalysis();
    }, 60000);
  }

  private async evaluateAllRules() {
    const allRules = await db.getAllRules();
    const rules = allRules.filter(r => r.isActive);
    if (rules.length === 0) return;

    const openOrders = mt5Bridge.getOpenOrders();

    for (const rule of rules) {
      // Check max positions for this rule
      const rulePositions = openOrders.filter(o => o.ruleId === rule.id);
      if (rulePositions.length >= rule.maxOpenPositions) {
        continue;
      }

      // Check cooldown (minimum 45 seconds between triggers for same rule)
      const lastTrigger = this.lastTriggerTimes.get(rule.id) || 0;
      if (Date.now() - lastTrigger < 45000) {
        continue;
      }

      const candles = marketData.getCandles(rule.symbol, rule.timeframe, 60);
      if (candles.length < 25) continue;

      const snapshot = IndicatorService.getSnapshot(candles);
      const currentPrice = marketData.getCurrentPrice(rule.symbol).lastPrice;

      let triggered = false;
      let triggerReason = '';

      switch (rule.indicator) {
        case 'RSI': {
          const rsi = snapshot.rsi14;
          const prevRsi = snapshot.rsi14Prev;
          const targetValue = rule.condition.value || 30;

          if (rule.condition.operator === '<' && rsi < targetValue) {
            triggered = true;
            triggerReason = `RSI(14) đạt ${rsi} (dưới ngưỡng ${targetValue} - Quá Bán)`;
          } else if (rule.condition.operator === '>' && rsi > targetValue) {
            triggered = true;
            triggerReason = `RSI(14) đạt ${rsi} (vượt ngưỡng ${targetValue} - Quá Mua)`;
          }
          break;
        }

        case 'EMA_CROSS': {
          const emaFast = snapshot.ema20;
          const emaFastPrev = snapshot.ema20Prev;
          const emaSlow = snapshot.ema50;
          const emaSlowPrev = snapshot.ema50Prev;

          if (rule.condition.operator === 'CROSS_ABOVE') {
            if (emaFastPrev <= emaSlowPrev && emaFast > emaSlow) {
              triggered = true;
              triggerReason = `EMA 20 (${emaFast.toFixed(2)}) vừa cắt lên trên EMA 50 (${emaSlow.toFixed(2)})`;
            }
          } else if (rule.condition.operator === 'CROSS_BELOW') {
            if (emaFastPrev >= emaSlowPrev && emaFast < emaSlow) {
              triggered = true;
              triggerReason = `EMA 20 (${emaFast.toFixed(2)}) vừa cắt xuống dưới EMA 50 (${emaSlow.toFixed(2)})`;
            }
          }
          break;
        }

        case 'BOLLINGER': {
          if (rule.condition.operator === 'TOUCH_LOWER' && currentPrice <= snapshot.bbLower) {
            triggered = true;
            triggerReason = `Giá chạm dải Bollinger dưới (${snapshot.bbLower.toFixed(2)}) -> Tín hiệu phản hồi tăng`;
          } else if (rule.condition.operator === 'TOUCH_UPPER' && currentPrice >= snapshot.bbUpper) {
            triggered = true;
            triggerReason = `Giá chạm dải Bollinger trên (${snapshot.bbUpper.toFixed(2)}) -> Tín hiệu phản hồi giảm`;
          }
          break;
        }

        case 'DYNAMIC_SWING': {
          const { swings, currentTrend } = IndicatorService.calculateDynamicSwings(candles);
          if (swings.length >= 2) {
            const lastConfirmed = swings[swings.length - 2];
            if (rule.condition.operator === 'SWING_LOW' && lastConfirmed.type === 'LOW' && currentTrend === 'UP') {
              triggered = true;
              triggerReason = `Đã xác nhận tạo ĐÁY nhịp giảm tại ${lastConfirmed.price} -> Bắt đầu nhịp tăng mới`;
            } else if (rule.condition.operator === 'SWING_HIGH' && lastConfirmed.type === 'HIGH' && currentTrend === 'DOWN') {
              triggered = true;
              triggerReason = `Đã xác nhận tạo ĐỈNH nhịp tăng tại ${lastConfirmed.price} -> Bắt đầu nhịp giảm mới`;
            }
          }
          break;
        }

        case 'WEBHOOK':
          // Handled via external webhook handler
          break;
      }

      if (triggered) {
        this.lastTriggerTimes.set(rule.id, Date.now());
        await this.executeTradeForRule(rule, triggerReason, currentPrice);
      }
    }
  }

  private async executeTradeForRule(rule: AutomationRule, reason: string, triggerPrice: number) {
    const order = await mt5Bridge.openOrder({
      symbol: rule.symbol,
      type: rule.action,
      lot: rule.lot,
      slPips: rule.slPips,
      tpPips: rule.tpPips,
      trailingStopPips: rule.trailingStopPips,
      ruleId: rule.id,
      ruleName: rule.name
    });

    const actionText = rule.action === 'BUY' ? '🟢 MUA (BUY)' : '🔴 BÁN (SELL)';
    const msg: BotMessage = {
      id: uuidv4(),
      userId: rule.userId || order.userId,
      type: 'ORDER',
      title: `🤖 Bot Vào Lệnh Tự Động: ${rule.symbol}`,
      message: `Khớp lệnh ${actionText} ${rule.lot} lot ${rule.symbol} tại ${order.openPrice}.
• Yêu cầu: "${rule.name}"
• Lý do kích hoạt: ${reason}
• Cắt lỗ (SL): ${order.sl || 'Không'} | Chốt lời (TP): ${order.tp || 'Không'}`,
      symbol: rule.symbol,
      orderId: order.id,
      data: { order, rule },
      timestamp: Date.now()
    };

    db.addBotMessage(msg).catch(err => console.error('Lỗi lưu bot message:', err.message));
    this.emit('botMessage', msg);
  }

  private async evaluateAllSignals() {
    const allSignals = await db.getAllTradingSignals();
    const signals = allSignals.filter(s => s.isActive);
    if (signals.length === 0) return;

    const openOrders = mt5Bridge.getOpenOrders();

    for (const signal of signals) {
      // Check max positions for this signal
      const signalPositions = openOrders.filter(o => o.ruleId === signal.id || o.ruleName === signal.name);
      if (signalPositions.length >= signal.maxOpenPositions) {
        continue;
      }

      // Check cooldown (minimum seconds between triggers)
      const lastTrigger = this.lastTriggerTimes.get(signal.id) || 0;
      const cooldownMs = (signal.cooldownSeconds || 45) * 1000;
      if (Date.now() - lastTrigger < cooldownMs) {
        continue;
      }

      const targetSymbol: TradingSymbol = signal.symbol === 'ALL' ? this.activeSymbol : (signal.symbol as TradingSymbol);
      const candles = marketData.getCandles(targetSymbol, signal.timeframe, 60);
      if (candles.length < 25) continue;

      const snapshot = IndicatorService.getSnapshot(candles);
      const currentPrice = marketData.getCurrentPrice(targetSymbol).lastPrice;

      if (!signal.conditions || signal.conditions.length === 0) continue;

      const conditionResults: { met: boolean; reason: string }[] = [];

      for (const cond of signal.conditions) {
        let met = false;
        let reason = '';

        switch (cond.indicatorType) {
          case 'RSI': {
            const rsi = snapshot.rsi14 || 50;
            const targetVal = Number(cond.value) || (cond.operator === '<' ? 30 : 70);
            if (cond.operator === '<' && rsi < targetVal) {
              met = true;
              reason = `RSI(14)=${rsi} < ${targetVal}`;
            } else if (cond.operator === '>' && rsi > targetVal) {
              met = true;
              reason = `RSI(14)=${rsi} > ${targetVal}`;
            }
            break;
          }

          case 'EMA_CROSS': {
            const emaFast = snapshot.ema20 || 0;
            const emaSlow = snapshot.ema50 || 0;
            const emaFastPrev = snapshot.ema20Prev || 0;
            const emaSlowPrev = snapshot.ema50Prev || 0;

            if (cond.operator === 'CROSS_ABOVE' && emaFastPrev <= emaSlowPrev && emaFast > emaSlow) {
              met = true;
              reason = `EMA 20 cắt lên EMA 50`;
            } else if (cond.operator === 'CROSS_BELOW' && emaFastPrev >= emaSlowPrev && emaFast < emaSlow) {
              met = true;
              reason = `EMA 20 cắt xuống EMA 50`;
            } else if (cond.operator === 'FAST_ABOVE_SLOW' && emaFast > emaSlow) {
              met = true;
              reason = `EMA 20 > EMA 50 (Xu hướng tăng)`;
            } else if (cond.operator === 'FAST_BELOW_SLOW' && emaFast < emaSlow) {
              met = true;
              reason = `EMA 20 < EMA 50 (Xu hướng giảm)`;
            }
            break;
          }

          case 'BOLLINGER': {
            const lower = snapshot.bbLower || 0;
            const upper = snapshot.bbUpper || 999999;
            const middle = snapshot.bbMiddle || currentPrice;

            if (cond.operator === 'TOUCH_LOWER' && currentPrice <= lower) {
              met = true;
              reason = `Chạm Lower Band (${lower.toFixed(2)})`;
            } else if (cond.operator === 'TOUCH_UPPER' && currentPrice >= upper) {
              met = true;
              reason = `Chạm Upper Band (${upper.toFixed(2)})`;
            } else if (cond.operator === 'PRICE_ABOVE_MIDDLE' && currentPrice > middle) {
              met = true;
              reason = `Giá trên Middle Band`;
            } else if (cond.operator === 'PRICE_BELOW_MIDDLE' && currentPrice < middle) {
              met = true;
              reason = `Giá dưới Middle Band`;
            }
            break;
          }

          case 'DYNAMIC_SWING': {
            const { swings, currentTrend } = IndicatorService.calculateDynamicSwings(candles);
            if (swings.length >= 2) {
              const lastConfirmed = swings[swings.length - 2];
              if (cond.operator === 'SWING_LOW' && lastConfirmed.type === 'LOW' && currentTrend === 'UP') {
                met = true;
                reason = `Xác nhận tạo Đáy sóng (${lastConfirmed.price})`;
              } else if (cond.operator === 'SWING_HIGH' && lastConfirmed.type === 'HIGH' && currentTrend === 'DOWN') {
                met = true;
                reason = `Xác nhận tạo Đỉnh sóng (${lastConfirmed.price})`;
              }
            }
            break;
          }

          case 'MACD': {
            const macdVal = snapshot.macdLine || 0;
            const signalVal = snapshot.macdSignal || 0;
            const hist = snapshot.macdHistogram || 0;
            const histPrev = snapshot.macdHistogramPrev || 0;

            if (cond.operator === 'HISTOGRAM_POSITIVE' && hist > 0) {
              met = true;
              reason = `MACD Histogram dương (+${hist.toFixed(2)})`;
            } else if (cond.operator === 'HISTOGRAM_NEGATIVE' && hist < 0) {
              met = true;
              reason = `MACD Histogram âm (${hist.toFixed(2)})`;
            } else if (cond.operator === 'CROSS_ABOVE' && histPrev <= 0 && hist > 0) {
              met = true;
              reason = `MACD cắt lên Signal Line`;
            } else if (cond.operator === 'CROSS_BELOW' && histPrev >= 0 && hist < 0) {
              met = true;
              reason = `MACD cắt xuống Signal Line`;
            }
            break;
          }
        }

        conditionResults.push({ met, reason });
      }

      // Check combination logic: AND vs OR
      const isTriggered = signal.logicOperator === 'OR'
        ? conditionResults.some(c => c.met)
        : conditionResults.every(c => c.met);

      if (isTriggered) {
        this.lastTriggerTimes.set(signal.id, Date.now());
        const satisfiedReasons = conditionResults.filter(c => c.met).map(c => c.reason).join(' & ');
        await this.executeTradeForSignal(signal, satisfiedReasons, currentPrice, targetSymbol);
      }
    }
  }

  private async executeTradeForSignal(signal: TradingSignalConfig, reason: string, triggerPrice: number, symbol: TradingSymbol) {
    try {
      await db.updateTradingSignal(signal.id, {
        totalTriggers: (signal.totalTriggers || 0) + 1,
        lastTriggeredAt: Date.now()
      });
    } catch {}

    const actionText = signal.action === 'BUY' ? '🟢 MUA (BUY)' : '🔴 BÁN (SELL)';
    const logicBadge = signal.conditions.length > 1
      ? `[Tổ hợp ${signal.conditions.length} chỉ báo - Logic ${signal.logicOperator}]`
      : `[1 Chỉ báo đơn lẻ]`;

    // 1. Find all active user rules associated with this signal
    const allRules = await db.getAllRules();
    const matchingRules = allRules.filter(r => r.isActive && (r.signalId === signal.id || r.name.includes(signal.name)));

    const openOrders = mt5Bridge.getOpenOrders();

    if (matchingRules.length > 0) {
      for (const rule of matchingRules) {
        // Check open positions limit for this user rule
        const rulePositions = openOrders.filter(o => o.ruleId === rule.id);
        if (rulePositions.length >= (rule.maxOpenPositions || 1)) {
          continue;
        }

        const order = await mt5Bridge.openOrder({
          symbol: (rule.symbol || symbol) as TradingSymbol,
          type: rule.action || signal.action,
          lot: rule.lot || signal.lot,
          slPips: rule.slPips !== undefined ? rule.slPips : signal.slPips,
          tpPips: rule.tpPips !== undefined ? rule.tpPips : signal.tpPips,
          trailingStopPips: rule.trailingStopPips !== undefined ? rule.trailingStopPips : signal.trailingStopPips,
          ruleId: rule.id,
          ruleName: rule.name,
          userId: rule.userId
        });

        // Update rule trade stats
        try {
          await db.saveRule({
            ...rule,
            totalTrades: (rule.totalTrades || 0) + 1,
            lastTriggeredAt: Date.now(),
            updatedAt: Date.now()
          });
        } catch {}

        const msg: BotMessage = {
          id: uuidv4(),
          userId: rule.userId,
          type: 'ORDER',
          title: `🤖 Bot Vào Lệnh Tự Động: ${order.symbol}`,
          message: `Khớp lệnh ${actionText} ${order.lot} lot ${order.symbol} tại ${order.openPrice}.
• Yêu cầu tự động: "${rule.name}"
• Tín hiệu: "${signal.name}" ${logicBadge}
• Điều kiện thỏa mãn: ${reason}
• Cắt lỗ (SL): ${order.sl || 'Không'} | Chốt lời (TP): ${order.tp || 'Không'}`,
          symbol: order.symbol,
          orderId: order.id,
          data: { order, rule, signal },
          timestamp: Date.now()
        };

        db.addBotMessage(msg).catch(err => console.error('Lỗi lưu bot message:', err.message));
        this.emit('botMessage', msg);

        // Notify user via Telegram if Pro/Ultra and configured
        if (rule.userId) {
          try {
            const { telegramService } = await import('./telegramService.js');
            await telegramService.sendNotificationToUser(rule.userId, msg.title, msg.message);
          } catch {}
        }
      }
    } else {
      // Default / System-level execution when no specific user rules are configured
      const order = await mt5Bridge.openOrder({
        symbol,
        type: signal.action,
        lot: signal.lot,
        slPips: signal.slPips,
        tpPips: signal.tpPips,
        trailingStopPips: signal.trailingStopPips,
        ruleId: signal.id,
        ruleName: signal.name
      });

      const msg: BotMessage = {
        id: uuidv4(),
        type: 'ORDER',
        title: `🤖 Bot Khớp Lệnh Tín Hiệu: ${symbol}`,
        message: `Khớp lệnh ${actionText} ${signal.lot} lot ${symbol} tại ${order.openPrice}.
• Chiến lược tín hiệu: "${signal.name}" ${logicBadge}
• Điều kiện thỏa mãn: ${reason}
• Cắt lỗ (SL): ${order.sl || 'Không'} | Chốt lời (TP): ${order.tp || 'Không'}`,
        symbol,
        orderId: order.id,
        data: { order, signal },
        timestamp: Date.now()
      };

      db.addBotMessage(msg).catch(err => console.error('Lỗi lưu bot message:', err.message));
      this.emit('botMessage', msg);
    }
  }

  async handleTradingViewWebhook(payload: {
    secret?: string;
    ticker: string;
    action: 'BUY' | 'SELL' | 'CLOSE';
    lot?: number;
    sl_pips?: number;
    tp_pips?: number;
    message?: string;
  }) {
    // Validate secret if configured
    if (payload.secret && payload.secret !== CONFIG.WEBHOOK_SECRET) {
      throw new Error('Sai mã bí mật Webhook secret');
    }

    const symbol = payload.ticker.replace('/', '').toUpperCase() as TradingSymbol;
    if (!CONFIG.SYMBOLS[symbol]) {
      throw new Error(`Cặp giao dịch ${payload.ticker} không được hỗ trợ`);
    }

    if (payload.action === 'CLOSE') {
      const closed = await mt5Bridge.closeAllOrders(`TradingView Webhook Alert: ${payload.message || 'Chốt vị thế'}`);
      const msg: BotMessage = {
        id: uuidv4(),
        type: 'INFO',
        title: `⚡ TradingView Webhook: Đóng Lệnh ${symbol}`,
        message: `Đã đóng ${closed.length} vị thế theo tín hiệu từ TradingView PineScript.`,
        symbol,
        timestamp: Date.now()
      };
      db.addBotMessage(msg).catch(err => console.error(err.message));
      this.emit('botMessage', msg);
      return { success: true, closedCount: closed.length };
    }

    // Find any active rule matching this webhook
    const allRules = await db.getAllRules();
    const matchingRule = allRules.find(r => r.symbol === symbol && r.indicator === 'WEBHOOK' && r.isActive);

    const lot = payload.lot || matchingRule?.lot || 0.1;
    const slPips = payload.sl_pips || matchingRule?.slPips || 25;
    const tpPips = payload.tp_pips || matchingRule?.tpPips || 50;

    const order = await mt5Bridge.openOrder({
      symbol,
      type: payload.action,
      lot,
      slPips,
      tpPips,
      ruleId: matchingRule?.id,
      ruleName: matchingRule?.name || 'TradingView Webhook'
    });

    const msg: BotMessage = {
      id: uuidv4(),
      type: 'SIGNAL',
      title: `⚡ Tín Hiệu TradingView Khớp Lệnh: ${symbol}`,
      message: `Nhận Webhook PineScript Alert! Khớp lệnh ${payload.action} ${lot} lot tại ${order.openPrice}.
Tin nhắn: "${payload.message || 'Tín hiệu tự động từ TradingView Alert'}"`,
      symbol,
      orderId: order.id,
      data: { order, payload },
      timestamp: Date.now()
    };

    db.addBotMessage(msg).catch(err => console.error(err.message));
    this.emit('botMessage', msg);
    return { success: true, order };
  }

  async handleCandleClosedAnalysis(symbol: TradingSymbol, timeframe: Timeframe, closedCandle: Candle) {
    if (!this.analysisAlertsActive) return;

    // 1. Identify active viewers watching this symbol & timeframe from wsHub
    let activeViewers: string[] = [];
    try {
      const { wsHub } = await import('../websocket/wsHub.js');
      activeViewers = wsHub.getActiveViewers(symbol, timeframe);
    } catch {}

    // 2. Identify users who have selected this symbol & timeframe in their account preferences
    let prefUsers: string[] = [];
    try {
      const { UserModel } = await import('../db/schemas.js');
      const users = await UserModel.find({ lastSymbol: symbol, lastTimeframe: timeframe }).select('id').lean();
      prefUsers = users.map((u: any) => u.id).filter(Boolean);
    } catch {}

    const targetUserIds = Array.from(new Set([...activeViewers, ...prefUsers]));
    const isGlobalActive = symbol === this.activeSymbol && timeframe === this.activeTimeframe;

    // Skip if nobody is viewing/preferring this pair and it is not the active symbol
    if (targetUserIds.length === 0 && !isGlobalActive) return;

    const snapshot = marketData.getIndicators(symbol, timeframe);
    const price = marketData.getCurrentPrice(symbol);
    const candles = marketData.getCandles(symbol, timeframe);
    const candleAnalysis = CandleClassifier.analyzeClosedCandle(candles, symbol, timeframe);

    let trendDescription = 'Đi ngang (Sideway)';
    if (snapshot.ema20 > snapshot.ema50) {
      trendDescription = `Tăng điểm ngắn hạn (${timeframe})`;
    } else if (snapshot.ema20 < snapshot.ema50) {
      trendDescription = `Điều chỉnh giảm (${timeframe})`;
    }

    let rsiState = 'Vùng cân bằng';
    if (snapshot.rsi14 < 35) rsiState = 'Gần vùng quá bán (RSI < 35) - Cơ hội MUA canh đảo chiều';
    else if (snapshot.rsi14 > 65) rsiState = 'Gần vùng quá mua (RSI > 65) - Cảnh báo kháng cự';

    const spec = CONFIG.SYMBOLS[symbol] || { digits: 2 };
    const closePriceStr = closedCandle ? closedCandle.close.toFixed(spec.digits) : price.lastPrice.toString();

    let patternSection = '';
    if (candleAnalysis) {
      const sigText = candleAnalysis.priceActionSignal === 'CANH_MUA' 
        ? '🟢 Khuyến nghị: CANH MUA (Bullish)' 
        : candleAnalysis.priceActionSignal === 'CANH_BAN' 
        ? '🔴 Khuyến nghị: CANH BÁN (Bearish)' 
        : '⚪ Khuyến nghị: THEO DÕI';
      patternSection = `• Mô hình nến vừa đóng: ${candleAnalysis.patternName} (${candleAnalysis.metrics.direction === 'BULLISH' ? 'Nến Xanh Tăng' : candleAnalysis.metrics.direction === 'BEARISH' ? 'Nến Đỏ Giảm' : 'Nến Doji'})
• Thông số nến: Thân ${candleAnalysis.metrics.bodyPips} pips (${candleAnalysis.metrics.bodyPercent}%) | Râu trên: ${candleAnalysis.metrics.upperWickPips} pips | Râu dưới: ${candleAnalysis.metrics.lowerWickPips} pips
• Đánh giá Price Action: ${candleAnalysis.sentiment}
• ${sigText}`;
    }

    const titleSuffix = candleAnalysis ? ` - ${candleAnalysis.patternName}` : '';
    const title = `📊 Phân Tích Đóng Nến: ${symbol} (${timeframe})${titleSuffix}`;
    const messageText = `Đã đóng 1 nến ${timeframe} của ${symbol} lúc ${new Date().toLocaleTimeString('vi-VN')}:
${patternSection ? patternSection + '\n' : ''}• Giá đóng nến: ${closePriceStr} (Bid: ${price.bid} | Ask: ${price.ask})
• RSI 14: ${snapshot.rsi14} (${rsiState})
• Xu hướng ${timeframe}: ${trendDescription}
• Bollinger Bands: [${snapshot.bbLower.toFixed(spec.digits)} - ${snapshot.bbUpper.toFixed(spec.digits)}]`;

    if (targetUserIds.length > 0) {
      for (const uid of targetUserIds) {
        const msg: BotMessage = {
          id: uuidv4(),
          userId: uid,
          type: 'ANALYSIS',
          title,
          message: messageText,
          symbol,
          data: { snapshot, price, timeframe, closedCandle, candleAnalysis },
          timestamp: Date.now()
        };
        db.addBotMessage(msg).catch(err => console.error('Lỗi lưu analysis message:', err.message));
        this.emit('botMessage', msg);
      }
    } else {
      const msg: BotMessage = {
        id: uuidv4(),
        type: 'ANALYSIS',
        title,
        message: messageText,
        symbol,
        data: { snapshot, price, timeframe, closedCandle, candleAnalysis },
        timestamp: Date.now()
      };
      db.addBotMessage(msg).catch(err => console.error('Lỗi lưu analysis message:', err.message));
      this.emit('botMessage', msg);
    }
  }

  generatePeriodicAnalysis(closedCandle?: Candle, targetSymbol?: TradingSymbol, targetTimeframe?: Timeframe) {
    if (!this.analysisAlertsActive) return;

    const symbol = targetSymbol || this.activeSymbol;
    const timeframe = targetTimeframe || this.activeTimeframe;
    const snapshot = marketData.getIndicators(symbol, timeframe);
    const price = marketData.getCurrentPrice(symbol);
    const candles = marketData.getCandles(symbol, timeframe);

    const candleAnalysis = CandleClassifier.analyzeClosedCandle(candles, symbol, timeframe);

    let trendDescription = 'Đi ngang (Sideway)';
    if (snapshot.ema20 > snapshot.ema50) {
      trendDescription = `Tăng điểm ngắn hạn (${timeframe})`;
    } else if (snapshot.ema20 < snapshot.ema50) {
      trendDescription = `Điều chỉnh giảm (${timeframe})`;
    }

    let rsiState = 'Vùng cân bằng';
    if (snapshot.rsi14 < 35) rsiState = 'Gần vùng quá bán (RSI < 35) - Cơ hội MUA canh đảo chiều';
    else if (snapshot.rsi14 > 65) rsiState = 'Gần vùng quá mua (RSI > 65) - Cảnh báo kháng cự';

    const spec = CONFIG.SYMBOLS[symbol] || { digits: 2 };
    const closePriceStr = closedCandle ? closedCandle.close.toFixed(spec.digits) : price.lastPrice.toString();

    let patternSection = '';
    if (candleAnalysis) {
      const sigText = candleAnalysis.priceActionSignal === 'CANH_MUA' 
        ? '🟢 Khuyến nghị: CANH MUA (Bullish)' 
        : candleAnalysis.priceActionSignal === 'CANH_BAN' 
        ? '🔴 Khuyến nghị: CANH BÁN (Bearish)' 
        : '⚪ Khuyến nghị: THEO DÕI';
      patternSection = `• Mô hình nến vừa đóng: ${candleAnalysis.patternName} (${candleAnalysis.metrics.direction === 'BULLISH' ? 'Nến Xanh Tăng' : candleAnalysis.metrics.direction === 'BEARISH' ? 'Nến Đỏ Giảm' : 'Nến Doji'})
• Thông số nến: Thân ${candleAnalysis.metrics.bodyPips} pips (${candleAnalysis.metrics.bodyPercent}%) | Râu trên: ${candleAnalysis.metrics.upperWickPips} pips | Râu dưới: ${candleAnalysis.metrics.lowerWickPips} pips
• Đánh giá Price Action: ${candleAnalysis.sentiment}
• ${sigText}`;
    }

    const titleSuffix = candleAnalysis ? ` - ${candleAnalysis.patternName}` : '';

    const msg: BotMessage = {
      id: uuidv4(),
      type: 'ANALYSIS',
      title: `📊 Phân Tích Đóng Nến: ${symbol} (${timeframe})${titleSuffix}`,
      message: `Đã đóng 1 nến ${timeframe} của ${symbol} lúc ${new Date().toLocaleTimeString('vi-VN')}:
${patternSection ? patternSection + '\n' : ''}• Giá đóng nến: ${closePriceStr} (Bid: ${price.bid} | Ask: ${price.ask})
• RSI 14: ${snapshot.rsi14} (${rsiState})
• Xu hướng ${timeframe}: ${trendDescription}
• Bollinger Bands: [${snapshot.bbLower.toFixed(spec.digits)} - ${snapshot.bbUpper.toFixed(spec.digits)}]`,
      symbol,
      data: { snapshot, price, timeframe, closedCandle, candleAnalysis },
      timestamp: Date.now()
    };

    db.addBotMessage(msg).catch(err => console.error('Lỗi lưu analysis message:', err.message));
    this.emit('botMessage', msg);
  }

  async handleUserChatMessage(
    userText: string,
    userId?: string,
    currentSymbol?: TradingSymbol,
    currentTf?: Timeframe
  ): Promise<BotMessage> {
    const text = userText.trim().toLowerCase();
    const activeSym = currentSymbol || this.activeSymbol;
    const activeTf = currentTf || this.activeTimeframe;
    let replyTitle = '🤖 Trợ Lý Bot Exness';
    let replyContent = '';

    // Record user message
    const userMsg: BotMessage = {
      id: uuidv4(),
      userId,
      type: 'USER',
      title: '👤 Bạn',
      message: userText,
      timestamp: Date.now()
    };
    db.addBotMessage(userMsg).catch(err => console.error(err.message));
    this.emit('botMessage', userMsg);

    if (text.includes('bật bot') || text.includes('start') || text.includes('resume')) {
      this.setBotActive(true);
      replyContent = 'Đã BẬT hệ thống quét và giao dịch tự động. Bot đang theo dõi các cặp tiền tệ và tín hiệu chỉ báo.';
    } else if (text.includes('tắt bot') || text.includes('dừng bot') || text.includes('pause') || text.includes('stop')) {
      this.setBotActive(false);
      replyContent = 'Đã TẠM DỪNG hệ thống giao dịch tự động. Các vị thế hiện tại vẫn được giữ nguyên cho đến khi chạm SL/TP hoặc đóng thủ công.';
    } else if (text.includes('đóng hết') || text.includes('đóng tất cả') || text.includes('close all')) {
      const closed = await mt5Bridge.closeAllOrders('Đóng khẩn cấp theo lệnh người dùng trong chat');
      replyContent = `Đã đóng khẩn cấp toàn bộ ${closed.length} vị thế đang mở.`;
    } else if (text.includes('trạng thái') || text.includes('status') || text.includes('tài khoản')) {
      const acc = mt5Bridge.getAccountInfo();
      replyContent = `Trạng thái tài khoản Exness (${acc.server}):
• Số dư (Balance): $${acc.balance.toLocaleString()} USD
• Tài sản (Equity): $${acc.equity.toLocaleString()} USD
• Trạng thái Bot: ${acc.botActive ? 'ĐANG CHẠY 🟢' : 'TẠM DỪNG ⏸️'}
• Vị thế mở: ${acc.openPositionsCount} lệnh (PnL: ${acc.floatingPnl >= 0 ? '+' : ''}$${acc.floatingPnl} USD)`;
    } else if (text.includes('bật thông báo topdown') || text.includes('bật thông báo đỉnh đáy') || text.includes('bật topdown')) {
      this.setSwingAlertsActive(true);
      replyContent = 'Đã BẬT thông báo tự động TopDown. Bot sẽ tự động gửi tin nhắn phân tích lên chat ngay khi có tín hiệu TopDown mới được xác nhận.';
    } else if (text.includes('tắt thông báo topdown') || text.includes('tắt thông báo đỉnh đáy') || text.includes('tắt topdown')) {
      this.setSwingAlertsActive(false);
      replyContent = 'Đã TẮT thông báo tự động TopDown.';
    } else if (text.includes('topdown') || text.includes('đỉnh đáy') || text.includes('nhịp') || text.includes('swing')) {
      const xauRes = IndicatorService.calculateDynamicSwings(marketData.getCandles('XAUUSD', 'M1', 100));
      const eurRes = IndicatorService.calculateDynamicSwings(marketData.getCandles('EURUSD', 'M1', 100));
      const btcRes = IndicatorService.calculateDynamicSwings(marketData.getCandles('BTCUSD', 'M1', 100));

      const formatSwingStatus = (sym: string, res: any) => {
        const last = res.swings.length >= 2 ? res.swings[res.swings.length - 2] : null;
        const trend = res.currentTrend === 'UP' ? '📈 TĂNG (Tìm Đỉnh)' : '📉 GIẢM (Tìm Đáy)';
        const lastStr = last ? `${last.type === 'HIGH' ? '🔻 Đỉnh' : '🔺 Đáy'} tại ${last.price}` : '---';
        return `• ${sym} (M1): Đang ở TopDown ${trend} | Chốt gần nhất: ${lastStr}`;
      };

      replyTitle = 'Tổng Hợp TopDown (M1)';
      replyContent = `Trạng thái TopDown các cặp chính:
${formatSwingStatus('XAU/USD', xauRes)}
${formatSwingStatus('EUR/USD', eurRes)}
${formatSwingStatus('BTC/USD', btcRes)}
Trạng thái chuông báo chat: ${this.swingAlertsActive ? 'ĐANG BẬT 🟢' : 'TẠM TẮT ⏸️'}
(Bot luôn tự động bắn thông báo lên chat mỗi khi tạo tín hiệu TopDown thành công)`;
    } else if (text.includes('đóng nến') || text.includes('nến gì') || text.includes('mô hình nến') || text.includes('nến vừa đóng') || text.includes('phân tích nến') || text.includes('phân tích')) {
      const candles = marketData.getCandles(activeSym, activeTf);
      const analysis = CandleClassifier.analyzeClosedCandle(candles, activeSym, activeTf);
      const snap = marketData.getIndicators(activeSym, activeTf);
      const p = marketData.getCurrentPrice(activeSym);
      replyTitle = `🕯️ Phân Tích Nến: ${activeSym} (${activeTf})`;
      if (analysis) {
        const sigText = analysis.priceActionSignal === 'CANH_MUA' 
          ? '🟢 CANH MUA (Bullish)' 
          : analysis.priceActionSignal === 'CANH_BAN' 
          ? '🔴 CANH BÁN (Bearish)' 
          : '⚪ THEO DÕI';
        replyContent = `Nến hiện tại/vừa đóng của ${activeSym} (${activeTf}) lúc ${new Date().toLocaleTimeString('vi-VN')}:
• Mô hình nhận diện: ${analysis.patternName} (${analysis.metrics.direction === 'BULLISH' ? 'Tăng' : analysis.metrics.direction === 'BEARISH' ? 'Giảm' : 'Doji'})
• Khuyến nghị: ${sigText} (Độ tin cậy: ${analysis.confidence})
• Chi tiết nến: Thân ${analysis.metrics.bodyPips} pips (${analysis.metrics.bodyPercent}%), Râu trên ${analysis.metrics.upperWickPips} pips, Râu dưới ${analysis.metrics.lowerWickPips} pips
• Tâm lý thị trường: ${analysis.sentiment}
• RSI 14: ${snap.rsi14} | EMA20/50: ${snap.ema20 > snap.ema50 ? 'Xu hướng TĂNG 📈' : 'Xu hướng GIẢM 📉'} | Giá: ${p.lastPrice}`;
      } else {
        replyContent = `Chưa đủ dữ liệu nến đóng cho cặp ${activeSym} (${activeTf}).`;
      }
    } else if (text.includes('vàng') || text.includes('xau') || text.includes('gold')) {
      const snap = marketData.getIndicators('XAUUSD', 'M1');
      const p = marketData.getCurrentPrice('XAUUSD');
      replyContent = `XAU/USD: Giá ${p.lastPrice}. RSI: ${snap.rsi14}. Bollinger: [${snap.bbLower.toFixed(2)} - ${snap.bbUpper.toFixed(2)}]. EMA20: ${snap.ema20.toFixed(2)}.`;
    } else {
      replyContent = `Chào bạn! Tôi là Bot Auto Trade Exness. Bạn có thể gõ các lệnh nhanh:
- "topdown": Xem ngay trạng thái TopDown hiện tại.
- "bật bot" hoặc "tắt bot": Điều khiển hệ thống vào lệnh tự động.
- "bật thông báo topdown" hoặc "tắt thông báo topdown".
- "trạng thái": Xem số dư tài khoản và các vị thế.
- "đóng hết lệnh": Chốt khẩn cấp tất cả vị thế.
- "phân tích nến" hoặc "phân tích": Cập nhật phân tích kỹ thuật của ${activeSym} (${activeTf}).
- "phân tích vàng": Cập nhật tín hiệu thị trường Vàng XAU/USD.`;
    }

    const replyMsg: BotMessage = {
      id: uuidv4(),
      userId,
      type: 'INFO',
      title: replyTitle,
      message: replyContent,
      timestamp: Date.now()
    };

    await db.addBotMessage(replyMsg).catch(err => console.error(err.message));
    this.emit('botMessage', replyMsg);
    return replyMsg;
  }
}

export const botEngine = new BotEngineService();
