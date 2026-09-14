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
        // Send initial state payload immediately upon connection (isolated by userId)
        const meta = this.clientMeta.get(ws);
        const [openOrders, messages, rules] = await Promise.all([
          meta?.userId ? db.getOpenOrders(meta.userId) : Promise.resolve([]),
          db.getBotMessages(100, meta?.userId),
          db.getRulesByUser(meta?.userId)
        ]);

        const initPayload = {
          type: 'INIT_STATE',
          data: {
            account: mt5Bridge.getAccountInfo(meta?.userId),
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

    // Broadcast market ticks with user-isolated openOrders and account metrics
    marketData.on('tick', (tick: TickData) => {
      const snap = marketData.getIndicators(tick.symbol, 'M1');
      const allOpenOrders = mt5Bridge.getOpenOrders();

      this.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          const meta = this.clientMeta.get(client);
          // Chỉ gửi openOrders và account tương ứng với user đã đăng nhập
          const userOpenOrders = meta?.userId
            ? allOpenOrders.filter(o => o.userId === meta.userId)
            : [];
          const userAccount = mt5Bridge.getAccountInfo(meta?.userId);

          client.send(JSON.stringify({
            type: 'TICK',
            data: {
              tick,
              indicators: snap,
              account: userAccount,
              openOrders: userOpenOrders
            }
          }));
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

    // Broadcast order opened (only to the owner user)
    mt5Bridge.on('orderOpened', (order) => {
      this.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          const meta = this.clientMeta.get(client);
          if (order.userId && meta?.userId === order.userId) {
            client.send(JSON.stringify({
              type: 'ORDER_OPENED',
              data: {
                order,
                account: mt5Bridge.getAccountInfo(meta?.userId)
              }
            }));
          }
        }
      });
    });

    // Broadcast order closed (only to the owner user)
    mt5Bridge.on('orderClosed', (data) => {
      this.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          const meta = this.clientMeta.get(client);
          if (data.order?.userId && meta?.userId === data.order.userId) {
            client.send(JSON.stringify({
              type: 'ORDER_CLOSED',
              data: {
                ...data,
                account: mt5Bridge.getAccountInfo(meta?.userId)
              }
            }));
          }
        }
      });
    });
  }

  private handleClientMessage(ws: WebSocket, msg: any) {
    switch (msg.action) {
      case 'SELECT_VIEW': {
        const prev = this.clientMeta.get(ws) || {};
        const isLoggingOut = msg.userId === null || msg.userId === '';
        const currentUserId = isLoggingOut ? undefined : (msg.userId || prev.userId);

        const updated: ClientMeta = {
          userId: currentUserId,
          symbol: (msg.symbol || prev.symbol || 'XAUUSD') as TradingSymbol,
          timeframe: (msg.timeframe || prev.timeframe || 'M1') as Timeframe
        };
        this.clientMeta.set(ws, updated);

        if (updated.symbol && updated.timeframe) {
          botEngine.setActiveSymbolAndTimeframe(updated.symbol, updated.timeframe);
        }

        // Gửi lại trạng thái riêng biệt (lệnh, tin nhắn, rules) tương ứng với user
        Promise.all([
          updated.userId ? db.getOpenOrders(updated.userId) : Promise.resolve([]),
          db.getBotMessages(100, updated.userId),
          db.getRulesByUser(updated.userId)
        ]).then(([openOrders, messages, rules]) => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
              type: 'INIT_STATE',
              data: {
                account: mt5Bridge.getAccountInfo(updated.userId),
                openOrders,
                messages,
                rules
              }
            }));
          }
        }).catch(err => console.error('Lỗi nạp lại INIT_STATE:', err.message));
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

      case 'TOGGLE_BOT': {
        const meta = this.clientMeta.get(ws);
        if (!meta?.userId) {
          ws.send(JSON.stringify({ type: 'ERROR', message: 'Vui lòng đăng nhập để điều khiển bot.' }));
          break;
        }
        botEngine.setBotActive(Boolean(msg.active));
        this.clients.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            const m = this.clientMeta.get(client);
            client.send(JSON.stringify({
              type: 'ACCOUNT_UPDATE',
              data: mt5Bridge.getAccountInfo(m?.userId)
            }));
          }
        });
        break;
      }
      case 'CLOSE_ORDER': {
        const meta = this.clientMeta.get(ws);
        if (!meta?.userId) {
          ws.send(JSON.stringify({ type: 'ERROR', message: 'Vui lòng đăng nhập để đóng lệnh.' }));
          break;
        }
        if (msg.orderId) {
          mt5Bridge.closeOrder(msg.orderId, 'Đóng thủ công từ Dashboard').catch(err => console.error(err.message));
        }
        break;
      }
      case 'CLOSE_ALL': {
        const meta = this.clientMeta.get(ws);
        if (!meta?.userId) {
          ws.send(JSON.stringify({ type: 'ERROR', message: 'Vui lòng đăng nhập để thao tác.' }));
          break;
        }
        mt5Bridge.closeAllOrders('Đóng tất cả từ Dashboard', meta.userId).catch(err => console.error(err.message));
        break;
      }
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

  sendToUser(userId: string, payload: any) {
    const json = typeof payload === 'string' ? payload : JSON.stringify(payload);
    this.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        const meta = this.clientMeta.get(client);
        if (meta?.userId === userId) {
          client.send(json);
        }
      }
    });
  }
}

export const wsHub = new WebSocketHub();
