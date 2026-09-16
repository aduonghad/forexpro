import { EventEmitter } from 'events';
import { CONFIG } from '../config.js';
import { Candle, TradingSymbol, Timeframe } from '../types/index.js';
import { IndicatorService } from './indicators.js';

export interface TickData {
  symbol: TradingSymbol;
  bid: number;
  ask: number;
  spread: number;
  time: number;
  candle: Candle;
}

export class MarketDataService extends EventEmitter {
  private candles: Map<string, Candle[]> = new Map(); // key: `${symbol}_${timeframe}`
  private currentPrices: Map<TradingSymbol, { bid: number; ask: number; lastPrice: number }> = new Map();
  private tickInterval: NodeJS.Timeout | null = null;
  private isMT5Connected: boolean = false;
  private lastMT5TickTime: number = 0;
  private mt5Symbols: Set<string> = new Set();

  constructor() {
    super();
    this.initHistoricalData();
    this.startLiveTickEngine();
  }

  private getTimeframeSeconds(tf: Timeframe): number {
    switch (tf) {
      case 'M1': return 60;
      case 'M5': return 300;
      case 'M15': return 900;
      case 'H1': return 3600;
      default: return 60;
    }
  }

  private initHistoricalData() {
    const symbols = Object.keys(CONFIG.SYMBOLS) as TradingSymbol[];
    const timeframes: Timeframe[] = ['M1', 'M5', 'M15', 'H1'];
    const now = Math.floor(Date.now() / 1000);

    for (const symbol of symbols) {
      const spec = CONFIG.SYMBOLS[symbol];
      let currentBasePrice = spec.initialPrice;

      for (const tf of timeframes) {
        const tfSec = this.getTimeframeSeconds(tf);
        const candleCount = 200;
        const candles: Candle[] = [];

        // Generate synthetic past candles with realistic random walk & mean reversion
        let p = currentBasePrice - (candleCount * 0.05 * spec.volatility);
        const startTime = now - (candleCount * tfSec);

        for (let i = 0; i < candleCount; i++) {
          const candleTime = startTime + (i * tfSec);
          const change = (Math.random() - 0.49) * spec.volatility * Math.sqrt(tfSec / 60);
          const open = p;
          const close = Number((p + change).toFixed(spec.digits));
          const high = Number((Math.max(open, close) + Math.random() * spec.volatility * 0.5).toFixed(spec.digits));
          const low = Number((Math.min(open, close) - Math.random() * spec.volatility * 0.5).toFixed(spec.digits));
          const volume = Math.floor(50 + Math.random() * 200);

          candles.push({
            time: candleTime,
            open,
            high,
            low,
            close,
            volume
          });

          p = close;
        }

        this.candles.set(`${symbol}_${tf}`, candles);

        if (tf === 'M1') {
          currentBasePrice = p;
        }
      }

      // Initial bid / ask
      const spread = spec.baseSpread;
      this.currentPrices.set(symbol, {
        bid: Number((currentBasePrice - spread / 2).toFixed(spec.digits)),
        ask: Number((currentBasePrice + spread / 2).toFixed(spec.digits)),
        lastPrice: currentBasePrice
      });
    }
  }

  private startLiveTickEngine() {
    if (this.tickInterval) return;

    // Run every 1000ms for realistic live trading dynamics
    this.tickInterval = setInterval(() => {
      const symbols = Object.keys(CONFIG.SYMBOLS) as TradingSymbol[];
      const nowSec = Math.floor(Date.now() / 1000);
      const isMT5Active = this.isMT5Connected && (Date.now() - this.lastMT5TickTime < 15000);

      for (const symbol of symbols) {
        // Nếu MT5 đang phát trực tiếp cho symbol này, bỏ qua mô phỏng ngẫu nhiên
        if (isMT5Active && this.mt5Symbols.has(symbol)) {
          continue;
        }

        const spec = CONFIG.SYMBOLS[symbol];
        const prevPrice = this.currentPrices.get(symbol)?.lastPrice || spec.initialPrice;

        // Realistic price fluctuation with slight trend bias
        const delta = (Math.random() - 0.495) * (spec.volatility * 0.25);
        const newPrice = Number((prevPrice + delta).toFixed(spec.digits));
        const spread = Number((spec.baseSpread * (0.95 + Math.random() * 0.1)).toFixed(spec.digits));
        const bid = Number((newPrice - spread / 2).toFixed(spec.digits));
        const ask = Number((newPrice + spread / 2).toFixed(spec.digits));

        this.currentPrices.set(symbol, { bid, ask, lastPrice: newPrice });

        // Update all timeframes for this symbol
        const timeframes: Timeframe[] = ['M1', 'M5', 'M15', 'H1'];
        for (const tf of timeframes) {
          const key = `${symbol}_${tf}`;
          const candleList = this.candles.get(key) || [];
          const tfSec = this.getTimeframeSeconds(tf);
          const currentCandlePeriod = Math.floor(nowSec / tfSec) * tfSec;

          if (candleList.length === 0) continue;

          const lastCandle = candleList[candleList.length - 1];

          if (lastCandle.time === currentCandlePeriod) {
            // Update current forming candle
            lastCandle.close = newPrice;
            if (newPrice > lastCandle.high) lastCandle.high = newPrice;
            if (newPrice < lastCandle.low) lastCandle.low = newPrice;
            lastCandle.volume += 1;
          } else if (nowSec >= currentCandlePeriod) {
            // Open new candle
            const newCandle: Candle = {
              time: currentCandlePeriod,
              open: lastCandle.close,
              high: Math.max(lastCandle.close, newPrice),
              low: Math.min(lastCandle.close, newPrice),
              close: newPrice,
              volume: 1
            };
            candleList.push(newCandle);
            if (candleList.length > 500) {
              candleList.shift();
            }

            // Emit candleClosed event for the finished candle
            this.emit('candleClosed', {
              symbol,
              timeframe: tf,
              closedCandle: { ...lastCandle },
              newCandle
            });
          }
        }

        // Emit tick
        const m1Candles = this.candles.get(`${symbol}_M1`) || [];
        const currentM1Candle = m1Candles[m1Candles.length - 1];

        const tick: TickData = {
          symbol,
          bid,
          ask,
          spread,
          time: Date.now(),
          candle: currentM1Candle
        };

        this.emit('tick', tick);
      }
    }, 1000);
  }

  /**
   * Nạp lịch sử nến từ MT5 Exness cho một symbol và timeframe
   */
  importMT5Candles(symbol: TradingSymbol, timeframe: Timeframe, candles: Candle[]): number {
    if (!candles || !Array.isArray(candles) || candles.length === 0) return 0;

    const valid = candles
      .filter(c => c && typeof c.time === 'number' && !isNaN(c.close))
      .sort((a, b) => a.time - b.time);

    if (valid.length === 0) return 0;

    const key = `${symbol}_${timeframe}`;
    this.candles.set(key, valid.slice(-500));
    this.isMT5Connected = true;
    this.lastMT5TickTime = Date.now();
    this.mt5Symbols.add(symbol);

    // Cập nhật giá hiện tại từ nến cuối cùng
    const lastBar = valid[valid.length - 1];
    const spec = CONFIG.SYMBOLS[symbol];
    if (lastBar && spec) {
      const spread = spec.baseSpread;
      this.currentPrices.set(symbol, {
        bid: Number((lastBar.close - spread / 2).toFixed(spec.digits)),
        ask: Number((lastBar.close + spread / 2).toFixed(spec.digits)),
        lastPrice: lastBar.close
      });
    }

    this.emit('candlesUpdated', { symbol, timeframe, candles: valid });
    return valid.length;
  }

  /**
   * Xử lý tick thời gian thực truyền từ MT5 EA
   */
  handleMT5Tick(data: {
    symbol: TradingSymbol;
    bid: number;
    ask: number;
    spread?: number;
    time?: number;
    candle?: Candle;
  }) {
    const spec = CONFIG.SYMBOLS[data.symbol];
    if (!spec) return;

    this.isMT5Connected = true;
    this.lastMT5TickTime = Date.now();
    this.mt5Symbols.add(data.symbol);

    const spread = data.spread !== undefined ? data.spread : Number((data.ask - data.bid).toFixed(spec.digits));
    const nowSec = data.time ? Math.floor(data.time > 1e12 ? data.time / 1000 : data.time) : Math.floor(Date.now() / 1000);

    this.currentPrices.set(data.symbol, {
      bid: data.bid,
      ask: data.ask,
      lastPrice: data.bid
    });

    // Kiểm tra nếu nến hiện tại trong bộ nhớ có giá bị lệch quá xa so với giá thật MT5 (do nến mô phỏng cũ)
    const timeframes: Timeframe[] = ['M1', 'M5', 'M15', 'H1'];
    for (const tf of timeframes) {
      const key = `${data.symbol}_${tf}`;
      const list = this.candles.get(key) || [];
      if (list.length > 0) {
        const firstCandle = list[0];
        // Nếu giá nến cũ lệch hơn 5% so với giá thật từ MT5
        if (Math.abs(firstCandle.close - data.bid) / data.bid > 0.05) {
          const tfSec = this.getTimeframeSeconds(tf);
          const newHistory: Candle[] = [];
          const count = 200;
          const startTime = nowSec - count * tfSec;
          let p = data.bid;
          for (let i = 0; i < count; i++) {
            const candleTime = startTime + i * tfSec;
            const delta = (Math.sin(i / 10) * 0.2 + (Math.random() - 0.5) * 0.3) * (spec.volatility || 0.5);
            const close = Number((p + delta).toFixed(spec.digits));
            const open = p;
            const high = Number((Math.max(open, close) + Math.random() * 0.2).toFixed(spec.digits));
            const low = Number((Math.min(open, close) - Math.random() * 0.2).toFixed(spec.digits));
            newHistory.push({ time: candleTime, open, high, low, close, volume: 50 });
            p = close;
          }
          this.candles.set(key, newHistory);
          this.emit('candlesUpdated', { symbol: data.symbol, timeframe: tf, candles: newHistory });
        }
      }
    }

    // Nếu EA gửi nến M1 hiện tại kèm theo tick
    if (data.candle && data.candle.time) {
      const m1Key = `${data.symbol}_M1`;
      const m1List = this.candles.get(m1Key) || [];
      if (m1List.length === 0) {
        m1List.push(data.candle);
        this.candles.set(m1Key, m1List);
      } else {
        const last = m1List[m1List.length - 1];
        if (last.time === data.candle.time) {
          m1List[m1List.length - 1] = { ...data.candle };
        } else if (data.candle.time > last.time) {
          m1List.push(data.candle);
          if (m1List.length > 500) m1List.shift();
          this.emit('candleClosed', {
            symbol: data.symbol,
            timeframe: 'M1',
            closedCandle: { ...last },
            newCandle: data.candle
          });
        }
      }
    } else {
      // Tự động gom nến M1 từ chuỗi tick nếu EA chỉ gửi tick đơn thuần
      const m1Key = `${data.symbol}_M1`;
      const m1List = this.candles.get(m1Key) || [];
      const currentCandlePeriod = Math.floor(nowSec / 60) * 60;

      if (m1List.length > 0) {
        const lastCandle = m1List[m1List.length - 1];
        if (lastCandle.time === currentCandlePeriod) {
          lastCandle.close = data.bid;
          if (data.bid > lastCandle.high) lastCandle.high = data.bid;
          if (data.bid < lastCandle.low) lastCandle.low = data.bid;
          lastCandle.volume += 1;
        } else if (nowSec >= currentCandlePeriod) {
          const newCandle: Candle = {
            time: currentCandlePeriod,
            open: lastCandle.close,
            high: Math.max(lastCandle.close, data.bid),
            low: Math.min(lastCandle.close, data.bid),
            close: data.bid,
            volume: 1
          };
          m1List.push(newCandle);
          if (m1List.length > 500) m1List.shift();
          this.emit('candleClosed', {
            symbol: data.symbol,
            timeframe: 'M1',
            closedCandle: { ...lastCandle },
            newCandle
          });
        }
      }
    }

    const m1Candles = this.candles.get(`${data.symbol}_M1`) || [];
    const currentM1Candle = m1Candles[m1Candles.length - 1];

    const tick: TickData = {
      symbol: data.symbol,
      bid: data.bid,
      ask: data.ask,
      spread,
      time: Date.now(),
      candle: currentM1Candle
    };

    this.emit('tick', tick);
  }

  /**
   * Trả về trạng thái kết nối nguồn dữ liệu MT5
   */
  getMT5Status() {
    const isLive = this.isMT5Connected && (Date.now() - this.lastMT5TickTime < 15000);
    return {
      connected: isLive,
      lastTickTime: this.lastMT5TickTime,
      source: isLive ? 'MT5_EXNESS' : 'SIMULATED',
      activeSymbols: Array.from(this.mt5Symbols),
      secondsSinceLastTick: this.lastMT5TickTime > 0 ? Math.round((Date.now() - this.lastMT5TickTime) / 1000) : -1
    };
  }

  getCandles(symbol: TradingSymbol, timeframe: Timeframe = 'M1', limit: number = 200): Candle[] {
    const key = `${symbol}_${timeframe}`;
    const list = this.candles.get(key) || [];
    return list.slice(-limit);
  }

  getCurrentPrice(symbol: TradingSymbol) {
    return this.currentPrices.get(symbol) || {
      bid: CONFIG.SYMBOLS[symbol].initialPrice,
      ask: CONFIG.SYMBOLS[symbol].initialPrice,
      lastPrice: CONFIG.SYMBOLS[symbol].initialPrice
    };
  }

  getIndicators(symbol: TradingSymbol, timeframe: Timeframe = 'M1') {
    const candles = this.getCandles(symbol, timeframe, 100);
    return IndicatorService.getSnapshot(candles);
  }

  stop() {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
  }
}

export const marketData = new MarketDataService();
