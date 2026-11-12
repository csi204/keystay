-- D1 Database: db_room
-- Service: @keystay/room-inventory

CREATE TABLE IF NOT EXISTS room_types (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    base_price REAL NOT NULL,
    max_occupancy INTEGER NOT NULL DEFAULT 2,
    bed_type TEXT NOT NULL,
    size_sqm REAL NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS floors (
    id TEXT PRIMARY KEY,
    floor_number INTEGER UNIQUE NOT NULL,
    name TEXT NOT NULL,
    total_rooms INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS rooms (
    id TEXT PRIMARY KEY,
    room_number TEXT UNIQUE NOT NULL,
    room_type_id TEXT NOT NULL REFERENCES room_types(id),
    floor_id TEXT NOT NULL REFERENCES floors(id),
    status TEXT NOT NULL DEFAULT 'available' CHECK(status IN ('available', 'reserved', 'occupied', 'checked_out', 'cleaning', 'maintenance', 'out_of_order')),
    is_active INTEGER NOT NULL DEFAULT 1,
    notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS room_amenities (
    id TEXT PRIMARY KEY,
    room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    amenity_name TEXT NOT NULL,
    description TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS room_status_history (
    id TEXT PRIMARY KEY,
    room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    previous_status TEXT NOT NULL,
    new_status TEXT NOT NULL,
    changed_by TEXT,
    change_reason TEXT,
    event_source TEXT NOT NULL DEFAULT 'manual',
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS outbox_events (
    id TEXT PRIMARY KEY,
    event_type TEXT NOT NULL,
    aggregate_id TEXT NOT NULL,
    aggregate_type TEXT NOT NULL,
    payload TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    published_at TEXT,
    created_at TEXT NOT NULL
);

-- 7. Minibar Items (รายการสินค้าในมินิบาร์)
CREATE TABLE IF NOT EXISTS minibar_items (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL CHECK(category IN ('เครื่องดื่ม', 'แอลกอฮอล์', 'ขนม', 'อื่นๆ')),
    price_per_unit REAL NOT NULL,
    unit TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- 8. Seasonal Pricing Rules (กฎราคาตามฤดูกาลและเทศกาล)
CREATE TABLE IF NOT EXISTS seasonal_pricing_rules (
    id TEXT PRIMARY KEY,                                       -- เช่น 'rule-high-winter'
    name TEXT NOT NULL,                                        -- เช่น 'High Season ภาคเหนือ (พ.ย.-ก.พ.)'
    tier TEXT NOT NULL,                                        -- เช่น 'High Season', 'Regular', 'Low Season', 'Special Holiday'
    room_type_id TEXT REFERENCES room_types(id) ON DELETE CASCADE, -- NULL = บังคับใช้กับทุกประเภทห้อง (Global)
    start_date TEXT NOT NULL,                                  -- YYYY-MM-DD เช่น '2026-11-01'
    end_date TEXT NOT NULL,                                    -- YYYY-MM-DD เช่น '2027-02-28'
    days_of_week TEXT,                                         -- JSON Array เช่น '[5,6,0]' (ศุกร์-เสาร์-อาทิตย์) หรือ NULL (ทุกวัน)
    adjustment_type TEXT NOT NULL CHECK(adjustment_type IN ('percent', 'fixed_amount')),
    adjustment_value REAL NOT NULL DEFAULT 5.0,                -- เช่น 5.0 (+5%), -10.0 (-10%), 200.0 (+200 บาท)
    priority INTEGER NOT NULL DEFAULT 10,                      -- ยิ่งตัวเลขมาก ยิ่งมี Priority สูง
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- 9. Amenities Catalog (แคตตาล็อกของใช้และบริการเสริม)
CREATE TABLE IF NOT EXISTS amenities_catalog (
    id TEXT PRIMARY KEY,                                       -- เช่น 'am-extra-bed'
    name_th TEXT NOT NULL,                                     -- เช่น 'เตียงเสริม'
    name_en TEXT NOT NULL,                                     -- เช่น 'Extra Bed'
    category TEXT NOT NULL CHECK(category IN ('bedding', 'bath', 'appliance', 'food_drink', 'other')),
    is_chargeable INTEGER NOT NULL DEFAULT 0,                  -- 0 = ฟรี, 1 = มีค่าใช้จ่าย (คิดเงินลงบิล)
    unit_price REAL NOT NULL DEFAULT 0.0,                      -- 0.0 สำหรับของฟรี, > 0 สำหรับของเสียเงิน
    unit_name_th TEXT NOT NULL DEFAULT 'ชิ้น',                  -- 'ชิ้น', 'หลัง', 'ชุด'
    unit_name_en TEXT NOT NULL DEFAULT 'piece',                -- 'piece', 'unit', 'set'
    stock_quantity INTEGER NOT NULL DEFAULT -1,                -- -1 = ไม่จำกัดจำนวนสต็อก, >= 0 = จำนวนที่มีอยู่
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_rooms_room_number ON rooms(room_number);
CREATE INDEX IF NOT EXISTS idx_rooms_status ON rooms(status);
CREATE INDEX IF NOT EXISTS idx_rooms_type_id ON rooms(room_type_id);
CREATE INDEX IF NOT EXISTS idx_rooms_floor_id ON rooms(floor_id);
CREATE INDEX IF NOT EXISTS idx_room_history_room_id ON room_status_history(room_id);
CREATE INDEX IF NOT EXISTS idx_room_amenities_room_id ON room_amenities(room_id);
CREATE INDEX IF NOT EXISTS idx_minibar_items_category ON minibar_items(category);
CREATE INDEX IF NOT EXISTS idx_minibar_items_is_active ON minibar_items(is_active);
CREATE INDEX IF NOT EXISTS idx_seasonal_rules_dates ON seasonal_pricing_rules(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_seasonal_rules_tier ON seasonal_pricing_rules(tier);
CREATE INDEX IF NOT EXISTS idx_seasonal_rules_room_type ON seasonal_pricing_rules(room_type_id);
CREATE INDEX IF NOT EXISTS idx_amenities_category ON amenities_catalog(category);
CREATE INDEX IF NOT EXISTS idx_amenities_chargeable ON amenities_catalog(is_chargeable);
