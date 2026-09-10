import { Candle, Timeframe, TradingSymbol } from '../types/index.js';

export interface ClosedCandleAnalysis {
  timeframe: Timeframe;
  symbol: TradingSymbol;
  candleTime: number;
  closeTimeFormatted: string;
  patternName: string;
  patternType: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  patternCategory: 'SINGLE' | 'DOUBLE' | 'TRIPLE';
  sentiment: string;
  confidence: 'HIGH' | 'MEDIUM' | 'MODERATE';
  priceActionSignal: 'CANH_MUA' | 'CANH_BAN' | 'THEO_DOI';
  metrics: {
    open: number;
    high: number;
    low: number;
    close: number;
    range: number;
    rangePips: number;
    body: number;
    bodyPips: number;
    upperWick: number;
    upperWickPips: number;
    lowerWick: number;
    lowerWickPips: number;
    bodyPercent: number;
    upperWickPercent: number;
    lowerWickPercent: number;
    direction: 'BULLISH' | 'BEARISH' | 'DOJI';
  };
}

export class CandleClassifier {
  static getPipSize(symbol: TradingSymbol): number {
    switch (symbol) {
      case 'XAUUSD': return 0.1;
      case 'EURUSD':
      case 'GBPUSD': return 0.0001;
      case 'USDJPY': return 0.01;
      case 'BTCUSD': return 1.0;
      default: return 0.1;
    }
  }

  static analyzeClosedCandle(
    candles: Candle[],
    symbol: TradingSymbol = 'XAUUSD',
    timeframe: Timeframe = 'M1'
  ): ClosedCandleAnalysis | null {
    if (!candles || candles.length < 1) return null;

    const targetIdx = candles.length >= 2 ? candles.length - 2 : candles.length - 1;
    const current = candles[targetIdx];
    const prev = targetIdx >= 1 ? candles[targetIdx - 1] : null;
    const prev2 = targetIdx >= 2 ? candles[targetIdx - 2] : null;

    const pipSize = this.getPipSize(symbol);
    const open = current.open;
    const high = current.high;
    const low = current.low;
    const close = current.close;

    const range = Math.max(0.00001, high - low);
    const body = Math.abs(close - open);
    const isBullish = close > open;
    const isBearish = close < open;
    const isDoji = body <= range * 0.1 || body === 0;
    const direction: 'BULLISH' | 'BEARISH' | 'DOJI' = isDoji ? 'DOJI' : (isBullish ? 'BULLISH' : 'BEARISH');

    const upperWick = high - Math.max(open, close);
    const lowerWick = Math.min(open, close) - low;

    const bodyPercent = Number(((body / range) * 100).toFixed(1));
    const upperWickPercent = Number(((upperWick / range) * 100).toFixed(1));
    const lowerWickPercent = Number(((lowerWick / range) * 100).toFixed(1));

    const rangePips = Number((range / pipSize).toFixed(1));
    const bodyPips = Number((body / pipSize).toFixed(1));
    const upperWickPips = Number((upperWick / pipSize).toFixed(1));
    const lowerWickPips = Number((lowerWick / pipSize).toFixed(1));

    const closeDate = new Date(current.time * 1000);
    const closeTimeFormatted = closeDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    let patternName = isBullish ? 'Nến Tăng Tiêu Chuẩn' : isBearish ? 'Nến Giảm Tiêu Chuẩn' : 'Nến Doji Chuẩn';
    let patternType: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = isBullish ? 'BULLISH' : isBearish ? 'BEARISH' : 'NEUTRAL';
    let patternCategory: 'SINGLE' | 'DOUBLE' | 'TRIPLE' = 'SINGLE';
    let sentiment = isBullish 
      ? `Thân nến tăng chiếm ${bodyPercent}% biên độ (${bodyPips} pips), phe Mua kiểm soát nhịp nến.` 
      : isBearish 
        ? `Thân nến giảm chiếm ${bodyPercent}% biên độ (${bodyPips} pips), phe Bán kiểm soát nhịp nến.`
        : `Biên độ giằng co (${rangePips} pips), thân nến siêu nhỏ thể hiện trạng thái cân bằng cung cầu.`;
    let confidence: 'HIGH' | 'MEDIUM' | 'MODERATE' = 'MODERATE';
    let priceActionSignal: 'CANH_MUA' | 'CANH_BAN' | 'THEO_DOI' = isBullish ? 'CANH_MUA' : isBearish ? 'CANH_BAN' : 'THEO_DOI';

    // 1. Triple patterns
    if (prev && prev2) {
      const prev2Bullish = prev2.close > prev2.open;
      const prev2Bearish = prev2.close < prev2.open;
      const prev2Body = Math.abs(prev2.close - prev2.open);
      const prevBody = Math.abs(prev.close - prev.open);

      if (prev2Bearish && prev2Body > (prev2.high - prev2.low) * 0.4 &&
          prevBody <= (prev.high - prev.low) * 0.35 &&
          isBullish && close > (prev2.open + prev2.close) / 2) {
        patternName = 'Morning Star (Sao Mai Đảo Chiều Tăng)';
        patternType = 'BULLISH';
        patternCategory = 'TRIPLE';
        sentiment = 'Bộ 3 nến Sao Mai kinh điển: Sau nhịp giảm mạnh xuất hiện nến lưỡng lự ở đáy và nến xác nhận tăng mạnh vượt 50% nến giảm.';
        confidence = 'HIGH';
        priceActionSignal = 'CANH_MUA';
      } else if (prev2Bullish && prev2Body > (prev2.high - prev2.low) * 0.4 &&
                 prevBody <= (prev.high - prev.low) * 0.35 &&
                 isBearish && close < (prev2.open + prev2.close) / 2) {
        patternName = 'Evening Star (Sao Hôm Đảo Chiều Giảm)';
        patternType = 'BEARISH';
        patternCategory = 'TRIPLE';
        sentiment = 'Bộ 3 nến Sao Hôm kinh điển: Sau nhịp tăng mạnh xuất hiện nến lưỡng lự ở đỉnh và nến xác nhận giảm mạnh đâm thủng 50% nến tăng.';
        confidence = 'HIGH';
        priceActionSignal = 'CANH_BAN';
      } else if (prev2Bullish && prev.close > prev.open && isBullish &&
                 close > prev.close && prev.close > prev2.close &&
                 bodyPercent >= 50 && upperWickPercent <= 25) {
        patternName = 'Three White Soldiers (Ba Chàng Lính Tăng Giá)';
        patternType = 'BULLISH';
        patternCategory = 'TRIPLE';
        sentiment = 'Ba nến xanh tăng liên tiếp với thân nến mạnh mẽ, thể hiện xung lực mua áp đảo.';
        confidence = 'HIGH';
        priceActionSignal = 'CANH_MUA';
      } else if (prev2Bearish && prev.close < prev.open && isBearish &&
                 close < prev.close && prev.close < prev2.close &&
                 bodyPercent >= 50 && lowerWickPercent <= 25) {
        patternName = 'Three Black Crows (Ba Con Quạ Đen Giảm Giá)';
        patternType = 'BEARISH';
        patternCategory = 'TRIPLE';
        sentiment = 'Ba nến đỏ giảm liên tiếp với thân nến dài xả hàng mạnh mẽ, phe Bán hoàn toàn làm chủ thị trường.';
        confidence = 'HIGH';
        priceActionSignal = 'CANH_BAN';
      }
    }

    // 2. Double patterns
    if (patternCategory === 'SINGLE' && prev) {
      const prevBullish = prev.close > prev.open;
      const prevBearish = prev.close < prev.open;
      const prevBody = Math.abs(prev.close - prev.open);

      if (prevBearish && isBullish && body > prevBody && close >= prev.open && open <= prev.close) {
        patternName = 'Bullish Engulfing (Nhấn Chìm Tăng)';
        patternType = 'BULLISH';
        patternCategory = 'DOUBLE';
        sentiment = `Nến tăng xanh nuốt trọn hoàn toàn thân nến giảm phía trước (${bodyPips} pips vs ${Number((prevBody / pipSize).toFixed(1))} pips), lực bắt đáy áp đảo cực mạnh.`;
        confidence = 'HIGH';
        priceActionSignal = 'CANH_MUA';
      } else if (prevBullish && isBearish && body > prevBody && close <= prev.open && open >= prev.close) {
        patternName = 'Bearish Engulfing (Nhấn Chìm Giảm)';
        patternType = 'BEARISH';
        patternCategory = 'DOUBLE';
        sentiment = `Nến giảm đỏ nuốt trọn hoàn toàn thân nến tăng phía trước (${bodyPips} pips vs ${Number((prevBody / pipSize).toFixed(1))} pips), phe Bán chốt lời xả mạnh.`;
        confidence = 'HIGH';
        priceActionSignal = 'CANH_BAN';
      } else if (prevBearish && isBullish && open < prev.low && close > (prev.open + prev.close) / 2) {
        patternName = 'Piercing Line (Đường Xuyên Tăng)';
        patternType = 'BULLISH';
        patternCategory = 'DOUBLE';
        sentiment = 'Nến mở cửa dưới đáy nến trước nhưng đảo chiều tăng vượt qua mức 50% thân nến giảm trước.';
        confidence = 'HIGH';
        priceActionSignal = 'CANH_MUA';
      } else if (prevBullish && isBearish && open > prev.high && close < (prev.open + prev.close) / 2) {
        patternName = 'Dark Cloud Cover (Mây Đen Bao Phủ)';
        patternType = 'BEARISH';
        patternCategory = 'DOUBLE';
        sentiment = 'Nến mở cửa vượt đỉnh nến trước nhưng bị bán tháo giảm sâu đâm thủng 50% thân nến tăng trước.';
        confidence = 'HIGH';
        priceActionSignal = 'CANH_BAN';
      } else if (prevBearish && isBullish && body < prevBody * 0.6 && open > prev.close && close < prev.open) {
        patternName = 'Bullish Harami (Mẹ Bồng Con Tăng)';
        patternType = 'BULLISH';
        patternCategory = 'DOUBLE';
        sentiment = 'Nến tăng nhỏ nằm lọt hoàn toàn bên trong thân nến giảm trước, nhịp giảm đã chững lại và đảo chiều.';
        confidence = 'MEDIUM';
        priceActionSignal = 'CANH_MUA';
      } else if (prevBullish && isBearish && body < prevBody * 0.6 && open < prev.close && close > prev.open) {
        patternName = 'Bearish Harami (Mẹ Bồng Con Giảm)';
        patternType = 'BEARISH';
        patternCategory = 'DOUBLE';
        sentiment = 'Nến giảm nhỏ nằm lọt hoàn toàn bên trong thân nến tăng trước, đà tăng bị ngưng trệ cảnh báo đảo chiều.';
        confidence = 'MEDIUM';
        priceActionSignal = 'CANH_BAN';
      } else if (Math.abs(low - prev.low) <= pipSize * 1.5 && lowerWickPercent >= 35) {
        patternName = 'Tweezer Bottom (Đáy Nhíp Song Đáy)';
        patternType = 'BULLISH';
        patternCategory = 'DOUBLE';
        sentiment = `Hai nến liên tiếp từ chối cùng một mức đáy (${low.toFixed(2)}), tạo thành hỗ trợ đôi rất cứng.`;
        confidence = 'HIGH';
        priceActionSignal = 'CANH_MUA';
      } else if (Math.abs(high - prev.high) <= pipSize * 1.5 && upperWickPercent >= 35) {
        patternName = 'Tweezer Top (Đỉnh Nhíp Song Đỉnh)';
        patternType = 'BEARISH';
        patternCategory = 'DOUBLE';
        sentiment = `Hai nến liên tiếp từ chối cùng một mức đỉnh (${high.toFixed(2)}), tạo thành kháng cự đôi rất cứng.`;
        confidence = 'HIGH';
        priceActionSignal = 'CANH_BAN';
      }
    }

    // 3. Single patterns
    if (patternCategory === 'SINGLE' && patternName.includes('Tiêu Chuẩn')) {
      if (isDoji) {
        if (lowerWickPercent >= 60 && upperWickPercent <= 15) {
          patternName = 'Dragonfly Doji (Doji Chuồn Chuồn)';
          patternType = 'BULLISH';
          sentiment = `Thân nến mở/đóng sát đỉnh, râu dưới dài chiếm ${lowerWickPercent}% (${lowerWickPips} pips) từ chối giá thấp cực mạnh.`;
          confidence = 'HIGH';
          priceActionSignal = 'CANH_MUA';
        } else if (upperWickPercent >= 60 && lowerWickPercent <= 15) {
          patternName = 'Gravestone Doji (Doji Bia Mộ)';
          patternType = 'BEARISH';
          sentiment = `Thân nến mở/đóng sát đáy, râu trên dài chiếm ${upperWickPercent}% (${upperWickPips} pips) từ chối giá cao cực mạnh.`;
          confidence = 'HIGH';
          priceActionSignal = 'CANH_BAN';
        } else if (upperWickPercent >= 35 && lowerWickPercent >= 35) {
          patternName = 'Long-Legged Doji (Doji Chân Dài)';
          patternType = 'NEUTRAL';
          sentiment = `Râu trên (${upperWickPips} pips) và râu dưới (${lowerWickPips} pips) đều dài cân đối, thị trường giằng co quyết liệt.`;
          confidence = 'MEDIUM';
          priceActionSignal = 'THEO_DOI';
        } else {
          patternName = 'Standard Doji (Doji Sao Lưỡng Lự)';
          patternType = 'NEUTRAL';
          sentiment = 'Giá mở cửa và đóng cửa gần như trùng khớp, phe Mua và Bán đang ở thế cân bằng tuyệt đối.';
          confidence = 'MEDIUM';
          priceActionSignal = 'THEO_DOI';
        }
      } else if (lowerWick >= body * 2.0 && upperWickPercent <= 20 && bodyPercent <= 35) {
        patternName = 'Hammer (Nến Búa Đảo Chiều Tăng)';
        patternType = 'BULLISH';
        sentiment = `Râu nến dưới dài gấp ${(lowerWick / body).toFixed(1)} lần thân nến (${lowerWickPips} pips), phe Mua hấp thụ toàn bộ lực bán ép giá lên cao.`;
        confidence = 'HIGH';
        priceActionSignal = 'CANH_MUA';
      } else if (upperWick >= body * 2.0 && lowerWickPercent <= 20 && bodyPercent <= 35) {
        patternName = 'Shooting Star (Sao Băng Đảo Chiều Giảm)';
        patternType = 'BEARISH';
        sentiment = `Râu nến trên dài gấp ${(upperWick / body).toFixed(1)} lần thân nến (${upperWickPips} pips), phe Bán xả hàng từ chối vùng giá đỉnh.`;
        confidence = 'HIGH';
        priceActionSignal = 'CANH_BAN';
      } else if (isBullish && upperWick >= body * 1.8 && lowerWickPercent <= 20) {
        patternName = 'Inverted Hammer (Nến Búa Ngược)';
        patternType = 'BULLISH';
        sentiment = `Râu trên dài ${upperWickPips} pips thể hiện phe Mua đã nỗ lực tấn công vùng giá cao, báo hiệu lực đảo chiều tăng.`;
        confidence = 'MEDIUM';
        priceActionSignal = 'CANH_MUA';
      } else if (isBearish && lowerWick >= body * 1.8 && upperWickPercent <= 20) {
        patternName = 'Hanging Man (Nến Người Treo Cổ)';
        patternType = 'BEARISH';
        sentiment = `Thân nến đỏ với râu dưới dài ${lowerWickPips} pips, xuất hiện phe Bán bắt đầu kiểm tra lực xả hàng.`;
        confidence = 'MEDIUM';
        priceActionSignal = 'CANH_BAN';
      } else if (bodyPercent >= 80) {
        if (isBullish) {
          patternName = 'Bullish Marubozu (Marubozu Tăng Cường Lực)';
          patternType = 'BULLISH';
          sentiment = `Thân nến xanh siêu dài chiếm ${bodyPercent}% biên độ (${bodyPips} pips), phe Mua áp đảo toàn diện.`;
          confidence = 'HIGH';
          priceActionSignal = 'CANH_MUA';
        } else {
          patternName = 'Bearish Marubozu (Marubozu Giảm Cường Lực)';
          patternType = 'BEARISH';
          sentiment = `Thân nến đỏ siêu dài chiếm ${bodyPercent}% biên độ (${bodyPips} pips), phe Bán bán tháo không thương tiếc.`;
          confidence = 'HIGH';
          priceActionSignal = 'CANH_BAN';
        }
      } else if (lowerWickPercent >= 55) {
        patternName = 'Bullish Pin Bar (Từ Chối Giá Giảm)';
        patternType = 'BULLISH';
        sentiment = `Râu dưới dài chiếm ${lowerWickPercent}% nến (${lowerWickPips} pips), lực cầu đẩy giá từ chối đáy mạnh mẽ.`;
        confidence = 'HIGH';
        priceActionSignal = 'CANH_MUA';
      } else if (upperWickPercent >= 55) {
        patternName = 'Bearish Pin Bar (Từ Chối Giá Tăng)';
        patternType = 'BEARISH';
        sentiment = `Râu trên dài chiếm ${upperWickPercent}% nến (${upperWickPips} pips), lực cung ép giá từ chối đỉnh mạnh mẽ.`;
        confidence = 'HIGH';
        priceActionSignal = 'CANH_BAN';
      } else if (bodyPercent <= 35 && upperWickPercent >= 25 && lowerWickPercent >= 25) {
        patternName = 'Spinning Top (Nến Con Xoay Phân Vân)';
        patternType = 'NEUTRAL';
        sentiment = `Thân nến nhỏ (${bodyPips} pips) kẹp giữa 2 râu nến dài cân bằng, thị trường đang tạm nghỉ phân vân xu hướng tiếp theo.`;
        confidence = 'MEDIUM';
        priceActionSignal = 'THEO_DOI';
      }
    }

    return {
      timeframe,
      symbol,
      candleTime: current.time,
      closeTimeFormatted,
      patternName,
      patternType,
      patternCategory,
      sentiment,
      confidence,
      priceActionSignal,
      metrics: {
        open,
        high,
        low,
        close,
        range,
        rangePips,
        body,
        bodyPips,
        upperWick,
        upperWickPips,
        lowerWick,
        lowerWickPips,
        bodyPercent,
        upperWickPercent,
        lowerWickPercent,
        direction
      }
    };
  }
}
