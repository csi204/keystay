const migratedDbs = new WeakSet<object>();

/**
 * Ensures missing tables and indexes from recent migrations exist on db_room.
 * Uses try/catch around individual DDL statements so that execution is idempotent.
 */
export async function ensureRoomInventorySchema(db: D1Database): Promise<void> {
  if (!db || migratedDbs.has(db as object)) return;
  migratedDbs.add(db as object);

  const tableStatements = [
    `CREATE TABLE IF NOT EXISTS minibar_items (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL CHECK(category IN ('เครื่องดื่ม', 'แอลกอฮอล์', 'ขนม', 'อื่นๆ')),
      price_per_unit REAL NOT NULL,
      unit TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS seasonal_pricing_rules (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      tier TEXT NOT NULL,
      room_type_id TEXT REFERENCES room_types(id) ON DELETE CASCADE,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      days_of_week TEXT,
      adjustment_type TEXT NOT NULL CHECK(adjustment_type IN ('percent', 'fixed_amount')),
      adjustment_value REAL NOT NULL DEFAULT 5.0,
      priority INTEGER NOT NULL DEFAULT 10,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS amenities_catalog (
      id TEXT PRIMARY KEY,
      name_th TEXT NOT NULL,
      name_en TEXT NOT NULL,
      category TEXT NOT NULL CHECK(category IN ('bedding', 'bath', 'appliance', 'food_drink', 'other')),
      is_chargeable INTEGER NOT NULL DEFAULT 0,
      unit_price REAL NOT NULL DEFAULT 0.0,
      unit_name_th TEXT NOT NULL DEFAULT 'ชิ้น',
      unit_name_en TEXT NOT NULL DEFAULT 'piece',
      stock_quantity INTEGER NOT NULL DEFAULT -1,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`,
    `CREATE INDEX IF NOT EXISTS idx_minibar_items_category ON minibar_items(category)`,
    `CREATE INDEX IF NOT EXISTS idx_minibar_items_is_active ON minibar_items(is_active)`,
    `CREATE INDEX IF NOT EXISTS idx_seasonal_rules_dates ON seasonal_pricing_rules(start_date, end_date)`,
    `CREATE INDEX IF NOT EXISTS idx_seasonal_rules_tier ON seasonal_pricing_rules(tier)`,
    `CREATE INDEX IF NOT EXISTS idx_seasonal_rules_room_type ON seasonal_pricing_rules(room_type_id)`,
    `CREATE INDEX IF NOT EXISTS idx_amenities_category ON amenities_catalog(category)`,
    `CREATE INDEX IF NOT EXISTS idx_amenities_chargeable ON amenities_catalog(is_chargeable)`,
    `INSERT OR IGNORE INTO seasonal_pricing_rules (id, name, tier, room_type_id, start_date, end_date, days_of_week, adjustment_type, adjustment_value, priority, is_active, created_at, updated_at) VALUES
      ('rule-high-winter', 'High Season ภาคเหนือ (พ.ย.-ก.พ.)', 'High Season', NULL, '2026-11-01', '2027-02-28', NULL, 'percent', 5.0, 10, 1, '2026-09-01T08:00:00Z', '2026-09-01T08:00:00Z'),
      ('rule-countdown', 'คืนเคานต์ดาวน์ปีใหม่', 'Special Holiday', NULL, '2026-12-31', '2027-01-01', NULL, 'fixed_amount', 300.0, 25, 1, '2026-09-01T08:00:00Z', '2026-09-01T08:00:00Z')`,
    `INSERT OR IGNORE INTO amenities_catalog (id, name_th, name_en, category, is_chargeable, unit_price, unit_name_th, unit_name_en, stock_quantity, is_active, created_at, updated_at) VALUES
      ('am-extra-bed', 'เตียงเสริม', 'Extra Bed', 'bedding', 1, 300.0, 'หลัง', 'unit', 5, 1, '2026-09-01T08:00:00Z', '2026-09-01T08:00:00Z'),
      ('am-extra-pillow', 'หมอนหนุนเสริม', 'Extra Pillow', 'bedding', 0, 0.0, 'ใบ', 'piece', 30, 1, '2026-09-01T08:00:00Z', '2026-09-01T08:00:00Z'),
      ('am-hair-dryer', 'ไดร์เป่าผมพลังไอออน', 'Ionic Hair Dryer', 'appliance', 0, 0.0, 'เครื่อง', 'unit', 15, 1, '2026-09-01T08:00:00Z', '2026-09-01T08:00:00Z'),
      ('am-premium-dental', 'เซ็ตแปรงสีฟันพรีเมียม', 'Premium Dental Kit', 'bath', 1, 50.0, 'ชุด', 'set', 50, 1, '2026-09-01T08:00:00Z', '2026-09-01T08:00:00Z')`,
  ];

  for (const sql of tableStatements) {
    try {
      await db.prepare(sql).run();
    } catch {
      // Table or index may already exist, safe to ignore
    }
  }
}
