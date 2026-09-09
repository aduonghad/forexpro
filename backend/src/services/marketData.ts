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

      for (const symbol of symbols) {
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
