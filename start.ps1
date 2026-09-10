# Exness Pro Auto Trading Bot - Windows PowerShell Startup Script
$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  🚀 KHỞI ĐỘNG EXNESS PRO AUTO TRADING BOT (WINDOWS)  " -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Kiểm tra Node.js
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "❌ LỖI: Chưa cài đặt Node.js!" -ForegroundColor Red
    Write-Host "👉 Vui lòng tải và cài đặt Node.js LTS từ: https://nodejs.org" -ForegroundColor Yellow
    Pause
    Exit 1
}

# 2. Tự động giải phóng cổng 3001 và 5173 nếu đang bận
$ports = @(3001, 5173)
foreach ($port in $ports) {
    try {
        $conns = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
        if ($conns) {
            foreach ($c in $conns) {
                Write-Host "⚠️ Đang giải phóng port $port (PID: $($c.OwningProcess))..." -ForegroundColor Yellow
                Stop-Process -Id $c.OwningProcess -Force -ErrorAction SilentlyContinue
            }
        }
    } catch {}
}

# 3. Tự động cài đặt dependencies nếu chưa có
if (-not (Test-Path "node_modules")) {
    Write-Host "📦 Đang cài đặt thư viện gốc (Root dependencies)..." -ForegroundColor Cyan
    npm install
}

if (-not (Test-Path "backend/node_modules")) {
    Write-Host "📦 Đang cài đặt thư viện Backend..." -ForegroundColor Cyan
    Push-Location backend
    npm install
    Pop-Location
}

if (-not (Test-Path "frontend/node_modules")) {
    Write-Host "📦 Đang cài đặt thư viện Frontend..." -ForegroundColor Cyan
    Push-Location frontend
    npm install
    Pop-Location
}

Write-Host ""
Write-Host "📡 Đang khởi động Backend + Frontend..." -ForegroundColor Green
Write-Host "👉 Web App:      http://localhost:5173" -ForegroundColor Cyan
Write-Host "👉 Backend API:  http://localhost:3001" -ForegroundColor Cyan
Write-Host "👉 WebSocket:    ws://localhost:3001/ws" -ForegroundColor Cyan
Write-Host ""
Write-Host "Nhấn [Ctrl + C] để dừng hệ thống." -ForegroundColor Yellow
Write-Host ""

npm start
