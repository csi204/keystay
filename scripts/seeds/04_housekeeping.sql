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

-- 5. Outsource Contacts (คู่ค้า/ช่างซ่อมบำรุง/คนสวนภายนอก)
INSERT OR REPLACE INTO outsource_contacts (
  id, name, category, service_type, phone_primary, phone_secondary, line_id,
  is_emergency, available_hours, price_rate_note, rating, address, notes, is_active, created_by, created_at, updated_at
) VALUES
('out-001', 'บจก. สยามแอร์เซอร์วิส', 'air_conditioning', 'ซ่อม/ล้างแอร์ห้องพัก 24 ชม.', '089-999-8888', '02-123-4567', '@siamair24', 1, '24 ชั่วโมง', 'เริ่มต้น 500 บาท/เครื่อง', 4.9, '123/45 ถ.สุขุมวิท กทม.', 'ติดต่อคุณสมศักดิ์ มาถึงภายใน 45 นาที', 1, 'usr-admin-001', '2026-09-01T08:00:00Z', '2026-09-01T08:00:00Z'),
('out-002', 'ช่างต้อย ท่อตันสุขภัณฑ์ด่วน', 'plumbing', 'แก้ท่อตัน ส้วมตัน น้ำรั่วซึม', '081-222-3333', NULL, 'toy_pipe_express', 1, '24 ชั่วโมง', 'ค่าบริการตรวจเช็ค 300 บาท', 4.8, '88 ถ.พหลโยธิน กทม.', 'รับงานฉุกเฉินดึก พกอุปกรณ์พร้อม', 1, 'usr-admin-001', '2026-09-01T08:00:00Z', '2026-09-01T08:00:00Z'),
('out-003', 'สมเกียรติ การไฟฟ้า & ช่างซ่อม', 'electrical', 'ไฟฟ้าลัดวงจร ซ่อมตู้ควบคุม เบรกเกอร์ทริป', '086-444-5555', '086-444-5556', '@somkiat_electric', 1, '24 ชั่วโมง', 'ตามประเมินหน้างาน', 5.0, '55 ซอยอารีย์ กทม.', 'มีใบประกอบวิชาชีพช่างไฟฟ้า', 1, 'usr-admin-001', '2026-09-01T08:00:00Z', '2026-09-01T08:00:00Z'),
('out-004', 'ลุงชาญ คนสวน & ดูแลภูมิทัศน์', 'gardening', 'ตัดแต่งต้นไม้ ปลูกหญ้า ดูแลสวนรอบอาคาร', '087-777-8888', NULL, NULL, 0, '08:00 - 17:00', 'รายวัน 600 บาท/วัน', 4.7, 'ชุมชนข้างโรงแรม', 'เข้างานทุกวันอังคารและศุกร์', 1, 'usr-admin-001', '2026-09-01T08:00:00Z', '2026-09-01T08:00:00Z'),
('out-005', 'ชัยวัฒน์ กุญแจด่วน 24 ชม.', 'locksmith', 'สะเดาะกุญแจ ทำคีย์การ์ดสำรอง ปลดล็อคห้อง', '085-111-9999', NULL, 'chai_key24', 1, '24 ชั่วโมง', 'เริ่มต้น 400 บาท/ครั้ง', 4.9, 'ปากซอยโรงแรม', 'มีมอเตอร์ไซค์มาถึงใน 15 นาที', 1, 'usr-admin-001', '2026-09-01T08:00:00Z', '2026-09-01T08:00:00Z');
