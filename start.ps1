# Exness Pro Auto Trading Bot - Windows PowerShell Startup Script
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  🚀 KHỞI ĐỘNG EXNESS PRO AUTO TRADING BOT (WINDOWS)  " -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📡 Đang khởi động Backend + Frontend..." -ForegroundColor Green
Write-Host "👉 Web App:      http://localhost:5173" -ForegroundColor Cyan
Write-Host "👉 Backend API:  http://localhost:3001" -ForegroundColor Cyan
Write-Host "👉 WebSocket:    ws://localhost:3001/ws" -ForegroundColor Cyan
Write-Host ""
npm start
