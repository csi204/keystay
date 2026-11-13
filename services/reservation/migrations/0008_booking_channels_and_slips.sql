-- Migration: 0008_booking_channels_and_slips.sql
-- Service: @keystay/reservation

ALTER TABLE reservations ADD COLUMN booking_source TEXT NOT NULL DEFAULT 'walk_in' 
    CHECK(booking_source IN ('walk_in', 'phone', 'facebook'));

ALTER TABLE reservations ADD COLUMN payment_status TEXT NOT NULL DEFAULT 'unpaid' 
    CHECK(payment_status IN ('unpaid', 'paid'));

ALTER TABLE reservations ADD COLUMN payment_slip_url TEXT;
ALTER TABLE reservations ADD COLUMN payment_slip_ref TEXT;
ALTER TABLE reservations ADD COLUMN payment_verified_at TEXT;
ALTER TABLE reservations ADD COLUMN payment_verified_by TEXT;

CREATE TABLE IF NOT EXISTS reservation_amenity_requests (
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
);

CREATE INDEX IF NOT EXISTS idx_reservations_channel ON reservations(booking_source);
CREATE INDEX IF NOT EXISTS idx_reservations_payment_status ON reservations(payment_status);
CREATE INDEX IF NOT EXISTS idx_amenity_req_res ON reservation_amenity_requests(reservation_id);
