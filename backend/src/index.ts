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
const distPath = fs.existsSync(candidateDist1) ? candidateDist1 : (fs.existsSync(candidateDist2) ? candidateDist2 : null);

if (distPath) {
  app.use(express.static(distPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/ws')) {
      return next();
    }
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

const server = http.createServer(app);

// Initialize WebSocket hub on the HTTP server
wsHub.init(server);

// Auto-free port 3001 if an old zombie process is holding it
try {
  if (process.platform === 'win32') {
    const output = execSync(`netstat -ano | findstr :${CONFIG.PORT}`, { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
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
    const pids = execSync(`lsof -ti :${CONFIG.PORT} 2>/dev/null`, { encoding: 'utf-8' }).trim();
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

server.on('error', (err: any) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n❌ Cổng ${CONFIG.PORT} đang bị chiếm bởi một tiến trình khác.`);
    if (process.platform === 'win32') {
      console.error(`👉 Bạn vui lòng giải phóng cổng ${CONFIG.PORT} trong Task Manager hoặc khởi động lại.`);
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

// Handle termination signals
process.on('SIGINT', () => {
  console.log('\n🛑 Đang đóng hệ thống an toàn...');
  server.close(() => {
    process.exit(0);
  });
});
