import React from 'react';
import { TradingSymbol, Timeframe, Candle, Order, IndicatorSnapshot, BotMessage } from '../types';
import { TradingChart } from '../components/chart/TradingChart';
import { OpenPositions } from '../components/positions/OpenPositions';
import { BotChat } from '../components/bot/BotChat';

interface DashboardPageProps {
  symbol: TradingSymbol;
  setSymbol: (s: TradingSymbol) => void;
  timeframe: Timeframe;
  setTimeframe: (tf: Timeframe) => void;
  candles: Candle[];
  currentTick: { bid: number; ask: number; spread: number } | null;
  indicators: IndicatorSnapshot | null;
  orders: Order[];
  messages: BotMessage[];
  botActive: boolean;
  onSendMessage: (text: string) => void;
  onCloseOrder: (orderId: string) => void;
  onCloseAll: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  symbol,
  setSymbol,
  timeframe,
  setTimeframe,
  candles,
  currentTick,
  indicators,
  orders,
  messages,
  botActive,
  onSendMessage,
  onCloseOrder,
  onCloseAll
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 max-w-7xl mx-auto py-4 px-4 items-start">
      {/* Left Column: Chart & Open Positions (approx 68% width on large screens) */}
      <div className="lg:col-span-8 flex flex-col gap-4">
        {/* TradingView Chart */}
        <TradingChart
          symbol={symbol}
          setSymbol={setSymbol}
          timeframe={timeframe}
          setTimeframe={setTimeframe}
          candles={candles}
          currentTick={currentTick}
          indicators={indicators}
          orders={orders}
        />

        {/* Live Positions Table */}
        <OpenPositions
          orders={orders}
          onCloseOrder={onCloseOrder}
          onCloseAll={onCloseAll}
        />
      </div>

      {/* Right Column: Bot Chat & Live Activity Stream (approx 32% width) */}
      <div className="lg:col-span-4 h-[780px] sticky top-16">
        <BotChat
          messages={messages}
          onSendMessage={onSendMessage}
          botActive={botActive}
          symbol={symbol}
          timeframe={timeframe}
        />
      </div>
    </div>
  );
};
