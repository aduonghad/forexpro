import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import {
  createChart,
  IChartApi,
  ISeriesApi,
  CandlestickData,
  Time,
  LineData,
  ISeriesPrimitive,
  ISeriesPrimitiveAxisView
} from 'lightweight-charts';
import { TradingSymbol, Timeframe, Candle, Order, IndicatorSnapshot, IndicatorConfig } from '../../types';
import { api } from '../../services/api';
import { Eye, EyeOff, TrendingUp, TrendingDown, Layers, Clock, Info } from 'lucide-react';

class CountdownPriceAxisView implements ISeriesPrimitiveAxisView {
  _coordinate: number = -10000;
  _text: string = '';
  _visible: boolean = false;
  _color: string = '#10b981';

  coordinate(): number {
    return -10000;
  }

  fixedCoordinate(): number | undefined {
    return this._visible ? this._coordinate : undefined;
  }

  text(): string {
    return this._text;
  }

  textColor(): string {
    return '#ffffff';
  }

  backColor(): string {
    return this._color;
  }

  visible(): boolean {
    return this._visible;
  }

  tickVisible(): boolean {
    return false;
  }
}

class CountdownPrimitive implements ISeriesPrimitive<Time> {
  _view = new CountdownPriceAxisView();
  _views: readonly ISeriesPrimitiveAxisView[] = [this._view];
  _series: ISeriesApi<'Candlestick'> | null = null;
  _requestUpdate: (() => void) | null = null;
  _lastPrice: number | null = null;
  _lastTimeLeft: string = '';
  _color: string = '#10b981';

  attached(param: any) {
    this._series = param.series;
    this._requestUpdate = param.requestUpdate;
  }

  detached() {
    this._series = null;
    this._requestUpdate = null;
  }

  update(timeLeft: string, price: number, color: string) {
    this._lastTimeLeft = timeLeft;
    this._lastPrice = price;
    this._color = color;
    this.refresh();
  }

  refresh() {
    if (!this._series || this._lastPrice === null) return;
    const coord = this._series.priceToCoordinate(this._lastPrice);
    if (coord === null) {
      this._view._visible = false;
    } else {
      this._view._visible = true;
      // Nhãn giá nến cao 18px (từ coord - 9 đến coord + 9).
      // Nhãn countdown (cao ~20px) đặt fixedCoordinate tại coord + 19 để nằm ngay sát dưới đáy của giá
      this._view._coordinate = Math.round(coord + 19);

      let priceStr = '';
      try {
        priceStr = this._series.priceFormatter().format(this._lastPrice);
      } catch {
        priceStr = this._lastPrice.toFixed(2);
      }

      // Đệm khoảng trắng không ngắt (\u00A0) để chiều dài nền bằng đúng với nhãn giá mua bán
      const diff = Math.max(0, priceStr.length - this._lastTimeLeft.length);
      const leftPad = Math.floor(diff / 2);
      const rightPad = diff - leftPad;
      this._view._text = '\u00A0'.repeat(leftPad) + this._lastTimeLeft + '\u00A0'.repeat(rightPad);
      this._view._color = this._color;
    }
    if (this._requestUpdate) {
      this._requestUpdate();
    }
  }

  updateAllViews() {
    this.refresh();
  }

  priceAxisViews() {
    return this._views;
  }
}

interface TradingChartProps {
  symbol: TradingSymbol;
  setSymbol: (s: TradingSymbol) => void;
  timeframe: Timeframe;
  setTimeframe: (tf: Timeframe) => void;
  candles: Candle[];
  currentTick: { bid: number; ask: number; spread: number } | null;
  indicators: IndicatorSnapshot | null;
  orders: Order[];
}

interface DynamicSwingResult {
  swings: Array<{ type: 'HIGH' | 'LOW'; time: number; price: number; label: string }>;
  waveLine: LineData[];
  currentTrend: 'UP' | 'DOWN';
}

function calculateEMA(prices: number[], period: number): number[] {
  const ema: number[] = [];
  const multiplier = 2 / (period + 1);
  if (prices.length < period) return prices.map(() => NaN);
  let sum = 0;
  for (let i = 0; i < period; i++) sum += prices[i];
  ema[period - 1] = sum / period;
  for (let i = period; i < prices.length; i++) {
    ema.push((prices[i] - ema[i - 1]) * multiplier + ema[i - 1]);
  }
  return ema;
}

function calculateMACD(
  closes: number[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
) {
  const fastEMA = calculateEMA(closes, fastPeriod);
  const slowEMA = calculateEMA(closes, slowPeriod);
  const macdLine: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (isNaN(fastEMA[i]) || isNaN(slowEMA[i])) {
      macdLine.push(NaN);
    } else {
      macdLine.push(fastEMA[i] - slowEMA[i]);
    }
  }

  const validStart = macdLine.findIndex(v => !isNaN(v));
  const validMacd = validStart >= 0 ? macdLine.slice(validStart) : [];
  const validSignal = calculateEMA(validMacd, signalPeriod);
  const signalLine: number[] = new Array(validStart >= 0 ? validStart : 0).fill(NaN).concat(validSignal);
  const histogram: number[] = [];

  for (let i = 0; i < closes.length; i++) {
    if (isNaN(macdLine[i]) || isNaN(signalLine[i])) {
      histogram.push(NaN);
    } else {
      histogram.push(macdLine[i] - signalLine[i]);
    }
  }

  return { macdLine, signalLine, histogram };
}

/**
 * Thuật toán bắt đỉnh - đáy theo nhịp sóng động:
 * - Nhịp tăng: Nến B có Close > Đỉnh A -> Cập nhật dời Đỉnh lên B
 * - Đảo chiều: Nến C quay đầu giảm -> Chốt Đỉnh B, bắt đầu nhịp giảm tạo Đáy C
 * - Nhịp giảm: Nến D có Close < Đáy C -> Cập nhật dời Đáy xuống D
 * - Đảo chiều: Nến quay đầu tăng -> Chốt Đáy D, bắt đầu nhịp tăng mới
 */
function calculateDynamicSwings(candles: Candle[]): DynamicSwingResult {
  if (!candles || candles.length < 3) {
    return { swings: [], waveLine: [], currentTrend: 'UP' };
  }

  const swings: Array<{ type: 'HIGH' | 'LOW'; time: number; price: number; label: string }> = [];
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
      // Nhịp tăng: Có nến tiếp theo đóng cửa cao hơn đỉnh tạm thời -> CẬP NHẬT ĐỈNH DỜI LÊN
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
          label: ''
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
      // Nhịp giảm: Có nến tiếp theo đóng cửa thấp hơn đáy tạm thời -> CẬP NHẬT ĐÁY DỜI XUỐNG
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
          label: ''
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
    label: ''
  });

  const waveLine: LineData[] = swings.map(s => ({ time: s.time as Time, value: s.price }));
  return { swings, waveLine, currentTrend: mode };
}

const getStoredBool = (key: string, defaultVal: boolean): boolean => {
  try {
    const item = localStorage.getItem(key);
    return item !== null ? JSON.parse(item) : defaultVal;
  } catch {
    return defaultVal;
  }
};

const setStoredBool = (key: string, val: boolean) => {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch {}
};

export const TradingChart: React.FC<TradingChartProps> = ({
  symbol,
  setSymbol,
  timeframe,
  setTimeframe,
  candles,
  currentTick,
  indicators,
  orders
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const rsiContainerRef = useRef<HTMLDivElement>(null);
  const macdContainerRef = useRef<HTMLDivElement>(null);

  const chartRef = useRef<IChartApi | null>(null);
  const rsiChartRef = useRef<IChartApi | null>(null);
  const macdChartRef = useRef<IChartApi | null>(null);

  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const ema20SeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const ema50SeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const bbUpperSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const bbLowerSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const rsiSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const macdLineSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const signalLineSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const histSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const waveLineSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const countdownPrimitiveRef = useRef<CountdownPrimitive | null>(null);

  // Dynamic Indicator configurations from Management page (/api/indicators/config)
  const [indicatorConfigs, setIndicatorConfigs] = useState<IndicatorConfig[]>([]);

  const loadIndicatorConfigs = useCallback(async () => {
    try {
      const data = await api.getIndicatorConfigs();
      if (data && Array.isArray(data) && data.length > 0) {
        setIndicatorConfigs(data);
      }
    } catch (err) {
      console.warn('Không thể nạp cấu hình chỉ báo từ API:', err);
    }
  }, []);

  useEffect(() => {
    loadIndicatorConfigs();
    const handleUpdate = () => loadIndicatorConfigs();
    window.addEventListener('indicators_updated', handleUpdate);
    window.addEventListener('focus', handleUpdate);
    return () => {
      window.removeEventListener('indicators_updated', handleUpdate);
      window.removeEventListener('focus', handleUpdate);
    };
  }, [loadIndicatorConfigs]);

  // Extract individual indicator configs from management
  const emaConfig = useMemo(() => indicatorConfigs.find(i => i.type === 'EMA_CROSS'), [indicatorConfigs]);
  const bbConfig = useMemo(() => indicatorConfigs.find(i => i.type === 'BOLLINGER'), [indicatorConfigs]);
  const rsiConfig = useMemo(() => indicatorConfigs.find(i => i.type === 'RSI'), [indicatorConfigs]);
  const swingsConfig = useMemo(() => indicatorConfigs.find(i => i.type === 'DYNAMIC_SWING'), [indicatorConfigs]);
  const macdConfig = useMemo(() => indicatorConfigs.find(i => i.type === 'MACD'), [indicatorConfigs]);

  // Dynamic Parameters (fallback to standard defaults if not set)
  const emaActive = emaConfig ? emaConfig.isActive : true;
  const emaFastPeriod = Number(emaConfig?.parameters?.fastPeriod) || 20;
  const emaSlowPeriod = Number(emaConfig?.parameters?.slowPeriod) || 50;

  const bbActive = bbConfig ? bbConfig.isActive : true;
  const bbPeriod = Number(bbConfig?.parameters?.period) || 20;
  const bbStdDev = Number(bbConfig?.parameters?.stdDev) || 2.0;

  const rsiActive = rsiConfig ? rsiConfig.isActive : true;
  const rsiPeriod = Number(rsiConfig?.parameters?.period) || 14;
  const rsiOversold = Number(rsiConfig?.parameters?.oversold) || 30;
  const rsiOverbought = Number(rsiConfig?.parameters?.overbought) || 70;

  const swingsActive = swingsConfig ? swingsConfig.isActive : true;

  const macdActive = macdConfig ? macdConfig.isActive : true;
  const macdFast = Number(macdConfig?.parameters?.fastEMA) || 12;
  const macdSlow = Number(macdConfig?.parameters?.slowEMA) || 26;
  const macdSignal = Number(macdConfig?.parameters?.signalPeriod) || 9;

  // Indicator visibility toggles with localStorage persistence
  const [showEmaFast, setShowEmaFast] = useState(() => getStoredBool('chart_show_ema_fast', getStoredBool('chart_show_ema20', true)));
  const [showEmaSlow, setShowEmaSlow] = useState(() => getStoredBool('chart_show_ema_slow', getStoredBool('chart_show_ema50', true)));
  const [showBollinger, setShowBollinger] = useState(() => getStoredBool('chart_show_bollinger', true));
  const [showRsi, setShowRsi] = useState(() => getStoredBool('chart_show_rsi', true));
  const [showSwings, setShowSwings] = useState(() => getStoredBool('chart_show_swings', true));
  const [showMacd, setShowMacd] = useState(() => getStoredBool('chart_show_macd', false));
  const [latestMacd, setLatestMacd] = useState({ macd: 0, signal: 0, hist: 0 });

  const [currentSwingTrend, setCurrentSwingTrend] = useState<'UP' | 'DOWN'>('UP');
  const [candleTimeLeft, setCandleTimeLeft] = useState<string>('00:00');

  // Update countdown on price scale
  useEffect(() => {
    if (countdownPrimitiveRef.current && candles.length > 0) {
      const last = candles[candles.length - 1];
      if (last) {
        const isUp = last.close >= last.open;
        const color = isUp ? '#10b981' : '#f43f5e';
        countdownPrimitiveRef.current.update(candleTimeLeft, last.close, color);
      }
    }
  }, [candleTimeLeft, candles]);

  // Countdown timer for selected timeframe
  useEffect(() => {
    const getSecondsForTf = (tf: Timeframe): number => {
      switch (tf) {
        case 'M1': return 60;
        case 'M5': return 300;
        case 'M15': return 900;
        case 'H1': return 3600;
        default: return 60;
      }
    };

    const updateCountdown = () => {
      const nowSec = Math.floor(Date.now() / 1000);
      const tfSec = getSecondsForTf(timeframe);
      const currentCandleStart = Math.floor(nowSec / tfSec) * tfSec;
      const nextCandleStart = currentCandleStart + tfSec;
      const remaining = Math.max(0, nextCandleStart - nowSec);

      const m = Math.floor(remaining / 60);
      const s = remaining % 60;
      const mStr = m < 10 ? `0${m}` : `${m}`;
      const sStr = s < 10 ? `0${s}` : `${s}`;
      setCandleTimeLeft(`${mStr}:${sStr}`);
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [timeframe]);

  const toggleEmaFast = () => {
    setShowEmaFast(prev => {
      const next = !prev;
      setStoredBool('chart_show_ema_fast', next);
      return next;
    });
  };

  const toggleEmaSlow = () => {
    setShowEmaSlow(prev => {
      const next = !prev;
      setStoredBool('chart_show_ema_slow', next);
      return next;
    });
  };

  const toggleBollinger = () => {
    setShowBollinger(prev => {
      const next = !prev;
      setStoredBool('chart_show_bollinger', next);
      return next;
    });
  };

  const toggleRsi = () => {
    setShowRsi(prev => {
      const next = !prev;
      setStoredBool('chart_show_rsi', next);
      return next;
    });
  };

  const toggleSwings = () => {
    setShowSwings(prev => {
      const next = !prev;
      setStoredBool('chart_show_swings', next);
      return next;
    });
  };

  const toggleMacd = () => {
    setShowMacd(prev => {
      const next = !prev;
      setStoredBool('chart_show_macd', next);
      return next;
    });
  };

  const symbolsList: { id: TradingSymbol; label: string }[] = [
    { id: 'XAUUSD', label: 'VÀNG (XAU/USD)' },
    { id: 'EURUSD', label: 'EUR/USD' },
    { id: 'GBPUSD', label: 'GBP/USD' },
    { id: 'USDJPY', label: 'USD/JPY' },
    { id: 'BTCUSD', label: 'BTC/USD' }
  ];

  const timeframes: Timeframe[] = ['M1', 'M5', 'M15', 'H1'];

  // Initialize main candlestick chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 380,
      layout: {
        background: { color: '#0b1120' },
        textColor: '#94a3b8',
      },
      grid: {
        vertLines: { color: '#1e293b' },
        horzLines: { color: '#1e293b' },
      },
      crosshair: {
        mode: 1,
        vertLine: { color: '#06b6d4', width: 1, style: 3 },
        horzLine: { color: '#06b6d4', width: 1, style: 3 },
      },
      timeScale: {
        borderColor: '#334155',
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderColor: '#334155',
        autoScale: true,
      },
    });

    const candleSeries = chart.addCandlestickSeries({
      upColor: '#10b981',
      downColor: '#f43f5e',
      borderVisible: false,
      wickUpColor: '#10b981',
      wickDownColor: '#f43f5e',
    });

    const ema20Series = chart.addLineSeries({
      color: '#f59e0b', // Amber
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
    });

    const ema50Series = chart.addLineSeries({
      color: '#a855f7', // Purple
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
    });

    const bbUpperSeries = chart.addLineSeries({
      color: '#06b6d4', // Cyan
      lineWidth: 1,
      lineStyle: 2,
      priceLineVisible: false,
      lastValueVisible: false,
    });

    const bbLowerSeries = chart.addLineSeries({
      color: '#06b6d4',
      lineWidth: 1,
      lineStyle: 2,
      priceLineVisible: false,
      lastValueVisible: false,
    });

    const waveLineSeries = chart.addLineSeries({
      color: '#38bdf8', // Sky Cyan
      lineWidth: 2,
      lineStyle: 2, // Dashed
      priceLineVisible: false,
      lastValueVisible: false,
    });

    const countdownPrimitive = new CountdownPrimitive();
    candleSeries.attachPrimitive(countdownPrimitive);
    countdownPrimitiveRef.current = countdownPrimitive;

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    ema20SeriesRef.current = ema20Series;
    ema50SeriesRef.current = ema50Series;
    bbUpperSeriesRef.current = bbUpperSeries;
    bbLowerSeriesRef.current = bbLowerSeries;
    waveLineSeriesRef.current = waveLineSeries;

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      try {
        candleSeries.detachPrimitive(countdownPrimitive);
      } catch {}
      countdownPrimitiveRef.current = null;
      chart.remove();
    };
  }, []);

  // Initialize RSI Sub-chart
  useEffect(() => {
    if (!rsiContainerRef.current || !showRsi || !rsiActive) return;

    const rsiChart = createChart(rsiContainerRef.current, {
      width: rsiContainerRef.current.clientWidth,
      height: 120,
      layout: {
        background: { color: '#080d1a' },
        textColor: '#64748b',
      },
      grid: {
        vertLines: { color: '#131d31' },
        horzLines: { color: '#131d31' },
      },
      timeScale: {
        borderColor: '#1e293b',
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderColor: '#1e293b',
        scaleMargins: { top: 0.1, bottom: 0.1 },
      },
    });

    const rsiSeries = rsiChart.addLineSeries({
      color: '#38bdf8',
      lineWidth: 2,
      title: `RSI ${rsiPeriod}`,
    });

    // Add dynamic overbought & oversold baseline markers
    rsiSeries.createPriceLine({
      price: rsiOverbought,
      color: '#f43f5e',
      lineWidth: 1,
      lineStyle: 2,
      axisLabelVisible: true,
      title: `${rsiOverbought} Quá Mua`,
    });

    rsiSeries.createPriceLine({
      price: rsiOversold,
      color: '#10b981',
      lineWidth: 1,
      lineStyle: 2,
      axisLabelVisible: true,
      title: `${rsiOversold} Quá Bán`,
    });

    rsiSeries.createPriceLine({
      price: 50,
      color: '#475569',
      lineWidth: 1,
      lineStyle: 3,
      axisLabelVisible: false,
      title: '50 Trung Tính',
    });

    rsiChartRef.current = rsiChart;
    rsiSeriesRef.current = rsiSeries;

    // Synchronize time scales safely
    const handleTimeRangeChange = (timeRange: any) => {
      if (
        timeRange &&
        timeRange.from !== null &&
        timeRange.to !== null &&
        timeRange.from !== undefined &&
        timeRange.to !== undefined &&
        rsiChartRef.current
      ) {
        try {
          rsiChartRef.current.timeScale().setVisibleRange({
            from: timeRange.from,
            to: timeRange.to
          });
        } catch {
          // Ignore sync errors before data is fully loaded
        }
      }
    };

    if (chartRef.current) {
      chartRef.current.timeScale().subscribeVisibleTimeRangeChange(handleTimeRangeChange);
    }

    const handleResize = () => {
      if (rsiContainerRef.current) {
        rsiChart.applyOptions({ width: rsiContainerRef.current.clientWidth });
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (chartRef.current) {
        chartRef.current.timeScale().unsubscribeVisibleTimeRangeChange(handleTimeRangeChange);
      }
      rsiChartRef.current = null;
      rsiSeriesRef.current = null;
      try {
        rsiChart.remove();
      } catch {}
    };
  }, [showRsi, rsiActive, rsiPeriod, rsiOverbought, rsiOversold]);

  // Initialize MACD Sub-chart
  useEffect(() => {
    if (!macdContainerRef.current || !showMacd || !macdActive) return;

    const macdChart = createChart(macdContainerRef.current, {
      width: macdContainerRef.current.clientWidth,
      height: 120,
      layout: {
        background: { color: '#080d1a' },
        textColor: '#64748b',
      },
      grid: {
        vertLines: { color: '#131d31' },
        horzLines: { color: '#131d31' },
      },
      timeScale: {
        borderColor: '#1e293b',
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderColor: '#1e293b',
        scaleMargins: { top: 0.1, bottom: 0.1 },
      },
    });

    const macdLineSeries = macdChart.addLineSeries({
      color: '#06b6d4',
      lineWidth: 2,
      title: 'MACD',
    });

    const signalLineSeries = macdChart.addLineSeries({
      color: '#f59e0b',
      lineWidth: 1,
      title: 'Signal',
    });

    const histSeries = macdChart.addHistogramSeries({
      color: '#10b981',
      title: 'Hist',
    });

    // Zero center line
    macdLineSeries.createPriceLine({
      price: 0,
      color: '#334155',
      lineWidth: 1,
      lineStyle: 3,
      axisLabelVisible: false,
    });

    macdChartRef.current = macdChart;
    macdLineSeriesRef.current = macdLineSeries;
    signalLineSeriesRef.current = signalLineSeries;
    histSeriesRef.current = histSeries;

    const handleTimeRangeChange = (timeRange: any) => {
      if (
        timeRange &&
        timeRange.from !== null &&
        timeRange.to !== null &&
        timeRange.from !== undefined &&
        timeRange.to !== undefined &&
        macdChartRef.current
      ) {
        try {
          macdChartRef.current.timeScale().setVisibleRange({
            from: timeRange.from,
            to: timeRange.to
          });
        } catch {}
      }
    };

    if (chartRef.current) {
      chartRef.current.timeScale().subscribeVisibleTimeRangeChange(handleTimeRangeChange);
    }

    const handleResize = () => {
      if (macdContainerRef.current) {
        macdChart.applyOptions({ width: macdContainerRef.current.clientWidth });
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (chartRef.current) {
        chartRef.current.timeScale().unsubscribeVisibleTimeRangeChange(handleTimeRangeChange);
      }
      macdChartRef.current = null;
      macdLineSeriesRef.current = null;
      signalLineSeriesRef.current = null;
      histSeriesRef.current = null;
      try {
        macdChart.remove();
      } catch {}
    };
  }, [showMacd, macdActive, macdFast, macdSlow, macdSignal]);

  // Update chart candles and overlay lines when candles data changes
  useEffect(() => {
    if (!candleSeriesRef.current || candles.length === 0) return;

    // Filter unique by time and sort ascending
    const sorted = [...candles].sort((a, b) => a.time - b.time);
    const uniqueMap = new Map<number, Candle>();
    for (const c of sorted) {
      uniqueMap.set(c.time, c);
    }
    const cleanCandles = Array.from(uniqueMap.values());

    const cData: CandlestickData[] = cleanCandles.map(c => ({
      time: c.time as Time,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close
    }));

    candleSeriesRef.current.setData(cData);

    // Calculate indicator lines
    const closes = cleanCandles.map(c => c.close);

    // EMA Fast (Cấu hình từ Quản Lý)
    if (showEmaFast && emaActive && ema20SeriesRef.current) {
      const mult = 2 / (emaFastPeriod + 1);
      const emaData: LineData[] = [];
      let ema = closes[0];
      for (let i = 0; i < cleanCandles.length; i++) {
        if (i >= emaFastPeriod - 1) {
          if (i === emaFastPeriod - 1) {
            const sum = closes.slice(0, emaFastPeriod).reduce((a, b) => a + b, 0);
            ema = sum / emaFastPeriod;
          } else {
            ema = (closes[i] - ema) * mult + ema;
          }
          emaData.push({ time: cleanCandles[i].time as Time, value: Number(ema.toFixed(4)) });
        }
      }
      ema20SeriesRef.current.setData(emaData);
    } else if (ema20SeriesRef.current) {
      ema20SeriesRef.current.setData([]);
    }

    // EMA Slow (Cấu hình từ Quản Lý)
    if (showEmaSlow && emaActive && ema50SeriesRef.current) {
      const mult = 2 / (emaSlowPeriod + 1);
      const emaData: LineData[] = [];
      let ema = closes[0];
      for (let i = 0; i < cleanCandles.length; i++) {
        if (i >= emaSlowPeriod - 1) {
          if (i === emaSlowPeriod - 1) {
            const sum = closes.slice(0, emaSlowPeriod).reduce((a, b) => a + b, 0);
            ema = sum / emaSlowPeriod;
          } else {
            ema = (closes[i] - ema) * mult + ema;
          }
          emaData.push({ time: cleanCandles[i].time as Time, value: Number(ema.toFixed(4)) });
        }
      }
      ema50SeriesRef.current.setData(emaData);
    } else if (ema50SeriesRef.current) {
      ema50SeriesRef.current.setData([]);
    }

    // Bollinger Bands (Cấu hình từ Quản Lý)
    if (showBollinger && bbActive && bbUpperSeriesRef.current && bbLowerSeriesRef.current) {
      const upperData: LineData[] = [];
      const lowerData: LineData[] = [];
      const period = bbPeriod;
      const stdMul = bbStdDev;

      for (let i = period - 1; i < cleanCandles.length; i++) {
        const slice = closes.slice(i - period + 1, i + 1);
        const mean = slice.reduce((a, b) => a + b, 0) / period;
        const variance = slice.reduce((s, p) => s + Math.pow(p - mean, 2), 0) / period;
        const std = Math.sqrt(variance);

        upperData.push({ time: cleanCandles[i].time as Time, value: Number((mean + stdMul * std).toFixed(4)) });
        lowerData.push({ time: cleanCandles[i].time as Time, value: Number((mean - stdMul * std).toFixed(4)) });
      }

      bbUpperSeriesRef.current.setData(upperData);
      bbLowerSeriesRef.current.setData(lowerData);
    } else {
      bbUpperSeriesRef.current?.setData([]);
      bbLowerSeriesRef.current?.setData([]);
    }

    // RSI (Cấu hình từ Quản Lý)
    if (showRsi && rsiActive && rsiSeriesRef.current) {
      const rsiData: LineData[] = [];
      const period = rsiPeriod;
      if (cleanCandles.length > period) {
        const gains: number[] = [];
        const losses: number[] = [];
        for (let i = 1; i < cleanCandles.length; i++) {
          const diff = closes[i] - closes[i - 1];
          gains.push(Math.max(0, diff));
          losses.push(Math.max(0, -diff));
        }

        let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
        let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;

        let rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
        let rsi = avgLoss === 0 ? 100 : 100 - (100 / (1 + rs));
        if (cleanCandles[period] && !isNaN(rsi)) {
          rsiData.push({ time: cleanCandles[period].time as Time, value: Number(rsi.toFixed(2)) });
        }

        for (let i = period; i < gains.length; i++) {
          avgGain = (avgGain * (period - 1) + gains[i]) / period;
          avgLoss = (avgLoss * (period - 1) + losses[i]) / period;
          rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
          rsi = avgLoss === 0 ? 100 : 100 - (100 / (1 + rs));
          if (cleanCandles[i + 1] && !isNaN(rsi)) {
            rsiData.push({ time: cleanCandles[i + 1].time as Time, value: Number(rsi.toFixed(2)) });
          }
        }
      }
      rsiSeriesRef.current.setData(rsiData);
    }

    // Dynamic Swings calculation (Cấu hình từ Quản Lý)
    const { swings, waveLine, currentTrend } = calculateDynamicSwings(cleanCandles);
    setCurrentSwingTrend(currentTrend);

    // Render ZigZag wave line
    if (showSwings && swingsActive && waveLineSeriesRef.current) {
      waveLineSeriesRef.current.setData(waveLine);
    } else if (waveLineSeriesRef.current) {
      waveLineSeriesRef.current.setData([]);
    }

    // MACD calculation (Cấu hình từ Quản Lý)
    if (showMacd && macdActive && (macdLineSeriesRef.current || signalLineSeriesRef.current || histSeriesRef.current)) {
      const { macdLine, signalLine, histogram } = calculateMACD(closes, macdFast, macdSlow, macdSignal);
      const macdData: LineData[] = [];
      const sigData: LineData[] = [];
      const histData: any[] = [];

      for (let i = 0; i < cleanCandles.length; i++) {
        const t = cleanCandles[i].time as Time;
        if (!isNaN(macdLine[i])) {
          macdData.push({ time: t, value: Number(macdLine[i].toFixed(4)) });
        }
        if (!isNaN(signalLine[i])) {
          sigData.push({ time: t, value: Number(signalLine[i].toFixed(4)) });
        }
        if (!isNaN(histogram[i])) {
          histData.push({
            time: t,
            value: Number(histogram[i].toFixed(4)),
            color: histogram[i] >= 0 ? '#10b981' : '#f43f5e'
          });
        }
      }

      macdLineSeriesRef.current?.setData(macdData);
      signalLineSeriesRef.current?.setData(sigData);
      histSeriesRef.current?.setData(histData);

      const lastIdx = cleanCandles.length - 1;
      if (lastIdx >= 0) {
        setLatestMacd({
          macd: !isNaN(macdLine[lastIdx]) ? Number(macdLine[lastIdx].toFixed(3)) : 0,
          signal: !isNaN(signalLine[lastIdx]) ? Number(signalLine[lastIdx].toFixed(3)) : 0,
          hist: !isNaN(histogram[lastIdx]) ? Number(histogram[lastIdx].toFixed(3)) : 0
        });
      }
    }

    // Set markers for Swings (ĐỈNH / ĐÁY) and active orders on the chart
    if (candleSeriesRef.current && cleanCandles.length > 0) {
      const combinedMarkers: any[] = [];

      // 1. Add Dynamic Swing Markers if enabled
      if (showSwings && swingsActive) {
        for (const sw of swings) {
          combinedMarkers.push({
            time: sw.time as Time,
            position: sw.type === 'HIGH' ? 'aboveBar' : 'belowBar',
            color: sw.type === 'HIGH' ? '#f43f5e' : '#10b981',
            shape: sw.type === 'HIGH' ? 'arrowDown' : 'arrowUp',
            text: '', // Thuần ký hiệu mũi tên, không hiển thị chữ
          });
        }
      }

      // 2. Add Active Order markers
      const activeOrderMarkers = orders
        .filter(o => o.symbol === symbol && o.status === 'OPEN')
        .map(o => {
          const orderSec = Math.floor(o.openTime / 1000);
          let closestTime = cleanCandles[cleanCandles.length - 1].time;
          for (const c of cleanCandles) {
            if (Math.abs(c.time - orderSec) < Math.abs(closestTime - orderSec)) {
              closestTime = c.time;
            }
          }
          return {
            time: closestTime as Time,
            position: (o.type === 'BUY' ? 'belowBar' : 'aboveBar') as any,
            color: o.type === 'BUY' ? '#38bdf8' : '#e11d48',
            shape: (o.type === 'BUY' ? 'arrowUp' : 'arrowDown') as any,
            text: `[LỆNH ${o.type} ${o.lot}L @ ${o.openPrice}]`,
          };
        });

      combinedMarkers.push(...activeOrderMarkers);
      combinedMarkers.sort((a, b) => (a.time as number) - (b.time as number));

      candleSeriesRef.current.setMarkers(combinedMarkers);
    }
  }, [candles, showEmaFast, showEmaSlow, showBollinger, showRsi, showSwings, showMacd, emaFastPeriod, emaSlowPeriod, bbPeriod, bbStdDev, rsiPeriod, macdFast, macdSlow, macdSignal, emaActive, bbActive, rsiActive, swingsActive, macdActive, orders, symbol]);

  const latestCandle = candles[candles.length - 1];
  const prevCandle = candles[candles.length - 2];
  const priceChange = latestCandle && prevCandle ? latestCandle.close - prevCandle.open : 0;
  const isUp = priceChange >= 0;

  return (
    <div className="glass-panel rounded-2xl overflow-hidden shadow-2xl border border-slate-800 flex flex-col">
      {/* Top Controls Bar */}
      <div className="p-3 border-b border-slate-800/80 bg-slate-900/60 flex flex-wrap items-center justify-between gap-3">
        {/* Symbol selector pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {symbolsList.map(item => (
            <button
              key={item.id}
              onClick={() => setSymbol(item.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                symbol === item.id
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Timeframe selector */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
          <Clock className="w-3.5 h-3.5 text-slate-500 ml-1.5 mr-0.5" />
          {timeframes.map(tf => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all ${
                timeframe === tf
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>

        {/* Indicator Toggles (Cập nhật tự động theo Trang Quản Lý) */}
        <div className="flex items-center gap-1.5 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800 text-[11px] overflow-x-auto scrollbar-none">
          <Layers className="w-3.5 h-3.5 text-cyan-400 mr-0.5 shrink-0" />

          {/* EMA Fast */}
          {emaActive && (
            <button
              onClick={toggleEmaFast}
              title={`Đường trung bình động EMA ${emaFastPeriod} (Cấu hình từ Quản Lý)`}
              className={`px-2 py-0.5 rounded font-medium transition whitespace-nowrap ${
                showEmaFast ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-sm' : 'text-slate-500 line-through'
              }`}
            >
              EMA {emaFastPeriod}
            </button>
          )}

          {/* EMA Slow */}
          {emaActive && (
            <button
              onClick={toggleEmaSlow}
              title={`Đường trung bình động EMA ${emaSlowPeriod} (Cấu hình từ Quản Lý)`}
              className={`px-2 py-0.5 rounded font-medium transition whitespace-nowrap ${
                showEmaSlow ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30 shadow-sm' : 'text-slate-500 line-through'
              }`}
            >
              EMA {emaSlowPeriod}
            </button>
          )}

          {/* Bollinger Bands */}
          {bbActive && (
            <button
              onClick={toggleBollinger}
              title={`Dải Bollinger Bands (${bbPeriod}, ${bbStdDev}) (Cấu hình từ Quản Lý)`}
              className={`px-2 py-0.5 rounded font-medium transition whitespace-nowrap ${
                showBollinger ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm' : 'text-slate-500 line-through'
              }`}
            >
              BB ({bbPeriod},{bbStdDev})
            </button>
          )}

          {/* RSI */}
          {rsiActive && (
            <button
              onClick={toggleRsi}
              title={`RSI ${rsiPeriod} [Quá bán: ${rsiOversold} | Quá mua: ${rsiOverbought}] (Cấu hình từ Quản Lý)`}
              className={`px-2 py-0.5 rounded font-medium transition whitespace-nowrap ${
                showRsi ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30 shadow-sm' : 'text-slate-500 line-through'
              }`}
            >
              RSI {rsiPeriod}
            </button>
          )}

          {/* Dynamic Swings / TopDown */}
          {swingsActive && (
            <button
              onClick={toggleSwings}
              title="Dynamic Price Action Swings / TopDown Đỉnh - Đáy (Cấu hình từ Quản Lý)"
              className={`px-2.5 py-0.5 rounded font-bold transition flex items-center gap-1 whitespace-nowrap ${
                showSwings ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-500/20' : 'text-slate-500 line-through'
              }`}
            >
              <span>TopDown</span>
            </button>
          )}

          {/* MACD */}
          {macdActive && (
            <button
              onClick={toggleMacd}
              title={`MACD (${macdFast}, ${macdSlow}, ${macdSignal}) (Cấu hình từ Quản Lý)`}
              className={`px-2 py-0.5 rounded font-medium transition whitespace-nowrap ${
                showMacd ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm' : 'text-slate-500 line-through'
              }`}
            >
              MACD ({macdFast},{macdSlow})
            </button>
          )}
        </div>
      </div>

      {/* Live Ticker Bar */}
      <div className="px-4 py-2 bg-slate-950/80 border-b border-slate-800/60 flex items-center justify-between text-xs">
        <div className="flex items-center gap-5">
          {/* Price Column */}
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-lg font-extrabold text-white">
              {latestCandle ? latestCandle.close.toFixed(symbol === 'EURUSD' || symbol === 'GBPUSD' ? 5 : 2) : '---'}
            </span>
            <span className={`font-mono text-xs font-semibold flex items-center gap-0.5 ${isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
              {isUp ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
              {isUp ? '+' : ''}{priceChange.toFixed(2)}
            </span>
          </div>

          {/* Bid / Ask (Giá mua và bán) Column */}
          <div className="hidden sm:flex items-center gap-3 text-slate-300 font-mono text-[11px]">
            <span>Giá Bán (Bid): <strong className="text-slate-100">{currentTick?.bid || '---'}</strong></span>
            <span>Giá Mua (Ask): <strong className="text-slate-100">{currentTick?.ask || '---'}</strong></span>
            <span>Spread: <strong className="text-cyan-400">{currentTick?.spread || '---'}</strong></span>
          </div>
        </div>
      </div>

      {/* Main Candlestick Chart Canvas */}
      <div className="relative w-full h-[380px]" ref={chartContainerRef} />

      {/* Sub-chart: RSI (Hiển thị đồng bộ theo Cấu hình Quản Lý) */}
      {showRsi && rsiActive && (
        <div className="border-t border-slate-800 bg-slate-950/60 p-2">
          <div className="flex items-center justify-between text-[11px] px-2 mb-1 text-slate-400 font-mono">
            <span className="font-semibold text-sky-400">
              RSI({rsiPeriod}) - Quá bán: {rsiOversold} | Quá mua: {rsiOverbought}
            </span>
            <span>Hiện tại: <strong className="text-sky-300">{indicators?.rsi14 || 50}</strong></span>
          </div>
          <div className="w-full h-[120px]" ref={rsiContainerRef} />
        </div>
      )}

      {/* Sub-chart: MACD (Hiển thị đồng bộ theo Cấu hình Quản Lý) */}
      {showMacd && macdActive && (
        <div className="border-t border-slate-800 bg-slate-950/60 p-2">
          <div className="flex items-center justify-between text-[11px] px-2 mb-1 text-slate-400 font-mono">
            <span className="font-semibold text-emerald-400">
              MACD ({macdFast}, {macdSlow}, {macdSignal})
            </span>
            <div className="flex items-center gap-3 font-mono text-[11px]">
              <span>Đường MACD: <strong className="text-cyan-400">{latestMacd.macd.toFixed(3)}</strong></span>
              <span>Đường Tín Hiệu: <strong className="text-amber-400">{latestMacd.signal.toFixed(3)}</strong></span>
              <span>Histogram: <strong className={latestMacd.hist >= 0 ? 'text-emerald-400' : 'text-rose-400'}>{latestMacd.hist >= 0 ? '+' : ''}{latestMacd.hist.toFixed(3)}</strong></span>
            </div>
          </div>
          <div className="w-full h-[120px]" ref={macdContainerRef} />
        </div>
      )}
    </div>
  );
};
