import http from 'http';
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';
import express from 'express';
import cors from 'cors';
import { CONFIG } from './config.js';
import { wsHub } from './websocket/wsHub.js';
import rulesRouter from './routes/rules.js';
import tradesRouter from './routes/trades.js';
import chartRouter from './routes/chart.js';
import webhookRouter from './routes/webhook.js';
import botRouter from './routes/bot.js';
import patternsRouter from './routes/patterns.js';
import telegramRouter from './routes/telegram.js';
import indicatorsRouter from './routes/indicators.js';
import signalsRouter from './routes/signals.js';
import { telegramService } from './services/telegramService.js';

const app = express();
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/rules', rulesRouter);
app.use('/api/trades', tradesRouter);
app.use('/api/chart', chartRouter);
app.use('/api/webhook', webhookRouter);
app.use('/api/bot', botRouter);
app.use('/api/patterns', patternsRouter);
app.use('/api/telegram', telegramRouter);
app.use('/api/indicators', indicatorsRouter);
app.use('/api/signals', signalsRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    version: '1.0.0',
    platform: 'Exness Pro Auto Trading Bot',
    timestamp: Date.now()
  });
});

// Serve built frontend statically if available
const candidateDist1 = path.resolve(process.cwd(), '../frontend/dist');
const candidateDist2 = path.resolve(process.cwd(), 'frontend/dist');
const candidateDist3 = typeof __dirname !== 'undefined' ? path.resolve(__dirname, '../../frontend/dist') : null;
const distPath = fs.existsSync(candidateDist1)
  ? candidateDist1
  : (fs.existsSync(candidateDist2)
      ? candidateDist2
      : (candidateDist3 && fs.existsSync(candidateDist3) ? candidateDist3 : null));

if (distPath) {
  app.use(express.static(distPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/ws')) {
      return next();
    }
    res.sendFile(path.join(distPath, 'index.html'));
  });
} else {
  // In development mode when frontend is run separately on port 5173
  app.get(['/', '/admin', '/admin/*'], (req, res) => {
    const targetUrl = `http://localhost:5173${req.originalUrl}`;
    res.send(`
      <!DOCTYPE html>
      <html lang="vi">
        <head>
          <meta charset="utf-8" />
          <title>Exness Pro - Chuyển Hướng Phát Triển</title>
          <meta http-equiv="refresh" content="0; url=${targetUrl}">
          <style>
            body {
              background: #080d1a;
              color: #f1f5f9;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
            }
            .card {
              background: #0f172a;
              border: 1px solid #1e293b;
              padding: 2rem;
              border-radius: 1rem;
              text-align: center;
              max-width: 420px;
              box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
            }
            h2 { color: #38bdf8; margin-top: 0; }
            a {
              display: inline-block;
              margin-top: 1rem;
              padding: 0.6rem 1.2rem;
              background: #0284c7;
              color: white;
              text-decoration: none;
              border-radius: 0.5rem;
              font-weight: bold;
            }
          </style>
        </head>
        <body>
          <div class="card">
            <h2>⚡ Cổng Phát Triển Frontend</h2>
            <p>Đang tự động chuyển bạn sang Vite Dev Server tại:</p>
            <p><code style="color: #22d3ee; font-size: 1.1rem;">${targetUrl}</code></p>
            <a href="${targetUrl}">Bấm vào đây nếu trình duyệt không tự chuyển</a>
          </div>
        </body>
      </html>
    `);
  });
}

const server = http.createServer(app);

// Initialize WebSocket hub on the HTTP server
wsHub.init(server);

// Helper dọn dẹp port tự động trên cả Windows và macOS/Linux
function cleanPortSync(port: number) {
  try {
    if (process.platform === 'win32') {
      const output = execSync(`netstat -ano | findstr :${port} | findstr LISTENING`, { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
      if (output) {
        const lines = output.split('\n');
        for (const line of lines) {
          const parts = line.trim().split(/\s+/);
          const pidStr = parts[parts.length - 1];
          const p = parseInt(pidStr, 10);
          if (p && p !== process.pid) {
            try { execSync(`taskkill /F /PID ${p}`, { stdio: 'ignore' }); } catch {}
          }
        }
      }
    } else {
      const pids = execSync(`lsof -ti :${port} 2>/dev/null`, { encoding: 'utf-8' }).trim();
      if (pids) {
        for (const pid of pids.split('\n')) {
          const p = parseInt(pid, 10);
          if (p && p !== process.pid) {
            try { process.kill(p, 'SIGKILL'); } catch {}
          }
        }
      }
    }
  } catch {}
}

// Dọn dẹp port trước khi bind
cleanPortSync(CONFIG.PORT);

let listenRetries = 0;
server.on('error', (err: any) => {
  if (err.code === 'EADDRINUSE') {
    if (listenRetries < 2) {
      listenRetries++;
      console.log(`⚠️ Cổng ${CONFIG.PORT} đang bận, đang tự động giải phóng và kết nối lại (thử lần ${listenRetries})...`);
      cleanPortSync(CONFIG.PORT);
      setTimeout(() => {
        try { server.close(); } catch {}
        server.listen(CONFIG.PORT);
      }, 1000);
      return;
    }
    console.error(`\n❌ Cổng ${CONFIG.PORT} đang bị chiếm bởi một tiến trình khác.`);
    if (process.platform === 'win32') {
      console.error(`👉 Bạn vui lòng kiểm tra cổng ${CONFIG.PORT} trong Task Manager hoặc khởi động lại.`);
    } else {
      console.error(`👉 Bạn vui lòng chạy lệnh sau trong Terminal để giải phóng cổng:`);
      console.error(`   lsof -ti :${CONFIG.PORT} | xargs kill -9\n`);
    }
    process.exit(1);
  } else {
    console.error('Server error:', err);
  }
});

server.listen(CONFIG.PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 Exness Pro Auto Trading Server Running!`);
  console.log(`📡 HTTP API: http://localhost:${CONFIG.PORT}`);
  console.log(`⚡ WebSocket: ws://localhost:${CONFIG.PORT}/ws`);
  console.log(`====================================================`);
  telegramService.init();
});

// Handle termination signals (Windows & POSIX)
const handleShutdown = () => {
  console.log('\n🛑 Đang đóng hệ thống an toàn...');
  server.close(() => {
    process.exit(0);
  });
};

process.on('SIGINT', handleShutdown);
process.on('SIGTERM', handleShutdown);
