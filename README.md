# EXNESS PRO AUTO TRADING BOT (FULL-STACK TYPESCRIPT)

Hệ thống Web App tự động giao dịch Forex & Crypto trên sàn **Exness**, kết nối **MetaTrader 5 (MT5)** và **TradingView**, được xây dựng bằng **100% TypeScript** với giao diện Dark Mode Fintech hiện đại bậc nhất.

---

## 🌟 Các Tính Năng Nổi Bật

### 1. Back-end (Node.js + Express + WebSocket + Bot Trading Engine)
- **Cơ chế đọc dữ liệu thị trường**: Quét nến và phát sinh tick thời gian thực cho các cặp:
  - `XAU/USD` (Vàng)
  - `EUR/USD`
  - `GBP/USD`
  - `USD/JPY`
  - `BTC/USD`
- **Bộ tính toán chỉ báo kỹ thuật thời gian thực**:
  - RSI (Chu kỳ 14 theo thuật toán Wilder)
  - EMA 20 & EMA 50
  - Bollinger Bands (20, độ lệch chuẩn 2)
- **Bot Engine tự động**:
  - Quét liên tục các yêu cầu tự động (Automation Rules) đang bật.
  - Tự động so khớp điều kiện: RSI quá mua/quá bán, Giao cắt EMA, Chạm biên Bollinger Bands.
  - Tự động vào lệnh MUA (BUY) hoặc BÁN (SELL) theo đúng khối lượng (Lot), Cắt lỗ (SL), Chốt lời (TP) và Trailing Stop.
  - Tích hợp **TradingView Webhook Alert**: Lắng nghe tín hiệu PineScript từ TradingView và khớp lệnh tức thì.
  - Tích hợp **Paper Trading chuẩn sàn Exness**: Quản lý đòn bẩy 1:500, Spread, Margin, Balance $10,000, Equity, PnL nhảy từng tick.
- **WebSocket Hub 2 chiều**: Truyền dữ liệu giá, nến, lệnh và luồng tin nhắn chat bot trực tiếp đến trình duyệt.

### 2. Front-end (React 18 + Vite + TypeScript + Tailwind CSS)
- **Trang chủ (Dashboard)**:
  - **Bên trái**: Biểu đồ nến tương tác cao từ **TradingView Lightweight Charts** chính hãng, kèm các đường EMA 20, EMA 50, dải Bollinger Bands, biểu đồ phụ RSI 14 bên dưới, các điểm vào lệnh (Buy/Sell arrows) gắn trực tiếp trên nến, cùng bảng quản lý lệnh đang mở (Open Positions) với nút đóng lệnh khẩn cấp.
  - **Bên phải**: **Thanh Chat Bot thông minh**, hiển thị luồng thông báo thời gian thực về phân tích thị trường, lý do kích hoạt lệnh, kết quả chốt lời/cắt lỗ; hỗ trợ gõ lệnh chat điều khiển bot (`bật bot`, `tắt bot`, `đóng hết lệnh`, `phân tích vàng`...).
- **Các yêu cầu tự động (Automations)**:
  - Hiển thị danh sách chiến lược dạng Card trực quan kèm tỷ lệ thắng (Win Rate) và lợi nhuận.
  - Đầy đủ tính năng **CRUD (Thêm, Sửa, Xoá, Bật/Tắt)** yêu cầu tự động.
  - Hộp thoại cấu hình trực quan với các mẫu chiến lược gợi ý có sẵn.
  - Hướng dẫn cấu hình Webhook TradingView 1-click kèm cú pháp JSON mẫu.

---

## 🚀 Hướng Dẫn Khởi Chạy (Cross-Platform: Windows & macOS)

### Cách 1: Khởi chạy 1-Click (Khuyên dùng)

- **Trên Windows**:
  - Nhấp đúp chuột vào file `start.bat`
  - Hoặc mở PowerShell trong thư mục dự án và gõ:
    ```powershell
    .\start.ps1
    ```
  *(Script trên Windows sẽ tự động kiểm tra Node.js, giải phóng cổng 3001/5173 và tự động cài đặt các dependencies còn thiếu).*

- **Trên macOS / Linux**:
  - Chạy lệnh:
    ```bash
    ./start.sh
    ```
  *(Script trên macOS sẽ tự động giải phóng port, kiểm tra môi trường và khởi động song song cả 2 tiến trình).*

---

### Cách 2: Khởi chạy chuẩn bằng npm (Hoạt động trên cả Windows & Mac)

Từ thư mục gốc dự án:
```bash
# Cài đặt toàn bộ thư viện (nếu mới clone về)
npm run install:all

# Khởi động cả Backend & Frontend
npm start
```

---

### Cách 3: Chạy từng phần riêng biệt (Dành cho lập trình viên)

#### Chạy Backend (Cổng 3001)
```bash
cd backend
npm run dev
```

#### Chạy Frontend (Cổng 5173)
```bash
cd frontend
npm run dev
```

Mở trình duyệt truy cập: **`http://localhost:5173`**

---

## 📡 Cấu Hình TradingView Webhook

1. Mở biểu đồ bất kỳ trên TradingView (ví dụ: `XAUUSD`).
2. Nhấn `Alt + A` để tạo Alert.
3. Trong tab **Notifications**, tích chọn **Webhook URL** và điền:
   ```
   http://localhost:3001/api/webhook/tradingview
   ```
4. Trong tab **Settings**, mục **Message**, dán mẫu JSON:
   ```json
   {
     "secret": "exness-pro-secret-2026",
     "ticker": "XAUUSD",
     "action": "BUY",
     "lot": 0.1,
     "sl_pips": 25,
     "tp_pips": 50,
     "message": "Tín hiệu MUA từ TradingView PineScript"
   }
   ```
5. Nhấn **Save**. Bot sẽ tự động nhận lệnh và thông báo lên thanh chat!

---

## 📁 Cấu Trúc Thư Mục

```
forexpro/
├── start.sh                  # Script 1-click chạy toàn bộ hệ thống
├── package.json              # Quản lý script tổng
├── backend/
│   ├── src/
│   │   ├── index.ts          # Express Server + WebSocket
│   │   ├── config.ts         # Cấu hình Exness & Thông số thị trường
│   │   ├── db/database.ts    # SQLite lưu trữ Rules, Orders, Chat logs
│   │   ├── services/
│   │   │   ├── indicators.ts # Tính RSI, EMA, Bollinger Bands
│   │   │   ├── marketData.ts # Stream tick & nến đa khung thời gian
│   │   │   ├── mt5Bridge.ts  # Cầu nối Exness MT5 & Simulator
│   │   │   └── botEngine.ts  # Bộ máy tự động quét quy tắc & vào lệnh
│   │   ├── routes/           # REST API: rules, trades, chart, webhook, bot
│   │   ├── websocket/wsHub.ts# WebSocket Hub thời gian thực
│   │   └── types/index.ts    # TypeScript Data Models
│   └── package.json
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── Navbar.tsx     # Menu, số dư Exness, Master Bot Toggle
    │   │   ├── chart/         # TradingView Lightweight Candlestick Chart
    │   │   ├── bot/BotChat.tsx# Thanh Chat Bot trực quan bên phải
    │   │   ├── positions/     # Bảng quản lý lệnh đang mở
    │   │   └── rules/         # Quản lý CRUD Yêu cầu tự động
    │   ├── pages/
    │   │   ├── DashboardPage.tsx
    │   │   └── AutomationsPage.tsx
    │   ├── services/          # API & WebSocket client
    │   └── App.tsx
    └── package.json
```
