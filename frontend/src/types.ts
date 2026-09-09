export type TradingSymbol = 'XAUUSD' | 'EURUSD' | 'GBPUSD' | 'USDJPY' | 'BTCUSD';
export type Timeframe = 'M1' | 'M5' | 'M15' | 'H1';
export type OrderType = 'BUY' | 'SELL';
export type OrderStatus = 'OPEN' | 'CLOSED' | 'CANCELLED';

export interface Order {
  id: string;
  ruleId?: string;
  ruleName?: string;
  symbol: TradingSymbol;
  type: OrderType;
  lot: number;
  openPrice: number;
  currentPrice: number;
  closePrice?: number;
  sl?: number;
  tp?: number;
  trailingStop?: number;
  pnl: number;
  status: OrderStatus;
  openTime: number;
  closeTime?: number;
  closeReason?: string;
}

export type IndicatorType = 'RSI' | 'EMA_CROSS' | 'BOLLINGER' | 'WEBHOOK' | 'DYNAMIC_SWING';

export interface RuleCondition {
  operator: '<' | '>' | 'CROSS_ABOVE' | 'CROSS_BELOW' | 'TOUCH_LOWER' | 'TOUCH_UPPER' | 'WEBHOOK_SIGNAL' | 'SWING_HIGH' | 'SWING_LOW';
  value?: number;
  period?: number;
  fastPeriod?: number;
  slowPeriod?: number;
  stdDev?: number;
}

export interface SwingPoint {
  type: 'HIGH' | 'LOW';
  time: number;
  price: number;
  label: string;
}

export interface AutomationRule {
  id: string;
  name: string;
  symbol: TradingSymbol;
  timeframe: Timeframe;
  indicator: IndicatorType;
  condition: RuleCondition;
  action: OrderType;
  lot: number;
  slPips: number;
  tpPips: number;
  trailingStopPips: number;
  maxOpenPositions: number;
  isActive: boolean;
  totalTrades: number;
  winTrades: number;
  totalProfit: number;
  lastTriggeredAt?: number;
  createdAt: number;
  updatedAt: number;
}

export type BotMessageType = 'SIGNAL' | 'ORDER' | 'CLOSE' | 'ANALYSIS' | 'ALERT' | 'INFO' | 'USER';

export interface BotMessage {
  id: string;
  type: BotMessageType;
  title: string;
  message: string;
  symbol?: TradingSymbol;
  orderId?: string;
  data?: Record<string, any>;
  timestamp: number;
}

export interface Candle {
  time: number; // Unix seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface AccountInfo {
  login: string;
  server: string;
  currency: string;
  balance: number;
  equity: number;
  margin: number;
  freeMargin: number;
  marginLevel: number;
  openPositionsCount: number;
  floatingPnl: number;
  isLive: boolean;
  botActive: boolean;
}

export interface IndicatorSnapshot {
  rsi14: number;
  rsi14Prev?: number;
  ema20: number;
  ema20Prev?: number;
  ema50: number;
  ema50Prev?: number;
  bbUpper: number;
  bbMiddle: number;
  bbLower: number;
}
