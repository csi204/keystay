const { execSync } = require('child_process');
const path = require('path');

const isRemote = process.argv.includes('--remote');
const flag = isRemote ? '--remote' : '--local';

const databases = [
  { name: 'db_auth_user', config: 'apps/services/auth-user/wrangler.jsonc', file: 'apps/services/auth-user/schema.sql' },
  { name: 'db_room', config: 'apps/services/room-inventory/wrangler.jsonc', file: 'apps/services/room-inventory/schema.sql' },
  { name: 'db_reservation', config: 'apps/services/reservation/wrangler.jsonc', file: 'apps/services/reservation/schema.sql' },
  { name: 'db_housekeeping', config: 'apps/services/housekeeping/wrangler.jsonc', file: 'apps/services/housekeeping/schema.sql' },
  { name: 'db_billing', config: 'apps/services/billing/wrangler.jsonc', file: 'apps/services/billing/schema.sql' },
  { name: 'db_report', config: 'apps/services/report-analytics/wrangler.jsonc', file: 'apps/services/report-analytics/schema.sql' },
];

console.log(`\n=== Migrating 6 D1 Databases (${isRemote ? 'REMOTE Cloudflare' : 'LOCAL SQLite'}) ===\n`);

for (const db of databases) {
  console.log(`Applying schema to ${db.name} (${flag})...`);
  try {
    const cmd = `pnpm dlx wrangler d1 execute ${db.name} ${flag} --config=${db.config} --file=${db.file} --yes`;
    execSync(cmd, { cwd: path.resolve(__dirname, '..'), stdio: 'inherit' });
    console.log(`✅ ${db.name} schema migrated successfully.\n`);
  } catch (err) {
    console.error(`❌ Error migrating ${db.name}:`, err.message);
    process.exit(1);
  }
}

console.log(`=== All 6 D1 Databases Migrated Successfully (${flag})! ===\n`);
