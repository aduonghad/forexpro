import { AccountInfo, BotMessage, Order, AutomationRule, TradingSymbol, Candle, IndicatorSnapshot } from '../types';

type MessageHandler = (data: any) => void;

class WebSocketClient {
  private ws: WebSocket | null = null;
  private listeners: Map<string, Set<MessageHandler>> = new Map();
  private reconnectTimer: any = null;
  private isConnected: boolean = false;

  constructor() {
    this.connect();
  }

  connect() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // When developing on vite port 5173, point to backend port 3001 or vite proxy
    const host = window.location.port === '5173' ? `${window.location.hostname}:3001` : window.location.host;
    const url = `${protocol}//${host}/ws`;

    try {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        this.isConnected = true;
        this.emit('connection', { connected: true });
        if (this.reconnectTimer) {
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = null;
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type) {
            this.emit(payload.type, payload.data);
          }
        } catch (err) {
          console.error('Error parsing WebSocket message:', err);
        }
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        this.emit('connection', { connected: false });
        this.scheduleReconnect();
      };

      this.ws.onerror = (err) => {
        console.warn('WebSocket connection warning:', err);
        this.ws?.close();
      };
    } catch (err) {
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (!this.reconnectTimer) {
      this.reconnectTimer = setTimeout(() => {
        this.reconnectTimer = null;
        this.connect();
      }, 3000);
    }
  }

  on(event: string, handler: MessageHandler) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);
    return () => this.off(event, handler);
  }

  off(event: string, handler: MessageHandler) {
    this.listeners.get(event)?.delete(handler);
  }

  private emit(event: string, data: any) {
    this.listeners.get(event)?.forEach(handler => {
      try {
        handler(data);
      } catch (err) {
        console.error(`Error in listener for ${event}:`, err);
      }
    });
  }

  send(action: string, payload: Record<string, any> = {}) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ action, ...payload }));
    }
  }

  selectView(symbol: TradingSymbol, timeframe: string, userId?: string) {
    this.send('SELECT_VIEW', { symbol, timeframe, userId });
  }

  sendChat(text: string, meta?: { userId?: string; symbol?: TradingSymbol; timeframe?: string }) {
    this.send('CHAT', { text, ...meta });
  }

  toggleBot(active: boolean) {
    this.send('TOGGLE_BOT', { active });
  }

  closeOrder(orderId: string) {
    this.send('CLOSE_ORDER', { orderId });
  }

  closeAllOrders() {
    this.send('CLOSE_ALL');
  }

  isOnline(): boolean {
    return this.isConnected;
  }
}

export const wsClient = new WebSocketClient();
