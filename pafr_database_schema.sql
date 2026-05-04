-- PAFR Database Schema
-- Generated from system_structure.md
-- MySQL WampServer Compatible
-- Character Set: utf8mb4
-- Storage Engine: InnoDB

-- Drop database if exists and create fresh
DROP DATABASE IF EXISTS pafr;
CREATE DATABASE pafr CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE pafr;

-- -----------------------------------------------------
-- Table users
-- -----------------------------------------------------
CREATE TABLE users (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('admin', 'reservist') NOT NULL DEFAULT 'reservist',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_login_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_role (role),
    INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table reservists
-- -----------------------------------------------------
CREATE TABLE reservists (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    `rank` VARCHAR(50) NOT NULL,
    service_number VARCHAR(100) UNIQUE NOT NULL,
    date_of_birth DATE NULL,
    phone_number VARCHAR(20) NULL,
    emergency_contact_name VARCHAR(200) NULL,
    emergency_contact_phone VARCHAR(20) NULL,
    address TEXT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_service_number (service_number),
    INDEX idx_name (last_name, first_name),
    INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table arsens
-- -----------------------------------------------------
CREATE TABLE arsens (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    location VARCHAR(500) NULL,
    commander_name VARCHAR(200) NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_code (code),
    INDEX idx_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table groups
-- -----------------------------------------------------
CREATE TABLE `groups` (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    arsen_id BIGINT NOT NULL,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(200) NOT NULL,
    commander_name VARCHAR(200) NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (arsen_id) REFERENCES arsens(id) ON DELETE CASCADE,
    UNIQUE KEY uk_group_code (arsen_id, code),
    INDEX idx_arsen (arsen_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table cities
-- -----------------------------------------------------
CREATE TABLE cities (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    group_id BIGINT NOT NULL,
    name VARCHAR(200) NOT NULL,
    province VARCHAR(100) NOT NULL,
    postal_code VARCHAR(20) NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (group_id) REFERENCES `groups`(id) ON DELETE CASCADE,
    INDEX idx_group (group_id),
    INDEX idx_province (province)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table reservist_assignments
-- -----------------------------------------------------
CREATE TABLE reservist_assignments (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    reservist_id BIGINT NOT NULL,
    group_id BIGINT NOT NULL,
    city_id BIGINT NOT NULL,
    assigned_date DATE NOT NULL,
    is_primary BOOLEAN NOT NULL DEFAULT TRUE,
    notes TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (reservist_id) REFERENCES reservists(id) ON DELETE CASCADE,
    FOREIGN KEY (group_id) REFERENCES `groups`(id) ON DELETE CASCADE,
    FOREIGN KEY (city_id) REFERENCES cities(id) ON DELETE CASCADE,
    INDEX idx_group_city (group_id, city_id),
    INDEX idx_reservist (reservist_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table areas
-- -----------------------------------------------------
CREATE TABLE areas (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    parent_area_id BIGINT NULL,
    name VARCHAR(200) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT NULL,
    geographic_boundary JSON NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_area_id) REFERENCES areas(id) ON DELETE SET NULL,
    INDEX idx_parent (parent_area_id),
    INDEX idx_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table trainings
-- -----------------------------------------------------
CREATE TABLE trainings (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(500) NOT NULL,
    description TEXT NULL,
    start_datetime DATETIME NOT NULL,
    end_datetime DATETIME NOT NULL,
    venue VARCHAR(500) NOT NULL,
    area_id BIGINT NULL,
    status ENUM('draft', 'published', 'ongoing', 'completed', 'cancelled') NOT NULL DEFAULT 'draft',
    capacity INT NULL,
    is_mandatory BOOLEAN NOT NULL DEFAULT FALSE,
    created_by BIGINT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (area_id) REFERENCES areas(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id),
    CHECK (end_datetime > start_datetime),
    INDEX idx_status (status),
    INDEX idx_dates (start_datetime, end_datetime),
    INDEX idx_area (area_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table activities
-- -----------------------------------------------------
CREATE TABLE activities (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    training_id BIGINT NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT NULL,
    start_time DATETIME NOT NULL,
    end_time DATETIME NOT NULL,
    location VARCHAR(500) NULL,
    instructor VARCHAR(200) NULL,
    is_mandatory BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (training_id) REFERENCES trainings(id) ON DELETE CASCADE,
    CHECK (end_time > start_time),
    INDEX idx_training (training_id),
    INDEX idx_timing (start_time, end_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table attendance
-- -----------------------------------------------------
CREATE TABLE attendance (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    reservist_id BIGINT NOT NULL,
    training_id BIGINT NOT NULL,
    status ENUM('present', 'absent', 'late', 'excused', 'pending') NOT NULL DEFAULT 'pending',
    check_in_time DATETIME NULL,
    check_out_time DATETIME NULL,
    location_check_in JSON NULL,
    qr_code_used VARCHAR(255) NULL,
    notes TEXT NULL,
    recorded_by BIGINT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (reservist_id) REFERENCES reservists(id) ON DELETE CASCADE,
    FOREIGN KEY (training_id) REFERENCES trainings(id) ON DELETE CASCADE,
    FOREIGN KEY (recorded_by) REFERENCES users(id),
    UNIQUE KEY uk_reservist_training (reservist_id, training_id),
    INDEX idx_training_status (training_id, status),
    INDEX idx_reservist (reservist_id),
    INDEX idx_dates (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table readiness
-- -----------------------------------------------------
CREATE TABLE readiness (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    reservist_id BIGINT NOT NULL,
    assessment_date DATE NOT NULL,
    medical_status ENUM('fit', 'unfit', 'limited', 'pending') NOT NULL DEFAULT 'pending',
    medical_notes TEXT NULL,
    physical_score DECIMAL(5,2) NOT NULL,
    physical_test_date DATE NULL,
    weapons_qualification ENUM('expert', 'sharpshooter', 'marksman', 'qualified', 'unqualified', 'none') DEFAULT 'none',
    weapons_test_date DATE NULL,
    overall_score DECIMAL(5,2) GENERATED ALWAYS AS (
        ROUND(
            (CASE WHEN medical_status = 'fit' THEN 100
                  WHEN medical_status = 'limited' THEN 70
                  WHEN medical_status = 'pending' THEN 50
                  ELSE 0 END
             + physical_score
             + CASE weapons_qualification
                WHEN 'expert' THEN 100
                WHEN 'sharpshooter' THEN 90
                WHEN 'marksman' THEN 80
                WHEN 'qualified' THEN 70
                ELSE 0 END
            ) / 3, 2)
    ) STORED,
    assessed_by BIGINT NULL,
    notes TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (reservist_id) REFERENCES reservists(id) ON DELETE CASCADE,
    FOREIGN KEY (assessed_by) REFERENCES users(id),
    UNIQUE KEY uk_reservist_date (reservist_id, assessment_date),
    INDEX idx_reservist (reservist_id),
    INDEX idx_assessment_date (assessment_date),
    INDEX idx_overall_score (overall_score)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table supplies
-- -----------------------------------------------------
CREATE TABLE supplies (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(200) NOT NULL,
    category VARCHAR(100) NOT NULL,
    description TEXT NULL,
    unit VARCHAR(20) NOT NULL,
    quantity_available INT NOT NULL DEFAULT 0,
    reorder_level INT NOT NULL DEFAULT 10,
    max_stock INT NULL,
    location VARCHAR(200) NULL,
    supplier VARCHAR(200) NULL,
    last_ordered_date DATE NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_category (category),
    INDEX idx_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table supply_issuances
-- -----------------------------------------------------
CREATE TABLE supply_issuances (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    reservist_id BIGINT NOT NULL,
    supply_id BIGINT NOT NULL,
    quantity_issued INT NOT NULL,
    issued_date DATE NOT NULL DEFAULT (CURRENT_DATE),
    due_return_date DATE NOT NULL,
    returned_date DATE NULL,
    returned_quantity INT NULL,
    condition_on_issue ENUM('new', 'good', 'fair', 'poor') DEFAULT 'good',
    condition_on_return ENUM('new', 'good', 'fair', 'poor', 'damaged') NULL,
    issued_by BIGINT NOT NULL,
    received_by BIGINT NULL,
    notes TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (reservist_id) REFERENCES reservists(id) ON DELETE CASCADE,
    FOREIGN KEY (supply_id) REFERENCES supplies(id) ON DELETE CASCADE,
    FOREIGN KEY (issued_by) REFERENCES users(id),
    FOREIGN KEY (received_by) REFERENCES users(id),
    CHECK (returned_quantity IS NULL OR returned_quantity <= quantity_issued),
    INDEX idx_reservist (reservist_id),
    INDEX idx_supply (supply_id),
    INDEX idx_due_date (due_return_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table reports
-- -----------------------------------------------------
CREATE TABLE reports (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(500) NOT NULL,
    type ENUM('attendance', 'readiness', 'logistics', 'custom') NOT NULL,
    format ENUM('pdf', 'excel', 'csv') NOT NULL,
    file_path VARCHAR(1000) NOT NULL,
    file_size INT NULL,
    parameters JSON NULL,
    generated_by BIGINT NOT NULL,
    generated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NULL,
    is_recurring BOOLEAN DEFAULT FALSE,
    schedule_pattern VARCHAR(100) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (generated_by) REFERENCES users(id),
    INDEX idx_type (type),
    INDEX idx_generated_at (generated_at),
    INDEX idx_generated_by (generated_by)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table alerts
-- -----------------------------------------------------
CREATE TABLE alerts (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(500) NOT NULL,
    message TEXT NOT NULL,
    target_role ENUM('admin', 'reservist', 'all') NOT NULL DEFAULT 'all',
    target_group_id BIGINT NULL,
    target_city_id BIGINT NULL,
    target_area_id BIGINT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    start_date DATE NOT NULL DEFAULT (CURRENT_DATE),
    end_date DATE NULL,
    created_by BIGINT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (target_group_id) REFERENCES `groups`(id) ON DELETE SET NULL,
    FOREIGN KEY (target_city_id) REFERENCES cities(id) ON DELETE SET NULL,
    FOREIGN KEY (target_area_id) REFERENCES areas(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id),
    INDEX idx_target (target_role, target_group_id, target_city_id),
    INDEX idx_active_dates (is_active, start_date, end_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table user_alerts
-- -----------------------------------------------------
CREATE TABLE user_alerts (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    alert_id BIGINT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    read_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (alert_id) REFERENCES alerts(id) ON DELETE CASCADE,
    UNIQUE KEY uk_user_alert (user_id, alert_id),
    INDEX idx_unread (user_id, is_read)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table system_settings
-- -----------------------------------------------------
CREATE TABLE system_settings (
    `key` VARCHAR(100) PRIMARY KEY,
    `value` JSON NOT NULL,
    description TEXT NULL,
    updated_by BIGINT NULL,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (updated_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table audit_logs
-- -----------------------------------------------------
CREATE TABLE audit_logs (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id BIGINT NULL,
    old_values JSON NULL,
    new_values JSON NULL,
    ip_address VARCHAR(45) NULL,
    user_agent TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_user (user_id),
    INDEX idx_action (action),
    INDEX idx_entity (entity_type, entity_id),
    INDEX idx_timestamp (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Recommended Additional Indexes
-- -----------------------------------------------------
CREATE INDEX idx_reservist_active_assignments ON reservist_assignments(reservist_id, is_primary, group_id, city_id);
CREATE INDEX idx_attendance_training_reservist ON attendance(training_id, reservist_id, status);
CREATE INDEX idx_readiness_reservist_date ON readiness(reservist_id, assessment_date DESC);
CREATE INDEX idx_issuances_reservist_due ON supply_issuances(reservist_id, returned_date, due_return_date);
CREATE INDEX idx_trainings_dates_status ON trainings(start_datetime, status);
