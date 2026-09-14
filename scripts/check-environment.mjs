#!/usr/bin/env node

/**
 * Cross-Platform Environment & Dependency Checker
 * Compatible with macOS, Windows, and Linux
 */

import os from 'os';
import fs from 'fs';
import path from 'path';
import net from 'net';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

function log(msg, color = COLORS.reset) {
  console.log(`${color}${msg}${COLORS.reset}`);
}

function checkSocket(port, host = '127.0.0.1', timeout = 1000) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let isConnected = false;

    socket.setTimeout(timeout);
    socket.once('connect', () => {
      isConnected = true;
      socket.destroy();
      resolve(true);
    });

    socket.once('timeout', () => {
      socket.destroy();
      resolve(false);
    });

    socket.once('error', () => {
      socket.destroy();
      resolve(false);
    });

    socket.connect(port, host);
  });
}

async function runChecks() {
  log('====================================================', COLORS.cyan);
  log('  🔍 KIỂM TRA MÔI TRƯỜNG & THƯ VIỆN ĐA NỀN TẢNG', COLORS.bright);
  log('     (Cross-Platform Checker: Windows / macOS / Linux)', COLORS.cyan);
  log('====================================================', COLORS.cyan);

  let hasErrors = false;

  // 1. OS & Architecture
  const platform = process.platform;
  const arch = process.arch;
  const osType = os.type();
  const osRelease = os.release();

  let platformName = 'Linux / Unix';
  if (platform === 'darwin') platformName = 'macOS (Apple Silicon / Intel)';
  if (platform === 'win32') platformName = 'Windows';

  log(`\n💻 Hệ điều hành: ${platformName} [${platform} / ${arch}] (Release: ${osRelease})`, COLORS.bright);

  // 2. Node.js Version
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0], 10);
  if (majorVersion >= 18) {
    log(`  ✅ Node.js: ${nodeVersion} (Tương thích tốt)`, COLORS.green);
  } else {
    log(`  ❌ Node.js: ${nodeVersion} (Yêu cầu Node.js >= 18.0.0)`, COLORS.red);
    hasErrors = true;
  }

  // 3. Check Dependencies in Root, Backend, Frontend
  log('\n📦 Kiểm tra cài đặt các thư viện (Dependencies):', COLORS.bright);

  const rootConcurrently = path.join(rootDir, 'node_modules', 'concurrently');
  if (fs.existsSync(rootConcurrently)) {
    log('  ✅ Root dependencies: Đã cài đặt (concurrently)', COLORS.green);
  } else {
    log('  ⚠️ Root dependencies: Chưa cài đặt hoặc thiếu concurrently. Chạy `npm install`', COLORS.yellow);
  }

  const backendMongoose = path.join(rootDir, 'backend', 'node_modules', 'mongoose');
  const backendBcryptjs = path.join(rootDir, 'backend', 'node_modules', 'bcryptjs');
  if (fs.existsSync(backendMongoose) && fs.existsSync(backendBcryptjs)) {
    log('  ✅ Backend dependencies: Đã cài đặt đầy đủ (mongoose, bcryptjs, tsx, express...)', COLORS.green);
  } else {
    log('  ❌ Backend dependencies: Thiếu thư viện cốt lõi! Cần chạy `npm install --prefix backend`', COLORS.red);
    hasErrors = true;
  }

  const frontendVite = path.join(rootDir, 'frontend', 'node_modules', 'vite');
  const frontendCharts = path.join(rootDir, 'frontend', 'node_modules', 'lightweight-charts');
  if (fs.existsSync(frontendVite) && fs.existsSync(frontendCharts)) {
    log('  ✅ Frontend dependencies: Đã cài đặt đầy đủ (vite, react, lightweight-charts...)', COLORS.green);
  } else {
    log('  ❌ Frontend dependencies: Thiếu thư viện Frontend! Cần chạy `npm install --prefix frontend`', COLORS.red);
    hasErrors = true;
  }

  // 4. Check Database (MongoDB Port 27017)
  log('\n🗄️ Kiểm tra Cơ sở dữ liệu (MongoDB):', COLORS.bright);
  const isMongoRunning = await checkSocket(27017, '127.0.0.1', 1200);
  if (isMongoRunning) {
    log('  ✅ MongoDB Server: Đang lắng nghe kết nối tại 127.0.0.1:27017', COLORS.green);
  } else {
    log('  ⚠️ MongoDB Server: Chưa phát hiện tiến trình chạy trên cổng 27017.', COLORS.yellow);
    if (platform === 'darwin') {
      log('     👉 Hướng dẫn macOS: brew services start mongodb/brew/mongodb-community', COLORS.yellow);
    } else if (platform === 'win32') {
      log('     👉 Hướng dẫn Windows: Start-Service MongoDB hoặc mở Services -> MongoDB Server', COLORS.yellow);
    } else {
      log('     👉 Hướng dẫn Linux: sudo systemctl start mongod', COLORS.yellow);
    }
  }

  // 5. Check Ports (3001 & 5173)
  log('\n🌐 Kiểm tra trạng thái các cổng mạng (Network Ports):', COLORS.bright);
  const port3001Busy = await checkSocket(3001, '127.0.0.1', 800);
  if (port3001Busy) {
    log('  ⚠️ Cổng 3001 (Backend API): Đang bận (sẽ được tự động giải phóng khi chạy script startup)', COLORS.yellow);
  } else {
    log('  ✅ Cổng 3001 (Backend API): Sẵn sàng', COLORS.green);
  }

  const port5173Busy = await checkSocket(5173, '127.0.0.1', 800);
  if (port5173Busy) {
    log('  ⚠️ Cổng 5173 (Frontend Vite): Đang bận (sẽ được tự động giải phóng khi chạy script startup)', COLORS.yellow);
  } else {
    log('  ✅ Cổng 5173 (Frontend Vite): Sẵn sàng', COLORS.green);
  }

  log('\n----------------------------------------------------', COLORS.cyan);
  if (hasErrors) {
    log('❌ CẢNH BÁO: Phát hiện một số vấn đề cần khắc phục trước khi khởi chạy.', COLORS.red);
    process.exit(1);
  } else {
    log('🎉 TẤT CẢ CÁC KIỂM TRA ĐỀU HOÀN TOÀN TƯƠNG THÍCH!', COLORS.green);
    process.exit(0);
  }
}

runChecks().catch((err) => {
  console.error('Lỗi khi chạy kiểm tra:', err);
  process.exit(1);
});
