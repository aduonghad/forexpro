import { Candle, SwingPoint } from '../types/index.js';

export class IndicatorService {
  /**
   * Calculate Simple Moving Average (SMA)
   */
  static calculateSMA(prices: number[], period: number): number[] {
    const sma: number[] = [];
    for (let i = 0; i < prices.length; i++) {
      if (i < period - 1) {
        sma.push(NaN);
      } else {
        const slice = prices.slice(i - period + 1, i + 1);
        const sum = slice.reduce((a, b) => a + b, 0);
        sma.push(sum / period);
      }
    }
    return sma;
  }

  /**
   * Calculate Exponential Moving Average (EMA)
   */
  static calculateEMA(prices: number[], period: number): number[] {
    const ema: number[] = [];
    const multiplier = 2 / (period + 1);

    if (prices.length < period) {
      return prices.map(() => NaN);
    }

    // First EMA is simple average
    let sum = 0;
    for (let i = 0; i < period; i++) {
      sum += prices[i];
      ema.push(NaN);
    }
    const initialSMA = sum / period;
    ema[period - 1] = initialSMA;

    for (let i = period; i < prices.length; i++) {
      const prevEMA = ema[i - 1];
      const currentPrice = prices[i];
      const val = (currentPrice - prevEMA) * multiplier + prevEMA;
      ema.push(val);
    }

    return ema;
  }

  /**
   * Calculate Relative Strength Index (RSI) using Wilder's Smoothing
   */
  static calculateRSI(prices: number[], period: number = 14): number[] {
    const rsi: number[] = [];
    if (prices.length <= period) {
      return prices.map(() => 50);
    }

    const gains: number[] = [];
    const losses: number[] = [];

    for (let i = 1; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1];
      gains.push(Math.max(0, change));
      losses.push(Math.max(0, -change));
    }

    // First average gain and loss
    let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
    let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;

    for (let i = 0; i < period; i++) {
      rsi.push(NaN);
    }

    const rs0 = avgLoss === 0 ? 100 : avgGain / avgLoss;
    const rsi0 = avgLoss === 0 ? 100 : 100 - 100 / (1 + rs0);
    rsi.push(rsi0);

    for (let i = period; i < gains.length; i++) {
      avgGain = (avgGain * (period - 1) + gains[i]) / period;
      avgLoss = (avgLoss * (period - 1) + losses[i]) / period;

      if (avgLoss === 0) {
        rsi.push(100);
      } else {
        const rs = avgGain / avgLoss;
        rsi.push(100 - 100 / (1 + rs));
      }
    }

    return rsi;
  }

  /**
   * Calculate Bollinger Bands (Middle, Upper, Lower)
   */
  static calculateBollingerBands(prices: number[], period: number = 20, stdDevMultiplier: number = 2) {
    const sma = this.calculateSMA(prices, period);
    const upper: number[] = [];
    const lower: number[] = [];

    for (let i = 0; i < prices.length; i++) {
      if (isNaN(sma[i])) {
        upper.push(NaN);
        lower.push(NaN);
      } else {
        const slice = prices.slice(i - period + 1, i + 1);
        const mean = sma[i];
        const variance = slice.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / period;
        const stdDev = Math.sqrt(variance);
        upper.push(mean + stdDevMultiplier * stdDev);
        lower.push(mean - stdDevMultiplier * stdDev);
      }
    }

    return { middle: sma, upper, lower };
  }

  /**
   * Calculate MACD (Moving Average Convergence Divergence)
   */
  static calculateMACD(prices: number[], fastPeriod: number = 12, slowPeriod: number = 26, signalPeriod: number = 9) {
    const fastEMA = this.calculateEMA(prices, fastPeriod);
    const slowEMA = this.calculateEMA(prices, slowPeriod);
    const macdLine: number[] = [];

    for (let i = 0; i < prices.length; i++) {
      if (isNaN(fastEMA[i]) || isNaN(slowEMA[i])) {
        macdLine.push(NaN);
      } else {
        macdLine.push(fastEMA[i] - slowEMA[i]);
      }
    }

    const validStart = macdLine.findIndex(v => !isNaN(v));
    const validMacd = validStart >= 0 ? macdLine.slice(validStart) : [];
    const validSignal = this.calculateEMA(validMacd, signalPeriod);
    const signalLine: number[] = new Array(validStart >= 0 ? validStart : 0).fill(NaN).concat(validSignal);
    const histogram: number[] = [];

    for (let i = 0; i < prices.length; i++) {
      if (isNaN(macdLine[i]) || isNaN(signalLine[i])) {
        histogram.push(0);
      } else {
        histogram.push(macdLine[i] - signalLine[i]);
      }
    }

    return { macdLine, signalLine, histogram };
  }

  /**
   * Get latest indicators for a candle series
   */
  static getSnapshot(candles: Candle[]) {
    const closes = candles.map(c => c.close);
    if (closes.length < 15) {
      const p = closes[closes.length - 1] || 0;
      return {
        rsi14: 50,
        rsi14Prev: 50,
        ema20: p,
        ema20Prev: p,
        ema50: p,
        ema50Prev: p,
        bbUpper: p,
        bbMiddle: p,
        bbLower: p,
        macdLine: 0,
        macdSignal: 0,
        macdHistogram: 0,
        macdHistogramPrev: 0,
      };
    }

    const rsi = this.calculateRSI(closes, 14);
    const ema20 = this.calculateEMA(closes, 20);
    const ema50 = this.calculateEMA(closes, 50);
    const bb = this.calculateBollingerBands(closes, 20, 2);
    const macd = this.calculateMACD(closes, 12, 26, 9);

    const lastIdx = closes.length - 1;
    const prevIdx = lastIdx - 1;

    return {
      rsi14: Number(rsi[lastIdx]?.toFixed(2)) || 50,
      rsi14Prev: Number(rsi[prevIdx]?.toFixed(2)) || 50,
      ema20: Number(ema20[lastIdx]?.toFixed(5)) || closes[lastIdx],
      ema20Prev: Number(ema20[prevIdx]?.toFixed(5)) || closes[prevIdx],
      ema50: Number(ema50[lastIdx]?.toFixed(5)) || closes[lastIdx],
      ema50Prev: Number(ema50[prevIdx]?.toFixed(5)) || closes[prevIdx],
      bbUpper: Number(bb.upper[lastIdx]?.toFixed(5)) || closes[lastIdx],
      bbMiddle: Number(bb.middle[lastIdx]?.toFixed(5)) || closes[lastIdx],
      bbLower: Number(bb.lower[lastIdx]?.toFixed(5)) || closes[lastIdx],
      macdLine: Number(macd.macdLine[lastIdx]?.toFixed(5)) || 0,
      macdSignal: Number(macd.signalLine[lastIdx]?.toFixed(5)) || 0,
      macdHistogram: Number(macd.histogram[lastIdx]?.toFixed(5)) || 0,
      macdHistogramPrev: Number(macd.histogram[prevIdx]?.toFixed(5)) || 0,
    };
  }

  /**
   * Calculate Dynamic Wave Swings (Đỉnh Đáy Theo Nhịp Sóng Động)
   * Theo đúng quy tắc:
   * - Nhịp tăng: Nến tiếp theo Close > Đỉnh tạm thời -> Dời đỉnh lên nến mới.
   * - Đảo chiều giảm: Khi nến quay đầu giảm qua ngưỡng xác nhận -> Chốt đỉnh, bắt đầu nhịp giảm.
   * - Nhịp giảm: Nến tiếp theo Close < Đáy tạm thời -> Dời đáy xuống nến mới.
   * - Đảo chiều tăng: Khi nến quay đầu tăng qua ngưỡng xác nhận -> Chốt đáy, bắt đầu nhịp tăng.
   */
  static calculateDynamicSwings(candles: Candle[]): {
    swings: SwingPoint[];
    waveLine: { time: number; value: number }[];
    currentTrend: 'UP' | 'DOWN';
  } {
    if (!candles || candles.length < 3) {
      return { swings: [], waveLine: [], currentTrend: 'UP' };
    }

    const swings: SwingPoint[] = [];
    let mode: 'UP' | 'DOWN' = candles[1].close >= candles[0].close ? 'UP' : 'DOWN';

    let currentExtreme = {
      type: (mode === 'UP' ? 'HIGH' : 'LOW') as 'HIGH' | 'LOW',
      time: candles[0].time,
      price: mode === 'UP' ? candles[0].high : candles[0].low,
      closePrice: candles[0].close,
      index: 0
    };

    for (let i = 1; i < candles.length; i++) {
      const c = candles[i];

      if (mode === 'UP') {
        // Nếu có nến tiếp theo đóng cửa cao hơn đỉnh hoặc chạm đỉnh cao hơn -> CẬP NHẬT ĐỈNH DỜI LÊN
        if (c.close > currentExtreme.closePrice || c.high > currentExtreme.price) {
          currentExtreme = {
            type: 'HIGH',
            time: c.time,
            price: Math.max(c.high, currentExtreme.price),
            closePrice: c.close,
            index: i
          };
        } else if (c.close < candles[currentExtreme.index].low || (i - currentExtreme.index >= 2 && c.close < currentExtreme.closePrice)) {
          // Đảo nhịp sang giảm: Chốt đỉnh cũ
          swings.push({
            type: 'HIGH',
            time: currentExtreme.time,
            price: currentExtreme.price,
            label: 'ĐỈNH'
          });
          mode = 'DOWN';
          currentExtreme = {
            type: 'LOW',
            time: c.time,
            price: c.low,
            closePrice: c.close,
            index: i
          };
        }
      } else {
        // mode === 'DOWN'
        // Nếu có nến tiếp theo đóng cửa thấp hơn đáy hoặc chạm đáy thấp hơn -> CẬP NHẬT ĐÁY DỜI XUỐNG
        if (c.close < currentExtreme.closePrice || c.low < currentExtreme.price) {
          currentExtreme = {
            type: 'LOW',
            time: c.time,
            price: Math.min(c.low, currentExtreme.price),
            closePrice: c.close,
            index: i
          };
        } else if (c.close > candles[currentExtreme.index].high || (i - currentExtreme.index >= 2 && c.close > currentExtreme.closePrice)) {
          // Đảo nhịp sang tăng: Chốt đáy cũ
          swings.push({
            type: 'LOW',
            time: currentExtreme.time,
            price: currentExtreme.price,
            label: 'ĐÁY'
          });
          mode = 'UP';
          currentExtreme = {
            type: 'HIGH',
            time: c.time,
            price: c.high,
            closePrice: c.close,
            index: i
          };
        }
      }
    }

    // Chốt điểm nhịp hiện tại đang chạy
    swings.push({
      type: currentExtreme.type,
      time: currentExtreme.time,
      price: currentExtreme.price,
      label: currentExtreme.type === 'HIGH' ? 'ĐỈNH' : 'ĐÁY'
    });

    const waveLine = swings.map(s => ({ time: s.time, value: s.price }));
    return { swings, waveLine, currentTrend: mode };
  }
}
