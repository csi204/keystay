const migratedDbs = new WeakSet<object>();

/**
 * Ensures missing columns and tables from recent migrations exist on the database.
 * Uses try/catch around individual ALTER TABLE statements so that if columns already
 * exist, execution proceeds safely and idempotently.
 */
export async function ensureReservationSchema(db: D1Database): Promise<void> {
  if (!db || migratedDbs.has(db as object)) return;
  migratedDbs.add(db as object);

  const alterStatements = [
    `ALTER TABLE reservations ADD COLUMN booking_source TEXT NOT NULL DEFAULT 'walk_in' CHECK(booking_source IN ('walk_in', 'phone', 'facebook'))`,
    `ALTER TABLE reservations ADD COLUMN payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK(payment_status IN ('unpaid', 'paid'))`,
    `ALTER TABLE reservations ADD COLUMN payment_slip_url TEXT`,
    `ALTER TABLE reservations ADD COLUMN payment_slip_ref TEXT`,
    `ALTER TABLE reservations ADD COLUMN payment_verified_at TEXT`,
    `ALTER TABLE reservations ADD COLUMN payment_verified_by TEXT`,
  ];

  for (const sql of alterStatements) {
    try {
      await db.prepare(sql).run();
    } catch {
      // Column may already exist, safe to ignore
    }
  }

  const tableStatements = [
    `CREATE TABLE IF NOT EXISTS reservation_amenity_requests (
      id TEXT PRIMARY KEY,
      reservation_id TEXT NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
      amenity_id TEXT NOT NULL,
      amenity_name TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      unit_price REAL NOT NULL DEFAULT 0.0,
      total_price REAL NOT NULL DEFAULT 0.0,
      is_chargeable INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'requested' CHECK(status IN ('requested', 'preparing', 'delivered', 'cancelled')),
      billed_to_folio INTEGER NOT NULL DEFAULT 0,
      bill_item_id TEXT,
      notes TEXT,
      requested_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
      delivered_at TEXT
    )`,
    `CREATE INDEX IF NOT EXISTS idx_reservations_channel ON reservations(booking_source)`,
    `CREATE INDEX IF NOT EXISTS idx_reservations_payment_status ON reservations(payment_status)`,
    `CREATE INDEX IF NOT EXISTS idx_amenity_req_res ON reservation_amenity_requests(reservation_id)`,
    `DROP INDEX IF EXISTS idx_guests_phone_unique`,
    `DROP INDEX IF EXISTS idx_guests_id_card_unique`,
    `CREATE INDEX IF NOT EXISTS idx_guests_phone ON guests(phone) WHERE phone IS NOT NULL`,
    `CREATE INDEX IF NOT EXISTS idx_guests_id_card ON guests(id_card_number) WHERE id_card_number IS NOT NULL`,
  ];

  for (const sql of tableStatements) {
    try {
      await db.prepare(sql).run();
    } catch {
      // Table or index may already exist, safe to ignore
    }
  }
}
