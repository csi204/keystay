const { execSync } = require('child_process');
const path = require('path');

const isRemote = process.argv.includes('--remote');
const flag = isRemote ? '--remote' : '--local';

const databases = [
  { name: 'db_auth_user', config: 'services/auth-user/wrangler.jsonc', file: 'scripts/seeds/01_auth_user.sql' },
  { name: 'db_room', config: 'services/room-inventory/wrangler.jsonc', file: 'scripts/seeds/02_room.sql' },
  { name: 'db_reservation', config: 'services/reservation/wrangler.jsonc', file: 'scripts/seeds/03_reservation.sql' },
  { name: 'db_housekeeping', config: 'services/housekeeping/wrangler.jsonc', file: 'scripts/seeds/04_housekeeping.sql' },
  { name: 'db_billing', config: 'services/billing/wrangler.jsonc', file: 'scripts/seeds/05_billing.sql' },
  { name: 'db_report', config: 'services/report-analytics/wrangler.jsonc', file: 'scripts/seeds/06_report.sql' },
];

console.log(`\n=== Seeding 6 D1 Databases (${isRemote ? 'REMOTE Cloudflare' : 'LOCAL SQLite'}) ===\n`);

for (const db of databases) {
  console.log(`🌱 Seeding ${db.name} (${flag}) with ${db.file}...`);
  try {
    const cmd = `pnpm dlx wrangler d1 execute ${db.name} ${flag} --config=${db.config} --file=${db.file} --yes`;
    execSync(cmd, { cwd: path.resolve(__dirname, '..'), stdio: 'inherit' });
    console.log(`✅ ${db.name} seeded successfully.\n`);
  } catch (err) {
    console.error(`❌ Error seeding ${db.name}:`, err.message);
    process.exit(1);
  }
}

console.log(`=== All 6 D1 Databases Seeded Successfully (${flag})! ===\n`);
