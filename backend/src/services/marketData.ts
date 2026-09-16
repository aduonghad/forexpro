import { EventEmitter } from 'events';
import fs from 'fs';
import path from 'path';
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

function getCacheFilePath(): string {
  const candidate1 = path.resolve(process.cwd(), 'data');
  const candidate2 = path.resolve(process.cwd(), 'backend/data');
  const targetDir = fs.existsSync(path.resolve(process.cwd(), 'backend')) ? candidate2 : candidate1;
  if (!fs.existsSync(targetDir)) {
    try {
      fs.mkdirSync(targetDir, { recursive: true });
    } catch {}
  }
  return path.join(targetDir, 'candles_cache.json');
}

export class MarketDataService extends EventEmitter {
  private candles: Map<string, Candle[]> = new Map(); // key: `${symbol}_${timeframe}`
  private currentPrices: Map<TradingSymbol, { bid: number; ask: number; lastPrice: number }> = new Map();
  private tickInterval: NodeJS.Timeout | null = null;
  private isMT5Connected: boolean = false;
  private lastMT5TickTime: number = 0;
  private mt5Symbols: Set<string> = new Set();
  private hasReceivedMT5History: boolean = false;
  private saveDebounceTimer: NodeJS.Timeout | null = null;

  constructor() {
    super();
    this.initHistoricalData();
    this.startLiveTickEngine();
  }

  public needsHistorySync(): boolean {
    return !this.hasReceivedMT5History;
  }

  public markHistorySynced() {
    this.hasReceivedMT5History = true;
    this.saveCandlesCache();
  }

  public saveCandlesCache() {
    if (this.saveDebounceTimer) return;
    this.saveDebounceTimer = setTimeout(() => {
      this.saveDebounceTimer = null;
      try {
        const filePath = getCacheFilePath();
        const obj: Record<string, Candle[]> = {};
        for (const [k, v] of this.candles.entries()) {
          if (v && v.length > 0) {
            obj[k] = v.slice(-300);
          }
        }
        const data = {
          updatedAt: Date.now(),
          candles: obj
        };
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
      } catch (err) {
        console.error('Lỗi khi lưu candles_cache.json:', err);
      }
    }, 1500);
  }

  private loadCandlesCache(): boolean {
    try {
      const filePath = getCacheFilePath();
      if (!fs.existsSync(filePath)) return false;
      const raw = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(raw);
      if (!parsed || !parsed.candles) return false;

      let loadedCount = 0;
      for (const [key, list] of Object.entries(parsed.candles)) {
        if (Array.isArray(list) && list.length > 0) {
          this.candles.set(key, list as Candle[]);
          loadedCount++;

          const [sym] = key.split('_');
          const symbol = sym as TradingSymbol;
          const spec = CONFIG.SYMBOLS[symbol];
          const lastCandle = list[list.length - 1];
          if (spec && lastCandle) {
            const spread = spec.baseSpread;
            this.currentPrices.set(symbol, {
              bid: Number((lastCandle.close - spread / 2).toFixed(spec.digits)),
              ask: Number((lastCandle.close + spread / 2).toFixed(spec.digits)),
              lastPrice: lastCandle.close
            });
          }
        }
      }

      if (loadedCount > 0) {
        console.log(`📦 [MarketData] Đã nạp thành công ${loadedCount} chuỗi nến lịch sử từ candles_cache.json!`);
        return true;
      }
    } catch (err) {
      console.warn('Lỗi đọc candles_cache.json, dùng nến mô phỏng tạm:', err);
    }
    return false;
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

  private generateRealisticCandles(
    symbol: TradingSymbol,
    tf: Timeframe,
    targetBasePrice: number,
    candleCount: number = 200,
    currentCandlePeriod: number
  ): Candle[] {
    const spec = CONFIG.SYMBOLS[symbol];
    const tfSec = this.getTimeframeSeconds(tf);
    const tfMultiplier = Math.sqrt(tfSec / 60);
    const baseVol = (spec.volatility || 1.0) * tfMultiplier;

    let currentOpen = targetBasePrice;
    const tempCandles: Candle[] = [];

    let trendDirection = Math.random() < 0.5 ? 1 : -1;
    let trendLength = Math.floor(Math.random() * 6 + 3);
    let trendCounter = 0;

    for (let i = 0; i < candleCount; i++) {
      const candleTime = currentCandlePeriod - ((candleCount - 1 - i) * tfSec);

      trendCounter++;
      if (trendCounter >= trendLength) {
        trendDirection = -trendDirection;
        trendLength = Math.floor(Math.random() * 7 + 3);
        trendCounter = 0;
      }

      // Thân nến theo xu hướng + nhiễu nhẹ
      const trendDelta = trendDirection * (Math.random() * 0.5 + 0.2) * baseVol * 0.4;
      const noiseDelta = (Math.random() - 0.5) * baseVol * 0.2;
      const bodyDelta = trendDelta + noiseDelta;

      const open = Number(currentOpen.toFixed(spec.digits));
      const close = Number((open + bodyDelta).toFixed(spec.digits));
      const bodySize = Math.max(Math.abs(close - open), spec.pipSize);

      // Râu nến tự nhiên:
      // - Phần lớn nến có râu ngắn (10-35% kích thước thân)
      // - Thỉnh thoảng có nến rút râu 1 đầu (pinbar)
      // - Không bị tình trạng 2 râu đối xứng dài ngoằng như răng cưa
      const isPinBar = Math.random() < 0.12;
      let upperWick = 0;
      let lowerWick = 0;

      if (isPinBar) {
        if (Math.random() < 0.5) {
          upperWick = (Math.random() * 1.2 + 0.6) * bodySize;
          lowerWick = Math.random() * 0.15 * bodySize;
        } else {
          lowerWick = (Math.random() * 1.2 + 0.6) * bodySize;
          upperWick = Math.random() * 0.15 * bodySize;
        }
      } else {
        upperWick = (Math.random() * 0.35 + 0.05) * bodySize;
        lowerWick = (Math.random() * 0.35 + 0.05) * bodySize;
      }

      const high = Number((Math.max(open, close) + upperWick).toFixed(spec.digits));
      const low = Number((Math.min(open, close) - lowerWick).toFixed(spec.digits));
      const volume = Math.floor(50 + Math.random() * 150);

      tempCandles.push({
        time: candleTime,
        open,
        high,
        low,
        close,
        volume
      });

      currentOpen = close;
    }

    // Điều chỉnh nến cuối cùng để bám sát targetBasePrice
    const diffToEnd = targetBasePrice - tempCandles[tempCandles.length - 1].close;
    for (let i = 0; i < candleCount; i++) {
      const ratio = (i + 1) / candleCount;
      const shift = Number((diffToEnd * ratio).toFixed(spec.digits));
      tempCandles[i].open = Number((tempCandles[i].open + shift).toFixed(spec.digits));
      tempCandles[i].high = Number((tempCandles[i].high + shift).toFixed(spec.digits));
      tempCandles[i].low = Number((tempCandles[i].low + shift).toFixed(spec.digits));
      tempCandles[i].close = Number((tempCandles[i].close + shift).toFixed(spec.digits));
    }

    return tempCandles;
  }

  private initHistoricalData() {
    this.loadCandlesCache();
    const symbols = Object.keys(CONFIG.SYMBOLS) as TradingSymbol[];
    const timeframes: Timeframe[] = ['M1', 'M5', 'M15', 'H1'];
    const now = Math.floor(Date.now() / 1000);

    for (const symbol of symbols) {
      const spec = CONFIG.SYMBOLS[symbol];
      const targetBasePrice = spec.initialPrice;

      for (const tf of timeframes) {
        const key = `${symbol}_${tf}`;
        if (this.candles.has(key) && (this.candles.get(key)?.length || 0) > 0) {
          continue;
        }

        const tfSec = this.getTimeframeSeconds(tf);
        const candleCount = 200;
        const currentCandlePeriod = Math.floor(now / tfSec) * tfSec;
        const candles = this.generateRealisticCandles(symbol, tf, targetBasePrice, candleCount, currentCandlePeriod);

        this.candles.set(key, candles);
      }

      // Khởi tạo bid / ask bám sát mốc giá chuẩn sàn Exness
      const spread = spec.baseSpread;
      this.currentPrices.set(symbol, {
        bid: Number((targetBasePrice - spread / 2).toFixed(spec.digits)),
        ask: Number((targetBasePrice + spread / 2).toFixed(spec.digits)),
        lastPrice: targetBasePrice
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
    this.hasReceivedMT5History = true;
    this.saveCandlesCache();

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

    // Kiểm tra nếu nến hiện tại trong bộ nhớ có giá bị lệch so với giá thật MT5 (do nến mô phỏng cũ)
    const timeframes: Timeframe[] = ['M1', 'M5', 'M15', 'H1'];
    for (const tf of timeframes) {
      const key = `${data.symbol}_${tf}`;
      const list = this.candles.get(key) || [];
      if (list.length > 0) {
        const firstCandle = list[0];
        const priceDiff = Math.abs(firstCandle.close - data.bid);
        // Nếu giá nến cũ lệch hơn 15 pips hoặc 0.5% so với giá thật từ MT5 -> Tạo lại lịch sử bám sát giá thật
        if (priceDiff > spec.pipSize * 15 || (priceDiff / data.bid > 0.005)) {
          const tfSec = this.getTimeframeSeconds(tf);
          const currentCandlePeriod = Math.floor(nowSec / tfSec) * tfSec;
          const newHistory = this.generateRealisticCandles(data.symbol, tf, data.bid, 200, currentCandlePeriod);
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
          this.saveCandlesCache();
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
          this.saveCandlesCache();
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
