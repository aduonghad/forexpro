import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { marketData, TickData } from '../services/marketData.js';
import { mt5Bridge } from '../services/mt5Bridge.js';
import { botEngine } from '../services/botEngine.js';
import { db } from '../db/database.js';
import { BotMessage } from '../types/index.js';

export class WebSocketHub {
  private wss: WebSocketServer | null = null;
  private clients: Set<WebSocket> = new Set();

  init(server: Server) {
    this.wss = new WebSocketServer({ server, path: '/ws' });

    this.wss.on('error', (err: any) => {
      // Avoid unhandled error crash if port is in use
      if (err.code === 'EADDRINUSE') return;
      console.error('WebSocket Server error:', err);
    });

    this.wss.on('connection', async (ws: WebSocket) => {
      this.clients.add(ws);

      try {
        // Send initial state payload immediately upon connection
        const [openOrders, messages, rules] = await Promise.all([
          db.getOpenOrders(),
          db.getBotMessages(40),
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
      });

      ws.on('error', (err) => {
        console.error('WebSocket client error:', err);
        this.clients.delete(ws);
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

    // Broadcast bot messages
    botEngine.on('botMessage', (msg: BotMessage) => {
      this.broadcast({
        type: 'BOT_MESSAGE',
        data: msg
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
      case 'CHAT':
        if (msg.text) {
          botEngine.handleUserChatMessage(msg.text).catch(err => console.error(err.message));
        }
        break;
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

  broadcast(payload: any) {
    const raw = JSON.stringify(payload);
    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(raw);
      }
    }
  }
}

export const wsHub = new WebSocketHub();
