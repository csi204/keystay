-- D1 Database: db_housekeeping
-- Seed Data for Housekeeping Staff, Tasks, Issues & Schedules

-- 1. Housekeeping Staff
INSERT OR REPLACE INTO housekeeping_staff (id, user_id, first_name, last_name, phone, zone, shift, is_active, max_tasks_per_day, created_at, updated_at) VALUES
('hk-staff-001', 'usr-hk-004', 'Somchai', 'Clean', '089-111-2222', 'Floors 1-2', 'day', 1, 10, '2026-09-01T08:00:00Z', '2026-09-26T10:00:00Z'),
('hk-staff-002', 'usr-hk-005', 'Malee', 'Ruangrot', '089-333-4444', 'Floors 3-4', 'day', 1, 10, '2026-09-01T08:00:00Z', '2026-09-26T10:00:00Z'),
('hk-staff-003', 'usr-hk-006', 'Wichai', 'Saetang', '089-555-6666', 'Floor 5 & Night Duty', 'night', 1, 8, '2026-09-01T08:00:00Z', '2026-09-26T10:00:00Z');

-- 2. Housekeeping Tasks
INSERT OR REPLACE INTO housekeeping_tasks (
  id, room_id, room_number, assigned_to, task_type, priority, status, notes,
  scheduled_date, started_at, completed_at, event_source, created_at, updated_at
) VALUES
-- Room 203: Checkout clean triggered by checkout event
('hkt-001', 'rm-203', '203', 'hk-staff-001', 'checkout_clean', 'urgent', 'in_progress', 'Priority clean: guest arriving at 2 PM',
 '2026-09-26', '2026-09-26T11:30:00Z', NULL, 'event_bus', '2026-09-26T11:15:00Z', '2026-09-26T11:30:00Z'),

-- Room 104: Routine checkout clean
('hkt-002', 'rm-104', '104', 'hk-staff-001', 'checkout_clean', 'high', 'assigned', 'Replace bed linens and restock minibar',
 '2026-09-26', NULL, NULL, 'manual', '2026-09-26T10:00:00Z', '2026-09-26T10:15:00Z'),

-- Room 305: Deep cleaning
('hkt-003', 'rm-305', '305', 'hk-staff-002', 'deep_clean', 'normal', 'in_progress', 'Carpet shampoo and balcony glass polish',
 '2026-09-26', '2026-09-26T09:30:00Z', NULL, 'manual', '2026-09-26T08:30:00Z', '2026-09-26T09:30:00Z'),

-- Room 101: Daily stay-over clean completed earlier today
('hkt-004', 'rm-101', '101', 'hk-staff-001', 'daily_clean', 'normal', 'completed', 'Standard daily refresh passed inspection',
 '2026-09-26', '2026-09-26T08:45:00Z', '2026-09-26T09:15:00Z', 'manual', '2026-09-26T08:00:00Z', '2026-09-26T09:15:00Z');

-- 3. Room Issues (Maintenance & Damages)
INSERT OR REPLACE INTO room_issues (
  id, task_id, room_id, reported_by, issue_type, description, photo_r2_key, severity, status, resolved_at, created_at
) VALUES
('iss-001', NULL, 'rm-205', 'hk-staff-001', 'malfunction', 'Air conditioning unit making whistling noise and cooling slowly', 'photos/issues/rm205-ac.jpg', 'high', 'acknowledged', NULL, '2026-09-25T14:00:00Z'),
('iss-002', NULL, 'rm-404', 'hk-staff-002', 'damage', 'Bathtub drain pipe leaking onto bathroom floor', 'photos/issues/rm404-pipe.jpg', 'critical', 'open', NULL, '2026-09-26T09:00:00Z');

-- 4. Housekeeping Schedule
INSERT OR REPLACE INTO housekeeping_schedule (id, staff_id, schedule_date, shift, zone_assigned, is_day_off, created_at) VALUES
('sch-001', 'hk-staff-001', '2026-09-26', 'day', 'Floors 1-2', 0, '2026-09-20T08:00:00Z'),
('sch-002', 'hk-staff-002', '2026-09-26', 'day', 'Floors 3-4', 0, '2026-09-20T08:00:00Z'),
('sch-003', 'hk-staff-003', '2026-09-26', 'night', 'Floor 5 & Night Duty', 0, '2026-09-20T08:00:00Z');
