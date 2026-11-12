const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const hkDbPath = path.resolve(__dirname, '../dev-dbs/4-housekeeping.sqlite');
const rmDbPath = path.resolve(__dirname, '../dev-dbs/2-room-inventory.sqlite');
const allDbPath = path.resolve(__dirname, '../dev-dbs/keystay-all-in-one.sqlite');

let debounceTimer = null;

function syncDatabase() {
  try {
    const allDb = new DatabaseSync(allDbPath);
    allDb.exec(`
      PRAGMA foreign_keys = OFF;
      DELETE FROM housekeeping_tasks;
      ATTACH DATABASE '${hkDbPath}' AS hk;
      INSERT INTO housekeeping_tasks SELECT * FROM hk.housekeeping_tasks;
      DELETE FROM room_issues;
      INSERT INTO room_issues SELECT * FROM hk.room_issues;
      DETACH DATABASE hk;

      DELETE FROM rooms;
      ATTACH DATABASE '${rmDbPath}' AS ri;
      INSERT INTO rooms SELECT * FROM ri.rooms;
      DETACH DATABASE ri;
      PRAGMA foreign_keys = ON;
    `);
    allDb.close();
    console.log(`[Auto-Sync] ${new Date().toLocaleTimeString('th-TH')} - Synchronized live changes into keystay-all-in-one.sqlite`);
  } catch (err) {
    // Retry on busy
    if (err.message && err.message.includes('busy')) {
      setTimeout(syncDatabase, 500);
    }
  }
}

function queueSync() {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    syncDatabase();
  }, 300);
}

// Initial sync
syncDatabase();

// Watch both live databases
try {
  fs.watch(hkDbPath, queueSync);
  fs.watch(rmDbPath, queueSync);
  console.log('👀 [Auto-Sync Daemon] Watching 4-housekeeping.sqlite & 2-room-inventory.sqlite for live changes...');
} catch (e) {
  // If watching symlink fails, watch real files
  console.log('👀 Watching live databases with polling fallback...');
  setInterval(syncDatabase, 3000);
}

