-- D1 Database: db_room
-- Seed Data for Room Inventory, Types, Floors, Amenities & Rooms

-- 1. Room Types
INSERT OR REPLACE INTO room_types (id, name, description, base_price, max_occupancy, bed_type, size_sqm, created_at, updated_at) VALUES
('rt-std', 'Standard Room', 'Comfortable modern room with city view, work desk, and private ensuite bathroom.', 2200.00, 2, 'Queen Bed', 28.0, '2026-09-01T08:00:00Z', '2026-09-01T08:00:00Z'),
('rt-dlx', 'Deluxe Sea View', 'Spacious room featuring private balcony with panoramic ocean views and marble bathroom.', 3500.00, 2, 'King Bed', 38.0, '2026-09-01T08:00:00Z', '2026-09-01T08:00:00Z'),
('rt-ste', 'Executive Suite', 'Luxurious corner suite with separate living area, dining table, and deep soaking bathtub.', 5800.00, 4, 'King Bed + Sofa Bed', 65.0, '2026-09-01T08:00:00Z', '2026-09-01T08:00:00Z'),
('rt-prs', 'Presidential Villa', 'The pinnacle of luxury with private plunge pool, master jacuzzi, 2 bedrooms, and butler service.', 12500.00, 6, '2 King Beds', 140.0, '2026-09-01T08:00:00Z', '2026-09-01T08:00:00Z');

-- 2. Floors
INSERT OR REPLACE INTO floors (id, floor_number, name, total_rooms, created_at) VALUES
('fl-1', 1, 'Floor 1 — Lobby & Garden Wing', 5, '2026-09-01T08:00:00Z'),
('fl-2', 2, 'Floor 2 — Ocean Wing', 5, '2026-09-01T08:00:00Z'),
('fl-3', 3, 'Floor 3 — Horizon Wing', 5, '2026-09-01T08:00:00Z'),
('fl-4', 4, 'Floor 4 — Executive Club Level', 5, '2026-09-01T08:00:00Z'),
('fl-5', 5, 'Floor 5 — Penthouse Residences', 2, '2026-09-01T08:00:00Z');

-- 3. Rooms
INSERT OR REPLACE INTO rooms (id, room_number, room_type_id, floor_id, status, is_active, notes, created_at, updated_at) VALUES
('rm-101', '101', 'rt-std', 'fl-1', 'available', 1, 'Near garden pathway', '2026-09-01T08:00:00Z', '2026-09-26T10:00:00Z'),
('rm-102', '102', 'rt-std', 'fl-1', 'reserved', 1, 'Late check-in guest', '2026-09-01T08:00:00Z', '2026-09-26T10:00:00Z'),
('rm-103', '103', 'rt-std', 'fl-1', 'occupied', 1, 'Family with infant', '2026-09-01T08:00:00Z', '2026-09-26T10:00:00Z'),
('rm-104', '104', 'rt-std', 'fl-1', 'cleaning', 1, 'Priority checkout clean', '2026-09-01T08:00:00Z', '2026-09-26T10:00:00Z'),
('rm-105', '105', 'rt-std', 'fl-1', 'available', 1, 'Accessible room', '2026-09-01T08:00:00Z', '2026-09-26T10:00:00Z'),

('rm-201', '201', 'rt-dlx', 'fl-2', 'available', 1, 'Ocean front', '2026-09-01T08:00:00Z', '2026-09-26T10:00:00Z'),
('rm-202', '202', 'rt-dlx', 'fl-2', 'occupied', 1, 'Guest Sarah Jenkins', '2026-09-01T08:00:00Z', '2026-09-26T10:00:00Z'),
('rm-203', '203', 'rt-dlx', 'fl-2', 'checked_out', 1, 'Awaiting housekeeping inspect', '2026-09-01T08:00:00Z', '2026-09-26T10:00:00Z'),
('rm-204', '204', 'rt-dlx', 'fl-2', 'available', 1, 'Balcony terrace', '2026-09-01T08:00:00Z', '2026-09-26T10:00:00Z'),
('rm-205', '205', 'rt-dlx', 'fl-2', 'maintenance', 1, 'AC fan replacement', '2026-09-01T08:00:00Z', '2026-09-26T10:00:00Z'),

('rm-301', '301', 'rt-dlx', 'fl-3', 'available', 1, 'Quiet zone', '2026-09-01T08:00:00Z', '2026-09-26T10:00:00Z'),
('rm-302', '302', 'rt-ste', 'fl-3', 'occupied', 1, 'Guest Kenji Sato', '2026-09-01T08:00:00Z', '2026-09-26T10:00:00Z'),
('rm-303', '303', 'rt-dlx', 'fl-3', 'available', 1, 'Sunset view', '2026-09-01T08:00:00Z', '2026-09-26T10:00:00Z'),
('rm-304', '304', 'rt-ste', 'fl-3', 'reserved', 1, 'VIP David Tan arriving tomorrow', '2026-09-01T08:00:00Z', '2026-09-26T10:00:00Z'),
('rm-305', '305', 'rt-dlx', 'fl-3', 'cleaning', 1, 'Deep cleaning routine', '2026-09-01T08:00:00Z', '2026-09-26T10:00:00Z'),

('rm-401', '401', 'rt-ste', 'fl-4', 'available', 1, 'Corner executive', '2026-09-01T08:00:00Z', '2026-09-26T10:00:00Z'),
('rm-402', '402', 'rt-ste', 'fl-4', 'occupied', 1, 'Long stay corporate', '2026-09-01T08:00:00Z', '2026-09-26T10:00:00Z'),
('rm-403', '403', 'rt-ste', 'fl-4', 'available', 1, 'Executive lounge access', '2026-09-01T08:00:00Z', '2026-09-26T10:00:00Z'),
('rm-404', '404', 'rt-ste', 'fl-4', 'out_of_order', 1, 'Plumbing maintenance', '2026-09-01T08:00:00Z', '2026-09-26T10:00:00Z'),
('rm-405', '405', 'rt-ste', 'fl-4', 'available', 1, 'High floor panoramic', '2026-09-01T08:00:00Z', '2026-09-26T10:00:00Z'),

('rm-501', '501', 'rt-prs', 'fl-5', 'occupied', 1, 'Guest Hans Mueller', '2026-09-01T08:00:00Z', '2026-09-26T10:00:00Z'),
('rm-502', '502', 'rt-prs', 'fl-5', 'available', 1, 'Presidential Penthouse East', '2026-09-01T08:00:00Z', '2026-09-26T10:00:00Z');

-- 4. Room Amenities
INSERT OR REPLACE INTO room_amenities (id, room_id, amenity_name, description, created_at) VALUES
('am-01', 'rm-101', 'Wi-Fi 6', 'Complimentary 500Mbps High-Speed Internet', '2026-09-01T08:00:00Z'),
('am-02', 'rm-101', 'Smart TV 55"', '4K UHD TV with Netflix & AirPlay', '2026-09-01T08:00:00Z'),
('am-03', 'rm-202', 'Balcony Sea View', 'Private balcony with 180-degree ocean view', '2026-09-01T08:00:00Z'),
('am-04', 'rm-202', 'Espresso Machine', 'Nespresso with 4 complimentary pods daily', '2026-09-01T08:00:00Z'),
('am-05', 'rm-302', 'Jacuzzi Bathtub', 'Deep soaking whirlpool bathtub with sea views', '2026-09-01T08:00:00Z'),
('am-06', 'rm-501', 'Private Plunge Pool', 'Outdoor heated infinity plunge pool', '2026-09-01T08:00:00Z'),
('am-07', 'rm-501', 'Butler Service', 'Dedicated 24/7 personal butler service', '2026-09-01T08:00:00Z');

-- 5. Room Status History (Sample audit trail)
INSERT OR REPLACE INTO room_status_history (id, room_id, previous_status, new_status, changed_by, change_reason, event_source, created_at) VALUES
('rsh-001', 'rm-202', 'reserved', 'occupied', 'usr-fd-003', 'Guest check-in', 'api', '2026-09-24T14:15:00Z'),
('rsh-002', 'rm-203', 'occupied', 'checked_out', 'usr-fd-003', 'Guest check-out completed', 'api', '2026-09-26T11:30:00Z'),
('rsh-003', 'rm-205', 'available', 'maintenance', 'usr-mgr-002', 'Air conditioning inspection', 'manual', '2026-09-25T09:00:00Z');
