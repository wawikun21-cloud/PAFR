-- PAFR Database Seed Data
-- Sample data for testing the PAFR system

USE pafr;

-- -----------------------------------------------------
-- Seed Users (password: password123 for all test users)
-- Password hash is bcrypt hash of 'password123' with cost factor 10
-- -----------------------------------------------------
INSERT INTO users (email, password_hash, role, is_active) VALUES
('admin@pafr.gov', '$2b$10$rG8xGxBWxYxYxYxYxYxYxYxYxYxYxYxYxYxYxYxYxYxYxYxY', 'admin', TRUE),
('john.doe@pafr.gov', '$2b$10$rG8xGxBWxYxYxYxYxYxYxYxYxYxYxYxYxYxYxYxYxYxYxY', 'reservist', TRUE),
('jane.smith@pafr.gov', '$2b$10$rG8xGxBWxYxYxYxYxYxYxYxYxYxYxYxYxYxYxYxYxYxYxY', 'reservist', TRUE),
('mike.wilson@pafr.gov', '$2b$10$rG8xGxBWxYxYxYxYxYxYxYxYxYxYxYxYxYxYxYxYxYxYxY', 'reservist', TRUE);

-- -----------------------------------------------------
-- Seed ARSENs
-- -----------------------------------------------------
INSERT INTO arsens (code, name, location, commander_name, is_active) VALUES
('ARSEN-1', 'ARSEN Central', 'Metro Manila', 'Gen. Ramon Mendoza', TRUE),
('ARSEN-2', 'ARSEN North', 'Northern Luzon', 'Gen. Antonio Reyes', TRUE);

-- -----------------------------------------------------
-- Seed Groups
-- -----------------------------------------------------
INSERT INTO `groups` (arsen_id, code, name, commander_name, is_active) VALUES
(1, 'G-101', '1st Infantry Group', 'Col. Luis Santos', TRUE),
(1, 'G-102', '2nd Infantry Group', 'Col. Maria Cruz', TRUE),
(2, 'G-201', '3rd Infantry Group', 'Col. Roberto Garcia', TRUE);

-- -----------------------------------------------------
-- Seed Cities
-- -----------------------------------------------------
INSERT INTO cities (group_id, name, province, postal_code, is_active) VALUES
(1, 'Quezon City', 'Metro Manila', '1100', TRUE),
(1, 'Manila', 'Metro Manila', '1000', TRUE),
(2, 'Makati', 'Metro Manila', '1200', TRUE),
(2, 'Pasig', 'Metro Manila', '1600', TRUE),
(3, 'Baguio', 'Benguet', '2600', TRUE),
(3, 'Laoag', 'Ilocos Norte', '2900', TRUE);

-- -----------------------------------------------------
-- Seed Reservists
-- -----------------------------------------------------
INSERT INTO reservists (user_id, first_name, last_name, `rank`, service_number, date_of_birth, phone_number, emergency_contact_name, emergency_contact_phone, address, is_active) VALUES
(2, 'John', 'Doe', 'Sergeant', 'SN-001', '1990-05-15', '+639123456789', 'Jane Doe', '+639987654321', '123 Main St, Quezon City', TRUE),
(3, 'Jane', 'Smith', 'Corporal', 'SN-002', '1992-08-22', '+639123456790', 'John Smith', '+639987654322', '456 Oak Ave, Makati', TRUE),
(4, 'Mike', 'Wilson', 'Private', 'SN-003', '1995-12-10', '+639123456791', 'Mary Wilson', '+639987654323', '789 Pine Rd, Baguio', TRUE);

-- -----------------------------------------------------
-- Seed Reservist Assignments
-- -----------------------------------------------------
INSERT INTO reservist_assignments (reservist_id, group_id, city_id, assigned_date, is_primary, notes) VALUES
(1, 1, 1, '2025-01-15', TRUE, 'Primary assignment'),
(2, 2, 3, '2025-02-20', TRUE, 'Primary assignment'),
(3, 3, 5, '2025-03-10', TRUE, 'Primary assignment');

-- -----------------------------------------------------
-- Seed Areas
-- -----------------------------------------------------
INSERT INTO areas (parent_area_id, name, code, description, is_active) VALUES
(NULL, 'National Capital Region', 'NCR', 'Metro Manila area', TRUE),
(1, 'Central Manila', 'NCR-1', 'Central district', TRUE),
(1, 'East Manila', 'NCR-2', 'Eastern district', TRUE),
(NULL, 'Northern Luzon', 'NL', 'Northern region', TRUE),
(4, 'Cordillera', 'NL-1', 'Mountain province area', TRUE);

-- -----------------------------------------------------
-- Seed Supplies
-- -----------------------------------------------------
INSERT INTO supplies (name, category, description, unit, quantity_available, reorder_level, max_stock, location, supplier) VALUES
('Combat Uniform', 'Clothing', 'Standard combat uniform', 'pcs', 150, 20, 300, 'Warehouse A', 'Military Supplies Co.'),
('Combat Boots', 'Footwear', 'Standard issue boots', 'pairs', 80, 15, 200, 'Warehouse A', 'BootMaster Inc.'),
('Helmet', 'Protective Gear', 'Kevlar helmet', 'pcs', 100, 10, 250, 'Warehouse B', 'SafeGuard Ltd.'),
('First Aid Kit', 'Medical', 'Standard first aid kit', 'kits', 50, 10, 150, 'Medical Storage', 'MedSupply Inc.');

-- -----------------------------------------------------
-- Seed System Settings
-- -----------------------------------------------------
INSERT INTO system_settings (`key`, `value`, description, updated_by) VALUES
('qr_attendance_enabled', '{"value": false}', 'Enable QR code based attendance', 1),
('notification_email', '{"value": "admin@pafr.gov"}', 'System notification email', 1),
('max_attendance_late_minutes', '{"value": 15}', 'Maximum minutes late for attendance', 1),
('default_training_capacity', '{"value": 50}', 'Default training capacity', 1);

-- -----------------------------------------------------
-- Seed Alerts
-- -----------------------------------------------------
INSERT INTO alerts (title, message, target_role, is_active, start_date, end_date, created_by) VALUES
('System Maintenance', 'The system will undergo maintenance on Sunday 2AM-4AM', 'all', TRUE, CURRENT_DATE, DATE_ADD(CURRENT_DATE, INTERVAL 7 DAY), 1),
('Training Reminder', 'Don\'t forget your scheduled training next week', 'reservist', TRUE, CURRENT_DATE, DATE_ADD(CURRENT_DATE, INTERVAL 14 DAY), 1);

-- -----------------------------------------------------
-- Seed Trainings
-- -----------------------------------------------------
INSERT INTO trainings (title, description, start_datetime, end_datetime, venue, area_id, status, capacity, is_mandatory, created_by) VALUES
('Basic Combat Training', 'Fundamental combat skills training', DATE_ADD(NOW(), INTERVAL 7 DAY), DATE_ADD(NOW(), INTERVAL 9 DAY), 'ARSEN-1 Training Ground', 1, 'published', 30, TRUE, 1),
('Advanced Marksmanship', 'Advanced weapon handling and marksmanship', DATE_ADD(NOW(), INTERVAL 14 DAY), DATE_ADD(NOW(), INTERVAL 16 DAY), 'Firing Range A', 2, 'published', 20, FALSE, 1);

-- -----------------------------------------------------
-- Seed User Alerts (mark alerts as unread for users)
-- -----------------------------------------------------
INSERT INTO user_alerts (user_id, alert_id, is_read) VALUES
(2, 1, FALSE),
(2, 2, FALSE),
(3, 1, FALSE),
(3, 2, FALSE),
(4, 1, FALSE);

-- Seed data insertion complete!
