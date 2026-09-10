import React from 'react';
import { CandleDefinition, PatternSignal } from '../../types';

interface CandleVisualProps {
  candles: CandleDefinition[];
  signal: PatternSignal;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const CandleVisual: React.FC<CandleVisualProps> = ({
  candles,
  signal,
  className = '',
  size = 'md'
}) => {
  const candleHeight = size === 'sm' ? 48 : size === 'md' ? 68 : 84;
  const candleWidth = size === 'sm' ? 12 : size === 'md' ? 16 : 20;
  const spacing = size === 'sm' ? 24 : size === 'md' ? 32 : 40;

  const n = Math.max(1, candles.length);
  const span = (n - 1) * spacing;
  const paddingX = Math.max(28, candleWidth * 2.2);
  const width = Math.max(90, Math.round(span + paddingX * 2));
  const svgHeight = candleHeight + (candles.length > 1 ? 16 : 14);

  // Exact horizontal center calculations
  const centerX = width / 2;
  const startX = centerX - span / 2;

  // Calculate dynamic geometry for each candle based on its definition
  return (
    <div className={`flex items-center justify-center p-2 rounded-xl bg-slate-950/60 border border-slate-800/80 ${className}`}>
      <svg
        width={width}
        height={svgHeight}
        viewBox={`0 0 ${width} ${svgHeight}`}
        className="overflow-visible mx-auto"
      >
        {candles.map((c, i) => {
          // Perfectly centered X position for every candle
          const cx = Math.round(startX + i * spacing);
          const isGreen = c.direction === 'BULLISH' || (c.direction === 'ANY' && signal === 'BUY');
          const isRed = c.direction === 'BEARISH' || (c.direction === 'ANY' && signal === 'SELL');
          const isDoji = c.direction === 'DOJI';

          // Color palette
          const strokeColor = isDoji ? '#94a3b8' : isGreen ? '#10b981' : '#f43f5e';
          const fillColor = isDoji ? '#94a3b8' : isGreen ? '#10b981' : '#f43f5e';

          // Derive proportions from rules
          let upperWickLen = 14;
          let lowerWickLen = 14;
          let bodyHeight = 24;
          let bodyTop = (candleHeight - bodyHeight) / 2;

          // Adjust based on typical patterns
          if (c.lowerWick.operator === '>=' && c.lowerWick.value >= 1.5) {
            // Hammer / Dragonfly: Long lower shadow, small body on top
            bodyHeight = 12;
            bodyTop = 8;
            upperWickLen = 4;
            lowerWickLen = candleHeight - bodyTop - bodyHeight - 6;
          } else if (c.upperWick.operator === '>=' && c.upperWick.value >= 1.5) {
            // Shooting star / Gravestone: Long upper shadow, small body at bottom
            bodyHeight = 12;
            bodyTop = candleHeight - 18;
            upperWickLen = candleHeight - 20;
            lowerWickLen = 4;
          } else if (c.body.mode === 'RATIO_TO_RANGE' && c.body.operator === '>=' && c.body.value >= 80) {
            // Marubozu: Large body, minimal wicks
            bodyHeight = candleHeight - 16;
            bodyTop = 8;
            upperWickLen = 3;
            lowerWickLen = 3;
          } else if (isDoji) {
            bodyHeight = 2;
            bodyTop = candleHeight / 2 - 1;
            upperWickLen = 22;
            lowerWickLen = 22;
          } else if (candles.length > 1 && i === candles.length - 1 && c.relative?.engulfsPrevious) {
            // Engulfing confirmation candle: larger body
            bodyHeight = candleHeight - 20;
            bodyTop = 10;
            upperWickLen = 6;
            lowerWickLen = 6;
          }

          const wickTop = Math.max(3, bodyTop - upperWickLen);
          const wickBottom = Math.min(candleHeight - 3, bodyTop + bodyHeight + lowerWickLen);

          return (
            <g key={c.position || i}>
              {/* Upper & Lower Wick (center line) */}
              <line
                x1={cx}
                y1={wickTop}
                x2={cx}
                y2={wickBottom}
                stroke={strokeColor}
                strokeWidth="1.5"
                strokeLinecap="round"
              />

              {/* Candle Body */}
              <rect
                x={cx - candleWidth / 2}
                y={bodyTop}
                width={candleWidth}
                height={Math.max(2, bodyHeight)}
                fill={isDoji ? strokeColor : fillColor}
                stroke={strokeColor}
                strokeWidth="1"
                rx={isDoji ? 0 : 2.5}
                className="transition-all duration-300"
              />

              {/* Index number indicator */}
              <text
                x={cx}
                y={candleHeight + 13}
                textAnchor="middle"
                fontSize="9"
                fontWeight="bold"
                fill="#64748b"
                fontFamily="monospace"
              >
                #{i + 1}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};
