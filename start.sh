#!/usr/bin/env bash

# Exness Pro Auto Trading Bot - Startup Script
echo "=========================================================="
echo "  🚀 KHỞI ĐỘNG EXNESS PRO AUTO TRADING BOT (TYPESCRIPT)  "
echo "=========================================================="

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"

cleanup() {
  echo ""
  echo "🛑 Đang tắt các tiến trình..."
  local pids=$(jobs -p)
  if [ -n "$pids" ]; then
    kill $pids 2>/dev/null
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

# 2. Tự động cài đặt dependencies nếu chưa có
if [ ! -d "$ROOT_DIR/node_modules" ]; then
  echo "📦 Đang cài đặt thư viện gốc (Root)..."
  (cd "$ROOT_DIR" && npm install)
fi

if [ ! -d "$ROOT_DIR/backend/node_modules" ]; then
  echo "📦 Đang cài đặt thư viện Backend..."
  (cd "$ROOT_DIR/backend" && npm install)
fi

if [ ! -d "$ROOT_DIR/frontend/node_modules" ]; then
  echo "📦 Đang cài đặt thư viện Frontend..."
  (cd "$ROOT_DIR/frontend" && npm install)
fi

# 3. Tự động dọn dẹp port 3001 nếu tiến trình cũ chưa thoát
PORT_3001_PID=$(lsof -ti :3001 2>/dev/null)
if [ -n "$PORT_3001_PID" ]; then
  echo "⚠️ Phát hiện tiến trình cũ ($PORT_3001_PID) đang chiếm cổng 3001. Đang giải phóng..."
  kill -9 $PORT_3001_PID 2>/dev/null
  sleep 1
fi

# 4. Tự động dọn dẹp port 5173 nếu có
PORT_5173_PID=$(lsof -ti :5173 2>/dev/null)
if [ -n "$PORT_5173_PID" ]; then
  echo "⚠️ Phát hiện tiến trình cũ ($PORT_5173_PID) đang chiếm cổng 5173. Đang giải phóng..."
  kill -9 $PORT_5173_PID 2>/dev/null
  sleep 1
fi

# 5. Khởi động Backend (Port 3001)
echo "📡 Đang khởi động Backend (Node.js/Express + WebSockets)..."
cd "$ROOT_DIR/backend"
npm run dev &
BACKEND_PID=$!

# Đợi backend khởi tạo
sleep 2

# 2. Khởi động Frontend (Port 5173)
echo "💻 Đang khởi động Frontend (React + Vite + TypeScript)..."
cd "$ROOT_DIR/frontend"
npm run dev &
FRONTEND_PID=$!

echo ""
echo "✅ HỆ THỐNG ĐÃ SẴN SÀNG:"
echo "👉 Giao diện Web:  http://localhost:5173"
echo "👉 Backend API:     http://localhost:3001"
echo "👉 WebSocket Hub:   ws://localhost:3001/ws"
echo ""
echo "Nhấn [Ctrl + C] để dừng toàn bộ hệ thống."

wait
