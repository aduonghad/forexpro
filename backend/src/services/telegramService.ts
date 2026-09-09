import { CONFIG } from '../config.js';
import { db } from '../db/database.js';
import { botEngine } from './botEngine.js';
import { BotMessage } from '../types/index.js';

export class TelegramService {
  private botToken: string = '';
  private chatId: string = '';
  private notificationsEnabled: boolean = true;
  private isPolling: boolean = false;
  private lastUpdateId: number = 0;
  private pollingTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.reloadCredentials();
  }

  /**
   * Reload credentials from config or database settings
   */
  public reloadCredentials(): void {
    const dbToken = db.getSetting('telegramBotToken');
    const dbChatId = db.getSetting('telegramChatId');
    const dbActive = db.getSetting('telegramAlertsActive');

    this.botToken = (dbToken && dbToken.trim()) ? dbToken.trim() : (CONFIG.TELEGRAM.BOT_TOKEN || '');
    this.chatId = (dbChatId && dbChatId.trim()) ? dbChatId.trim() : (CONFIG.TELEGRAM.CHAT_ID || '');
    this.notificationsEnabled = dbActive !== 'false';
  }

  public setNotificationsEnabled(enabled: boolean): boolean {
    this.notificationsEnabled = enabled;
    db.setSetting('telegramAlertsActive', enabled ? 'true' : 'false');
    return this.notificationsEnabled;
  }

  public isNotificationsEnabled(): boolean {
    return this.notificationsEnabled;
  }

  /**
   * Update credentials dynamically and restart polling
   */
  public setCredentials(token: string, chatId: string): void {
    this.botToken = token.trim();
    this.chatId = chatId.trim();

    db.setSetting('telegramBotToken', this.botToken);
    db.setSetting('telegramChatId', this.chatId);

    if (this.isPolling) {
      this.stopPolling();
    }
    if (this.botToken && this.chatId) {
      this.startPolling();
      this.sendTelegramMessage('🟢 *ForexPro Bot*: Đã kết nối thành công với Telegram! Các thông báo giao dịch sẽ được cập nhật tại đây.');
    }
  }

  public getCredentials(): { botToken: string; chatId: string; active: boolean; notificationsEnabled: boolean } {
    return {
      botToken: this.botToken ? `${this.botToken.substring(0, 8)}...` : '',
      chatId: this.chatId,
      active: Boolean(this.botToken && this.chatId),
      notificationsEnabled: this.notificationsEnabled
    };
  }

  /**
   * Initialize service and listen to botEngine events
   */
  public init(): void {
    this.reloadCredentials();

    // Hook into botEngine messages
    botEngine.on('botMessage', (msg: BotMessage) => {
      this.handleBotEngineMessage(msg);
    });

    if (this.botToken && this.chatId) {
      console.log('🤖 Telegram Bot configured. Starting Telegram polling & notification service...');
      this.startPolling();
    } else {
      console.log('ℹ️ Telegram Bot Token / Chat ID chưa được cấu hình. (Đặt TELEGRAM_BOT_TOKEN & TELEGRAM_CHAT_ID trong .env để kích hoạt)');
    }
  }

  /**
   * Forward BotMessage from engine to Telegram
   */
  private handleBotEngineMessage(msg: BotMessage): void {
    if (!this.notificationsEnabled || !this.botToken || !this.chatId) return;

    // Only forward signals for the currently selected active symbol & timeframe
    if (msg.type === 'SIGNAL') {
      const activeSymbol = botEngine.getActiveSymbol();
      const activeTimeframe = botEngine.getActiveTimeframe();

      if (msg.symbol && msg.symbol !== activeSymbol) return;
      if (msg.data?.timeframe && msg.data?.timeframe !== activeTimeframe) return;
    }

    let icon = '📢';
    switch (msg.type) {
      case 'SIGNAL': icon = '🎯'; break;
      case 'ORDER': icon = '⚡'; break;
      case 'CLOSE': icon = '🏁'; break;
      case 'ALERT': icon = '🚨'; break;
      case 'ANALYSIS': icon = '📊'; break;
      case 'INFO': icon = 'ℹ️'; break;
      case 'USER': icon = '💬'; break;
    }

    const text = `${icon} *${this.escapeMarkdown(msg.title)}*\n\n${this.escapeMarkdown(msg.message)}`;
    this.sendTelegramMessage(text, 'MarkdownV2');
  }

  /**
   * Send text message to configured Telegram Chat ID
   */
  public async sendTelegramMessage(text: string, parseMode: 'MarkdownV2' | 'HTML' | 'Markdown' = 'Markdown'): Promise<boolean> {
    if (!this.botToken || !this.chatId) return false;

    const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: this.chatId,
          text: text,
          parse_mode: parseMode,
          disable_web_page_preview: true
        })
      });

      const resData = await response.json() as any;
      if (!resData.ok) {
        // Fallback to plain text if markdown formatting failed
        if (parseMode) {
          return this.sendTelegramMessage(text.replace(/[*_`[\]()]/g, ''), 'HTML');
        }
        console.error('❌ Error sending Telegram message:', resData.description);
        return false;
      }
      return true;
    } catch (err: any) {
      console.error('❌ Failed to communicate with Telegram API:', err?.message || err);
      return false;
    }
  }

  /**
   * Start polling loop for Telegram incoming messages
   */
  private startPolling(): void {
    if (this.isPolling) return;
    this.isPolling = true;
    this.pollUpdates();
  }

  private stopPolling(): void {
    this.isPolling = false;
    if (this.pollingTimer) {
      clearTimeout(this.pollingTimer);
      this.pollingTimer = null;
    }
  }

  private async pollUpdates(): Promise<void> {
    if (!this.isPolling || !this.botToken) return;

    try {
      const url = `https://api.telegram.org/bot${this.botToken}/getUpdates?offset=${this.lastUpdateId + 1}&timeout=5`;
      const response = await fetch(url, { method: 'GET' });
      const data = await response.json() as any;

      if (data && data.ok && Array.isArray(data.result)) {
        for (const update of data.result) {
          this.lastUpdateId = Math.max(this.lastUpdateId, update.update_id);
          if (update.message && update.message.text) {
            await this.processIncomingTelegramMessage(update.message);
          }
        }
      }
    } catch (err: any) {
      // Ignore routine network timeout / fetch errors during polling
    } finally {
      if (this.isPolling) {
        this.pollingTimer = setTimeout(() => this.pollUpdates(), 2000);
      }
    }
  }

  /**
   * Process user input sent from Telegram
   */
  private async processIncomingTelegramMessage(message: any): Promise<void> {
    const fromChatId = String(message.chat.id);
    const userText = String(message.text).trim();

    // Verify chat ID match (security check)
    if (this.chatId && fromChatId !== this.chatId) {
      console.warn(`⚠️ Received Telegram message from unauthorized chat ID: ${fromChatId}`);
      return;
    }

    console.log(`💬 Telegram command received: "${userText}" from ${message.from?.first_name || 'User'}`);

    if (userText === '/start' || userText === '/help' || userText.toLowerCase() === 'trợ giúp') {
      const helpMsg = 
`🤖 *HƯỚNG DẪN ĐIỀU KHIỂN FOREXPRO BOT*

Bạn có thể gõ các câu lệnh sau trực tiếp trên Telegram:
• *bật bot* : Kích hoạt hệ thống quét tín hiệu
• *tắt bot* : Tạm dừng hệ thống quét
• *trạng thái* : Xem trạng thái lệnh & tài khoản
• *phân tích gold* / *phân tích eurusd* : Xem phân tích TopDown kỹ thuật
• *đóng hết lệnh* : Đóng tất cả các vị thế đang mở khẩn cấp`;
      await this.sendTelegramMessage(helpMsg, 'Markdown');
      return;
    }

    // Process user command using botEngine's NLP/command router
    const reply = botEngine.handleUserChatMessage(userText);
    
    // Send response back to Telegram
    const responseText = `🤖 *Phản hồi ForexPro*:\n\n${reply.message}`;
    await this.sendTelegramMessage(responseText, 'Markdown');
  }

  private escapeMarkdown(text: string): string {
    return text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&');
  }
}

export const telegramService = new TelegramService();
