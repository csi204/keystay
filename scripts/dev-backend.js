const { spawn } = require('child_process');
const path = require('path');

const services = [
  { name: 'api-gateway', cwd: path.join(__dirname, '../apps/api-gateway') },
  { name: 'auth-user', cwd: path.join(__dirname, '../services/auth-user') },
  { name: 'room-inventory', cwd: path.join(__dirname, '../services/room-inventory') },
  { name: 'reservation', cwd: path.join(__dirname, '../services/reservation') },
  { name: 'housekeeping', cwd: path.join(__dirname, '../services/housekeeping') },
  { name: 'billing', cwd: path.join(__dirname, '../services/billing') },
  { name: 'report-analytics', cwd: path.join(__dirname, '../services/report-analytics') },
];

console.log('🚀 Starting KEYSTAY Backend Services (Bypassing Turbo for Windows AppLocker)...');

const isWin = process.platform === 'win32';
const pnpmCmd = isWin ? 'pnpm.cmd' : 'pnpm';

const children = [];

services.forEach((srv) => {
  const child = spawn(pnpmCmd, ['dev'], {
    cwd: srv.cwd,
    stdio: 'inherit',
    shell: true,
  });

  child.on('error', (err) => {
    console.error(`❌ [${srv.name}] Error:`, err.message);
  });

  children.push(child);
});

process.on('SIGINT', () => {
  console.log('\n🛑 Stopping all backend services...');
  children.forEach((c) => c.kill('SIGINT'));
  process.exit(0);
});

process.on('SIGTERM', () => {
  children.forEach((c) => c.kill('SIGTERM'));
  process.exit(0);
});
