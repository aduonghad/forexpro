import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { marketData, TickData } from '../services/marketData.js';
import { mt5Bridge } from '../services/mt5Bridge.js';
import { botEngine } from '../services/botEngine.js';
import { db } from '../db/database.js';
import { BotMessage, TradingSymbol, Timeframe } from '../types/index.js';

interface ClientMeta {
  userId?: string;
  symbol?: TradingSymbol;
  timeframe?: Timeframe;
}

export class WebSocketHub {
  private wss: WebSocketServer | null = null;
  private clients: Set<WebSocket> = new Set();
  private clientMeta = new Map<WebSocket, ClientMeta>();

  init(server: Server) {
    this.wss = new WebSocketServer({ server, path: '/ws' });

    this.wss.on('error', (err: any) => {
      // Avoid unhandled error crash if port is in use
      if (err.code === 'EADDRINUSE') return;
      console.error('WebSocket Server error:', err);
    });

    this.wss.on('connection', async (ws: WebSocket) => {
      this.clients.add(ws);
      this.clientMeta.set(ws, { symbol: 'XAUUSD', timeframe: 'M1' });

      try {
        // Send initial state payload immediately upon connection
        const [openOrders, messages, rules] = await Promise.all([
          db.getOpenOrders(),
          db.getBotMessages(100),
          db.getAllRules()
        ]);

        const initPayload = {
          type: 'INIT_STATE',
          data: {
            account: mt5Bridge.getAccountInfo(),
            openOrders,
            messages,
            rules
          }
        };
        ws.send(JSON.stringify(initPayload));
      } catch (err) {
        console.error('Lỗi nạp INIT_STATE cho WebSocket client:', err);
      }

      ws.on('message', (data: string) => {
        try {
          const parsed = JSON.parse(data.toString());
          this.handleClientMessage(ws, parsed);
        } catch (err) {
          console.error('Lỗi phân tích WebSocket message từ client:', err);
        }
      });

      ws.on('close', () => {
        this.clients.delete(ws);
        this.clientMeta.delete(ws);
      });

      ws.on('error', (err) => {
        console.error('WebSocket client error:', err);
        this.clients.delete(ws);
        this.clientMeta.delete(ws);
      });
    });

    // Broadcast market ticks
    marketData.on('tick', (tick: TickData) => {
      const snap = marketData.getIndicators(tick.symbol, 'M1');
      this.broadcast({
        type: 'TICK',
        data: {
          tick,
          indicators: snap,
          account: mt5Bridge.getAccountInfo(),
          openOrders: mt5Bridge.getOpenOrders()
        }
      });
    });

    // Broadcast bot messages with user privacy routing
    botEngine.on('botMessage', (msg: BotMessage) => {
      const payload = JSON.stringify({
        type: 'BOT_MESSAGE',
        data: msg
      });

      this.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          const meta = this.clientMeta.get(client);
          // If message belongs to a specific user, deliver only to that user's client(s)
          if (msg.userId) {
            if (meta?.userId === msg.userId) {
              client.send(payload);
            }
          } else {
            // Global broadcast message (e.g. general market alert without target user)
            client.send(payload);
          }
        }
      });
    });

    // Broadcast order opened
    mt5Bridge.on('orderOpened', (order) => {
      this.broadcast({
        type: 'ORDER_OPENED',
        data: {
          order,
          account: mt5Bridge.getAccountInfo()
        }
      });
    });

    // Broadcast order closed
    mt5Bridge.on('orderClosed', (data) => {
      this.broadcast({
        type: 'ORDER_CLOSED',
        data: {
          ...data,
          account: mt5Bridge.getAccountInfo()
        }
      });
    });
  }

  private handleClientMessage(ws: WebSocket, msg: any) {
    switch (msg.action) {
      case 'SELECT_VIEW': {
        const prev = this.clientMeta.get(ws) || {};
        const updated: ClientMeta = {
          userId: msg.userId || prev.userId,
          symbol: (msg.symbol || prev.symbol || 'XAUUSD') as TradingSymbol,
          timeframe: (msg.timeframe || prev.timeframe || 'M1') as Timeframe
        };
        this.clientMeta.set(ws, updated);

        if (updated.symbol && updated.timeframe) {
          botEngine.setActiveSymbolAndTimeframe(updated.symbol, updated.timeframe);
        }

        // Return user's private message history (max 100) if userId is authenticated
        if (updated.userId) {
          db.getBotMessages(100, updated.userId).then(messages => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({
                type: 'INIT_MESSAGES',
                data: messages
              }));
            }
          }).catch(err => console.error('Lỗi gửi INIT_MESSAGES:', err.message));
        }
        break;
      }

      case 'CHAT': {
        if (msg.text) {
          const meta = this.clientMeta.get(ws);
          const userId = msg.userId || meta?.userId;
          const symbol = msg.symbol || meta?.symbol;
          const timeframe = msg.timeframe || meta?.timeframe;
          botEngine.handleUserChatMessage(msg.text, userId, symbol, timeframe).catch(err => console.error(err.message));
        }
        break;
      }

      case 'TOGGLE_BOT':
        botEngine.setBotActive(Boolean(msg.active));
        this.broadcast({
          type: 'ACCOUNT_UPDATE',
          data: mt5Bridge.getAccountInfo()
        });
        break;
      case 'CLOSE_ORDER':
        if (msg.orderId) {
          mt5Bridge.closeOrder(msg.orderId, 'Đóng thủ công từ Dashboard').catch(err => console.error(err.message));
        }
        break;
      case 'CLOSE_ALL':
        mt5Bridge.closeAllOrders('Đóng tất cả từ Dashboard').catch(err => console.error(err.message));
        break;
      case 'GET_INDICATORS':
        if (msg.symbol) {
          const indicators = marketData.getIndicators(msg.symbol, msg.timeframe || 'M1');
          ws.send(JSON.stringify({
            type: 'INDICATOR_DATA',
            data: { symbol: msg.symbol, indicators }
          }));
        }
        break;
    }
  }

  getActiveViewers(symbol: TradingSymbol, timeframe: Timeframe): string[] {
    const userIds = new Set<string>();
    this.clientMeta.forEach(meta => {
      if (meta.userId && meta.symbol === symbol && meta.timeframe === timeframe) {
        userIds.add(meta.userId);
      }
    });
    return Array.from(userIds);
  }

  broadcast(payload: any) {
    const json = JSON.stringify(payload);
    this.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(json);
      }
    });
  }
}

export const wsHub = new WebSocketHub();
