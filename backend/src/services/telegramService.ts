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
    this.botToken = CONFIG.TELEGRAM.BOT_TOKEN || '';
    this.chatId = CONFIG.TELEGRAM.CHAT_ID || '';
  }

  /**
   * Reload credentials from config or database settings
   */
  public async reloadCredentials(): Promise<void> {
    const dbToken = await db.getSetting('telegramBotToken');
    const dbChatId = await db.getSetting('telegramChatId');
    const dbActive = await db.getSetting('telegramAlertsActive');

    this.botToken = (dbToken && dbToken.trim()) ? dbToken.trim() : (CONFIG.TELEGRAM.BOT_TOKEN || '');
    this.chatId = (dbChatId && dbChatId.trim()) ? dbChatId.trim() : (CONFIG.TELEGRAM.CHAT_ID || '');
    this.notificationsEnabled = dbActive !== 'false';
  }

  public async setNotificationsEnabled(enabled: boolean): Promise<boolean> {
    this.notificationsEnabled = enabled;
    await db.setSetting('telegramAlertsActive', enabled ? 'true' : 'false');
    return this.notificationsEnabled;
  }

  public isNotificationsEnabled(): boolean {
    return this.notificationsEnabled;
  }

  /**
   * Update credentials dynamically and restart polling
   */
  public async setCredentials(token: string, chatId: string): Promise<void> {
    this.botToken = token.trim();
    this.chatId = chatId.trim();

    await db.setSetting('telegramBotToken', this.botToken);
    await db.setSetting('telegramChatId', this.chatId);

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
  public async init(): Promise<void> {
    await this.reloadCredentials();

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

    // Only forward signals & analysis for the currently selected active symbol & timeframe
    if (msg.type === 'SIGNAL' || msg.type === 'ANALYSIS') {
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
    const reply = await botEngine.handleUserChatMessage(userText);
    
    // Send response back to Telegram
    const responseText = `🤖 *Phản hồi ForexPro*:\n\n${reply.message}`;
    await this.sendTelegramMessage(responseText, 'Markdown');
  }

  /**
   * Send notification directly to a specific user's Telegram chatbot (for Pro/Ultra users)
   */
  public async sendNotificationToUser(userId: string, title: string, message: string): Promise<boolean> {
    try {
      const user = await db.findUserById(userId);
      if (!user) return false;

      // Check plan eligibility and configured telegram
      if (user.plan !== 'pro' && user.plan !== 'ultra') return false;
      if (!user.telegramBotToken || !user.telegramChatId || user.telegramAlertsActive === false) return false;

      const url = `https://api.telegram.org/bot${user.telegramBotToken.trim()}/sendMessage`;
      const text = `🤖 *${title}*\n\n${message}`;

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: user.telegramChatId.trim(),
          text,
          parse_mode: 'Markdown',
          disable_web_page_preview: true
        })
      });

      const resData = await res.json() as any;
      if (!resData.ok) {
        console.warn(`⚠️ Gửi Telegram thất bại tới user ${userId}:`, resData.description);
        return false;
      }
      return true;
    } catch (err: any) {
      console.error(`❌ Lỗi gửi Telegram tới user ${userId}:`, err?.message || err);
      return false;
    }
  }

  /**
   * Send test message using custom credentials (for settings preview / validation)
   */
  public async sendTestMessageToCredentials(token: string, chatId: string): Promise<{ success: boolean; message: string }> {
    try {
      const url = `https://api.telegram.org/bot${token.trim()}/sendMessage`;
      const text = `🔔 *ForexPro Telegram Bot*: Kiểm tra kết nối thành công!\n\nBot của bạn đã được kết nối với tài khoản ForexPro và sẽ nhận thông báo tự động mỗi khi vào/đóng lệnh.`;

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId.trim(),
          text,
          parse_mode: 'Markdown'
        })
      });

      const data = await res.json() as any;
      if (data.ok) {
        return { success: true, message: 'Gửi tin nhắn thử nghiệm thành công! Vui lòng kiểm tra Telegram của bạn.' };
      } else {
        return { success: false, message: `Lỗi từ Telegram API: ${data.description || 'Không thể gửi'}` };
      }
    } catch (err: any) {
      return { success: false, message: `Lỗi kết nối tới Telegram: ${err?.message || 'Không thể kết nối'}` };
    }
  }

  private escapeMarkdown(text: string): string {
    return text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&');
  }
}

export const telegramService = new TelegramService();
