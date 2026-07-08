-- PAFR Seed Data
-- Run AFTER pafr_database_schema.sql
-- Character Set: utf8mb4

USE u591572634_pafr;

-- ============================================================
-- 1. AREAS (hierarchical geographic areas)
-- ============================================================
INSERT INTO areas (id, parent_area_id, name, code, description, is_active) VALUES
  (1, NULL, 'National Capital Region', 'NCR', 'Metro Manila area', TRUE),
  (2, NULL, 'Northern Luzon', 'NLU', 'Northern Luzon region', TRUE),
  (3, NULL, 'Southern Luzon', 'SLU', 'Southern Luzon region', TRUE),
  (4, NULL, 'Visayas', 'VIS', 'Visayas region', TRUE),
  (5, NULL, 'Mindanao', 'MIN', 'Mindanao region', TRUE),
  (6, 1, 'Manila', 'MNL', 'Manila proper', TRUE),
  (7, 1, 'Quezon City', 'QZN', 'Quezon City area', TRUE),
  (8, 1, 'Makati', 'MKT', 'Makati City area', TRUE),
  (9, 2, 'Cordillera Administrative Region', 'CAR', 'CAR area', TRUE),
  (10, 2, 'Ilocos Region', 'R01', 'Ilocos Region', TRUE),
  (11, 3, 'Calabarzon', 'R4A', 'Calabarzon region', TRUE),
  (12, 4, 'Western Visayas', 'R06', 'Western Visayas region', TRUE),
  (13, 5, 'Northern Mindanao', 'R10', 'Northern Mindanao region', TRUE);

-- ============================================================
-- 2. ARSENS (top-level organizational units)
-- ============================================================
INSERT INTO arsens (id, code, name, location, commander_name, is_active) VALUES
  (1, 'ARSEN-1', 'Arsenal ng Sandatahang Lakas', 'Camp General Emilio Aguinaldo, Quezon City', 'BGen. Roberto V. Garcia Jr.', TRUE),
  (2, 'ARSEN-2', 'Eastern Mindanao Command Arsenal', 'Camp Panacan, Davao City', 'BGen. Ariel M. Detuya', TRUE),
  (3, 'ARSEN-3', 'Western Command Arsenal', 'Camp Lapu-Lapu, Cebu City', 'BGen. Ariel M. Catapang', TRUE),
  (4, 'ARSEN-4', 'Southern Luzon Command Arsenal', 'Camp General Macario Peralta Jr., Lucena City', 'BGen. Jose C. Faustino Jr.', TRUE),
  (5, 'ARSEN-5', 'Northern Luzon Command Arsenal', 'Camp Servillano M. Aquino, San Fernando City', 'BGen. Carlito J. Galvez Jr.', TRUE);

-- ============================================================
-- 3. GROUPS (belong to ARSENs)
-- ============================================================
INSERT INTO `groups` (id, arsen_id, code, name, commander_name, is_active) VALUES
  -- ARSEN-1 Groups
  (1, 1, 'GRP-101', '1st Infantry Group', 'Col. Juan D. Dela Cruz', TRUE),
  (2, 1, 'GRP-102', '2nd Infantry Group', 'Col. Pedro B. Santos', TRUE),
  (3, 1, 'GRP-103', '3rd Infantry Group', 'Col. Jose C. Reyes', TRUE),
  (4, 1, 'GRP-104', '4th Infantry Group', 'Col. Maria L. Santos', TRUE),
  -- ARSEN-2 Groups
  (5, 2, 'GRP-201', '1st Infantry Battalion (EastMin)', 'Col. Eduardo M. Oban', TRUE),
  (6, 2, 'GRP-202', '2nd Infantry Battalion (EastMin)', 'Col. Reynaldo B. Mapagu', TRUE),
  -- ARSEN-3 Groups
  (7, 3, 'GRP-301', '1st Infantry Battalion (WestMin)', 'Col. Cirilo B. Peralto Jr.', TRUE),
  (8, 3, 'GRP-302', '2nd Infantry Battalion (WestMin)', 'Col. Ariel B. Pasion', TRUE),
  -- ARSEN-4 Groups
  (9, 4, 'GRP-401', '1st Infantry Battalion (SoLuz)', 'Col. Reynaldo B. Sendong', TRUE),
  (10, 4, 'GRP-402', '2nd Infantry Battalion (SoLuz)', 'Lt. Col. Maria R. Santos', TRUE),
  -- ARSEN-5 Groups
  (11, 5, 'GRP-501', '1st Infantry Battalion (NoLu)', 'Col. Cesar C. Pabil', TRUE),
  (12, 5, 'GRP-502', '2nd Infantry Battalion (NoLu)', 'Lt. Col. Romeo C. Tolentino', TRUE);

-- ============================================================
-- 4. SQUADRON (belong to Groups)
-- ============================================================
INSERT INTO squadron (id, group_id, name, code, location, specialization, is_active) VALUES
  -- Group 1 squadrons
  (1, 1, 'Alpha Squadron', 'SQ-A1', 'Camp Aguinaldo', 'Infantry', TRUE),
  (2, 1, 'Bravo Squadron', 'SQ-B1', 'Camp Aguinaldo', 'Infantry', TRUE),
  (3, 1, 'Charlie Squadron', 'SQ-C1', 'Camp Tecson', 'Reconnaissance', TRUE),
  -- Group 2 squadrons
  (4, 2, 'Delta Squadron', 'SQ-D2', 'Camp Aguinaldo', 'Infantry', TRUE),
  (5, 2, 'Echo Squadron', 'SQ-E2', 'Camp Tecson', 'Artillery', TRUE),
  -- Group 3 squadrons
  (6, 3, 'Foxtrot Squadron', 'SQ-F3', 'Camp Lapu-Lapu', 'Infantry', TRUE),
  (7, 3, 'Golf Squadron', 'SQ-G3', 'Camp Lapu-Lapu', 'Mechanized', TRUE),
  -- Group 4 squadrons
  (8, 4, 'Hotel Squadron', 'SQ-H4', 'Camp Olongapo', 'Infantry', TRUE),
  (9, 4, 'India Squadron', 'SQ-I4', 'Camp Olongapo', 'Engineering', TRUE),
  -- Group 5 squadrons
  (10, 5, 'Juliet Squadron', 'SQ-J5', 'Camp Panacan', 'Infantry', TRUE),
  (11, 5, 'Kilo Squadron', 'SQ-K5', 'Camp Panacan', 'Reconnaissance', TRUE),
  -- Group 6 squadrons
  (12, 6, 'Lima Squadron', 'SQ-L6', 'Camp Evangelista', 'Infantry', TRUE),
  (13, 6, 'Mike Squadron', 'SQ-M6', 'Camp Evangelista', 'Artillery', TRUE),
  -- Group 7 squadrons
  (14, 7, 'November Squadron', 'SQ-N7', 'Camp Lapu-Lapu', 'Infantry', TRUE),
  (15, 7, 'Oscar Squadron', 'SQ-O7', 'Camp Lapu-Lapu', 'Reconnaissance', TRUE),
  -- Group 8 squadrons
  (16, 8, 'Papa Squadron', 'SQ-P8', 'Camp Eldridge', 'Infantry', TRUE),
  (17, 8, 'Quebec Squadron', 'SQ-Q8', 'Camp Eldridge', 'Mechanized', TRUE),
  -- Group 9 squadrons
  (18, 9, 'Romeo Squadron', 'SQ-R9', 'Camp Quirino', 'Infantry', TRUE),
  (19, 9, 'Sierra Squadron', 'SQ-S9', 'Camp Quirino', 'Engineering', TRUE),
  -- Group 10 squadrons
  (20, 10, 'Tango Squadron', 'SQ-T10', 'Camp Lapu-Lapu South', 'Infantry', TRUE),
  (21, 10, 'Uniform Squadron', 'SQ-U10', 'Camp Lapu-Lapu South', 'Artillery', TRUE),
  -- Group 11 squadrons
  (22, 11, 'Victor Squadron', 'SQ-V11', 'Camp Dau', 'Infantry', TRUE),
  (23, 11, 'Whiskey Squadron', 'SQ-W11', 'Camp Dau', 'Reconnaissance', TRUE),
  -- Group 12 squadrons
  (24, 12, 'X-Ray Squadron', 'SQ-X12', 'Camp Tomas K. Confesor', 'Infantry', TRUE),
  (25, 12, 'Yankee Squadron', 'SQ-Y12', 'Camp Tomas K. Confesor', 'Engineering', TRUE);

-- ============================================================
-- 5. USERS
-- ============================================================
-- Using service_number as email (matching auth.js login logic)
INSERT INTO users (id, email, password_hash, role, is_active, last_login_at, created_at) VALUES
  (1, 'ADMIN-001', '$2b$12$9pyfCDLMIf8Agvd43F3cSuMU1MXoXiNma3BseIhL/V7XfgN3KU6WK', 'admin', TRUE, '2026-05-09 08:00:00', '2025-01-15 08:00:00'),
  (2, 'RES-001', '$2b$12$BAE3Py3W4C6ju1U7cP30oebo2iGyJqJ1Yehg6CGzL/a0BkImF9Pqi', 'reservist', TRUE, '2026-05-08 14:30:00', '2025-01-20 09:00:00'),
  (3, 'RES-002', '$2b$12$kMr/aWMLKk1pWYspsaugcuNLOusQu68ZE8jd2hxLXZG2gX49tSENm', 'reservist', TRUE, '2026-05-07 10:15:00', '2025-02-01 10:00:00'),
  (4, 'RES-003', '$2b$12$2ViqMoyF9F6MfuLTgqk/b.xCBUctZfJog3OwEaamR05ZvX7m2QWbO', 'reservist', TRUE, '2026-05-06 16:45:00', '2025-02-10 11:00:00'),
  (5, 'RES-004', '$2b$12$e86qI.d7ZSeNeVqSRPXZEuHmgmZlkQGw5TGF/CApkVDzst4Idisj2', 'reservist', TRUE, NULL, '2025-03-05 14:00:00'),
  (6, 'RES-005', '$2b$12$FhPZYS/2X0HCaA.20XmJDeSNHD8i/wfx35AeVDL63.pc6.OORBvqC', 'reservist', TRUE, '2026-05-05 09:30:00', '2025-03-15 15:00:00'),
  (7, 'RES-006', '$2b$12$UeVt2aE5b8C9x7K3mQ1rkexamplehash1234567890abcdef', 'reservist', TRUE, '2026-05-04 11:00:00', '2025-04-01 08:00:00'),
  (8, 'RES-007', '$2b$12$Lt3sN8fKj5mR4qW9vB2nUexampletoken9876543210ghijkl', 'reservist', TRUE, '2026-05-03 13:20:00', '2025-04-10 09:00:00'),
  (9, 'RES-008', '$2b$12$Df5gH6jK8lM2nQ4pR6tVbexamplepass3216549870zyxwvu', 'reservist', TRUE, NULL, '2025-04-20 10:30:00'),
  (10, 'RES-009', '$2b$12$Wq3eR7tY9uI5oP1aS3dF6anotherexample789123456abcd', 'reservist', FALSE, '2026-01-15 08:00:00', '2025-05-01 12:00:00'),
  (11, 'RES-010', '$2b$12$Zl2mN8kP4qR6sT9vX1wY3acexamplepass4567891230efgh', 'reservist', TRUE, '2026-05-02 15:45:00', '2025-05-15 14:00:00'),
  (12, 'RES-011', '$2b$12$Km5nQ9wX3yAbCdEfGhIjKlMnOpQrStUvWxYz0123456789abcdef', 'reservist', TRUE, '2026-05-01 07:30:00', '2025-06-01 07:00:00');

-- ============================================================
-- 6. RESERVISTS
-- ============================================================
INSERT INTO reservists (id, user_id, first_name, last_name, `rank`, service_number, date_of_birth, place_of_birth, age, sex, civil_status, citizenship, height, weight, blood_type, phone_number, address, reserve_center, category, date_enlisted, source_of_commission, rank_date_appointment, specialization, reserve_status, highest_education, course_degree, school, year_graduated, occupation, employer, office_address, basic_training_completed, basic_training_date, emergency_contact_name, emergency_contact_phone, emergency_contact_address, is_active) VALUES
  (1, 1, 'Roberto', 'V. Garcia Jr.', 'Captain', 'ADMIN-001', '1980-03-15', 'Quezon City', 46, 'Male', 'Married', 'Filipino', 175.00, 78.50, 'O+', '09123456789', 'Camp General Emilio Aguinaldo, QC', 'Camp Aguinaldo', '1st Category', '2010-05-15', 'ROTC', '2015-03-20', 'Infantry Operations', 'Ready Reserve', 'Masters Degree', 'MSc Military Science', 'Philippine Military Academy', 2010, 'Military Officer', 'PAFR Unit', 'Camp Aguinaldo', 'Yes', '2010-06-01', 'Elena Garcia', '09123456780', 'Camp Aguinaldo Housing', TRUE),
  (2, 2, 'Juan', 'Dela Cruz', 'Airman', 'RES-001', '1995-08-22', 'Manila', 30, 'Male', 'Single', 'Filipino', 170.00, 65.00, 'A+', '09171234567', '123 Katipunan Ave, QC', 'Camp Aguinaldo', '1st Category', '2018-03-10', 'ROTC', '2018-07-15', 'Infantry', 'Ready Reserve', 'Bachelors Degree', 'BS Information Technology', 'UP Diliman', 2017, 'Software Developer', 'Accenture', 'Ortigas Center, Pasig', 'Yes', '2018-04-01', 'Maria Dela Cruz', '09171111111', '123 Katipunan Ave, QC', TRUE),
  (3, 3, 'Pedro', 'B. Santos', 'Airman First Class', 'RES-002', '1993-12-05', 'Bulacan', 32, 'Male', 'Married', 'Filipino', 172.00, 70.00, 'B+', '09182345678', '456 Balagtas St, Bulacan', 'Camp Tecson', '1st Category', '2016-09-01', 'BCMT', '2017-01-20', 'Mechanized Infantry', 'Ready Reserve', 'Bachelors Degree', 'BS Criminology', 'BulSU', 2015, 'Security Officer', 'Philippine National Police', 'Camp Crame, QC', 'Yes', '2016-10-01', 'Liza Santos', '09182222222', '456 Balagtas St, Bulacan', TRUE),
  (4, 4, 'Jose', 'C. Reyes', 'Sergeant', 'RES-003', '1990-06-14', 'Pampanga', 35, 'Male', 'Married', 'Filipino', 178.00, 80.00, 'O+', '09193456789', '789 Mac Arthur Hwy, Pampanga', 'Camp Tecson', '2nd Category', '2012-06-15', 'MOTC', '2013-09-10', 'Field Artillery', 'Ready Reserve', 'Bachelors Degree', 'BS Management', 'AMA Computer College', 2012, 'Logistics Manager', 'Jollibee Foods', 'Sta. Rosa, Laguna', 'Yes', '2012-07-01', 'Ana Reyes', '09193333333', '789 Mac Arthur Hwy, Pampanga', TRUE),
  (5, 5, 'Maria', 'L. Santos', 'Corporal', 'RES-004', '1998-02-28', 'Laguna', 28, 'Female', 'Single', 'Filipino', 160.00, 52.00, 'A-', '09204567890', '321 National Rd, Laguna', 'Camp Olongapo', '2nd Category', '2020-01-05', 'Direct Commission', '2020-06-15', 'Medical Corps', 'Ready Reserve', 'Bachelors Degree', 'BS Nursing', 'UST', 2019, 'Nurse', 'St. Lukes Medical Center', 'Ortigas, Pasig', 'Yes', '2020-02-01', 'Rosa Santos', '09204444444', '321 National Rd, Laguna', TRUE),
  (6, 6, 'Carlos', 'M. Reyes', 'Private First Class', 'RES-005', '1996-11-11', 'Cavite', 29, 'Male', 'Single', 'Filipino', 173.00, 68.00, 'AB+', '09215678901', '555 Aguinaldo Hwy, Cavite', 'Camp Panacan', '1st Category', '2019-08-20', 'ROTC', '2020-02-28', 'Signal Corps', 'Ready Reserve', 'Bachelors Degree', 'BS Electronics Engineering', 'Mapua University', 2019, 'Electronics Engineer', 'PLDT', 'Makati City', 'Yes', '2019-09-01', 'Fe Reyes', '09215555555', '555 Aguinaldo Hwy, Cavite', TRUE),
  (7, 7, 'Eduardo', 'M. Oban', 'Lieutenant Colonel', 'RES-006', '1985-04-23', 'Davao City', 41, 'Male', 'Married', 'Filipino', 176.00, 75.00, 'O+', '09226789012', 'Camp Panacan, Davao City', 'Camp Panacan', '1st Category', '2008-12-01', 'PMA', '2012-04-10', 'Infantry', 'Ready Reserve', 'Masters Degree', 'MSc Strategic Studies', 'Philippine Military Academy', 2008, 'Military Officer', 'Eastern Mindanao Command', 'Camp Panacan, Davao', 'Yes', '2008-12-15', 'Grace Oban', '09226666666', 'Camp Panacan Housing, Davao', TRUE),
  (8, 8, 'Reynaldo', 'B. Mapagu', 'Major', 'RES-007', '1988-07-30', 'Cotabato', 37, 'Male', 'Married', 'Filipino', 174.00, 72.00, 'B+', '09237890123', 'Camp Evangelista, Cagayan de Oro', 'Camp Evangelista', '1st Category', '2011-03-15', 'PMA', '2014-08-20', 'Armor', 'Ready Reserve', 'Bachelors Degree', 'BS Military Engineering', 'PMA', 2011, 'Military Engineer', 'Army Engineering Brigade', 'Camp Aguinaldo', 'Yes', '2011-04-01', 'Maria Mapagu', '09237777777', 'Camp Evangelista Housing', TRUE),
  (9, 9, 'Cirilo', 'B. Peralto Jr.', 'Colonel', 'RES-008', '1979-01-18', 'Zamboanga', 47, 'Male', 'Married', 'Filipino', 177.00, 82.00, 'O+', '09248901234', 'Camp Lapu-Lapu, Cebu', 'Camp Lapu-Lapu', '1st Category', '2005-10-20', 'PMA', '2008-07-12', 'Infantry', 'Ready Reserve', 'Masters Degree', 'MSc National Security', 'Philippine Military Academy', 2005, 'Military Officer', 'Western Command', 'Camp Lapu-Lapu', 'Yes', '2005-11-01', 'Conchita Peralto', '09248888888', 'Camp Lapu-Lapu Housing, Cebu', TRUE),
  (10, 10, 'Ariel', 'B. Pasion', 'Lieutenant Colonel', 'RES-009', '1987-09-05', 'Bohol', 38, 'Male', 'Married', 'Filipino', 171.00, 69.00, 'A+', '09259012345', 'Camp Olongapo', 'Camp Lapu-Lapu', '2nd Category', '2014-04-10', 'ROTC', '2015-09-25', 'Naval Operations', 'Ready Reserve', 'Bachelors Degree', 'BS Marine Engineering', 'Philippine Merchant Marine Academy', 2014, 'Marine Engineer', 'Philippine Navy', 'Naval Station, Subic', 'Yes', '2014-05-01', 'Liza Pasion', '09259999999', 'Camp Olongapo Housing', TRUE),
  (11, 11, 'Reynaldo', 'B. Sendong', 'Colonel', 'RES-010', '1982-05-12', 'Lucena City', 43, 'Male', 'Married', 'Filipino', 175.00, 76.00, 'O+', '09260123456', 'Camp General Macario Peralta Jr., Lucena', 'Camp Lucena', '1st Category', '2009-02-28', 'PMA', '2013-01-15', 'Artillery', 'Standby Reserve', 'Masters Degree', 'MSc Defense Management', 'Philippine Military Academy', 2009, 'Military Officer', 'Southern Luzon Command', 'Camp Lucena', 'Yes', '2009-03-15', 'Evelyn Sendong', '09260222222', 'Camp Lucena Housing', TRUE),
  (12, 12, 'Felix', 'M. Santos', 'Master Sergeant', 'RES-011', '2000-03-20', 'Cebu City', 26, 'Male', 'Single', 'Filipino', 172.00, 71.00, 'AB+', '09280123456', '789 M. Velez St, Cebu', 'Camp Panacan', '2nd Category', '2015-07-01', 'ROTC', '2015-12-10', 'Infantry', 'Ready Reserve', 'Bachelors Degree', 'BS Business Administration', 'University of San Carlos', 2015, 'Operations Manager', 'Ayala Corporation', 'Cebu Business Park', 'Yes', '2015-07-15', 'Lourdes Santos', '09280999999', '789 M. Velez St, Cebu', TRUE);

-- ============================================================
-- 7. RESERVIST ASSIGNMENTS (Primary assignments)
-- ============================================================
INSERT INTO reservist_assignments (id, reservist_id, group_id, squadron_id, assigned_date, is_primary, notes) VALUES
  (1, 2, 1, 1, '2018-03-15', TRUE, 'Primary assignment to Alpha Squadron, 1st Infantry Group'),
  (2, 3, 1, 2, '2016-09-10', TRUE, 'Primary assignment to Bravo Squadron, 1st Infantry Group'),
  (3, 4, 2, 4, '2012-06-20', TRUE, 'Primary assignment to Delta Squadron, 2nd Infantry Group'),
  (4, 5, 2, 5, '2020-01-10', TRUE, 'Primary assignment to Echo Squadron, 2nd Infantry Group'),
  (5, 6, 3, 6, '2019-08-25', TRUE, 'Primary assignment to Foxtrot Squadron, 3rd Infantry Group'),
  (6, 7, 5, 10, '2008-12-15', TRUE, 'Primary assignment to Juliet Squadron, 1st Infantry Battalion (EastMin)'),
  (7, 8, 6, 12, '2011-03-20', TRUE, 'Primary assignment to Lima Squadron, 1st Infantry Battalion (EastMin)'),
  (8, 9, 7, 14, '2005-11-01', TRUE, 'Primary assignment to November Squadron, 1st Infantry Battalion (WestMin)'),
  (9, 10, 7, 15, '2014-04-15', TRUE, 'Primary assignment to Oscar Squadron, 1st Infantry Battalion (WestMin)'),
  (10, 11, 9, 18, '2009-03-01', TRUE, 'Primary assignment to Romeo Squadron, 1st Infantry Battalion (SoLuz)'),
  (11, 12, 11, 22, '2017-12-20', TRUE, 'Primary assignment to Victor Squadron, 1st Infantry Battalion (NoLu)');

-- ============================================================
-- 8. TRAININGS (created by admin user)
-- ============================================================
INSERT INTO trainings (id, title, description, start_datetime, end_datetime, venue, area_id, status, capacity, created_by, created_at) VALUES
  (1, 'Basic Infantry Training 2026', 'Fundamentals of infantry combat operations for new reservists', '2026-06-01 08:00:00', '2026-06-15 17:00:00', 'Camp Aguinaldo Training Range', 6, 'published', 50, 1, '2026-05-01 09:00:00'),
  (2, 'Advanced Weapons Qualification', 'Weapons handling and marksmanship certification', '2026-06-20 07:00:00', '2026-06-22 18:00:00', 'Camp Aguinaldo Firing Range', 6, 'published', 30, 1, '2026-05-02 10:00:00'),
  (3, 'Tactical Communications Course', 'Radio communications and encrypted messaging protocols', '2026-07-01 08:00:00', '2026-07-05 17:00:00', 'Camp Tecson Training Center', 7, 'draft', 25, 1, '2026-05-03 11:00:00'),
  (4, 'Combat First Aid Training', 'Emergency medical response and battlefield triage', '2026-07-15 08:00:00', '2026-07-17 17:00:00', 'Camp Olongapo Medical Facility', 11, 'published', 40, 1, '2026-05-04 12:00:00'),
  (5, 'Physical Fitness Assessment', 'Semi-annual physical readiness test', '2026-05-15 06:00:00', '2026-05-15 12:00:00', 'Camp Aguinaldo PT Field', 6, 'ongoing', 100, 1, '2026-05-01 08:00:00'),
  (6, 'Leadership Development Seminar', 'Command and leadership skills for NCOs and officers', '2026-08-01 08:00:00', '2026-08-03 17:00:00', 'Camp General Macario Peralta Jr.', 11, 'draft', 35, 1, '2026-05-05 09:00:00'),
  (7, 'Counter-Insurgency Operations Workshop', 'COIN doctrine and community engagement strategies', '2026-08-10 08:00:00', '2026-08-14 17:00:00', 'Camp Panacan, Davao', 13, 'published', 45, 1, '2026-05-06 10:00:00'),
  (8, 'Disaster Response Training', 'Humanitarian assistance and disaster relief operations', '2026-09-01 08:00:00', '2026-09-05 17:00:00', 'Camp Lapu-Lapu, Cebu', 12, 'draft', 60, 1, '2026-05-07 11:00:00'),
  (9, 'Marksmanship Refresher Course', 'Rifle and pistol qualification renewal', '2026-06-25 07:00:00', '2026-06-27 18:00:00', 'Camp Evangelista, CDO', 13, 'published', 35, 1, '2026-05-08 09:00:00'),
  (10, 'Urban Operations Training', 'Close quarters battle and urban patrol techniques', '2026-10-01 08:00:00', '2026-10-10 17:00:00', 'Camp Tecson, Bulacan', 10, 'draft', 40, 1, '2026-05-09 08:00:00');

-- ============================================================
-- 9. ACTIVITIES (within trainings)
-- Description format: JSON with activityType and requirements fields
-- ============================================================
INSERT INTO activities (id, training_id, title, description, start_time, end_time, location, instructor) VALUES
  -- Training 1 activities
  (1, 1, 'Orientation & Safety Briefing', '{"activityType":"orientation","requirements":"None"}', '2026-06-01 08:00:00', '2026-06-01 10:00:00', 'Camp Aguinaldo HQ', 'Capt. Garcia'),
  (2, 1, 'Squad Drill Fundamentals', '{"activityType":"drill","requirements":"Combat uniform, boots"}', '2026-06-01 13:00:00', '2026-06-02 17:00:00', 'Training Field Alpha', '1LT Santos'),
  (3, 1, 'Weapons Familiarization', '{"activityType":"weapons","requirements":"Safety gear"}', '2026-06-03 08:00:00', '2026-06-04 17:00:00', 'Armory Building', 'SSG Reyes'),
  (4, 1, 'Field Exercise FTX-1', '{"activityType":"field_exercise","requirements":"Full combat load, 72hr pack"}', '2026-06-08 06:00:00', '2026-06-10 18:00:00', 'Tactical Training Area', 'Capt. Garcia'),
  (5, 1, 'After Action Review', '{"activityType":"review","requirements":"None"}', '2026-06-14 08:00:00', '2026-06-15 12:00:00', 'Training Room 1', 'Capt. Garcia'),
  -- Training 2 activities
  (6, 2, 'Weapons Safety & Rules', '{"activityType":"weapons","requirements":"Eye and ear protection"}', '2026-06-20 07:00:00', '2026-06-20 09:00:00', 'Firing Range Safety Area', 'SMSgt Peralto'),
  (7, 2, 'Marksmanship - Rifle Qualification', '{"activityType":"weapons","requirements":"M16/M4 rifle, 40 rounds"}', '2026-06-20 10:00:00', '2026-06-21 17:00:00', 'Firing Range', 'SMSgt Peralto'),
  (8, 2, 'Marksmanship - Pistol Qualification', '{"activityType":"weapons","requirements":"9mm pistol, 30 rounds"}', '2026-06-22 07:00:00', '2026-06-22 17:00:00', 'Pistol Range', 'SSG Pasion'),
  -- Training 3 activities
  (9, 3, 'Radio Fundamentals', '{"activityType":"communications","requirements":"PRC-152 radio"}', '2026-07-01 08:00:00', '2026-07-02 17:00:00', 'Comms Room', '1LT Oban'),
  (10, 3, 'Encrypted Communications', '{"activityType":"communications","requirements":"Crypto key material"}', '2026-07-03 08:00:00', '2026-07-04 17:00:00', 'Comms Room', '1LT Oban'),
  (11, 3, 'Field Exercise COMEX', '{"activityType":"field_exercise","requirements":"Full comms kit"}', '2026-07-05 06:00:00', '2026-07-05 17:00:00', 'Field Training Area', 'Capt. Garcia'),
  -- Training 4 activities
  (12, 4, 'TCCC Level A', '{"activityType":"medical","requirements":"IFAK, tourniquet"}', '2026-07-15 08:00:00', '2026-07-15 17:00:00', 'Medical Training Hall', 'Nurse Santos'),
  (13, 4, 'Casualty Evacuation Drill', '{"activityType":"medical","requirements":"Litter, stretcher"}', '2026-07-16 08:00:00', '2026-07-16 17:00:00', 'Field Training Area', 'Nurse Santos'),
  (14, 4, 'Mass Casualty Exercise', '{"activityType":"medical","requirements":"Full medical kit, triage tags"}', '2026-07-17 08:00:00', '2026-07-17 17:00:00', 'Multi-Purpose Hall', 'Capt. Mapagu'),
  -- Training 5 activities (Physical Fitness)
  (15, 5, 'APFT Administration', '{"activityType":"fitness","requirements":"PT uniform, running shoes"}', '2026-05-15 06:00:00', '2026-05-15 09:00:00', 'PT Field', '1LT Tolentino'),
  (16, 5, 'Cross-Country Run', '{"activityType":"fitness","requirements":"Running shoes, hydration"}', '2026-05-15 10:00:00', '2026-05-15 12:00:00', 'Camp Grounds', '1LT Tolentino'),
  -- Training 7 activities
  (17, 7, 'COIN Classroom Instruction', '{"activityType":"classroom","requirements":"None"}', '2026-08-10 08:00:00', '2026-08-11 17:00:00', 'Lecture Hall', 'Col. Oban'),
  (18, 7, 'Civil-Military Operations', '{"activityType":"classroom","requirements":"None"}', '2026-08-12 08:00:00', '2026-08-12 17:00:00', 'Community Center', 'Capt. Mapagu'),
  (19, 7, 'Patrol Exercise', '{"activityType":"field_exercise","requirements":"Full combat load"}', '2026-08-13 06:00:00', '2026-08-14 18:00:00', 'Rural Training Area', 'Col. Oban'),
  -- Training 9 activities
  (20, 9, 'Qualification Zeroing', '{"activityType":"weapons","requirements":"M16/M4 rifle, 10 rounds"}', '2026-06-25 07:00:00', '2026-06-25 10:00:00', 'Firing Range', 'SSG Sendong'),
  (21, 9, 'Marksmanship Record Fire', '{"activityType":"weapons","requirements":"M16/M4 rifle, 40 rounds"}', '2026-06-25 10:30:00', '2026-06-26 17:00:00', 'Firing Range', 'SSG Sendong');

-- ============================================================
-- 10. ATTENDANCE (recording reservist training participation)
-- ============================================================
INSERT INTO attendance (id, reservist_id, training_id, status, check_in_time, check_out_time, location_check_in, qr_code_used, notes, recorded_by, created_at) VALUES
  -- Training 1 (Basic Infantry) - All present
  (1, 2, 1, 'present', '2026-06-01 07:55:00', '2026-06-01 17:05:00', NULL, 'QR-RES001-20260601', 'Day 1 orientation', 1, '2026-06-01 17:30:00'),
  (2, 2, 1, 'present', '2026-06-02 07:50:00', '2026-06-02 17:10:00', NULL, 'QR-RES001-20260602', 'Day 2 squad drill', 1, '2026-06-02 17:30:00'),
  (3, 2, 1, 'present', '2026-06-08 05:55:00', '2026-06-10 18:05:00', NULL, 'QR-RES001-20260608', 'FTX completed', 1, '2026-06-10 18:30:00'),
  (4, 2, 1, 'present', '2026-06-14 07:50:00', '2026-06-15 12:10:00', NULL, 'QR-RES001-20260614', 'AAR completed', 1, '2026-06-15 12:30:00'),
  -- Training 2 (Weapons Qual) - Partial attendance 
  (5, 3, 2, 'present', '2026-06-20 06:55:00', '2026-06-21 17:05:00', NULL, 'QR-RES002-20260620', 'Rifle qual - Expert', 1, '2026-06-21 17:30:00'),
  (6, 5, 2, 'present', '2026-06-20 06:55:00', '2026-06-21 17:05:00', NULL, 'QR-RES004-20260620', 'Rifle qualification', 1, '2026-06-21 17:30:00'),
  -- Training 5 (Physical Fitness)
  (7, 2, 5, 'present', '2026-05-15 05:50:00', '2026-05-15 12:05:00', NULL, 'QR-RES001-20260515', 'APFT Score: 285', 1, '2026-05-15 12:30:00'),
  (8, 3, 5, 'present', '2026-05-15 05:50:00', '2026-05-15 12:05:00', NULL, 'QR-RES002-20260515', 'APFT Score: 260', 1, '2026-05-15 12:30:00'),
  (9, 4, 5, 'late', '2026-05-15 07:00:00', '2026-05-15 12:10:00', NULL, NULL, 'Arrived 1hr late', 1, '2026-05-15 12:30:00'),
  (10, 6, 5, 'present', '2026-05-15 05:45:00', '2026-05-15 12:05:00', NULL, 'QR-RES005-20260515', 'APFT Score: 290', 1, '2026-05-15 12:30:00'),
  -- Training 4 (Combat First Aid)
  (11, 5, 4, 'present', '2026-07-15 07:50:00', '2026-07-15 17:10:00', NULL, 'QR-RES004-20260715', 'TCCC cert obtained', 1, '2026-07-15 17:30:00'),
  (12, 2, 4, 'present', '2026-07-15 07:55:00', '2026-07-15 17:05:00', NULL, 'QR-RES001-20260715', NULL, 1, '2026-07-15 17:30:00'),
  -- Training 7 (COIN Ops)
  (13, 6, 7, 'present', '2026-08-10 07:50:00', '2026-08-12 17:10:00', NULL, 'QR-RES005-20260810', 'COIN cert', 1, '2026-08-12 17:30:00'),
  (14, 7, 7, 'present', '2026-08-10 07:55:00', '2026-08-14 18:05:00', NULL, 'QR-RES006-20260810', NULL, 1, '2026-08-14 18:30:00'),
  (15, 8, 7, 'absent', NULL, NULL, NULL, NULL, 'Medical leave', 1, '2026-08-14 18:30:00'),
  -- Training 9 (Marksmanship Refresher)
  (16, 8, 9, 'present', '2026-06-25 06:50:00', '2026-06-26 17:05:00', NULL, 'QR-RES007-20260625', 'Sharpshooter qual', 1, '2026-06-26 17:30:00'),
  (17, 9, 9, 'present', '2026-06-25 06:55:00', '2026-06-26 17:05:00', NULL, 'QR-RES008-20260625', 'Marksman qual', 1, '2026-06-26 17:30:00');

-- ============================================================
-- 11. READINESS ASSESSMENTS
-- ============================================================
INSERT INTO readiness (id, reservist_id, assessment_date, medical_status, medical_notes, physical_score, physical_test_date, weapons_qualification, weapons_test_date, assessed_by, notes, created_at) VALUES
  (1, 2, '2026-05-01', 'fit', 'No medical issues', 88.50, '2026-04-28', 'expert', '2026-04-25', 1, 'Excellent overall readiness', '2026-05-01 10:00:00'),
  (2, 2, '2025-11-01', 'fit', 'Annual checkup cleared', 85.00, '2025-10-28', 'sharpshooter', '2025-10-25', 1, 'Consistent performance', '2025-11-01 10:00:00'),
  (3, 3, '2026-05-01', 'fit', 'No issues', 78.00, '2026-04-29', 'marksman', '2026-04-25', 1, 'Good physical condition', '2026-05-01 10:00:00'),
  (4, 4, '2026-05-01', 'limited', 'Knee strain - light duty', 65.00, '2026-04-30', 'qualified', '2026-04-28', 1, 'Medical review recommended', '2026-05-01 10:00:00'),
  (5, 5, '2026-05-01', 'fit', 'No issues', 92.00, '2026-04-27', 'expert', '2026-04-24', 1, 'Outstanding readiness', '2026-05-01 10:00:00'),
  (6, 6, '2026-05-01', 'fit', 'All clear', 81.00, '2026-04-30', 'sharpshooter', '2026-04-27', 1, 'Good standing', '2026-05-01 10:00:00'),
  (7, 7, '2026-04-15', 'fit', 'No issues', 90.00, '2026-04-12', 'expert', '2026-04-10', 1, 'Senior NCO - excellent condition', '2026-04-15 09:00:00'),
  (8, 8, '2026-04-15', 'fit', 'Minor cold - cleared', 75.00, '2026-04-12', 'marksman', '2026-04-10', 1, 'Satisfactory', '2026-04-15 09:00:00'),
  (9, 9, '2026-04-15', 'unfit', 'Pending cardiac evaluation', 45.00, NULL, 'none', NULL, 1, 'Medical hold - pending further evaluation', '2026-04-15 09:00:00'),
  (10, 11, '2026-04-15', 'fit', 'All clear', 83.00, '2026-04-12', 'qualified', '2026-04-10', 1, 'Good overall readiness', '2026-04-15 09:00:00'),
  (11, 12, '2026-04-15', 'pending', 'Awaiting scheduled exam', 50.00, NULL, 'none', NULL, 1, 'Assessment in progress', '2026-04-15 09:00:00');

-- ============================================================
-- 12. SUPPLIES (inventory items)
-- ============================================================
INSERT INTO supplies (id, name, category, description, unit, quantity_available, reorder_level, max_stock, location, supplier, last_ordered_date, created_at) VALUES
  (1, 'M16A4 Rifle', 'Weapons', '5.56mm NATO assault rifle', 'pcs', 150, 50, 300, 'Armory Room A', 'FN Herstal', '2026-03-15', '2025-01-10 08:00:00'),
  (2, 'M4 Carbine', 'Weapons', '5.56mm NATO carbine', 'pcs', 85, 30, 150, 'Armory Room B', 'Colt Defense', '2026-02-20', '2025-01-10 08:00:00'),
  (3, '9mm Pistol Magazine', 'Ammunition', 'Standard 9mm pistol magazine (17rd)', 'pcs', 500, 100, 1000, 'Ammo Storage B', 'IMI', '2026-03-01', '2025-01-15 09:00:00'),
  (4, '5.56mm NATO Ammo', 'Ammunition', '5.56x45mm NATO ball ammunition', 'rounds', 15000, 5000, 30000, 'Ammo Storage A', 'Lake City Army', '2026-01-10', '2025-01-15 09:00:00'),
  (5, 'Combat Uniform (OCP)', 'Uniforms', 'Operational Camouflage Pattern uniform set', 'sets', 200, 50, 500, 'Supply Room 1', 'Propper', '2026-02-15', '2025-02-01 10:00:00'),
  (6, 'Combat Boots', 'Uniforms', 'Temperate/hot weather combat boots', 'pairs', 180, 40, 400, 'Supply Room 2', 'Wolverine', '2026-01-25', '2025-02-01 10:00:00'),
  (7, 'Kevlar Helmet', 'Protective Equipment', 'PASGT ballistic helmet', 'pcs', 120, 30, 250, 'Supply Room 3', 'Gentex', '2026-03-05', '2025-02-10 11:00:00'),
  (8, 'Body Armor Plate', 'Protective Equipment', 'ESAPI Level IV ballistic plate', 'pcs', 95, 25, 200, 'Supply Room 3', 'Ceradyne', '2026-02-10', '2025-02-10 11:00:00'),
  (9, 'Tactical Radio (PRC-152)', 'Communications', 'Multiband handheld tactical radio', 'pcs', 30, 10, 60, 'Comms Vault', 'Motorola', '2026-01-30', '2025-03-01 09:00:00'),
  (10, 'First Aid Kit (IFAK)', 'Medical', 'Individual first aid kit', 'kits', 200, 50, 400, 'Medical Storage', 'North American Rescue', '2026-03-20', '2025-03-01 09:00:00'),
  (11, 'Entrenching Tool', 'Field Equipment', 'Folding military e-tool', 'pcs', 100, 25, 200, 'Supply Room 4', 'Glock', '2026-02-05', '2025-03-05 10:00:00'),
  (12, 'MRE (Meal Ready to Eat)', 'Rations', 'Complete field ration meal', 'meals', 1000, 200, 3000, 'Ration Storage', 'Ameriqual', '2026-03-10', '2025-03-10 08:00:00'),
  (13, 'Night Vision Goggle', 'Optics', 'PVS-14 monocular night vision device', 'pcs', 20, 5, 40, 'Optics Vault', 'L3Harris', '2026-01-15', '2025-03-15 11:00:00'),
  (14, 'Laser Bore Sighter', 'Training Aids', 'Laser cartridge for zeroing weapons', 'pcs', 45, 10, 100, 'Armory Room C', 'Laser Devices', '2026-03-25', '2025-04-01 09:00:00'),
  (15, 'Vehicle Fuel (Diesel)', 'Logistics', 'Military grade diesel fuel', 'liters', 5000, 1000, 10000, 'Fuel Depot', 'Petron', '2026-04-01', '2025-04-01 08:00:00');

-- ============================================================
-- 13. SUPPLY ISSUANCES
-- ============================================================
INSERT INTO supply_issuances (id, reservist_id, supply_id, quantity_issued, issued_date, due_return_date, issuance_type, returned_date, returned_quantity, condition_on_issue, condition_on_return, issued_by, received_by, notes, created_at) VALUES
  (1, 2, 5, 2, '2026-05-01', '2026-06-01', 'issued', NULL, NULL, 'new', NULL, 1, NULL, 'Issued for training', '2026-05-01 08:00:00'),
  (2, 3, 6, 1, '2026-05-01', '2026-07-01', 'issued', NULL, NULL, 'new', NULL, 1, NULL, 'Boot replacement', '2026-05-01 08:05:00'),
  (3, 2, 10, 1, '2026-05-15', '2026-06-15', 'issued', NULL, NULL, 'new', NULL, 1, NULL, 'Pre-deployment kit', '2026-05-15 09:00:00'),
  (4, 5, 12, 5, '2026-06-01', '2026-06-30', 'issued', '2026-06-15', 5, 'good', 'good', 1, NULL, 'Rations consumed during FTX', '2026-06-01 10:00:00'),
  (5, 6, 7, 1, '2026-05-10', '2026-08-10', 'issued', NULL, NULL, 'new', NULL, 1, NULL, 'Helmet for range training', '2026-05-10 08:00:00'),
  (6, 2, 3, 50, '2026-05-20', '2026-07-20', 'issued', NULL, NULL, 'new', NULL, 1, NULL, 'Pistol magazines for qualification', '2026-05-20 09:00:00'),
  (7, 8, 5, 2, '2026-04-15', '2026-05-15', 'issued', '2026-05-10', 2, 'good', 'fair', 1, NULL, 'Returned with minor wear', '2026-04-15 08:00:00'),
  (8, 9, 11, 1, '2026-04-20', '2026-07-20', 'issued', NULL, NULL, 'good', NULL, 1, NULL, 'E-tool issued', '2026-04-20 10:00:00');

-- ============================================================
-- 14. ALERTS
-- ============================================================
INSERT INTO alerts (id, title, message, target_role, target_group_id, target_squadron_id, target_area_id, is_active, start_date, end_date, created_by, created_at) VALUES
  (1, 'Mandatory Training Reminder', 'All reservists are reminded to attend the Basic Infantry Training 2026 scheduled June 1-15. Ensure you are physically prepared.', 'all', NULL, NULL, NULL, TRUE, '2026-05-10', '2026-05-31', 1, '2026-05-01 09:00:00'),
  (2, 'Physical Fitness Assessment', 'Semi-annual PFA will be conducted on May 15, 2026 at 0600H. All reservists must report to Camp Aguinaldo PT Field.', 'all', NULL, NULL, 6, TRUE, '2026-05-05', '2026-05-15', 1, '2026-05-05 08:00:00'),
  (3, 'Medical Clearance Required', 'Reservists with pending medical evaluations must complete their assessments by April 30, 2026.', 'reservist', NULL, NULL, NULL, TRUE, '2026-04-01', '2026-04-30', 1, '2026-04-15 10:00:00'),
  (4, 'Weapons Qualification Deadline', 'All reservists must complete their annual weapons qualification by June 30, 2026. Schedule with your unit armory.', 'reservist', 1, NULL, NULL, TRUE, '2026-05-01', '2026-06-30', 1, '2026-05-02 09:00:00'),
  (5, 'COIN Training Deployment Notice', '1st Infantry Group units will participate in Counter-Insurgency Operations Workshop at Camp Panacan, Davao, Aug 10-14.', 'reservist', 1, NULL, 13, TRUE, '2026-07-01', '2026-08-09', 1, '2026-07-01 08:00:00');

-- ============================================================
-- 15. USER ALERTS (read status)
-- ============================================================
INSERT INTO user_alerts (id, user_id, alert_id, is_read, read_at, created_at) VALUES
  -- User 2 (RES-001) read alert 1
  (1, 2, 1, TRUE, '2026-05-10 10:30:00', '2026-05-10 10:30:00'),
  -- User 2 (RES-001) has not read alert 2
  (2, 2, 2, FALSE, NULL, '2026-05-05 08:10:00'),
  -- User 3 (RES-002) read alert 1
  (3, 3, 1, TRUE, '2026-05-10 11:00:00', '2026-05-10 11:00:00'),
  -- User 3 has not read alert 3
  (4, 3, 3, FALSE, NULL, '2026-04-15 10:10:00'),
  -- User 4 (RES-003) has not read alert 4
  (5, 4, 4, FALSE, NULL, '2026-05-02 09:10:00'),
  -- User 6 (RES-005) read alert 5
  (6, 6, 5, TRUE, '2026-07-02 09:00:00', '2026-07-02 09:00:00'),
  -- Admin (user 1) read all alerts
  (7, 1, 1, TRUE, '2026-05-01 09:15:00', '2026-05-01 09:15:00'),
  (8, 1, 2, TRUE, '2026-05-05 08:15:00', '2026-05-05 08:15:00'),
  (9, 1, 3, TRUE, '2026-04-15 10:15:00', '2026-04-15 10:15:00'),
  (10, 1, 4, TRUE, '2026-05-02 09:15:00', '2026-05-02 09:15:00'),
  (11, 1, 5, TRUE, '2026-07-01 08:15:00', '2026-07-01 08:15:00');

-- ============================================================
-- 16. SYSTEM SETTINGS
-- ============================================================
INSERT INTO system_settings (`key`, `value`, description, updated_by, updated_at) VALUES
  ('app_name', '\"PAFR - Personnel & Attendance Force Readiness\"', 'Application name', 1, '2025-01-01 00:00:00'),
  ('app_version', '\"1.0.0\"', 'Application version', 1, '2025-01-01 00:00:00'),
  ('attendance_qr_enabled', 'true', 'Enable QR code attendance scanning', 1, '2025-01-15 08:00:00'),
  ('attendance_checkin_window_minutes', '15', 'Minutes before/after training start for check-in', 1, '2025-01-15 08:00:00'),
  ('auto_logout_timeout_minutes', '30', 'Auto-logout after inactivity', 1, '2025-02-01 09:00:00'),
  ('max_login_attempts', '5', 'Max failed login attempts before lockout', 1, '2025-02-01 09:00:00'),
  ('password_min_length', '8', 'Minimum password length', 1, '2025-02-01 09:00:00'),
  ('session_timeout_minutes', '480', 'Session timeout in minutes (8 hours)', 1, '2025-02-01 09:00:00'),
  ('low_stock_threshold', '10', 'Alert when supplies drop below this level', 1, '2025-03-01 10:00:00'),
  ('readiness_threshold', '70', 'Minimum overall readiness score threshold', 1, '2025-03-01 10:00:00'),
  ('notification_email_enabled', 'false', 'Enable email notifications', 1, '2025-03-15 11:00:00'),
  ('report_retention_days', '365', 'Number of days to retain generated reports', 1, '2025-04-01 08:00:00');

-- ============================================================
-- 17. AUDIT LOGS (sample historical entries)
-- ============================================================
INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, old_values, new_values, ip_address, user_agent, created_at) VALUES
  (1, 1, 'user.login', 'user', 1, NULL, '{\"email\": \"ADMIN-001\", \"role\": \"admin\"}', '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) PAFR/1.0', '2025-01-15 08:00:00'),
  (2, 1, 'user.login', 'user', 2, NULL, '{\"email\": \"RES-001\", \"role\": \"reservist\"}', '192.168.1.100', 'Mozilla/5.0 (Android 13) PAFR/1.0', '2026-05-08 14:30:00'),
  (3, 1, 'reservist.created', 'reservist', 2, NULL, '{\"email\": \"RES-001\", \"first_name\": \"Juan\", \"last_name\": \"Dela Cruz\", \"rank\": \"Airman\", \"service_number\": \"RES-001\"}', '127.0.0.1', 'Mozilla/5.0 PAFR/1.0', '2025-01-20 09:00:00'),
  (4, 1, 'reservist.created', 'reservist', 3, NULL, '{\"email\": \"RES-002\", \"first_name\": \"Pedro\", \"last_name\": \"Santos\", \"rank\": \"Airman First Class\", \"service_number\": \"RES-002\"}', '127.0.0.1', 'Mozilla/5.0 PAFR/1.0', '2025-02-01 10:00:00'),
  (5, 1, 'arsen.created', 'arsen', 1, NULL, '{\"code\": \"ARSEN-1\", \"name\": \"Arsenal ng Sandatahang Lakas\", \"location\": \"Camp General Emilio Aguinaldo, Quezon City\"}', '127.0.0.1', 'Mozilla/5.0 PAFR/1.0', '2025-01-10 08:00:00'),
  (6, 1, 'group.created', 'group', 1, NULL, '{\"code\": \"GRP-101\", \"name\": \"1st Infantry Group\", \"arsen_id\": 1}', '127.0.0.1', 'Mozilla/5.0 PAFR/1.0', '2025-01-12 09:00:00'),
  (7, 1, 'squadron.created', 'squadron', 1, NULL, '{\"name\": \"Alpha Squadron\", \"code\": \"SQ-A1\", \"group_id\": 1}', '127.0.0.1', 'Mozilla/5.0 PAFR/1.0', '2025-01-12 09:30:00'),
  (8, 1, 'training.created', 'training', 1, NULL, '{\"title\": \"Basic Infantry Training 2026\", \"start_datetime\": \"2026-06-01 08:00:00\", \"status\": \"published\"}', '127.0.0.1', 'Mozilla/5.0 PAFR/1.0', '2026-05-01 09:00:00'),
  (9, 1, 'supply.created', 'supply', 1, NULL, '{\"name\": \"M16A4 Rifle\", \"category\": \"Weapons\", \"quantity_available\": 150}', '127.0.0.1', 'Mozilla/5.0 PAFR/1.0', '2025-01-10 10:00:00'),
  (10, 1, 'alert.created', 'alert', 1, NULL, '{\"title\": \"Mandatory Training Reminder\", \"target_role\": \"all\"}', '127.0.0.1', 'Mozilla/5.0 PAFR/1.0', '2026-05-01 09:00:00'),
  (11, 2, 'user.login', 'user', 2, NULL, '{\"email\": \"RES-001\", \"role\": \"reservist\"}', '192.168.1.101', 'Mozilla/5.0 (Android 13) PAFR/1.0', '2026-05-06 16:45:00'),
  (12, 1, 'reservist.assigned', 'assignment', 1, NULL, '{\"reservist_id\": 2, \"group_id\": 1, \"squadron_id\": 1}', '127.0.0.1', 'Mozilla/5.0 PAFR/1.0', '2025-01-20 09:30:00'),
  (13, 1, 'readiness.assessment', 'readiness', 1, NULL, '{\"reservist_id\": 2, \"assessment_date\": \"2026-05-01\", \"overall_score\": 91.50}', '127.0.0.1', 'Mozilla/5.0 PAFR/1.0', '2026-05-01 10:00:00');

-- ============================================================
-- 18. COMPUTED/DERIVED DATA - Update overall_score manually for correctness
-- (The overall_score column is GENERATED ALWAYS AS STORED,
--  so it's computed automatically. These inserts above already trigger computation.)
-- ============================================================

-- ============================================================
-- 19. INTERNAL TRAINING PARTICIPANTS
-- ============================================================
INSERT INTO internal_training_participants (training_id, reservist_id, squadron_id) VALUES
  -- Training 1 (Basic Infantry) - participants from Alpha and Bravo squadrons
  (1, 2, 1),  -- Juan Dela Cruz (Alpha)
  (1, 3, 2),  -- Pedro Santos (Bravo)
  -- Training 2 (Weapons Qual) - participants from Delta and Echo squadrons
  (2, 4, 4),  -- Jose Reyes (Delta)
  (2, 5, 5),  -- Maria Santos (Echo)
  -- Training 5 (Physical Fitness) - mixed squadrons
  (5, 2, 1),
  (5, 3, 2),
  (5, 4, 4),
  (5, 6, 6),  -- Carlos Reyes (Foxtrot)
  -- Training 7 (COIN) - from Juliet squadron
  (7, 7, 10), -- Eduardo Oban (Juliet)
  -- Training 9 (Marksmanship Refresher) - from Lima and November
  (9, 8, 12), -- Reynaldo Mapagu (Lima)
  (9, 9, 14); -- Cirilo Peralto (November)

-- ============================================================
-- 20. EXTERNAL TRAININGS
-- ============================================================
INSERT INTO external_trainings (id, title, description, start_date, start_time, venue, status, capacity, created_at) VALUES
  (1, 'Emergency Medical Responder Course', 'Certified EMR course open to civilian and military participants', '2026-07-01', '08:00:00', 'Philippine Red Cross Training Center, Manila', 'open', 30, '2026-05-10 09:00:00'),
  (2, 'Cybersecurity Awareness Seminar', 'Introduction to cybersecurity threats and best practices for reservists', '2026-08-15', '09:00:00', 'Camp Aguinaldo, Multi-Purpose Hall', 'open', 100, '2026-05-12 10:00:00'),
  (3, 'Disaster Risk Reduction Workshop', 'Community-based disaster preparedness and response planning', '2026-09-20', '08:30:00', 'Cebu City Disaster Risk Reduction Office', 'draft', 50, '2026-05-14 11:00:00'),
  (4, 'Women in Leadership Conference', 'Leadership development and networking for female reservists', '2026-10-05', '09:00:00', 'AFP General Headquarters, Camp Aguinaldo', 'open', 80, '2026-05-15 08:00:00'),
  (5, 'Advanced Drone Operations Training', 'UAV reconnaissance and surveillance techniques - invitation only', '2026-11-10', '07:00:00', 'Camp Panacan, Davao', 'draft', 20, '2026-05-16 09:00:00');

-- ============================================================
-- 21. TRAINING REGISTRATIONS (external training sign-ups)
-- ============================================================
INSERT INTO training_registrations (training_id, participant_data, registered_at) VALUES
  -- EMR Course registrations
  (1, '{"full_name":"Maria Santos","email":"maria.santos@example.com","phone":"09171234567","organization":"St. Lukes Medical Center","previous_training":"First Aid"}', '2026-05-11 10:00:00'),
  (1, '{"full_name":"Ana Reyes","email":"ana.reyes@example.com","phone":"09182345678","organization":"Red Cross","previous_training":"EMR"}', '2026-05-11 14:30:00'),
  (1, '{"full_name":"Roberto Garcia","email":"roberto.garcia@example.com","phone":"09193456789","organization":"None","previous_training":"None"}', '2026-05-12 09:15:00'),
  -- Cybersecurity Seminar registrations
  (2, '{"full_name":"Carlos Reyes","email":"carlos.reyes@example.com","service_number":"RES-005","unit":"3rd Infantry Group"}', '2026-05-13 08:00:00'),
  (2, '{"full_name":"Eduardo Oban","email":"eduardo.oban@example.com","service_number":"RES-006","unit":"1st Infantry Battalion (EastMin)"}', '2026-05-13 10:30:00'),
  -- Women in Leadership registrations
  (4, '{"full_name":"Maria Santos","email":"maria.santos@example.com","rank":"Corporal","unit_assignment":"Echo Squadron, 2nd Infantry Group"}', '2026-05-16 09:00:00'),
  (4, '{"full_name":"Liza Gomez","email":"liza.gomez@example.com","rank":"Sergeant","unit_assignment":"Alpha Flight Squadron"}', '2026-05-16 11:00:00'),
  (4, '{"full_name":"Nina Ramos","email":"nina.ramos@example.com","rank":"Corporal","unit_assignment":"Juliet Squadron"}', '2026-05-17 08:30:00');

-- ============================================================
-- SEED DATA SUMMARY
-- ============================================================
-- Tables populated:
--   - areas:                       13 records (3 root areas + 10 child areas)
--   - arsens:                       5 records
--   - groups:                      12 records
--   - squadron:                    25 records
--   - users:                      12 records (1 admin + 11 reservists, 1 deactivated)
--   - reservists:                  12 records
--   - reservist_assignments:       11 records
--   - trainings:                   10 records
--   - activities:                  21 records
--   - attendance:                  17 records
--   - readiness:                   11 records
--   - supplies:                    15 records
--   - supply_issuances:             8 records
--   - alerts:                       5 records
--   - user_alerts:                 11 records
--   - system_settings:             12 records
--   - audit_logs:                  13 records
--   - internal_training_participants: 10 records
--   - external_trainings:           5 records
--   - training_registrations:       8 records
--
-- TEST CREDENTIALS:
--   Admin  -> email: ADMIN-001  password: AdminPass123!
--   Res 1  -> email: RES-001    password: Reservist123!
--   Res 2  -> email: RES-002    password: Reservist456!
--   Res 3  -> email: RES-003    password: Reservist789!
--   Res 4  -> email: RES-004    password: Reservist101!
--   Res 5  -> email: RES-005    password: Reservist202!
--   (Users 10/RES-009 is deactivated for testing inactive state)