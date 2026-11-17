const migratedHousekeepingDbs = new WeakSet<object>();

/**
 * Ensures recent schema columns on db_housekeeping (such as Lost & Found fields on room_issues)
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
      // Column already exists, safe to ignore
    }
  }
}
