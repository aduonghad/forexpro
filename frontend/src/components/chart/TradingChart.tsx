import React, { useEffect, useRef, useState, useMemo } from 'react';
import { createChart, IChartApi, ISeriesApi, CandlestickData, Time, LineData } from 'lightweight-charts';
import { TradingSymbol, Timeframe, Candle, Order, IndicatorSnapshot } from '../../types';
import { Eye, EyeOff, TrendingUp, TrendingDown, Layers, Clock } from 'lucide-react';

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

  const chartRef = useRef<IChartApi | null>(null);
  const rsiChartRef = useRef<IChartApi | null>(null);

  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const ema20SeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const ema50SeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const bbUpperSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const bbLowerSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const rsiSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const waveLineSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);

  // Indicator visibility toggles with localStorage persistence
  const [showEma20, setShowEma20] = useState(() => getStoredBool('chart_show_ema20', true));
  const [showEma50, setShowEma50] = useState(() => getStoredBool('chart_show_ema50', true));
  const [showBollinger, setShowBollinger] = useState(() => getStoredBool('chart_show_bollinger', true));
  const [showRsi, setShowRsi] = useState(() => getStoredBool('chart_show_rsi', true));
  const [showSwings, setShowSwings] = useState(() => getStoredBool('chart_show_swings', true));
  const [currentSwingTrend, setCurrentSwingTrend] = useState<'UP' | 'DOWN'>('UP');

  const toggleEma20 = () => {
    setShowEma20(prev => {
      const next = !prev;
      setStoredBool('chart_show_ema20', next);
      return next;
    });
  };

  const toggleEma50 = () => {
    setShowEma50(prev => {
      const next = !prev;
      setStoredBool('chart_show_ema50', next);
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
      title: 'EMA 20',
      priceLineVisible: false,
    });

    const ema50Series = chart.addLineSeries({
      color: '#a855f7', // Purple
      lineWidth: 2,
      title: 'EMA 50',
      priceLineVisible: false,
    });

    const bbUpperSeries = chart.addLineSeries({
      color: '#06b6d4', // Cyan
      lineWidth: 1,
      lineStyle: 2,
      title: 'BB Upper',
      priceLineVisible: false,
    });

    const bbLowerSeries = chart.addLineSeries({
      color: '#06b6d4',
      lineWidth: 1,
      lineStyle: 2,
      title: 'BB Lower',
      priceLineVisible: false,
    });

    const waveLineSeries = chart.addLineSeries({
      color: '#38bdf8', // Sky Cyan
      lineWidth: 2,
      lineStyle: 2, // Dashed
      title: 'TopDown',
      priceLineVisible: false,
    });

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
      chart.remove();
    };
  }, []);

  // Initialize RSI Sub-chart
  useEffect(() => {
    if (!rsiContainerRef.current || !showRsi) return;

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
      title: 'RSI 14',
    });

    // Add 70 and 30 baseline markers
    rsiSeries.createPriceLine({
      price: 70,
      color: '#f43f5e',
      lineWidth: 1,
      lineStyle: 2,
      axisLabelVisible: true,
      title: '70 Quá Mua',
    });

    rsiSeries.createPriceLine({
      price: 30,
      color: '#10b981',
      lineWidth: 1,
      lineStyle: 2,
      axisLabelVisible: true,
      title: '30 Quá Bán',
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
  }, [showRsi]);

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

    // EMA 20
    if (showEma20 && ema20SeriesRef.current) {
      const mult = 2 / (20 + 1);
      const emaData: LineData[] = [];
      let ema = closes[0];
      for (let i = 0; i < cleanCandles.length; i++) {
        if (i >= 19) {
          if (i === 19) {
            const sum = closes.slice(0, 20).reduce((a, b) => a + b, 0);
            ema = sum / 20;
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

    // EMA 50
    if (showEma50 && ema50SeriesRef.current) {
      const mult = 2 / (50 + 1);
      const emaData: LineData[] = [];
      let ema = closes[0];
      for (let i = 0; i < cleanCandles.length; i++) {
        if (i >= 49) {
          if (i === 49) {
            const sum = closes.slice(0, 50).reduce((a, b) => a + b, 0);
            ema = sum / 50;
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

    // Bollinger Bands
    if (showBollinger && bbUpperSeriesRef.current && bbLowerSeriesRef.current) {
      const upperData: LineData[] = [];
      const lowerData: LineData[] = [];
      const period = 20;

      for (let i = period - 1; i < cleanCandles.length; i++) {
        const slice = closes.slice(i - period + 1, i + 1);
        const mean = slice.reduce((a, b) => a + b, 0) / period;
        const variance = slice.reduce((s, p) => s + Math.pow(p - mean, 2), 0) / period;
        const std = Math.sqrt(variance);

        upperData.push({ time: cleanCandles[i].time as Time, value: Number((mean + 2 * std).toFixed(4)) });
        lowerData.push({ time: cleanCandles[i].time as Time, value: Number((mean - 2 * std).toFixed(4)) });
      }

      bbUpperSeriesRef.current.setData(upperData);
      bbLowerSeriesRef.current.setData(lowerData);
    } else {
      bbUpperSeriesRef.current?.setData([]);
      bbLowerSeriesRef.current?.setData([]);
    }

    // RSI
    if (showRsi && rsiSeriesRef.current) {
      const rsiData: LineData[] = [];
      const period = 14;
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

    // Dynamic Swings calculation
    const { swings, waveLine, currentTrend } = calculateDynamicSwings(cleanCandles);
    setCurrentSwingTrend(currentTrend);

    // Render ZigZag wave line
    if (showSwings && waveLineSeriesRef.current) {
      waveLineSeriesRef.current.setData(waveLine);
    } else if (waveLineSeriesRef.current) {
      waveLineSeriesRef.current.setData([]);
    }

    // Set markers for Swings (ĐỈNH / ĐÁY) and active orders on the chart
    if (candleSeriesRef.current && cleanCandles.length > 0) {
      const combinedMarkers: any[] = [];

      // 1. Add Dynamic Swing Markers if enabled
      if (showSwings) {
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
  }, [candles, showEma20, showEma50, showBollinger, showRsi, showSwings, orders, symbol]);

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

        {/* Indicator Toggles */}
        <div className="flex items-center gap-1.5 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800 text-[11px]">
          <Layers className="w-3.5 h-3.5 text-slate-500 mr-1" />
          <button
            onClick={toggleEma20}
            className={`px-2 py-0.5 rounded font-medium transition ${
              showEma20 ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'text-slate-500 line-through'
            }`}
          >
            EMA 20
          </button>
          <button
            onClick={toggleEma50}
            className={`px-2 py-0.5 rounded font-medium transition ${
              showEma50 ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'text-slate-500 line-through'
            }`}
          >
            EMA 50
          </button>
          <button
            onClick={toggleBollinger}
            className={`px-2 py-0.5 rounded font-medium transition ${
              showBollinger ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'text-slate-500 line-through'
            }`}
          >
            BB (20,2)
          </button>
          <button
            onClick={toggleRsi}
            className={`px-2 py-0.5 rounded font-medium transition ${
              showRsi ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30' : 'text-slate-500 line-through'
            }`}
          >
            RSI 14
          </button>
          <button
            onClick={toggleSwings}
            className={`px-2.5 py-0.5 rounded font-bold transition flex items-center gap-1 ${
              showSwings ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-500/20' : 'text-slate-500 line-through'
            }`}
          >
            <span>TopDown</span>
          </button>
        </div>
      </div>

      {/* Live Ticker Bar */}
      <div className="px-4 py-2 bg-slate-950/80 border-b border-slate-800/60 flex items-center justify-between text-xs">
        <div className="flex items-center gap-4">
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-lg font-extrabold text-white">
              {latestCandle ? latestCandle.close.toFixed(symbol === 'EURUSD' || symbol === 'GBPUSD' ? 5 : 2) : '---'}
            </span>
            <span className={`font-mono text-xs font-semibold flex items-center gap-0.5 ${isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
              {isUp ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
              {isUp ? '+' : ''}{priceChange.toFixed(2)}
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-3 text-slate-400 font-mono text-[11px]">
            <span>Bid: <strong className="text-slate-200">{currentTick?.bid || '---'}</strong></span>
            <span>Ask: <strong className="text-slate-200">{currentTick?.ask || '---'}</strong></span>
            <span>Spread: <strong className="text-cyan-400">{currentTick?.spread || '---'}</strong></span>
          </div>
        </div>

        {/* Real-time Indicator Snapshot & Wave Readouts */}
        <div className="hidden md:flex items-center gap-3 text-[11px] font-mono">
          <span className={`px-2 py-0.5 rounded border text-[11px] font-bold ${
            currentSwingTrend === 'UP'
              ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
              : 'bg-rose-500/10 text-rose-300 border-rose-500/30'
          }`}>
            TopDown: {currentSwingTrend === 'UP' ? '📈 TĂNG (Tìm Đỉnh)' : '📉 GIẢM (Tìm Đáy)'}
          </span>
          {indicators && (
            <>
              <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
                RSI: <strong className={`${indicators.rsi14 < 30 ? 'text-emerald-400' : indicators.rsi14 > 70 ? 'text-rose-400' : 'text-sky-300'}`}>{indicators.rsi14}</strong>
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-amber-300">
                EMA20: {indicators.ema20}
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-purple-300">
                EMA50: {indicators.ema50}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Main Candlestick Chart Canvas */}
      <div className="relative w-full h-[380px]" ref={chartContainerRef} />

      {/* Sub-chart: RSI */}
      {showRsi && (
        <div className="border-t border-slate-800 bg-slate-950/60 p-2">
          <div className="flex items-center justify-between text-[11px] px-2 mb-1 text-slate-400 font-mono">
            <span className="font-semibold text-sky-400">RSI(14) - Quá bán: 30 | Quá mua: 70</span>
            <span>Hiện tại: <strong className="text-sky-300">{indicators?.rsi14 || 50}</strong></span>
          </div>
          <div className="w-full h-[120px]" ref={rsiContainerRef} />
        </div>
      )}
    </div>
  );
};
