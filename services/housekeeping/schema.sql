-- D1 Database: db_housekeeping
-- Service: @keystay/housekeeping

CREATE TABLE IF NOT EXISTS housekeeping_staff (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    phone TEXT,
    zone TEXT NOT NULL DEFAULT 'All Floors',
    shift TEXT NOT NULL DEFAULT 'day' CHECK(shift IN ('day', 'night')),
    is_active INTEGER NOT NULL DEFAULT 1,
    max_tasks_per_day INTEGER NOT NULL DEFAULT 10,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS housekeeping_tasks (
    id TEXT PRIMARY KEY,
    room_id TEXT NOT NULL,
    room_number TEXT NOT NULL,
    assigned_to TEXT REFERENCES housekeeping_staff(id),
    task_type TEXT NOT NULL DEFAULT 'checkout_clean' CHECK(task_type IN ('checkout_clean', 'daily_clean', 'deep_clean', 'inspection')),
    priority TEXT NOT NULL DEFAULT 'normal' CHECK(priority IN ('urgent', 'high', 'normal', 'low')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'assigned', 'in_progress', 'completed', 'cancelled')),
    notes TEXT,
    scheduled_date TEXT NOT NULL,
    started_at TEXT,
    completed_at TEXT,
    event_source TEXT NOT NULL DEFAULT 'manual',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS room_issues (
    id TEXT PRIMARY KEY,
    task_id TEXT REFERENCES housekeeping_tasks(id),
    room_id TEXT NOT NULL,
    reported_by TEXT NOT NULL REFERENCES housekeeping_staff(id),
    issue_type TEXT NOT NULL CHECK(issue_type IN ('damage', 'missing_item', 'malfunction', 'hygiene')),
    description TEXT NOT NULL,
    photo_r2_key TEXT,
    severity TEXT NOT NULL DEFAULT 'medium' CHECK(severity IN ('low', 'medium', 'high', 'critical')),
    status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open', 'acknowledged', 'resolved')),
    resolved_at TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS housekeeping_schedule (
    id TEXT PRIMARY KEY,
    staff_id TEXT NOT NULL REFERENCES housekeeping_staff(id),
    schedule_date TEXT NOT NULL,
    shift TEXT NOT NULL DEFAULT 'day',
    zone_assigned TEXT NOT NULL,
    is_day_off INTEGER NOT NULL DEFAULT 0,
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

-- 6. Outsource Contacts (คู่ค้า/ช่างซ่อมบำรุง/คนสวนภายนอก)
CREATE TABLE IF NOT EXISTS outsource_contacts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL CHECK(category IN ('air_conditioning', 'plumbing', 'electrical', 'carpentry', 'general_maintenance', 'locksmith', 'pest_control', 'gardening', 'laundry', 'transport', 'cleaning', 'other')),
    service_type TEXT NOT NULL,
    phone_primary TEXT NOT NULL,
    phone_secondary TEXT,
    line_id TEXT,
    is_emergency INTEGER NOT NULL DEFAULT 0,
    available_hours TEXT DEFAULT '24 ชั่วโมง',
    price_rate_note TEXT,
    rating REAL DEFAULT 5.0,
    address TEXT,
    notes TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_by TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tasks_room ON housekeeping_tasks(room_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON housekeeping_tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON housekeeping_tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_date ON housekeeping_tasks(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_room_issues_room ON room_issues(room_id);
CREATE INDEX IF NOT EXISTS idx_room_issues_status ON room_issues(status);
CREATE INDEX IF NOT EXISTS idx_outsource_category ON outsource_contacts(category);
CREATE INDEX IF NOT EXISTS idx_outsource_is_active ON outsource_contacts(is_active);
CREATE INDEX IF NOT EXISTS idx_outsource_is_emergency ON outsource_contacts(is_emergency);
