-- D1 Database: db_report
-- Seed Data for Analytics, Daily Stats, KPIs, Room Performance & Demographics

-- 1. Daily Stats (Last 7 Days)
INSERT OR REPLACE INTO daily_stats (
  id, stat_date, total_rooms, occupied_rooms, available_rooms, reserved_rooms, maintenance_rooms,
  occupancy_rate, total_checkins, total_checkouts, total_cancellations, total_walk_ins,
  total_revenue, room_revenue, minibar_revenue, created_at, updated_at
) VALUES
('ds-20260920', '2026-09-20', 22, 14, 6, 1, 1, 63.64, 4, 3, 0, 1, 48200.00, 44800.00, 3400.00, '2026-09-20T23:59:59Z', '2026-09-20T23:59:59Z'),
('ds-20260921', '2026-09-21', 22, 15, 5, 1, 1, 68.18, 5, 4, 1, 0, 52400.00, 48900.00, 3500.00, '2026-09-21T23:59:59Z', '2026-09-21T23:59:59Z'),
('ds-20260922', '2026-09-22', 22, 16, 4, 1, 1, 72.73, 6, 5, 0, 2, 61500.00, 57200.00, 4300.00, '2026-09-22T23:59:59Z', '2026-09-22T23:59:59Z'),
('ds-20260923', '2026-09-23', 22, 18, 2, 1, 1, 81.82, 7, 5, 0, 1, 95300.00, 89500.00, 5800.00, '2026-09-23T23:59:59Z', '2026-09-23T23:59:59Z'),
('ds-20260924', '2026-09-24', 22, 17, 3, 1, 1, 77.27, 4, 5, 1, 0, 78600.00, 73400.00, 5200.00, '2026-09-24T23:59:59Z', '2026-09-24T23:59:59Z'),
('ds-20260925', '2026-09-25', 22, 16, 4, 1, 1, 72.73, 5, 6, 0, 1, 69400.00, 64900.00, 4500.00, '2026-09-25T23:59:59Z', '2026-09-25T23:59:59Z'),
('ds-20260926', '2026-09-26', 22, 15, 4, 2, 1, 68.18, 3, 4, 0, 0, 62100.00, 58200.00, 3900.00, '2026-09-26T22:00:00Z', '2026-09-26T22:00:00Z');

-- 2. Monthly Summary (Q3 2026)
INSERT OR REPLACE INTO monthly_summary (
  id, year_month, total_revenue, net_revenue, avg_occupancy_rate,
  total_reservations, cancellation_rate, avg_stay_duration, total_guests,
  adr, revpar, created_at, updated_at
) VALUES
('ms-2026-07', '2026-07', 1650000.00, 1534500.00, 71.4, 142, 4.2, 3.2, 298, 3850.00, 2748.90, '2026-08-01T00:00:00Z', '2026-08-01T00:00:00Z'),
('ms-2026-08', '2026-08', 1890000.00, 1757700.00, 78.6, 168, 3.5, 3.4, 345, 3980.00, 3128.28, '2026-09-01T00:00:00Z', '2026-09-01T00:00:00Z'),
('ms-2026-09', '2026-09', 1720000.00, 1599600.00, 74.2, 155, 3.8, 3.3, 312, 4020.00, 2982.84, '2026-09-26T22:00:00Z', '2026-09-26T22:00:00Z');

-- 3. Room Performance (September 2026)
INSERT OR REPLACE INTO room_performance (
  id, room_id, room_number, room_type_name, year_month, total_bookings,
  total_nights_sold, total_revenue, maintenance_days, created_at, updated_at
) VALUES
('rp-501-09', 'rm-501', '501', 'Presidential Villa', '2026-09', 4, 21, 262500.00, 0, '2026-09-26T22:00:00Z', '2026-09-26T22:00:00Z'),
('rp-302-09', 'rm-302', '302', 'Executive Suite', '2026-09', 6, 20, 116000.00, 0, '2026-09-26T22:00:00Z', '2026-09-26T22:00:00Z'),
('rp-202-09', 'rm-202', '202', 'Deluxe Sea View', '2026-09', 7, 22, 77000.00, 0, '2026-09-26T22:00:00Z', '2026-09-26T22:00:00Z'),
('rp-101-09', 'rm-101', '101', 'Standard Room', '2026-09', 8, 19, 41800.00, 1, '2026-09-26T22:00:00Z', '2026-09-26T22:00:00Z'),
('rp-205-09', 'rm-205', '205', 'Deluxe Sea View', '2026-09', 5, 14, 49000.00, 3, '2026-09-26T22:00:00Z', '2026-09-26T22:00:00Z');

-- 4. Guest Demographics (September 2026)
INSERT OR REPLACE INTO guest_demographics (
  id, year_month, nationality, guest_count, total_revenue, avg_stay_nights, created_at, updated_at
) VALUES
('gd-01', '2026-09', 'Thailand', 132, 620000.00, 2.4, '2026-09-26T22:00:00Z', '2026-09-26T22:00:00Z'),
('gd-02', '2026-09', 'United States', 48, 380000.00, 4.6, '2026-09-26T22:00:00Z', '2026-09-26T22:00:00Z'),
('gd-03', '2026-09', 'Germany', 42, 345000.00, 5.1, '2026-09-26T22:00:00Z', '2026-09-26T22:00:00Z'),
('gd-04', '2026-09', 'Japan', 38, 245000.00, 3.2, '2026-09-26T22:00:00Z', '2026-09-26T22:00:00Z'),
('gd-05', '2026-09', 'Singapore', 26, 130000.00, 2.8, '2026-09-26T22:00:00Z', '2026-09-26T22:00:00Z');

-- 5. Housekeeping Performance (Today)
INSERT OR REPLACE INTO housekeeping_performance (
  id, staff_id, staff_name, record_date, tasks_completed, avg_duration_minutes, issues_reported, created_at, updated_at
) VALUES
('hp-01', 'hk-staff-001', 'Somchai Clean', '2026-09-26', 7, 28.5, 1, '2026-09-26T22:00:00Z', '2026-09-26T22:00:00Z'),
('hp-02', 'hk-staff-002', 'Malee Ruangrot', '2026-09-26', 6, 32.0, 1, '2026-09-26T22:00:00Z', '2026-09-26T22:00:00Z'),
('hp-03', 'hk-staff-003', 'Wichai Saetang', '2026-09-26', 4, 35.2, 0, '2026-09-26T22:00:00Z', '2026-09-26T22:00:00Z');

-- 6. Revenue Records (Sample Transactions)
INSERT OR REPLACE INTO revenue_records (
  id, record_date, reservation_id, bill_id, room_type_name, revenue_type, amount, payment_method, created_at
) VALUES
('rev-001', '2026-09-26', 'res-005', 'bill-001', 'Deluxe Sea View', 'room_charge', 14000.00, 'CARD', '2026-09-26T11:25:00Z'),
('rev-002', '2026-09-26', 'res-005', 'bill-001', 'Deluxe Sea View', 'minibar', 850.00, 'CARD', '2026-09-26T11:25:00Z');

-- 7. Audit Events
INSERT OR REPLACE INTO audit_events (
  id, event_type, source_service, performed_by, ip_address, payload, received_at
) VALUES
('aud-001', 'ReservationCheckedIn', 'reservation', 'usr-fd-003', '10.0.1.42', '{"reservationId":"res-001","roomNumber":"202"}', '2026-09-24T14:20:00Z'),
('aud-002', 'ReservationCheckedOut', 'reservation', 'usr-fd-003', '10.0.1.42', '{"reservationId":"res-005","roomNumber":"203"}', '2026-09-26T11:15:00Z'),
('aud-003', 'BillPaid', 'billing', 'usr-fd-003', '10.0.1.42', '{"billId":"bill-001","amount":14374.50}', '2026-09-26T11:25:00Z');
