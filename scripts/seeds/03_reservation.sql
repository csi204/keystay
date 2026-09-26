-- D1 Database: db_reservation
-- Seed Data for Guests & Reservations

-- 1. Guests
INSERT OR REPLACE INTO guests (id, first_name, last_name, email, phone, id_card_number, nationality, address, notes, total_stays, created_at, updated_at) VALUES
('gst-001', 'Natthapong', 'Techasorn', 'natthapong.t@example.com', '081-234-5678', '1100400123456', 'Thai', '123 Sukhumvit Rd, Bangkok 10110', 'Preferred high floor and quiet room', 2, '2026-09-01T08:00:00Z', '2026-09-26T10:00:00Z'),
('gst-002', 'Sarah', 'Jenkins', 'sarah.jenkins@example.com', '+1-555-0199', 'PASSPORT-USA-884210', 'American', '450 California St, San Francisco, CA', 'Celebrating wedding anniversary', 1, '2026-09-01T08:00:00Z', '2026-09-26T10:00:00Z'),
('gst-003', 'Kenji', 'Sato', 'kenji.sato@example.jp', '+81-90-1234-5678', 'PASSPORT-JPN-472911', 'Japanese', 'Chiyoda-ku, Tokyo, Japan', 'Requires non-smoking, extra pillows', 3, '2026-09-01T08:00:00Z', '2026-09-26T10:00:00Z'),
('gst-004', 'Hans', 'Mueller', 'hans.mueller@example.de', '+49-170-5551234', 'PASSPORT-DEU-992144', 'German', 'Maximilianstrasse 14, Munich, Germany', 'VIP guest — likes sparkling water', 5, '2026-09-01T08:00:00Z', '2026-09-26T10:00:00Z'),
('gst-005', 'Ploy', 'Chermarn', 'ploy.c@example.com', '089-876-5432', '3100500987654', 'Thai', '88 Nimman Rd, Chiang Mai 50200', 'Regular business traveler', 4, '2026-09-01T08:00:00Z', '2026-09-26T10:00:00Z'),
('gst-006', 'David', 'Tan', 'david.tan@example.sg', '+65-9123-4567', 'PASSPORT-SGP-112233', 'Singaporean', 'Marina Boulevard, Singapore', 'Early check-in requested (11:00 AM)', 1, '2026-09-01T08:00:00Z', '2026-09-26T10:00:00Z');

-- 2. Reservations
INSERT OR REPLACE INTO reservations (
  id, reservation_code, guest_id, room_id, room_number, room_type_name,
  status, booking_type, check_in_date, check_out_date, actual_check_in, actual_check_out,
  num_guests, nightly_rate, total_nights, subtotal, discount_amount, tax_amount, deposit_amount,
  total_amount, special_requests, created_by, created_at, updated_at
) VALUES
-- Sarah Jenkins in Room 202 (Deluxe Sea View, currently occupied)
('res-001', 'RES-2026-1001', 'gst-002', 'rm-202', '202', 'Deluxe Sea View',
 'checked_in', 'advance', '2026-09-24', '2026-09-28', '2026-09-24T14:20:00Z', NULL,
 2, 3500.00, 4, 14000.00, 0, 980.00, 3000.00,
 14980.00, 'Ocean view king bed requested', 'usr-fd-003', '2026-09-15T09:00:00Z', '2026-09-24T14:20:00Z'),

-- Kenji Sato in Room 302 (Executive Suite, currently occupied)
('res-002', 'RES-2026-1002', 'gst-003', 'rm-302', '302', 'Executive Suite',
 'checked_in', 'advance', '2026-09-25', '2026-09-29', '2026-09-25T15:05:00Z', NULL,
 2, 5800.00, 4, 23200.00, 1000.00, 1554.00, 5000.00,
 23754.00, 'Extra towels and quiet room', 'usr-fd-003', '2026-09-18T11:30:00Z', '2026-09-25T15:05:00Z'),

-- Hans Mueller in Room 501 (Presidential Villa, currently occupied)
('res-003', 'RES-2026-1003', 'gst-004', 'rm-501', '501', 'Presidential Villa',
 'checked_in', 'advance', '2026-09-23', '2026-09-30', '2026-09-23T13:45:00Z', NULL,
 4, 12500.00, 7, 87500.00, 5000.00, 5775.00, 20000.00,
 88275.00, 'Private butler setup & Champagne on arrival', 'usr-mgr-002', '2026-09-10T14:00:00Z', '2026-09-23T13:45:00Z'),

-- Natthapong Techasorn in Room 102 (Standard Room, confirmed for tomorrow)
('res-004', 'RES-2026-1004', 'gst-001', 'rm-102', '102', 'Standard Room',
 'confirmed', 'advance', '2026-09-27', '2026-09-29', NULL, NULL,
 1, 2200.00, 2, 4400.00, 0, 308.00, 1000.00,
 4708.00, 'Late check-in around 8 PM', 'usr-fd-003', '2026-09-20T16:00:00Z', '2026-09-20T16:00:00Z'),

-- Ploy Chermarn in Room 203 (Deluxe Sea View, just checked out today)
('res-005', 'RES-2026-1005', 'gst-005', 'rm-203', '203', 'Deluxe Sea View',
 'checked_out', 'advance', '2026-09-22', '2026-09-26', '2026-09-22T14:10:00Z', '2026-09-26T11:15:00Z',
 2, 3500.00, 4, 14000.00, 0, 980.00, 3000.00,
 14980.00, 'Bill split requested', 'usr-fd-003', '2026-09-12T10:15:00Z', '2026-09-26T11:15:00Z'),

-- David Tan in Room 304 (Executive Suite, confirmed for next week)
('res-006', 'RES-2026-1006', 'gst-006', 'rm-304', '304', 'Executive Suite',
 'confirmed', 'advance', '2026-09-28', '2026-10-02', NULL, NULL,
 2, 5800.00, 4, 23200.00, 0, 1624.00, 5000.00,
 24824.00, 'Early check-in 11 AM if possible', 'usr-fd-003', '2026-09-22T13:00:00Z', '2026-09-22T13:00:00Z');

-- 3. Reservation History (Sample audit trail)
INSERT OR REPLACE INTO reservation_history (id, reservation_id, action, previous_data, new_data, performed_by, created_at) VALUES
('rh-001', 'res-001', 'check_in', '{"status":"confirmed"}', '{"status":"checked_in","actual_check_in":"2026-09-24T14:20:00Z"}', 'usr-fd-003', '2026-09-24T14:20:00Z'),
('rh-002', 'res-005', 'check_out', '{"status":"checked_in"}', '{"status":"checked_out","actual_check_out":"2026-09-26T11:15:00Z"}', 'usr-fd-003', '2026-09-26T11:15:00Z');
