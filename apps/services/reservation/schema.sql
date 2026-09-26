-- D1 Database: db_reservation
-- Service: @keystay/reservation

CREATE TABLE IF NOT EXISTS guests (
    id TEXT PRIMARY KEY,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    id_card_number TEXT,
    nationality TEXT,
    address TEXT,
    notes TEXT,
    total_stays INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS reservations (
    id TEXT PRIMARY KEY,
    reservation_code TEXT UNIQUE NOT NULL,
    guest_id TEXT NOT NULL REFERENCES guests(id),
    room_id TEXT NOT NULL,
    room_number TEXT NOT NULL,
    room_type_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'confirmed' CHECK(status IN ('confirmed', 'checked_in', 'checked_out', 'cancelled', 'extended')),
    booking_type TEXT NOT NULL DEFAULT 'advance' CHECK(booking_type IN ('advance', 'walk_in')),
    check_in_date TEXT NOT NULL,
    check_out_date TEXT NOT NULL,
    actual_check_in TEXT,
    actual_check_out TEXT,
    num_guests INTEGER NOT NULL DEFAULT 1,
    nightly_rate REAL NOT NULL,
    total_nights INTEGER NOT NULL,
    subtotal REAL NOT NULL,
    discount_amount REAL NOT NULL DEFAULT 0,
    tax_amount REAL NOT NULL DEFAULT 0,
    deposit_amount REAL NOT NULL DEFAULT 0,
    total_amount REAL NOT NULL,
    special_requests TEXT,
    created_by TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS reservation_history (
    id TEXT PRIMARY KEY,
    reservation_id TEXT NOT NULL REFERENCES reservations(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    previous_data TEXT,
    new_data TEXT,
    performed_by TEXT,
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
CREATE INDEX IF NOT EXISTS idx_reservations_code ON reservations(reservation_code);
CREATE INDEX IF NOT EXISTS idx_reservations_guest ON reservations(guest_id);
CREATE INDEX IF NOT EXISTS idx_reservations_room ON reservations(room_id);
CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(status);
CREATE INDEX IF NOT EXISTS idx_reservations_dates ON reservations(check_in_date, check_out_date);
CREATE INDEX IF NOT EXISTS idx_guests_phone ON guests(phone);
CREATE INDEX IF NOT EXISTS idx_guests_id_card ON guests(id_card_number);
