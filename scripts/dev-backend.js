const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const services = [
  { name: 'api-gateway', port: 8787, inspectorPort: 9228, cwd: path.join(__dirname, '../services/api-gateway') },
  { name: 'auth-user', port: 8788, inspectorPort: 9229, cwd: path.join(__dirname, '../services/auth-user') },
  { name: 'room-inventory', port: 8789, inspectorPort: 9230, cwd: path.join(__dirname, '../services/room-inventory') },
  { name: 'reservation', port: 8790, inspectorPort: 9231, cwd: path.join(__dirname, '../services/reservation') },
  { name: 'housekeeping', port: 8791, inspectorPort: 9232, cwd: path.join(__dirname, '../services/housekeeping') },
  { name: 'billing', port: 8792, inspectorPort: 9233, cwd: path.join(__dirname, '../services/billing') },
  { name: 'report-analytics', port: 8793, inspectorPort: 9234, cwd: path.join(__dirname, '../services/report-analytics') },
];

console.log('🚀 Starting KEYSTAY Backend Services (Bypassing Turbo for Windows AppLocker)...');

const isWin = process.platform === 'win32';
const pnpmCmd = isWin ? 'pnpm.cmd' : 'pnpm';
const localWrangler = path.join(__dirname, '../node_modules/.bin', isWin ? 'wrangler.cmd' : 'wrangler');

// Clear any zombie workerd/wrangler processes holding ports 8787-8793 before starting
if (!isWin) {
  try {
    execSync('pkill -f workerd 2>/dev/null || true');
    execSync('lsof -ti:8787,8788,8789,8790,8791,8792,8793,9228,9229,9230,9231,9232,9233,9234 | xargs kill -9 2>/dev/null || true');
  } catch (_) {}
}

function resolveWranglerBin() {
  if (fs.existsSync(localWrangler)) {
    return localWrangler;
  }
  try {
    const cmd = isWin ? 'where wrangler' : 'which wrangler';
    const found = execSync(cmd, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim().split(/\r?\n/)[0];
    if (found) return found;
  } catch (_) {}
  return null;
}

const wranglerBin = resolveWranglerBin();

if (!wranglerBin) {
  console.log('⏳ Pre-warming wrangler via pnpm dlx (once before parallel startup)...');
  try {
    execSync(
      `${pnpmCmd} dlx --allow-build=esbuild,workerd,@cloudflare/workerd-darwin-arm64,@cloudflare/workerd-linux-64,@cloudflare/workerd-windows-64 wrangler --version`,
      { stdio: 'inherit', env: { ...process.env, CI: 'true' } }
    );
  } catch (_) {}
} else {
  console.log(`✅ Using installed wrangler: ${wranglerBin}`);
}

const children = [];

services.forEach((srv) => {
  const devArgs = ['dev', '--port', srv.port.toString()];
  if (srv.inspectorPort) {
    devArgs.push('--inspector-port', srv.inspectorPort.toString());
  }

  const spawnCmd = wranglerBin || pnpmCmd;
  const args = wranglerBin
    ? devArgs
    : [
        'dlx',
        '--allow-build=esbuild,workerd,@cloudflare/workerd-darwin-arm64,@cloudflare/workerd-linux-64,@cloudflare/workerd-windows-64',
        'wrangler',
        ...devArgs,
      ];

  const child = spawn(
    spawnCmd,
    args,
    {
      cwd: srv.cwd,
      stdio: 'inherit',
      shell: !wranglerBin && isWin,
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

const cleanup = () => {
  console.log('\n🛑 Stopping all backend services...');
  children.forEach((c) => {
    try {
      if (isWin) {
        spawn('taskkill', ['/F', '/T', '/PID', c.pid]);
      } else {
        c.kill('SIGTERM');
      }
    } catch (_) {}
  });
  if (!isWin) {
    try {
      require('child_process').execSync('pkill -f workerd 2>/dev/null || true');
    } catch (_) {}
  }
  process.exit(0);
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
