#!/usr/bin/env bash

# Exness Pro Auto Trading Bot - Startup Script for macOS / Linux
echo "=========================================================="
echo "  🚀 KHỞI ĐỘNG EXNESS PRO AUTO TRADING BOT (TYPESCRIPT)  "
echo "=========================================================="

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"

cleanup() {
  echo ""
  echo "🛑 Đang tắt các tiến trình..."
  if [ -n "$BACKEND_PID" ]; then
    kill "$BACKEND_PID" 2>/dev/null
  fi
  if [ -n "$FRONTEND_PID" ]; then
    kill "$FRONTEND_PID" 2>/dev/null
  fi
  local pids=$(jobs -p)
  if [ -n "$pids" ]; then
    kill $pids 2>/dev/null
  fi
  # Dọn dẹp cổng nếu còn tiến trình sót lại
  local lingering=$(lsof -ti :3001,:5173 2>/dev/null)
  if [ -n "$lingering" ]; then
    kill -9 $lingering 2>/dev/null
  fi
  exit 0
}

trap cleanup SIGINT SIGTERM EXIT

# 1. Kiểm tra Node.js
if ! command -v node &> /dev/null; then
  echo "❌ [LỖI] Chưa tìm thấy Node.js trên máy!"
  echo "👉 Vui lòng cài đặt Node.js từ https://nodejs.org"
  exit 1
fi
echo "✅ Node.js: $(node -v)"

# 2. Kiểm tra MongoDB
if ! lsof -i :27017 &>/dev/null && ! nc -z 127.0.0.1 27017 &>/dev/null; then
  echo "⚠️ MongoDB chưa chạy trên cổng 27017."
  if command -v brew &>/dev/null; then
    echo "🔄 Đang thử khởi động MongoDB qua brew services..."
    brew services start mongodb-community 2>/dev/null || brew services start mongodb-community@7.0 2>/dev/null
    sleep 2
  fi
  if ! lsof -i :27017 &>/dev/null && ! nc -z 127.0.0.1 27017 &>/dev/null; then
    echo "⚠️ [Cảnh báo] Chưa kết nối được MongoDB tại mongodb://127.0.0.1:27017"
    echo "👉 Hãy đảm bảo MongoDB đang chạy: brew services start mongodb/brew/mongodb-community"
  else
    echo "✅ MongoDB đã sẵn sàng trên cổng 27017."
  fi
else
  echo "✅ Cơ sở dữ liệu: MongoDB Server đang hoạt động trên cổng 27017."
fi

# 3. Tự động cài đặt/kiểm tra dependencies
if [ ! -d "$ROOT_DIR/node_modules" ] || [ ! -f "$ROOT_DIR/node_modules/.bin/concurrently" ]; then
  echo "📦 Đang cài đặt thư viện gốc (Root)..."
  (cd "$ROOT_DIR" && npm install)
fi

if [ ! -d "$ROOT_DIR/backend/node_modules" ] || [ ! -d "$ROOT_DIR/backend/node_modules/mongoose" ]; then
  echo "📦 Đang cài đặt thư viện Backend..."
  (cd "$ROOT_DIR/backend" && npm install)
fi

if [ ! -d "$ROOT_DIR/frontend/node_modules" ] || [ ! -d "$ROOT_DIR/frontend/node_modules/lightweight-charts" ]; then
  echo "📦 Đang cài đặt thư viện Frontend..."
  (cd "$ROOT_DIR/frontend" && npm install)
fi

# 4. Tự động dọn dẹp port 3001 nếu tiến trình cũ chưa thoát
PORT_3001_PID=$(lsof -ti :3001 2>/dev/null)
if [ -n "$PORT_3001_PID" ]; then
  echo "⚠️ Phát hiện tiến trình ($PORT_3001_PID) đang chiếm cổng 3001. Đang giải phóng..."
  kill -9 $PORT_3001_PID 2>/dev/null
  sleep 1
fi

# 5. Tự động dọn dẹp port 5173 nếu có
PORT_5173_PID=$(lsof -ti :5173 2>/dev/null)
if [ -n "$PORT_5173_PID" ]; then
  echo "⚠️ Phát hiện tiến trình ($PORT_5173_PID) đang chiếm cổng 5173. Đang giải phóng..."
  kill -9 $PORT_5173_PID 2>/dev/null
  sleep 1
fi

# 6. Khởi động Backend (Port 3001)
echo "📡 Đang khởi động Backend (Node.js/Express + WebSockets)..."
cd "$ROOT_DIR/backend"
npm run dev &
BACKEND_PID=$!

# Đợi backend khởi tạo
sleep 2

# 7. Khởi động Frontend (Port 5173)
echo "💻 Đang khởi động Frontend (React + Vite + TypeScript)..."
cd "$ROOT_DIR/frontend"
npm run dev &
FRONTEND_PID=$!

echo ""
echo "✅ HỆ THỐNG ĐÃ SẴN SÀNG TRÊN MAC:"
echo "👉 Giao diện Web:  http://localhost:5173"
echo "👉 Backend API:     http://localhost:3001"
echo "👉 WebSocket Hub:   ws://localhost:3001/ws"
echo ""
echo "Nhấn [Ctrl + C] để dừng toàn bộ hệ thống."

wait
