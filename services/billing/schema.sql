-- D1 Database: db_billing
-- Service: @keystay/billing

CREATE TABLE IF NOT EXISTS payment_methods (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    code TEXT UNIQUE NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS bills (
    id TEXT PRIMARY KEY,
    bill_number TEXT UNIQUE NOT NULL,
    reservation_id TEXT NOT NULL,
    guest_name TEXT NOT NULL,
    room_number TEXT NOT NULL,
    subtotal REAL NOT NULL DEFAULT 0,
    discount_amount REAL NOT NULL DEFAULT 0,
    tax_rate REAL NOT NULL DEFAULT 0.07,
    tax_amount REAL NOT NULL DEFAULT 0,
    service_charge REAL NOT NULL DEFAULT 0.10,
    total_amount REAL NOT NULL DEFAULT 0,
    deposit_deducted REAL NOT NULL DEFAULT 0,
    amount_paid REAL NOT NULL DEFAULT 0,
    amount_due REAL NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'partially_paid', 'paid', 'refunded', 'void')),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS bill_items (
    id TEXT PRIMARY KEY,
    bill_id TEXT NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
    item_type TEXT NOT NULL CHECK(item_type IN ('room_charge', 'minibar', 'laundry', 'room_service', 'damage', 'other')),
    description TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price REAL NOT NULL,
    total_price REAL NOT NULL,
    item_date TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    bill_id TEXT NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
    payment_method_id TEXT NOT NULL REFERENCES payment_methods(id),
    amount REAL NOT NULL,
    reference_number TEXT,
    status TEXT NOT NULL DEFAULT 'completed' CHECK(status IN ('completed', 'failed', 'refunded')),
    paid_at TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS invoices (
    id TEXT PRIMARY KEY,
    invoice_number TEXT UNIQUE NOT NULL,
    bill_id TEXT NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
    issued_to_name TEXT NOT NULL,
    issued_to_email TEXT,
    total_amount REAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'issued' CHECK(status IN ('draft', 'issued', 'sent', 'void')),
    sent_at TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS refunds (
    id TEXT PRIMARY KEY,
    bill_id TEXT NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
    payment_id TEXT REFERENCES payments(id),
    amount REAL NOT NULL,
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'completed' CHECK(status IN ('pending', 'completed', 'failed')),
    refunded_by TEXT,
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
CREATE INDEX IF NOT EXISTS idx_bills_number ON bills(bill_number);
CREATE INDEX IF NOT EXISTS idx_bills_reservation ON bills(reservation_id);
CREATE INDEX IF NOT EXISTS idx_bills_status ON bills(status);
CREATE INDEX IF NOT EXISTS idx_bill_items_bill ON bill_items(bill_id);
CREATE INDEX IF NOT EXISTS idx_payments_bill ON payments(bill_id);
CREATE INDEX IF NOT EXISTS idx_invoices_bill ON invoices(bill_id);
