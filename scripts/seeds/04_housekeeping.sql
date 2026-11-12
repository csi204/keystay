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
  scheduled_date, started_at, completed_at, event_source, before_photo_url, after_photo_url, created_at, updated_at
) VALUES
-- Room 203: Checkout clean triggered by checkout event
('hkt-001', 'rm-203', '203', 'hk-staff-001', 'checkout_clean', 'urgent', 'in_progress', 'แขกขอเข้าพักด่วนเวลา 14:00 น. เปลี่ยนผ้าปูและทำความสะอาดห้องน้ำ',
 '2026-09-26', '2026-09-26T11:30:00Z', NULL, 'event_bus', 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800&auto=format&fit=crop&q=80', NULL, '2026-09-26T11:15:00Z', '2026-09-26T11:30:00Z'),

-- Room 104: Routine checkout clean
('hkt-002', 'rm-104', '104', 'hk-staff-001', 'checkout_clean', 'high', 'assigned', 'เปลี่ยนผ้าปูที่นอนและเติมมินิบาร์ให้ครบถ้วน',
 '2026-09-26', NULL, NULL, 'manual', NULL, NULL, '2026-09-26T10:00:00Z', '2026-09-26T10:15:00Z'),

-- Room 305: Deep cleaning
('hkt-003', 'rm-305', '305', 'hk-staff-002', 'deep_clean', 'normal', 'in_progress', 'ซักพรม ขัดระเบียง และเช็ดผ้าม่าน',
 '2026-09-26', '2026-09-26T09:30:00Z', NULL, 'manual', 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&auto=format&fit=crop&q=80', NULL, '2026-09-26T08:30:00Z', '2026-09-26T09:30:00Z'),

-- Room 101: Daily stay-over clean completed with Before/After photos
('hkt-004', 'rm-101', '101', 'hk-staff-001', 'daily_clean', 'normal', 'completed', 'จัดเตียง เช็ดทำความสะอาดห้องน้ำ และเติมของใช้ครบถ้วน ตรวจรับเรียบร้อย',
 '2026-09-26', '2026-09-26T08:45:00Z', '2026-09-26T09:15:00Z', 'manual', 'https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800&auto=format&fit=crop&q=80', 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=800&auto=format&fit=crop&q=80', '2026-09-26T08:00:00Z', '2026-09-26T09:15:00Z'),

-- Room 402: Checkout clean completed with Before/After photos
('hkt-005', 'rm-402', '402', 'hk-staff-002', 'checkout_clean', 'high', 'completed', 'ทำความสะอาดครบวงจร ฉีดพ่นฆ่าเชื้อและจัดเตียงใหม่พร้อมต้อนรับแขก',
 '2026-09-26', '2026-09-26T10:00:00Z', '2026-09-26T10:42:00Z', 'event_bus', 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=800&auto=format&fit=crop&q=80', 'https://images.unsplash.com/photo-1591088398332-8a7791972843?w=800&auto=format&fit=crop&q=80', '2026-09-26T09:45:00Z', '2026-09-26T10:42:00Z');

-- 3. Room Issues (Maintenance & Damages & Lost/Found)
INSERT OR REPLACE INTO room_issues (
  id, task_id, room_id, reported_by, issue_type, description, photo_r2_key, severity, status, resolved_at, created_at
) VALUES
('iss-001', 'hkt-001', 'rm-205', 'hk-staff-001', 'malfunction', 'เครื่องปรับอากาศมีเสียงหวีดและทำความเย็นช้า', 'https://images.unsplash.com/photo-1621905251918-48416bd8575a?w=800&auto=format&fit=crop&q=80', 'high', 'acknowledged', NULL, '2026-09-25T14:00:00Z'),
('iss-002', NULL, 'rm-404', 'hk-staff-002', 'damage', 'ท่อน้ำใต้อ่างอาบน้ำรั่วซึมลงพื้นห้องน้ำ', 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=800&auto=format&fit=crop&q=80', 'critical', 'open', NULL, '2026-09-26T09:00:00Z'),
('iss-003', 'hkt-004', 'rm-101', 'hk-staff-001', 'missing_item', 'พบแว่นกันแดดสีดำตกอยู่ใต้โต๊ะทำงาน (เก็บรักษาไว้ที่เคาน์เตอร์)', 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=800&auto=format&fit=crop&q=80', 'low', 'open', NULL, '2026-09-26T09:10:00Z');

-- 4. Housekeeping Schedule
INSERT OR REPLACE INTO housekeeping_schedule (id, staff_id, schedule_date, shift, zone_assigned, is_day_off, created_at) VALUES
('sch-001', 'hk-staff-001', '2026-09-26', 'day', 'Floors 1-2', 0, '2026-09-20T08:00:00Z'),
('sch-002', 'hk-staff-002', '2026-09-26', 'day', 'Floors 3-4', 0, '2026-09-20T08:00:00Z'),
('sch-003', 'hk-staff-003', '2026-09-26', 'night', 'Floor 5 & Night Duty', 0, '2026-09-20T08:00:00Z');

-- 5. Outsource Contacts (คู่ค้า/ช่างซ่อมบำรุง/คนสวนภายนอก)
INSERT OR REPLACE INTO outsource_contacts (
  id, name, category, categories, service_type, phone_primary, phone_secondary, line_id,
  is_emergency, available_hours, open_time, close_time, price_rate_note, rating, address, notes, is_active, created_by, created_at, updated_at
) VALUES
('out-001', 'บจก. สยามแอร์เซอร์วิส', 'air_conditioning', '["air_conditioning"]', 'ซ่อม/ล้างแอร์ห้องพัก 24 ชม.', '089-999-8888', '02-123-4567', '@siamair24', 1, '24 ชั่วโมง', '00:00', '23:59', 'เริ่มต้น 500 บาท/เครื่อง', 4.9, '123/45 ถ.สุขุมวิท กทม.', 'ติดต่อคุณสมศักดิ์ มาถึงภายใน 45 นาที', 1, 'usr-admin-001', '2026-09-01T08:00:00Z', '2026-09-01T08:00:00Z'),
('out-002', 'ช่างต้อย ท่อตันสุขภัณฑ์ด่วน', 'plumbing', '["plumbing"]', 'แก้ท่อตัน ส้วมตัน น้ำรั่วซึม', '081-222-3333', NULL, 'toy_pipe_express', 1, '24 ชั่วโมง', '00:00', '23:59', 'ค่าบริการตรวจเช็ค 300 บาท', 4.8, '88 ถ.พหลโยธิน กทม.', 'รับงานฉุกเฉินดึก พกอุปกรณ์พร้อม', 1, 'usr-admin-001', '2026-09-01T08:00:00Z', '2026-09-01T08:00:00Z'),
('out-003', 'สมเกียรติ การไฟฟ้า & ช่างซ่อม', 'electrical', '["electrical","general_maintenance"]', 'ไฟฟ้าลัดวงจร ซ่อมตู้ควบคุม เบรกเกอร์ทริป', '086-444-5555', '086-444-5556', '@somkiat_electric', 1, '24 ชั่วโมง', '00:00', '23:59', 'ตามประเมินหน้างาน', 5.0, '55 ซอยอารีย์ กทม.', 'มีใบประกอบวิชาชีพช่างไฟฟ้า', 1, 'usr-admin-001', '2026-09-01T08:00:00Z', '2026-09-01T08:00:00Z'),
('out-004', 'ลุงชาญ คนสวน & ดูแลภูมิทัศน์', 'gardening', '["gardening"]', 'ตัดแต่งต้นไม้ ปลูกหญ้า ดูแลสวนรอบอาคาร', '087-777-8888', NULL, NULL, 0, '08:00 - 17:00', '08:00', '17:00', 'รายวัน 600 บาท/วัน', 4.7, 'ชุมชนข้างโรงแรม', 'เข้างานทุกวันอังคารและศุกร์', 1, 'usr-admin-001', '2026-09-01T08:00:00Z', '2026-09-01T08:00:00Z'),
('out-005', 'ชัยวัฒน์ กุญแจด่วน 24 ชม.', 'locksmith', '["locksmith"]', 'สะเดาะกุญแจ ทำคีย์การ์ดสำรอง ปลดล็อคห้อง', '085-111-9999', NULL, 'chai_key24', 1, '24 ชั่วโมง', '00:00', '23:59', 'เริ่มต้น 400 บาท/ครั้ง', 4.9, 'ปากซอยโรงแรม', 'มีมอเตอร์ไซค์มาถึงใน 15 นาที', 1, 'usr-admin-001', '2026-09-01T08:00:00Z', '2026-09-01T08:00:00Z');

-- 6. Task Templates (แม่แบบงานมาตรฐานสำหรับแม่บ้านโรงแรม)
INSERT OR REPLACE INTO task_templates (
  id, name, task_type, default_priority, estimated_minutes, description, checklist_items, is_active, created_at, updated_at
) VALUES
('tt-001', 'ทำความสะอาดหลัง Checkout มาตรฐาน', 'checkout_clean', 'high', 45, 'เปลี่ยนผ้าปูเตียง ทำความสะอาดห้องน้ำ เช็ดฝุ่น เปลี่ยนผ้าเช็ดตัว เติมสบู่และน้ำดื่ม',
 '[{"id":"linen","label":"เปลี่ยนผ้าปูที่นอน ปลอกหมอน และปลอกผ้านวมชุดใหม่","sublabel":"ใช้ผ้าซักฆ่าเชื้อ สะอาด ไร้รอยเปื้อน และกลิ่นอับ","zone":"bedroom"},{"id":"bedTuck","label":"ดึงผ้าปูตึง ตบหมอนฟู จัดมุมเตียง 45 องศาสวยงาม","sublabel":"มาตรฐานความตึงระดับโรงแรม เรียบกริบไร้รอยย่น","zone":"bedroom"},{"id":"dusting","label":"เช็ดฝุ่นโต๊ะข้างเตียง โต๊ะทำงาน หัวเตียง และโคมไฟ","sublabel":"ใช้ผ้าไมโครไฟเบอร์ชุบน้ำยาเฉพาะ ไม่ทิ้งคราบ","zone":"bedroom"},{"id":"floorClean","label":"ดูดฝุ่น กวาด และถูพื้นห้องนอนรวมถึงใต้เตียง","sublabel":"ตรวจเช็คไม่มีเศษเส้นผมหรือสิ่งสกปรกตกค้าง","zone":"bedroom"},{"id":"toiletSanitize","label":"ขัดล้างและฆ่าเชื้อโถสุขภัณฑ์ อ่างล้างหน้า และฝักบัว","sublabel":"ใช้น้ำยาฆ่าเชื้อแบคทีเรียและเช็ดแห้งสนิท","zone":"bathroom"},{"id":"glassMirror","label":"เช็ดกระจกเงาและกระจกกั้นโซนเปียกใสไร้คราบน้ำ","sublabel":"ไร้คราบสบู่ ละอองน้ำ และรอยนิ้วมือ","zone":"bathroom"},{"id":"towelsReplace","label":"จัดชุดผ้าเช็ดตัว ผ้าเช็ดหน้า และพรมเท้าเซ็ตใหม่","sublabel":"พับวางเรียงตามตำแหน่งมาตรฐานโรงแรมครบชุด","zone":"bathroom"},{"id":"amenitiesRefill","label":"เติมสบู่ แชมพู ครีมนวด แปรงสีฟัน และหมวกคลุมผม","sublabel":"เช็คซีลและแพ็กเกจจิ้งสมบูรณ์ วางบนถาดอะเมนิตี้","zone":"bathroom"},{"id":"minibarRefill","label":"ตรวจเช็คและเติมมินิบาร์ครบเซ็ตแล้ว (พร้อมปล่อยห้อง)","sublabel":"เครื่องดื่ม ขนมขบเคี้ยวในตู้เย็น และเบียร์ครบจำนวนตามมาตรฐาน","zone":"minibar"},{"id":"waterKettle","label":"ล้างแก้วน้ำ กาน้ำร้อน และเติมน้ำดื่ม Keystay 2 ขวด","sublabel":"แก้วคว่ำบนถาดรองสะอาดพร้อมฝาครอบแก้ว","zone":"minibar"},{"id":"trashEmptied","label":"เทถังขยะและใส่ถุงขยะใหม่ทุกจุด (ห้องนอน & ห้องน้ำ)","sublabel":"เช็ดถังขยะให้สะอาดและแห้งสนิททั้งภายนอกและภายใน","zone":"final_inspection"},{"id":"acRemoteSpray","label":"ทดสอบแอร์ ทีวี ปิดผ้าม่าน และฉีดสเปรย์ปรับอากาศ","sublabel":"กลิ่นหอมสะอาดสดชื่น บรรยากาศพร้อมต้อนรับแขกใหม่","zone":"final_inspection"}]',
 1, '2026-09-01T08:00:00Z', '2026-09-01T08:00:00Z'),
('tt-002', 'ทำความสะอาดระหว่างพัก (Stayover)', 'stayover_clean', 'normal', 20, 'จัดเตียง ทำความสะอาดห้องน้ำ เติมของใช้ในห้อง เก็บขยะ',
 '[{"id":"stayover_bed","label":"จัดเตียงและดึงผ้าปูที่นอนให้ตึงเรียบร้อย","sublabel":"จัดหมอนและผ้าห่มให้เป็นระเบียบ","zone":"bedroom"},{"id":"stayover_bath","label":"เช็ดทำความสะอาดอ่างล้างหน้า โถสุขภัณฑ์ และเปลี่ยนผ้าเช็ดตัว","sublabel":"เติมสบู่และแชมพูที่พร่อง","zone":"bathroom"},{"id":"stayover_trash","label":"เก็บขยะและเปลี่ยนถุงขยะใหม่ทุกจุด","sublabel":"ทั้งในห้องนอนและห้องน้ำ","zone":"final_inspection"},{"id":"stayover_water","label":"เติมน้ำดื่ม Keystay ประจำวัน 2 ขวด","sublabel":"วางคู่กับแก้วน้ำสะอาด","zone":"minibar"}]',
 1, '2026-09-01T08:00:00Z', '2026-09-01T08:00:00Z'),
('tt-003', 'Deep Clean รายเดือน', 'deep_clean', 'normal', 120, 'ทำความสะอาดทุกซอก เช็ดกระจก ซักผ้าม่าน ทำความสะอาดเครื่องปรับอากาศ ขัดระเบียง',
 '[{"id":"deep_curtain","label":"ซักและดูดฝุ่นผ้าม่านทั้งห้อง","sublabel":"ตรวจเช็ครางม่านและตัวเกี่ยว","zone":"bedroom"},{"id":"deep_carpet","label":"ซักพรมและดูดไรฝุ่นที่นอนอย่างละเอียด","sublabel":"ใช้น้ำยาซักพรมฆ่าเชื้อโรค","zone":"bedroom"},{"id":"deep_ac","label":"ถอดล้างแผ่นกรองเครื่องปรับอากาศและเช็ดหน้ากากแอร์","sublabel":"เช็คระบบระบายน้ำทิ้ง","zone":"bedroom"},{"id":"deep_balcony","label":"ขัดล้างพื้นระเบียงและเช็ดกระจกภายนอก","sublabel":"เช็ดราวกันตกและโต๊ะระเบียง","zone":"final_inspection"},{"id":"deep_grout","label":"ขัดคราบยาแนวและกระเบื้องห้องน้ำทั้งห้อง","sublabel":"ขจัดคราบหินปูนและตะกรัน","zone":"bathroom"}]',
 1, '2026-09-01T08:00:00Z', '2026-09-01T08:00:00Z'),
('tt-004', 'ตรวจสอบห้องก่อน Check-in', 'inspection', 'urgent', 15, 'ตรวจอุปกรณ์ไฟฟ้า เช็คห้องน้ำ ตรวจมินิบาร์ ตรวจความเรียบร้อยและฉีดสเปรย์ปรับอากาศ',
 '[{"id":"insp_elec","label":"ทดสอบระบบไฟฟ้า แอร์ ทีวี และคีย์การ์ด","sublabel":"ไฟติดครบทุกดวง รีโมทใช้งานได้","zone":"bedroom"},{"id":"insp_plumb","label":"ตรวจเช็คน้ำไหลแรง ท่อไม่ตัน ชักโครกกดทำงานปกติ","sublabel":"ไม่มีน้ำรั่วซึม","zone":"bathroom"},{"id":"insp_minibar","label":"ตรวจเช็คสต็อกมินิบาร์และวันหมดอายุสินค้า","sublabel":"สินค้าเรียงสวยงามตรงป้ายราคา","zone":"minibar"},{"id":"insp_scent","label":"ตรวจกลิ่นอับและความสะอาด ฉีดสเปรย์ปรับอากาศ","sublabel":"อุณหภูมิห้อง 24 องศาพร้อมรับแขก","zone":"final_inspection"}]',
 1, '2026-09-01T08:00:00Z', '2026-09-01T08:00:00Z');


