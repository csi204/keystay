const { spawn } = require('child_process');
const path = require('path');

const services = [
  { name: 'api-gateway', port: 8787, cwd: path.join(__dirname, '../services/api-gateway') },
  { name: 'auth-user', port: 8788, cwd: path.join(__dirname, '../services/auth-user') },
  { name: 'room-inventory', port: 8789, cwd: path.join(__dirname, '../services/room-inventory') },
  { name: 'reservation', port: 8790, cwd: path.join(__dirname, '../services/reservation') },
  { name: 'housekeeping', port: 8791, cwd: path.join(__dirname, '../services/housekeeping') },
  { name: 'billing', port: 8792, cwd: path.join(__dirname, '../services/billing') },
  { name: 'report-analytics', port: 8793, cwd: path.join(__dirname, '../services/report-analytics') },
];

console.log('🚀 Starting KEYSTAY Backend Services (Bypassing Turbo for Windows AppLocker)...');

const isWin = process.platform === 'win32';
const pnpmCmd = isWin ? 'pnpm.cmd' : 'pnpm';

const children = [];

services.forEach((srv) => {
  const child = spawn(
    pnpmCmd,
    [
      'dlx',
      '--allow-build=esbuild,workerd,@cloudflare/workerd-darwin-arm64,@cloudflare/workerd-linux-64,@cloudflare/workerd-windows-64',
      'wrangler',
      'dev',
      '--port',
      srv.port.toString(),
    ],
    {
      cwd: srv.cwd,
      stdio: 'inherit',
      shell: true,
      env: { ...process.env, CI: 'true' },
    }
  );

  child.on('error', (err) => {
    console.error(`❌ [${srv.name}] Error:`, err.message);
  });

  children.push(child);
});

// Auto-Sync Daemon for live SQLite databases into keystay-all-in-one.sqlite
const syncChild = spawn('node', [path.join(__dirname, 'watch-db-sync.js')], {
  stdio: 'inherit',
});
children.push(syncChild);

process.on('SIGINT', () => {
  console.log('\n🛑 Stopping all backend services...');
  children.forEach((c) => c.kill('SIGINT'));
  process.exit(0);
});

process.on('SIGTERM', () => {
  children.forEach((c) => c.kill('SIGTERM'));
  process.exit(0);
});
