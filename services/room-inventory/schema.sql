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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_rooms_room_number ON rooms(room_number);
CREATE INDEX IF NOT EXISTS idx_rooms_status ON rooms(status);
CREATE INDEX IF NOT EXISTS idx_rooms_type_id ON rooms(room_type_id);
CREATE INDEX IF NOT EXISTS idx_rooms_floor_id ON rooms(floor_id);
CREATE INDEX IF NOT EXISTS idx_room_history_room_id ON room_status_history(room_id);
CREATE INDEX IF NOT EXISTS idx_room_amenities_room_id ON room_amenities(room_id);
