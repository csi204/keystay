const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Load .env if present
const rootDir = path.resolve(__dirname, '..');
const envFile = path.join(rootDir, '.env');
const customEnv = { ...process.env };

if (fs.existsSync(envFile)) {
  const lines = fs.readFileSync(envFile, 'utf8').split('\n');
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (line && !line.startsWith('#') && line.includes('=')) {
      const idx = line.indexOf('=');
      const key = line.slice(0, idx).trim();
      const val = line.slice(idx + 1).trim();
      customEnv[key] = val;
    }
  }
}

const servicesToDeploy = [
  { name: 'auth-user', dir: 'services/auth-user' },
  { name: 'room-inventory', dir: 'services/room-inventory' },
  { name: 'reservation', dir: 'services/reservation' },
  { name: 'housekeeping', dir: 'services/housekeeping' },
  { name: 'billing', dir: 'services/billing' },
  { name: 'report-analytics', dir: 'services/report-analytics' },
  { name: 'api-gateway', dir: 'services/api-gateway' },
];

console.log('\n🚀 Deploying KEYSTAY Backend Services & API Gateway to Cloudflare...\n');

for (const srv of servicesToDeploy) {
  const cwd = path.join(rootDir, srv.dir);
  console.log(`📦 Deploying ${srv.name} (${srv.dir})...`);
  let success = false;
  let attempts = 0;
  const maxAttempts = 3;

  while (!success && attempts < maxAttempts) {
    attempts++;
    try {
      execSync('pnpm dlx wrangler deploy', {
        cwd,
        env: customEnv,
        stdio: 'inherit',
      });
      console.log(`✅ ${srv.name} deployed successfully.\n`);
      success = true;
    } catch (err) {
      if (attempts < maxAttempts) {
        console.warn(`⚠️ Attempt ${attempts} failed for ${srv.name}. Retrying in 3 seconds...`);
        execSync('node -e "setTimeout(() => {}, 3000)"');
      } else {
        console.error(`❌ Deployment failed for ${srv.name} after ${maxAttempts} attempts:`, err.message);
        process.exit(1);
      }
    }
  }
}

console.log('🎉 All backend services & API Gateway deployed successfully!\n');
