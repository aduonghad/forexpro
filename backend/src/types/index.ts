export type TradingSymbol = 'XAUUSD' | 'EURUSD' | 'GBPUSD' | 'USDJPY' | 'BTCUSD';
export type Timeframe = 'M1' | 'M5' | 'M15' | 'H1';
export type OrderType = 'BUY' | 'SELL';
export type OrderStatus = 'OPEN' | 'CLOSED' | 'CANCELLED';

export interface Order {
  id: string;
  userId?: string;
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
  highestPrice?: number; // for trailing stop
  lowestPrice?: number;  // for trailing stop
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
  userId?: string;
  signalId?: string;
  isDefaultRule?: boolean;
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
  userId?: string;
  type: BotMessageType;
  title: string;
  message: string;
  symbol?: TradingSymbol;
  orderId?: string;
  data?: Record<string, any>;
  timestamp: number;
}

export interface Candle {
  time: number; // Unix timestamp in seconds
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

export interface ExnessAccount {
  id: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  accountName: string;
  login: string;
  server: string;
  accountType: 'REAL' | 'DEMO';
  platform: 'MT5' | 'MT4';
  password?: string;
  investorPassword?: string;
  currency: string;
  leverage: number;
  balance: number;
  equity: number;
  isActive: boolean;
  status: 'CONNECTED' | 'DISCONNECTED' | 'SYNCING';
  lastSyncAt?: number;
  createdAt: number;
  updatedAt: number;
}

export interface IndicatorSnapshot {
  rsi14?: number;
  ema20?: number;
  ema50?: number;
  bbUpper?: number;
  bbMiddle?: number;
  bbLower?: number;
}

export type PatternCategory = 'SINGLE' | 'DOUBLE' | 'TRIPLE' | 'MULTI';
export type PatternSignal = 'BUY' | 'SELL' | 'NEUTRAL';
export type CandleDirection = 'BULLISH' | 'BEARISH' | 'DOJI' | 'ANY';

export type BodySizeMode = 
  | 'SPECIFIC_VALUE'               // Số cụ thể (pips/points)
  | 'RATIO_TO_RANGE'               // % thân nến so với tổng chiều dài nến (High - Low)
  | 'PERCENT_OF_PREVIOUS_BODY'     // % so với thân nến phía trước
  | 'PERCENT_OF_PREVIOUS_TOTAL'    // % so với tổng chiều dài nến phía trước
  | 'ANY';                         // Bất kỳ

export type WickSizeMode = 
  | 'SPECIFIC_VALUE'               // Số cụ thể (pips/points)
  | 'RATIO_TO_BODY'                // Tỷ lệ râu so với thân nến hiện tại (ví dụ >= 2x thân)
  | 'PERCENT_OF_RANGE'             // % râu so với toàn bộ nến
  | 'PERCENT_OF_PREVIOUS_UPPER'    // % so với râu trên nến trước
  | 'PERCENT_OF_PREVIOUS_LOWER'    // % so với râu dưới nến trước
  | 'ANY';                         // Bất kỳ

export interface CandleMetricRule {
  mode: BodySizeMode | WickSizeMode;
  operator: '>=' | '<=' | '>' | '<' | '=';
  value: number;
}

export interface RelativePositionRule {
  engulfsPrevious?: boolean;
  higherHigh?: boolean;
  lowerLow?: boolean;
  closeAbovePreviousOpen?: boolean;
  closeBelowPreviousOpen?: boolean;
  insidePreviousBar?: boolean;
}

export interface CandleDefinition {
  position: number; // 1 = nến cũ nhất trong mẫu, N = nến xác nhận cuối cùng
  label: string;
  direction: CandleDirection;
  body: CandleMetricRule;
  upperWick: CandleMetricRule;
  lowerWick: CandleMetricRule;
  relative?: RelativePositionRule;
}

export interface CandlestickPattern {
  id: string;
  name: string;
  category: PatternCategory;
  signal?: PatternSignal;
  candleCount: number;
  description: string;
  candles: CandleDefinition[];
  isActive: boolean;
  isPredefined?: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface IndicatorConfig {
  id: string;
  name: string;
  type: 'RSI' | 'EMA_CROSS' | 'BOLLINGER' | 'DYNAMIC_SWING' | 'MACD';
  category: 'MOMENTUM' | 'TREND' | 'VOLATILITY' | 'SUPPORT_RESISTANCE';
  description: string;
  isActive: boolean;
  timeframe: Timeframe;
  parameters: Record<string, any>;
  priority?: number;
  buyCondition?: {
    operator: string;
    threshold: number | string;
    description: string;
  };
  sellCondition?: {
    operator: string;
    threshold: number | string;
    description: string;
  };
  updatedAt: number;
}

export interface SignalCondition {
  indicatorType: 'RSI' | 'EMA_CROSS' | 'BOLLINGER' | 'DYNAMIC_SWING' | 'MACD';
  operator: string;
  value?: number | string;
  description?: string;
}

export interface TradingSignalConfig {
  id: string;
  name: string;
  description: string;
  action: 'BUY' | 'SELL';
  symbol: TradingSymbol | 'ALL';
  timeframe: Timeframe;
  logicOperator: 'AND' | 'OR';
  conditions: SignalCondition[];
  lot: number;
  slPips: number;
  tpPips: number;
  trailingStopPips?: number;
  maxOpenPositions: number;
  cooldownSeconds: number;
  isActive: boolean;
  totalTriggers: number;
  lastTriggeredAt?: number;
  updatedAt: number;
}

export interface TelegramConfigStatus {
  botTokenConfigured: boolean;
  botTokenMasked: string;
  chatId: string;
  notificationsEnabled: boolean;
  botUsername?: string;
  botFirstName?: string;
}

export type UserPlan = 'free' | 'plus' | 'pro' | 'ultra';

export const PLAN_SIGNAL_LIMITS: Record<UserPlan, number> = {
  free: 1,
  plus: 3,
  pro: 10,
  ultra: Infinity
};

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  passwordHash?: string;
  googleId?: string;
  authProvider: 'local' | 'google';
  role: 'user' | 'admin';
  plan: UserPlan;
  lastSymbol?: TradingSymbol;
  lastTimeframe?: Timeframe;
  telegramBotToken?: string;
  telegramChatId?: string;
  telegramAlertsActive?: boolean;
  createdAt: number;
  updatedAt: number;
}

export type SafeUser = Omit<User, 'passwordHash'>;

export interface AuthResponse {
  user: SafeUser;
  token: string;
}

export interface RegisterParams {
  email: string;
  password?: string;
  name: string;
}

export interface LoginParams {
  email: string;
  password?: string;
}

export interface GoogleAuthParams {
  credential?: string; // ID token
  accessToken?: string;
}
