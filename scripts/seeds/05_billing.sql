-- D1 Database: db_billing
-- Seed Data for Payment Methods, Bills, Items, Payments & Invoices

-- 1. Payment Methods
INSERT OR REPLACE INTO payment_methods (id, name, code, is_active, created_at) VALUES
('pm-cash', 'Cash (THB)', 'CASH', 1, '2026-09-01T08:00:00Z'),
('pm-card', 'Credit / Debit Card (Visa, Master, JCB)', 'CARD', 1, '2026-09-01T08:00:00Z'),
('pm-qr', 'PromptPay QR Payment', 'PROMPTPAY', 1, '2026-09-01T08:00:00Z'),
('pm-transfer', 'Direct Bank Transfer', 'TRANSFER', 1, '2026-09-01T08:00:00Z');

-- 2. Bills
INSERT OR REPLACE INTO bills (
  id, bill_number, reservation_id, guest_name, room_number,
  subtotal, discount_amount, tax_rate, tax_amount, service_charge,
  total_amount, deposit_deducted, amount_paid, amount_due, status, created_at, updated_at
) VALUES
-- Bill #1: Ploy Chermarn (Room 203, fully settled upon checkout)
('bill-001', 'BILL-2026-0001', 'res-005', 'Ploy Chermarn', '203',
 14850.00, 0.00, 0.07, 1039.50, 1485.00,
 17374.50, 3000.00, 14374.50, 0.00, 'paid', '2026-09-26T11:15:00Z', '2026-09-26T11:25:00Z'),

-- Bill #2: Sarah Jenkins (Room 202, active stay, pending minibar & checkout)
('bill-002', 'BILL-2026-0002', 'res-001', 'Sarah Jenkins', '202',
 14420.00, 0.00, 0.07, 1009.40, 1442.00,
 16871.40, 3000.00, 0.00, 13871.40, 'pending', '2026-09-24T14:20:00Z', '2026-09-26T10:00:00Z'),

-- Bill #3: Kenji Sato (Room 302, active stay, pending checkout)
('bill-003', 'BILL-2026-0003', 'res-002', 'Kenji Sato', '302',
 23550.00, 1000.00, 0.07, 1578.50, 2255.00,
 26383.50, 5000.00, 0.00, 21383.50, 'pending', '2026-09-25T15:05:00Z', '2026-09-26T10:00:00Z');

-- 3. Bill Items
INSERT OR REPLACE INTO bill_items (id, bill_id, item_type, description, quantity, unit_price, total_price, item_date, created_at) VALUES
-- Bill #1 Items (Room 203)
('bi-001', 'bill-001', 'room_charge', 'Deluxe Sea View (4 nights @ 3,500 THB)', 4, 3500.00, 14000.00, '2026-09-26', '2026-09-26T11:15:00Z'),
('bi-002', 'bill-001', 'minibar', 'Heineken Beer (Can)', 3, 120.00, 360.00, '2026-09-25', '2026-09-26T11:16:00Z'),
('bi-003', 'bill-001', 'minibar', 'Evian Natural Mineral Water 500ml', 3, 80.00, 240.00, '2026-09-25', '2026-09-26T11:16:00Z'),
('bi-004', 'bill-001', 'minibar', 'Roasted Cashew Nuts 80g', 1, 250.00, 250.00, '2026-09-25', '2026-09-26T11:16:00Z'),

-- Bill #2 Items (Room 202)
('bi-005', 'bill-002', 'room_charge', 'Deluxe Sea View (4 nights @ 3,500 THB)', 4, 3500.00, 14000.00, '2026-09-24', '2026-09-24T14:20:00Z'),
('bi-006', 'bill-002', 'minibar', 'Toblerone Chocolate 100g', 2, 110.00, 220.00, '2026-09-25', '2026-09-25T18:00:00Z'),
('bi-007', 'bill-002', 'minibar', 'Evian Natural Mineral Water 500ml', 2, 80.00, 160.00, '2026-09-25', '2026-09-25T18:00:00Z'),
('bi-008', 'bill-002', 'other', 'Laundry Service (Express Shirt)', 1, 40.00, 40.00, '2026-09-26', '2026-09-26T09:00:00Z'),

-- Bill #3 Items (Room 302)
('bi-009', 'bill-003', 'room_charge', 'Executive Suite (4 nights @ 5,800 THB)', 4, 5800.00, 23200.00, '2026-09-25', '2026-09-25T15:05:00Z'),
('bi-010', 'bill-003', 'minibar', 'Imported Red Wine 375ml', 1, 350.00, 350.00, '2026-09-25', '2026-09-25T21:00:00Z');

-- 4. Payments
INSERT OR REPLACE INTO payments (id, bill_id, payment_method_id, amount, reference_number, status, paid_at, created_at) VALUES
('pay-001', 'bill-001', 'pm-card', 14374.50, 'VISA-AUTH-948102', 'completed', '2026-09-26T11:25:00Z', '2026-09-26T11:25:00Z');

-- 5. Invoices
INSERT OR REPLACE INTO invoices (id, invoice_number, bill_id, issued_to_name, issued_to_email, total_amount, status, sent_at, created_at) VALUES
('inv-001', 'INV-2026-0001', 'bill-001', 'Ploy Chermarn', 'ploy.c@example.com', 17374.50, 'issued', '2026-09-26T11:26:00Z', '2026-09-26T11:26:00Z');
