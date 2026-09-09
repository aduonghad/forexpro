import { Router, Request, Response } from 'express';
import { botEngine } from '../services/botEngine.js';
import { CONFIG } from '../config.js';

const router = Router();

// GET webhook configuration guide & status
router.get('/config', (req: Request, res: Response) => {
  const host = req.get('host') || `localhost:${CONFIG.PORT}`;
  const protocol = req.protocol;
  const webhookUrl = `${protocol}://${host}/api/webhook/tradingview`;

  const samplePineScriptJson = {
    secret: CONFIG.WEBHOOK_SECRET,
    ticker: '{{ticker}}',
    action: 'BUY',
    lot: 0.1,
    sl_pips: 25,
    tp_pips: 50,
    message: 'Chiến lược RSI Crossover kích hoạt Mua'
  };

  res.json({
    success: true,
    webhookUrl,
    secret: CONFIG.WEBHOOK_SECRET,
    samplePayload: samplePineScriptJson,
    instructions: [
      '1. Trên TradingView, tạo một Alert (Cảnh báo) mới cho cặp tiền bất kỳ (ví dụ: XAUUSD).',
      '2. Trong mục "Notifications", tích chọn "Webhook URL" và dán link Webhook trên.',
      '3. Trong mục "Message", dán đoạn JSON mẫu bên dưới (thay đổi BUY thành SELL hoặc cấu hình sl_pips, tp_pips theo ý muốn).',
      '4. Nhấn Save. Khi có tín hiệu, TradingView sẽ tự động gửi webhook tới hệ thống này để vào lệnh!'
    ]
  });
});

// POST receive TradingView webhook
router.post('/tradingview', (req: Request, res: Response) => {
  try {
    const { secret, ticker, action, lot, sl_pips, tp_pips, message } = req.body;

    if (!ticker || !action) {
      res.status(400).json({ success: false, error: 'Thiếu trường ticker hoặc action (BUY/SELL/CLOSE)' });
      return;
    }

    const result = botEngine.handleTradingViewWebhook({
      secret,
      ticker,
      action,
      lot,
      sl_pips,
      tp_pips,
      message
    });

    res.json(result);
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

export default router;
