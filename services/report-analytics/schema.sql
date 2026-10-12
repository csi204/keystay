-- D1 Database: db_report
-- Service: @keystay/report-analytics

CREATE TABLE IF NOT EXISTS daily_stats (
    id TEXT PRIMARY KEY,
    stat_date TEXT UNIQUE NOT NULL,
    total_rooms INTEGER NOT NULL DEFAULT 0,
    occupied_rooms INTEGER NOT NULL DEFAULT 0,
    available_rooms INTEGER NOT NULL DEFAULT 0,
    reserved_rooms INTEGER NOT NULL DEFAULT 0,
    maintenance_rooms INTEGER NOT NULL DEFAULT 0,
    occupancy_rate REAL NOT NULL DEFAULT 0,
    total_checkins INTEGER NOT NULL DEFAULT 0,
    total_checkouts INTEGER NOT NULL DEFAULT 0,
    total_cancellations INTEGER NOT NULL DEFAULT 0,
    total_walk_ins INTEGER NOT NULL DEFAULT 0,
    total_revenue REAL NOT NULL DEFAULT 0,
    room_revenue REAL NOT NULL DEFAULT 0,
    minibar_revenue REAL NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS revenue_records (
    id TEXT PRIMARY KEY,
    record_date TEXT NOT NULL,
    reservation_id TEXT,
    bill_id TEXT,
    room_type_name TEXT,
    revenue_type TEXT NOT NULL CHECK(revenue_type IN ('room_charge', 'service', 'minibar', 'refund')),
    amount REAL NOT NULL,
    payment_method TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS monthly_summary (
    id TEXT PRIMARY KEY,
    year_month TEXT UNIQUE NOT NULL,
    total_revenue REAL NOT NULL DEFAULT 0,
    net_revenue REAL NOT NULL DEFAULT 0,
    avg_occupancy_rate REAL NOT NULL DEFAULT 0,
    total_reservations INTEGER NOT NULL DEFAULT 0,
    cancellation_rate REAL NOT NULL DEFAULT 0,
    avg_stay_duration REAL NOT NULL DEFAULT 0,
    total_guests INTEGER NOT NULL DEFAULT 0,
    adr REAL NOT NULL DEFAULT 0,
    revpar REAL NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS room_performance (
    id TEXT PRIMARY KEY,
    room_id TEXT NOT NULL,
    room_number TEXT NOT NULL,
    room_type_name TEXT,
    year_month TEXT NOT NULL,
    total_bookings INTEGER NOT NULL DEFAULT 0,
    total_nights_sold INTEGER NOT NULL DEFAULT 0,
    total_revenue REAL NOT NULL DEFAULT 0,
    maintenance_days INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS guest_demographics (
    id TEXT PRIMARY KEY,
    year_month TEXT NOT NULL,
    nationality TEXT NOT NULL,
    guest_count INTEGER NOT NULL DEFAULT 0,
    total_revenue REAL NOT NULL DEFAULT 0,
    avg_stay_nights REAL NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS housekeeping_performance (
    id TEXT PRIMARY KEY,
    staff_id TEXT NOT NULL,
    staff_name TEXT NOT NULL,
    record_date TEXT NOT NULL,
    tasks_completed INTEGER NOT NULL DEFAULT 0,
    avg_duration_minutes REAL NOT NULL DEFAULT 0,
    issues_reported INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_events (
    id TEXT PRIMARY KEY,
    event_type TEXT NOT NULL,
    source_service TEXT NOT NULL,
    performed_by TEXT,
    ip_address TEXT,
    payload TEXT NOT NULL,
    received_at TEXT NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_daily_stats_date ON daily_stats(stat_date);
CREATE INDEX IF NOT EXISTS idx_revenue_date ON revenue_records(record_date);
CREATE INDEX IF NOT EXISTS idx_monthly_ym ON monthly_summary(year_month);
CREATE INDEX IF NOT EXISTS idx_room_perf ON room_performance(room_id, year_month);
CREATE INDEX IF NOT EXISTS idx_guest_demo ON guest_demographics(year_month, nationality);
CREATE INDEX IF NOT EXISTS idx_audit_type ON audit_events(event_type);
