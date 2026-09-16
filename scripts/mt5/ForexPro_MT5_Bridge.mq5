//+------------------------------------------------------------------+
//|                                     ForexPro_MT5_Bridge.mq5      |
//|                        Copyright 2026, ForexPro Automated Trader |
//|                                   https://github.com/forexpro    |
//+------------------------------------------------------------------+
#property copyright "ForexPro Automated Trader"
#property link      "http://127.0.0.1:3001"
#property version   "1.10"
#property description "EA phát trực tiếp nến & tick từ MT5 Exness về Web App ForexPro qua WebRequest"
#property strict

//--- INPUT PARAMETERS
input group "=== Cấu hình Máy Chủ Web App ==="
input string   InpServerUrl       = "http://127.0.0.1:3001"; // Địa chỉ Backend ForexPro
input string   InpSecretToken     = "exness-pro-secret-2026"; // Mã bảo mật Webhook/API
input int      InpSendIntervalMs  = 500;                     // Chu kỳ gửi tick tối thiểu (ms)
input int      InpHistoryBars     = 150;                     // Số nến lịch sử gửi ban đầu

input group "=== Cặp Tiền Giám Sát ==="
input bool     InpSendAllSymbols  = true;                    // Gửi tất cả 5 cặp chính
input string   InpCustomSymbols   = "XAUUSD,EURUSD,GBPUSD,USDJPY,BTCUSD"; // Danh sách cặp tiền

//--- GLOBAL VARIABLES
ulong  g_lastSendTickTime = 0;
bool   g_historySent = false;
string g_symbols[];
int    g_symbolCount = 0;
ulong  g_lastStatusPrint = 0;
bool   g_connectedLogged = false;

// Khai báo trước hàm đồng bộ nến lịch sử
void SyncHistory();

//+------------------------------------------------------------------+
//| Cắt chuỗi danh sách cặp tiền thành mảng                          |
//+------------------------------------------------------------------+
void ParseSymbols()
{
   if(InpSendAllSymbols)
   {
      ArrayResize(g_symbols, 5);
      g_symbols[0] = "XAUUSD";
      g_symbols[1] = "EURUSD";
      g_symbols[2] = "GBPUSD";
      g_symbols[3] = "USDJPY";
      g_symbols[4] = "BTCUSD";
      g_symbolCount = 5;
   }
   else
   {
      ushort u_sep = StringGetCharacter(",", 0);
      g_symbolCount = StringSplit(InpCustomSymbols, u_sep, g_symbols);
      for(int i = 0; i < g_symbolCount; i++)
      {
         StringTrimLeft(g_symbols[i]);
         StringTrimRight(g_symbols[i]);
         StringToUpper(g_symbols[i]);
      }
   }

   // Đảm bảo tất cả cặp tiền được chọn trong Market Watch
   for(int i = 0; i < g_symbolCount; i++)
   {
      SymbolSelect(g_symbols[i], true);
   }
}

//+------------------------------------------------------------------+
//| Gửi HTTP POST request bằng WebRequest của MT5                    |
//+------------------------------------------------------------------+
bool SendHttpRequest(string endpoint, string jsonPayload)
{
   string url = InpServerUrl + endpoint;
   string headers = "Content-Type: application/json\r\n" +
                    "x-webhook-secret: " + InpSecretToken + "\r\n";
   char postData[];
   char result[];
   string resultHeaders;
   
   StringToCharArray(jsonPayload, postData, 0, WHOLE_ARRAY, CP_UTF8);
   int dataLen = ArraySize(postData);
   if(dataLen > 0 && postData[dataLen - 1] == 0)
   {
      ArrayResize(postData, dataLen - 1);
   }

   ResetLastError();
   int res = WebRequest("POST", url, headers, 3000, postData, result, resultHeaders);
   
   if(res == -1)
   {
      int err = GetLastError();
      if(err == 4014) // ERR_FUNCTION_NOT_ALLOWED
      {
         Print("❌ LỖI 4014: Chưa bật WebRequest cho URL: ", InpServerUrl);
         Print("👉 Vào Tools -> Options -> Expert Advisors -> Tích 'Allow WebRequest for listed URL' -> Thêm chính xác: ", InpServerUrl);
      }
      else
      {
         Print("⚠️ Lỗi WebRequest: ", err, " khi gửi đến ", url);
      }
      return false;
   }

   if(!g_connectedLogged && res >= 200 && res < 300)
   {
      g_connectedLogged = true;
      Print("🎉 [ForexPro MT5 Bridge] Đã kết nối và truyền dữ liệu thành công tới: ", InpServerUrl);
   }

   // Tự động kiểm tra Handshake: Nếu server vừa restart và yêu cầu nạp lại nến lịch sử
   if(endpoint == "/api/mt5/tick" && res >= 200 && res < 300 && ArraySize(result) > 0)
   {
      string respStr = CharArrayToString(result, 0, WHOLE_ARRAY, CP_UTF8);
      if(StringFind(respStr, "\"needHistory\":true") >= 0 || StringFind(respStr, "\"needHistory\": true") >= 0)
      {
         static ulong s_lastAutoSyncTime = 0;
         ulong nowMs = GetTickCount64();
         if(nowMs - s_lastAutoSyncTime > 10000)
         {
            s_lastAutoSyncTime = nowMs;
            Print("🔄 [ForexPro MT5 Bridge] Server Web App vừa mở lại, đang tự động nạp nến lịch sử sang server...");
            SyncHistory();
         }
      }
   }

   return (res >= 200 && res < 300);
}

//+------------------------------------------------------------------+
//| Chuyển enum ENUM_TIMEFRAMES sang chuỗi chuẩn (M1, M5, M15, H1)   |
//+------------------------------------------------------------------+
string TimeframeToString(ENUM_TIMEFRAMES tf)
{
   switch(tf)
   {
      case PERIOD_M1:  return "M1";
      case PERIOD_M5:  return "M5";
      case PERIOD_M15: return "M15";
      case PERIOD_H1:  return "H1";
      default:         return "M1";
   }
}

//+------------------------------------------------------------------+
//| Nạp và gửi lịch sử nến cho một cặp tiền và khung thời gian       |
//+------------------------------------------------------------------+
bool SendCandleHistory(string symbol, ENUM_TIMEFRAMES tf)
{
   SymbolSelect(symbol, true);

   MqlRates rates[];
   ArraySetAsSeries(rates, true);
   
   int copied = CopyRates(symbol, tf, 0, InpHistoryBars, rates);
   if(copied <= 0)
   {
      return false;
   }

   string tfStr = TimeframeToString(tf);
   string json = "{\"symbol\":\"" + symbol + "\",\"timeframe\":\"" + tfStr + "\",\"candles\":[";
   
   // Đảo ngược rates để nến cũ nằm trước, nến mới nhất nằm cuối
   for(int i = copied - 1; i >= 0; i--)
   {
      string barJson = StringFormat(
         "{\"time\":%I64d,\"open\":%.5f,\"high\":%.5f,\"low\":%.5f,\"close\":%.5f,\"volume\":%I64d}",
         (long)rates[i].time,
         rates[i].open,
         rates[i].high,
         rates[i].low,
         rates[i].close,
         rates[i].tick_volume
      );
      json += barJson;
      if(i > 0) json += ",";
   }
   json += "]}";

   return SendHttpRequest("/api/mt5/candles", json);
}

//+------------------------------------------------------------------+
//| Gửi tick giá hiện tại và nến M1 đang hình thành                  |
//+------------------------------------------------------------------+
void SendLiveTick(string symbol)
{
   SymbolSelect(symbol, true);

   MqlTick lastTick;
   if(!SymbolInfoTick(symbol, lastTick)) return;

   int digits = (int)SymbolInfoInteger(symbol, SYMBOL_DIGITS);
   double spread = (lastTick.ask - lastTick.bid);
   
   // Lấy nến M1 hiện tại đang chạy
   MqlRates currentBar[];
   ArraySetAsSeries(currentBar, true);
   string candleJson = "null";
   
   if(CopyRates(symbol, PERIOD_M1, 0, 1, currentBar) > 0)
   {
      candleJson = StringFormat(
         "{\"time\":%I64d,\"open\":%.*f,\"high\":%.*f,\"low\":%.*f,\"close\":%.*f,\"volume\":%I64d}",
         (long)currentBar[0].time,
         digits, currentBar[0].open,
         digits, currentBar[0].high,
         digits, currentBar[0].low,
         digits, currentBar[0].close,
         currentBar[0].tick_volume
      );
   }

   string payload = StringFormat(
      "{\"symbol\":\"%s\",\"bid\":%.*f,\"ask\":%.*f,\"spread\":%.*f,\"time\":%I64d,\"candle\":%s}",
      symbol,
      digits, lastTick.bid,
      digits, lastTick.ask,
      digits, spread,
      (long)lastTick.time,
      candleJson
   );

   SendHttpRequest("/api/mt5/tick", payload);
}

//+------------------------------------------------------------------+
//| Đồng bộ nến lịch sử sang Web App                                 |
//+------------------------------------------------------------------+
void SyncHistory()
{
   Print("📦 [ForexPro MT5 Bridge] Bắt đầu đồng bộ nến lịch sử sang Web App...");
   ENUM_TIMEFRAMES tfs[] = { PERIOD_M1, PERIOD_M5, PERIOD_M15, PERIOD_H1 };
   
   bool okChart = true;
   for(int t = 0; t < ArraySize(tfs); t++)
   {
      if(!SendCandleHistory(_Symbol, tfs[t])) okChart = false;
   }

   for(int s = 0; s < g_symbolCount; s++)
   {
      string sym = g_symbols[s];
      if(sym == _Symbol) continue;
      for(int t = 0; t < ArraySize(tfs); t++)
      {
         SendCandleHistory(sym, tfs[t]);
      }
   }

   if(okChart)
   {
      g_historySent = true;
      Print("✅ [ForexPro MT5 Bridge] Hoàn tất nạp nến lịch sử Exness sang Web App!");
   }
}

//+------------------------------------------------------------------+
//| Khởi tạo EA                                                      |
//+------------------------------------------------------------------+
int OnInit()
{
   ParseSymbols();
   g_historySent = false;
   g_connectedLogged = false;
   g_lastStatusPrint = 0;

   Print("🚀 [ForexPro MT5 Bridge v1.10] Đang khởi động...");
   Print("📡 Kết nối tới: ", InpServerUrl);
   Print("📊 Số cặp theo dõi: ", g_symbolCount, " (", _Symbol, ")");

   // Hủy timer cũ và tạo timer 1 giây (đảm bảo 100% chạy mượt trên cả macOS Wine & Windows)
   EventKillTimer();
   EventSetTimer(1);
   
   return(INIT_SUCCEEDED);
}

//+------------------------------------------------------------------+
//| Huỷ EA                                                           |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
{
   EventKillTimer();
   Print("🛑 [ForexPro MT5 Bridge] Đã dừng.");
}

//+------------------------------------------------------------------+
//| Sự kiện Tick                                                     |
//+------------------------------------------------------------------+
void OnTick()
{
   // Đồng bộ nến lịch sử nếu chưa gửi
   if(!g_historySent)
   {
      SyncHistory();
   }

   ulong now = GetTickCount64();
   if(now - g_lastSendTickTime < (ulong)InpSendIntervalMs) return;
   g_lastSendTickTime = now;

   // Gửi tick của cặp tiền trên chart hiện tại
   SendLiveTick(_Symbol);
}

//+------------------------------------------------------------------+
//| Sự kiện Bộ đếm thời gian (Timer) - Chạy định kỳ 1 giây           |
//+------------------------------------------------------------------+
void OnTimer()
{
   // 1. Đồng bộ lịch sử nến nếu chưa gửi
   if(!g_historySent)
   {
      SyncHistory();
   }

   // 2. Gửi tick định kỳ cho tất cả các cặp tiền đã cấu hình
   for(int s = 0; s < g_symbolCount; s++)
   {
      SendLiveTick(g_symbols[s]);
   }

   // 3. Log trạng thái mỗi 10 giây trên MT5 Experts
   ulong now = GetTickCount64();
   if(now - g_lastStatusPrint > 10000)
   {
      g_lastStatusPrint = now;
      MqlTick tick;
      if(SymbolInfoTick(_Symbol, tick))
      {
         Print("🟢 [ForexPro MT5 Bridge] Đang phát trực tiếp: ", _Symbol, " Bid=", tick.bid, " Ask=", tick.ask);
      }
   }
}
//+------------------------------------------------------------------+
