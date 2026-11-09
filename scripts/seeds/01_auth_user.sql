-- D1 Database: db_auth_user
-- Seed Data for Authentication & Users

-- Password for all seed users is: Keystay@2026
-- Hash: pbkdf2$100000$e4f1d1da8f9ce067510791907107d3e9$268f410338d9886fd848580450fc42f76f1a8f98641448e55253bb2d7f751c4c

INSERT OR REPLACE INTO users (id, email, password_hash, first_name, last_name, role, is_active, created_at, updated_at) VALUES
('usr-owner-001', 'owner@keystay.com', 'pbkdf2$100000$e4f1d1da8f9ce067510791907107d3e9$268f410338d9886fd848580450fc42f76f1a8f98641448e55253bb2d7f751c4c', 'Khetsophon', 'Owner', 'owner', 1, '2026-09-01T08:00:00Z', '2026-09-01T08:00:00Z'),
('usr-fd-003', 'frontdesk@keystay.com', 'pbkdf2$100000$e4f1d1da8f9ce067510791907107d3e9$268f410338d9886fd848580450fc42f76f1a8f98641448e55253bb2d7f751c4c', 'Supaporn', 'Frontdesk', 'front_desk', 1, '2026-09-01T08:00:00Z', '2026-09-01T08:00:00Z'),
('usr-hk-004', 'housekeeping@keystay.com', 'pbkdf2$100000$e4f1d1da8f9ce067510791907107d3e9$268f410338d9886fd848580450fc42f76f1a8f98641448e55253bb2d7f751c4c', 'Somchai', 'Clean', 'housekeeping', 1, '2026-09-01T08:00:00Z', '2026-09-01T08:00:00Z');

-- Role Permissions Seed
INSERT OR REPLACE INTO permissions (id, role, resource, action, created_at) VALUES
('perm-001', 'owner', '*', '*', '2026-09-01T08:00:00Z'),
('perm-002', 'front_desk', 'reservations', 'manage', '2026-09-01T08:00:00Z'),
('perm-003', 'front_desk', 'rooms', 'read', '2026-09-01T08:00:00Z'),
('perm-004', 'front_desk', 'billing', 'manage', '2026-09-01T08:00:00Z'),
('perm-005', 'housekeeping', 'housekeeping', 'manage', '2026-09-01T08:00:00Z'),
('perm-006', 'housekeeping', 'rooms', 'read', '2026-09-01T08:00:00Z');
