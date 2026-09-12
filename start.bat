@echo off
chcp 65001 > nul
setlocal enabledelayedexpansion

echo ==========================================================
echo   🚀 KHỞI ĐỘNG EXNESS PRO AUTO TRADING BOT (WINDOWS)  
echo ==========================================================
echo.

:: 1. Kiểm tra Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [LỖI] Chưa tìm thấy Node.js!
    echo 👉 Vui lòng tải và cài đặt Node.js LTS từ: https://nodejs.org
    echo.
    pause
    exit /b 1
)

:: 2. Kiểm tra và giải phóng cổng 3001 nếu đang bị chiếm
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3001 ^| findstr LISTENING 2^>nul') do (
    if not "%%a"=="" if not "%%a"=="0" (
        echo ⚠️ Phát hiện tiến trình [PID: %%a] đang chiếm cổng 3001. Đang giải phóng...
        taskkill /F /PID %%a >nul 2>nul
    )
)

:: 3. Kiểm tra và giải phóng cổng 5173 nếu đang bị chiếm
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5173 ^| findstr LISTENING 2^>nul') do (
    if not "%%a"=="" if not "%%a"=="0" (
        echo ⚠️ Phát hiện tiến trình [PID: %%a] đang chiếm cổng 5173. Đang giải phóng...
        taskkill /F /PID %%a >nul 2>nul
    )
)

:: 4. Tự động cài đặt dependencies nếu chưa có
if not exist "node_modules" (
    echo 📦 Đang cài đặt thư viện gốc [Root dependencies]...
    call npm install
)

if not exist "backend\node_modules" (
    echo 📦 Đang cài đặt thư viện Backend...
    call npm --prefix backend install
)

if not exist "frontend\node_modules" (
    echo 📦 Đang cài đặt thư viện Frontend...
    call npm --prefix frontend install
)

echo.
echo 📡 Đang khởi động Backend + Frontend qua Concurrently...
echo 👉 Web App:      http://localhost:5173
echo 👉 Backend API:  http://localhost:3001
echo 👉 WebSocket:    ws://localhost:3001/ws
echo.
echo Nhấn [Ctrl + C] để dừng hệ thống.
echo.

call npm start
pause
