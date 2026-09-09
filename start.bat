@echo off
chcp 65001 > nul
echo ==========================================================
echo   🚀 KHỞI ĐỘNG EXNESS PRO AUTO TRADING BOT (WINDOWS)  
echo ==========================================================
echo.
echo 📡 Đang khởi động Backend + Frontend qua Concurrently...
echo 👉 Web App:      http://localhost:5173
echo 👉 Backend API:  http://localhost:3001
echo 👉 WebSocket:    ws://localhost:3001/ws
echo.
echo Nhấn Ctrl+C để dừng hệ thống.
echo.
npm start
pause
