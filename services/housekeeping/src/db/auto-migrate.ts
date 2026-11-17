const migratedHousekeepingDbs = new WeakSet<object>();

/**
 * Ensures recent schema columns and CHECK constraints on db_housekeeping
 * (such as Lost & Found fields and expanded issue_type / status values on room_issues)
 * exist idempotently across both local D1 and production.
 */
export async function ensureHousekeepingSchema(db: D1Database): Promise<void> {
  if (!db || migratedHousekeepingDbs.has(db as object)) return;
  migratedHousekeepingDbs.add(db as object);

  const alterStatements = [
    `ALTER TABLE room_issues ADD COLUMN storage_location TEXT DEFAULT 'Front Desk Counter'`,
    `ALTER TABLE room_issues ADD COLUMN retention_days INTEGER DEFAULT 7`,
    `ALTER TABLE room_issues ADD COLUMN received_by_name TEXT`,
    `ALTER TABLE housekeeping_tasks ADD COLUMN before_photo_url TEXT`,
    `ALTER TABLE housekeeping_tasks ADD COLUMN after_photo_url TEXT`,
    `CREATE TABLE IF NOT EXISTS task_templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL DEFAULT 'Standard Clean',
      task_type TEXT NOT NULL DEFAULT 'checkout_clean',
      default_priority TEXT NOT NULL DEFAULT 'normal',
      estimated_minutes INTEGER NOT NULL DEFAULT 30,
      description TEXT,
      checklist_items TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`,
    `ALTER TABLE task_templates ADD COLUMN name TEXT DEFAULT 'Standard Clean'`,
    `ALTER TABLE task_templates ADD COLUMN task_type TEXT DEFAULT 'checkout_clean'`,
    `ALTER TABLE task_templates ADD COLUMN default_priority TEXT DEFAULT 'normal'`,
    `CREATE TABLE IF NOT EXISTS amenity_requests (
      id TEXT PRIMARY KEY,
      room_number TEXT NOT NULL,
      reservation_id TEXT,
      amenity_id TEXT NOT NULL,
      amenity_name TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      unit_price REAL NOT NULL DEFAULT 0.0,
      total_price REAL NOT NULL DEFAULT 0.0,
      is_chargeable INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'pending',
      notes TEXT,
      requested_by TEXT,
      fulfilled_by TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`,
  ];

  for (const sql of alterStatements) {
    try {
      await db.prepare(sql).run();
    } catch {
      // Column or table already exists, safe to ignore
    }
  }

  // Upgrade room_issues CHECK constraint if it predates 'lost_and_found' / 'cleanliness' / 'expired_claimed'
  try {
    const tbl: any = await db
      .prepare(`SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'room_issues'`)
      .first();
    const ddl: string = tbl?.sql || '';
    if (ddl && (!ddl.includes('lost_and_found') || !ddl.includes('cleanliness'))) {
      await db.prepare(`DROP TABLE IF EXISTS room_issues_new`).run();
      await db
        .prepare(
          `CREATE TABLE room_issues_new (
            id TEXT PRIMARY KEY,
            task_id TEXT REFERENCES housekeeping_tasks(id),
            room_id TEXT NOT NULL,
            reported_by TEXT NOT NULL REFERENCES housekeeping_staff(id),
            issue_type TEXT NOT NULL CHECK(issue_type IN ('damage', 'missing_item', 'malfunction', 'hygiene', 'cleanliness', 'lost_and_found')),
            description TEXT NOT NULL,
            photo_r2_key TEXT,
            severity TEXT NOT NULL DEFAULT 'medium' CHECK(severity IN ('low', 'medium', 'high', 'critical')),
            status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open', 'acknowledged', 'resolved', 'expired_claimed')),
            storage_location TEXT DEFAULT 'Front Desk Counter',
            retention_days INTEGER DEFAULT 7,
            received_by_name TEXT,
            resolved_at TEXT,
            created_at TEXT NOT NULL
          )`
        )
        .run();
      await db
        .prepare(
          `INSERT INTO room_issues_new (
            id, task_id, room_id, reported_by, issue_type, description, photo_r2_key,
            severity, status, storage_location, retention_days, received_by_name, resolved_at, created_at
          )
          SELECT
            id, task_id, room_id, reported_by, issue_type, description, photo_r2_key,
            severity, status,
            COALESCE(storage_location, 'Front Desk Counter'),
            COALESCE(retention_days, 7),
            received_by_name, resolved_at, created_at
          FROM room_issues`
        )
        .run();
      await db.prepare(`DROP TABLE room_issues`).run();
      await db.prepare(`ALTER TABLE room_issues_new RENAME TO room_issues`).run();
    }
  } catch (err) {
    console.warn('[Auto-Migrate] room_issues constraint upgrade warning:', err);
  }
}
