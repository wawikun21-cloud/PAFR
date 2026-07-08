
/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

CREATE DATABASE /*!32312 IF NOT EXISTS*/ `u591572634_pafr` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;

USE `u591572634_pafr`;
DROP TABLE IF EXISTS `activities`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `activities` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `training_id` bigint NOT NULL,
  `title` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `start_time` datetime NOT NULL,
  `end_time` datetime NOT NULL,
  `location` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `instructor` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_mandatory` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_training` (`training_id`),
  KEY `idx_timing` (`start_time`,`end_time`),
  CONSTRAINT `activities_ibfk_1` FOREIGN KEY (`training_id`) REFERENCES `trainings` (`id`) ON DELETE CASCADE,
  CONSTRAINT `activities_chk_1` CHECK ((`end_time` > `start_time`))
) ENGINE=InnoDB AUTO_INCREMENT=24 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `alert_rules`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `alert_rules` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'readiness_low, readiness_drop, no_training, low_attendance, supply_low, supply_overdue, profile_incomplete, no_assessment',
  `name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `severity` enum('critical','warning','info') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'warning',
  `threshold` decimal(10,2) DEFAULT NULL COMMENT 'Numeric threshold for triggering (e.g., 60 for readiness < 60)',
  `lookback_days` int DEFAULT NULL COMMENT 'Number of days to look back (e.g., 90 for no training in 90 days)',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `alerts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `alerts` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `title` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `message` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `target_role` enum('admin','reservist','all') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'all',
  `target_group_id` bigint DEFAULT NULL,
  `target_squadron_id` bigint DEFAULT NULL,
  `target_area_id` bigint DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `start_date` date NOT NULL DEFAULT (curdate()),
  `end_date` date DEFAULT NULL,
  `created_by` bigint NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `target_group_id` (`target_group_id`),
  KEY `target_squadron_id` (`target_squadron_id`),
  KEY `target_area_id` (`target_area_id`),
  KEY `created_by` (`created_by`),
  KEY `idx_target` (`target_role`,`target_group_id`,`target_squadron_id`),
  KEY `idx_active_dates` (`is_active`,`start_date`,`end_date`),
  CONSTRAINT `alerts_ibfk_1` FOREIGN KEY (`target_group_id`) REFERENCES `groups` (`id`) ON DELETE SET NULL,
  CONSTRAINT `alerts_ibfk_2` FOREIGN KEY (`target_squadron_id`) REFERENCES `squadron` (`id`) ON DELETE SET NULL,
  CONSTRAINT `alerts_ibfk_3` FOREIGN KEY (`target_area_id`) REFERENCES `areas` (`id`) ON DELETE SET NULL,
  CONSTRAINT `alerts_ibfk_4` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `areas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `areas` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `parent_area_id` bigint DEFAULT NULL,
  `name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `geographic_boundary` json DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`),
  KEY `idx_parent` (`parent_area_id`),
  KEY `idx_code` (`code`),
  CONSTRAINT `areas_ibfk_1` FOREIGN KEY (`parent_area_id`) REFERENCES `areas` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `arsens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `arsens` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `location` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `commander_name` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`),
  KEY `idx_code` (`code`),
  KEY `idx_active` (`is_active`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `attendance`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `attendance` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `reservist_id` bigint NOT NULL,
  `training_id` bigint NOT NULL,
  `event_type` enum('internal','external') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'internal',
  `external_training_id` bigint DEFAULT NULL,
  `status` enum('present','absent','late','excused','pending') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `check_in_time` datetime DEFAULT NULL,
  `check_out_time` datetime DEFAULT NULL,
  `location_check_in` json DEFAULT NULL,
  `qr_code_used` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `scan_method` enum('qr_scanner','camera','manual') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `scan_timestamp` datetime DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `recorded_by` bigint DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_reservist_training` (`reservist_id`,`training_id`),
  KEY `recorded_by` (`recorded_by`),
  KEY `idx_training_status` (`training_id`,`status`),
  KEY `idx_reservist` (`reservist_id`),
  KEY `idx_dates` (`created_at`),
  KEY `idx_attendance_training_reservist` (`training_id`,`reservist_id`,`status`),
  KEY `idx_external_training` (`external_training_id`),
  KEY `idx_event_type` (`event_type`),
  CONSTRAINT `attendance_ibfk_1` FOREIGN KEY (`reservist_id`) REFERENCES `reservists` (`id`) ON DELETE CASCADE,
  CONSTRAINT `attendance_ibfk_2` FOREIGN KEY (`training_id`) REFERENCES `trainings` (`id`) ON DELETE CASCADE,
  CONSTRAINT `attendance_ibfk_3` FOREIGN KEY (`recorded_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `audit_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `audit_logs` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint DEFAULT NULL,
  `action` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `entity_type` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `entity_id` bigint DEFAULT NULL,
  `old_values` json DEFAULT NULL,
  `new_values` json DEFAULT NULL,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user` (`user_id`),
  KEY `idx_action` (`action`),
  KEY `idx_entity` (`entity_type`,`entity_id`),
  KEY `idx_timestamp` (`created_at`),
  CONSTRAINT `audit_logs_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=41 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `external_training_attachments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `external_training_attachments` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `external_training_id` bigint NOT NULL,
  `kind` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'letter_order',
  `stored_filename` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `original_filename` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `mime_type` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `size_bytes` int DEFAULT NULL,
  `storage_backend` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'local',
  `relative_path` varchar(1000) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `uploaded_by` bigint DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `uploaded_by` (`uploaded_by`),
  KEY `idx_external_training_kind` (`external_training_id`,`kind`),
  CONSTRAINT `external_training_attachments_ibfk_1` FOREIGN KEY (`external_training_id`) REFERENCES `external_trainings` (`id`) ON DELETE CASCADE,
  CONSTRAINT `external_training_attachments_ibfk_2` FOREIGN KEY (`uploaded_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `external_training_attendance`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `external_training_attendance` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `external_training_id` bigint NOT NULL,
  `registration_id` bigint DEFAULT NULL,
  `reservist_id` bigint DEFAULT NULL,
  `participant_name` varchar(300) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `participant_data` json DEFAULT NULL,
  `status` enum('present','absent','late','excused','pending') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `check_in_time` datetime DEFAULT NULL,
  `check_out_time` datetime DEFAULT NULL,
  `scan_method` enum('qr_scanner','camera','manual') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `qr_code_scanned` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `recorded_by` bigint DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `recorded_by` (`recorded_by`),
  KEY `idx_eta_training` (`external_training_id`),
  KEY `idx_eta_reservist` (`reservist_id`),
  KEY `idx_eta_registration` (`registration_id`),
  KEY `idx_eta_status` (`status`),
  CONSTRAINT `external_training_attendance_ibfk_1` FOREIGN KEY (`external_training_id`) REFERENCES `external_trainings` (`id`) ON DELETE CASCADE,
  CONSTRAINT `external_training_attendance_ibfk_2` FOREIGN KEY (`registration_id`) REFERENCES `training_registrations` (`id`) ON DELETE SET NULL,
  CONSTRAINT `external_training_attendance_ibfk_3` FOREIGN KEY (`reservist_id`) REFERENCES `reservists` (`id`) ON DELETE SET NULL,
  CONSTRAINT `external_training_attendance_ibfk_4` FOREIGN KEY (`recorded_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `external_trainings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `external_trainings` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `title` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `start_date` date NOT NULL,
  `start_time` time DEFAULT NULL,
  `venue` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('draft','open','closed','completed') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'draft',
  `capacity` int DEFAULT NULL,
  `instructor` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Facilitator or instructor name',
  `squadron_limits` json DEFAULT NULL COMMENT 'Per-squadron slot limits (array of {squadron_id, slot_limit})',
  `registration_fields` json DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_status` (`status`),
  KEY `idx_start_date` (`start_date`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `groups`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `groups` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `arsen_id` bigint NOT NULL,
  `code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `commander_name` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_group_code` (`arsen_id`,`code`),
  KEY `idx_arsen` (`arsen_id`),
  CONSTRAINT `groups_ibfk_1` FOREIGN KEY (`arsen_id`) REFERENCES `arsens` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `internal_training_attachments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `internal_training_attachments` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `training_id` bigint NOT NULL,
  `kind` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'letter_order',
  `stored_filename` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `original_filename` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `mime_type` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `size_bytes` int DEFAULT NULL,
  `storage_backend` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'local',
  `relative_path` varchar(1000) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `uploaded_by` bigint DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `uploaded_by` (`uploaded_by`),
  KEY `idx_training_kind` (`training_id`,`kind`),
  CONSTRAINT `internal_training_attachments_ibfk_1` FOREIGN KEY (`training_id`) REFERENCES `trainings` (`id`) ON DELETE CASCADE,
  CONSTRAINT `internal_training_attachments_ibfk_2` FOREIGN KEY (`uploaded_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `internal_training_participants`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `internal_training_participants` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `training_id` bigint NOT NULL,
  `reservist_id` bigint NOT NULL,
  `squadron_id` bigint NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_training_reservist` (`training_id`,`reservist_id`),
  KEY `reservist_id` (`reservist_id`),
  KEY `idx_training` (`training_id`),
  KEY `idx_squadron` (`squadron_id`),
  CONSTRAINT `internal_training_participants_ibfk_1` FOREIGN KEY (`training_id`) REFERENCES `trainings` (`id`) ON DELETE CASCADE,
  CONSTRAINT `internal_training_participants_ibfk_2` FOREIGN KEY (`reservist_id`) REFERENCES `reservists` (`id`) ON DELETE CASCADE,
  CONSTRAINT `internal_training_participants_ibfk_3` FOREIGN KEY (`squadron_id`) REFERENCES `squadron` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=23 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `readiness`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `readiness` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `reservist_id` bigint NOT NULL,
  `assessment_date` date NOT NULL,
  `medical_status` enum('fit','unfit','limited','pending') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `medical_notes` text COLLATE utf8mb4_unicode_ci,
  `physical_score` decimal(5,2) NOT NULL,
  `physical_test_date` date DEFAULT NULL,
  `weapons_qualification` enum('expert','sharpshooter','marksman','qualified','unqualified','none') COLLATE utf8mb4_unicode_ci DEFAULT 'none',
  `weapons_test_date` date DEFAULT NULL,
  `overall_score` decimal(5,2) GENERATED ALWAYS AS (round(((((case when (`medical_status` = _utf8mb4'fit') then 100 when (`medical_status` = _utf8mb4'limited') then 70 when (`medical_status` = _utf8mb4'pending') then 50 else 0 end) + `physical_score`) + (case `weapons_qualification` when _utf8mb4'expert' then 100 when _utf8mb4'sharpshooter' then 90 when _utf8mb4'marksman' then 80 when _utf8mb4'qualified' then 70 else 0 end)) / 3),2)) STORED,
  `assessed_by` bigint DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_reservist_date` (`reservist_id`,`assessment_date`),
  KEY `assessed_by` (`assessed_by`),
  KEY `idx_reservist` (`reservist_id`),
  KEY `idx_assessment_date` (`assessment_date`),
  KEY `idx_overall_score` (`overall_score`),
  KEY `idx_readiness_reservist_date` (`reservist_id`,`assessment_date` DESC),
  CONSTRAINT `readiness_ibfk_1` FOREIGN KEY (`reservist_id`) REFERENCES `reservists` (`id`) ON DELETE CASCADE,
  CONSTRAINT `readiness_ibfk_2` FOREIGN KEY (`assessed_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `report_documentations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `report_documentations` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `report_id` bigint NOT NULL,
  `original_filename` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_path` varchar(1000) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_size` int DEFAULT NULL,
  `mime_type` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `uploaded_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_rd_report` (`report_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `report_participants`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `report_participants` (
  `report_id` bigint NOT NULL,
  `reservist_id` bigint NOT NULL,
  `squadron_id` bigint DEFAULT NULL,
  `attendance_status` enum('present','absent','late','excused') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'present',
  `notes` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`report_id`,`reservist_id`),
  KEY `idx_rp_report` (`report_id`),
  KEY `idx_rp_reservist` (`reservist_id`),
  KEY `idx_rp_squadron` (`squadron_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `reports`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `reports` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `title` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `event_type` enum('internal','external') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'internal',
  `event_source_id` bigint DEFAULT NULL COMMENT 'FK to trainings.id or external_trainings.id',
  `event_date` date DEFAULT NULL,
  `summary` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `type` enum('attendance','readiness','logistics','custom') COLLATE utf8mb4_unicode_ci NOT NULL,
  `format` enum('pdf','excel','csv') COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_path` varchar(1000) COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_size` int DEFAULT NULL,
  `parameters` json DEFAULT NULL,
  `generated_by` bigint NOT NULL,
  `generated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `expires_at` datetime DEFAULT NULL,
  `is_recurring` tinyint(1) DEFAULT '0',
  `schedule_pattern` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_type` (`type`),
  KEY `idx_generated_at` (`generated_at`),
  KEY `idx_generated_by` (`generated_by`),
  CONSTRAINT `reports_ibfk_1` FOREIGN KEY (`generated_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `reservist_assignments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `reservist_assignments` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `reservist_id` bigint NOT NULL,
  `group_id` bigint NOT NULL,
  `squadron_id` bigint NOT NULL,
  `assigned_date` date NOT NULL,
  `is_primary` tinyint(1) NOT NULL DEFAULT '1',
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `squadron_id` (`squadron_id`),
  KEY `idx_group_squadron` (`group_id`,`squadron_id`),
  KEY `idx_reservist` (`reservist_id`),
  KEY `idx_reservist_active_assignments` (`reservist_id`,`is_primary`,`group_id`,`squadron_id`),
  CONSTRAINT `reservist_assignments_ibfk_1` FOREIGN KEY (`reservist_id`) REFERENCES `reservists` (`id`) ON DELETE CASCADE,
  CONSTRAINT `reservist_assignments_ibfk_2` FOREIGN KEY (`group_id`) REFERENCES `groups` (`id`) ON DELETE CASCADE,
  CONSTRAINT `reservist_assignments_ibfk_3` FOREIGN KEY (`squadron_id`) REFERENCES `squadron` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `reservists`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `reservists` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `first_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `last_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `rank` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `service_number` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `qr_code` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `date_of_birth` date DEFAULT NULL,
  `place_of_birth` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `age` int DEFAULT NULL,
  `sex` enum('Male','Female','Other') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `civil_status` enum('Single','Married','Widowed','Separated','Divorced') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `citizenship` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT 'Filipino',
  `height` decimal(5,2) DEFAULT NULL,
  `weight` decimal(5,2) DEFAULT NULL,
  `blood_type` enum('A+','A-','B+','B-','AB+','AB-','O+','O-','Unknown') COLLATE utf8mb4_unicode_ci DEFAULT 'Unknown',
  `phone_number` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address` text COLLATE utf8mb4_unicode_ci,
  `reserve_center` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `category` enum('1st Category','2nd Category','3rd Category') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `date_enlisted` date DEFAULT NULL,
  `source_of_commission` enum('ROTC','BCMT','MOTC','Direct Commission') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `rank_date_appointment` date DEFAULT NULL,
  `position` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `specialization` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reserve_status` enum('Ready Reserve','Standby Reserve','Retired') COLLATE utf8mb4_unicode_ci DEFAULT 'Ready Reserve',
  `highest_education` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `course_degree` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `school` varchar(300) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `year_graduated` int DEFAULT NULL,
  `occupation` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `employer` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `office_address` text COLLATE utf8mb4_unicode_ci,
  `basic_training_completed` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `basic_training_date` date DEFAULT NULL,
  `emergency_contact_name` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `emergency_contact_phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `emergency_contact_address` text COLLATE utf8mb4_unicode_ci,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_id` (`user_id`),
  UNIQUE KEY `service_number` (`service_number`),
  UNIQUE KEY `qr_code` (`qr_code`),
  KEY `idx_service_number` (`service_number`),
  KEY `idx_name` (`last_name`,`first_name`),
  KEY `idx_active` (`is_active`),
  KEY `idx_rank` (`rank`),
  KEY `idx_position` (`position`),
  KEY `idx_reserve_status` (`reserve_status`),
  KEY `idx_qr_code` (`qr_code`),
  CONSTRAINT `reservists_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `roles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `display_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `scan_audit_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `scan_audit_log` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `training_id` bigint DEFAULT NULL,
  `external_training_id` bigint DEFAULT NULL,
  `event_type` enum('internal','external') COLLATE utf8mb4_unicode_ci NOT NULL,
  `qr_code_scanned` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `reservist_id` bigint DEFAULT NULL,
  `scan_result` enum('success','not_registered','invalid_qr_code','event_inactive','duplicate','capacity_full') COLLATE utf8mb4_unicode_ci NOT NULL,
  `scan_method` enum('qr_scanner','camera','manual') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `device_info` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `facilitator_id` bigint DEFAULT NULL,
  `error_message` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `scanned_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `reservist_id` (`reservist_id`),
  KEY `facilitator_id` (`facilitator_id`),
  KEY `idx_sal_training` (`training_id`),
  KEY `idx_sal_external` (`external_training_id`),
  KEY `idx_sal_qr_code` (`qr_code_scanned`),
  KEY `idx_sal_result` (`scan_result`),
  KEY `idx_sal_time` (`scanned_at`),
  CONSTRAINT `scan_audit_log_ibfk_1` FOREIGN KEY (`training_id`) REFERENCES `trainings` (`id`) ON DELETE SET NULL,
  CONSTRAINT `scan_audit_log_ibfk_2` FOREIGN KEY (`external_training_id`) REFERENCES `external_trainings` (`id`) ON DELETE SET NULL,
  CONSTRAINT `scan_audit_log_ibfk_3` FOREIGN KEY (`reservist_id`) REFERENCES `reservists` (`id`) ON DELETE SET NULL,
  CONSTRAINT `scan_audit_log_ibfk_4` FOREIGN KEY (`facilitator_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `squadron`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `squadron` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `group_id` bigint NOT NULL,
  `name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `location` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `latitude` decimal(10,7) DEFAULT NULL,
  `longitude` decimal(10,7) DEFAULT NULL,
  `specialization` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_group` (`group_id`),
  KEY `idx_location` (`location`),
  KEY `idx_specialization` (`specialization`),
  CONSTRAINT `squadron_ibfk_1` FOREIGN KEY (`group_id`) REFERENCES `groups` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=26 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `supplies`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `supplies` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `name` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `category` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `unit` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `quantity_available` int NOT NULL DEFAULT '0',
  `reorder_level` int NOT NULL DEFAULT '10',
  `max_stock` int DEFAULT NULL,
  `location` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `supplier` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `last_ordered_date` date DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_category` (`category`),
  KEY `idx_name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `supply_issuances`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `supply_issuances` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `reservist_id` bigint NOT NULL,
  `supply_id` bigint NOT NULL,
  `quantity_issued` int NOT NULL,
  `issued_date` date NOT NULL DEFAULT (curdate()),
  `due_return_date` date NOT NULL,
  `returned_date` date DEFAULT NULL,
  `returned_quantity` int DEFAULT NULL,
  `condition_on_issue` enum('new','good','fair','poor') COLLATE utf8mb4_unicode_ci DEFAULT 'good',
  `condition_on_return` enum('new','good','fair','poor','damaged') COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `issued_by` bigint NOT NULL,
  `received_by` bigint DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `issued_by` (`issued_by`),
  KEY `received_by` (`received_by`),
  KEY `idx_reservist` (`reservist_id`),
  KEY `idx_supply` (`supply_id`),
  KEY `idx_due_date` (`due_return_date`),
  KEY `idx_issuances_reservist_due` (`reservist_id`,`returned_date`,`due_return_date`),
  CONSTRAINT `supply_issuances_ibfk_1` FOREIGN KEY (`reservist_id`) REFERENCES `reservists` (`id`) ON DELETE CASCADE,
  CONSTRAINT `supply_issuances_ibfk_2` FOREIGN KEY (`supply_id`) REFERENCES `supplies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `supply_issuances_ibfk_3` FOREIGN KEY (`issued_by`) REFERENCES `users` (`id`),
  CONSTRAINT `supply_issuances_ibfk_4` FOREIGN KEY (`received_by`) REFERENCES `users` (`id`),
  CONSTRAINT `supply_issuances_chk_1` CHECK (((`returned_quantity` is null) or (`returned_quantity` <= `quantity_issued`)))
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `system_alerts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `system_alerts` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `rule_id` bigint DEFAULT NULL COMMENT 'FK to alert_rules, NULL for ad-hoc',
  `alert_type` enum('readiness_low','readiness_drop','no_training','low_attendance','supply_low','supply_overdue','profile_incomplete','no_assessment','training_upcoming','custom') COLLATE utf8mb4_unicode_ci NOT NULL,
  `severity` enum('critical','warning','info') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'warning',
  `title` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `message` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `entity_type` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'squadron, reservist, supply, training, issuance',
  `entity_id` bigint DEFAULT NULL COMMENT 'ID of the entity this alert is about',
  `entity_name` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Denormalized name for display',
  `squadron_id` bigint DEFAULT NULL,
  `group_id` bigint DEFAULT NULL,
  `arsen_id` bigint DEFAULT NULL,
  `is_acknowledged` tinyint(1) NOT NULL DEFAULT '0',
  `acknowledged_by` bigint DEFAULT NULL,
  `acknowledged_at` datetime DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_alert_type` (`alert_type`),
  KEY `idx_severity` (`severity`),
  KEY `idx_entity` (`entity_type`,`entity_id`),
  KEY `idx_squadron` (`squadron_id`),
  KEY `idx_group` (`group_id`),
  KEY `idx_arsen` (`arsen_id`),
  KEY `idx_created` (`created_at`),
  KEY `idx_acknowledged` (`is_acknowledged`),
  KEY `rule_id` (`rule_id`),
  CONSTRAINT `system_alerts_ibfk_1` FOREIGN KEY (`rule_id`) REFERENCES `alert_rules` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=255 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `system_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `system_settings` (
  `key` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `value` json NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `updated_by` bigint DEFAULT NULL,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`key`),
  KEY `updated_by` (`updated_by`),
  CONSTRAINT `system_settings_ibfk_1` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `training_facilitators`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `training_facilitators` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `training_id` bigint DEFAULT NULL,
  `external_training_id` bigint DEFAULT NULL,
  `user_id` bigint NOT NULL,
  `assigned_by` bigint DEFAULT NULL,
  `assigned_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_tf_training_user` (`training_id`,`user_id`),
  UNIQUE KEY `uk_tf_external_user` (`external_training_id`,`user_id`),
  KEY `assigned_by` (`assigned_by`),
  KEY `idx_tf_user` (`user_id`),
  CONSTRAINT `training_facilitators_ibfk_1` FOREIGN KEY (`training_id`) REFERENCES `trainings` (`id`) ON DELETE CASCADE,
  CONSTRAINT `training_facilitators_ibfk_2` FOREIGN KEY (`external_training_id`) REFERENCES `external_trainings` (`id`) ON DELETE CASCADE,
  CONSTRAINT `training_facilitators_ibfk_3` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `training_facilitators_ibfk_4` FOREIGN KEY (`assigned_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `training_registrations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `training_registrations` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `training_id` bigint NOT NULL,
  `participant_data` json DEFAULT NULL,
  `registered_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_training` (`training_id`),
  CONSTRAINT `training_registrations_ibfk_1` FOREIGN KEY (`training_id`) REFERENCES `external_trainings` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `trainings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `trainings` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `title` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `start_datetime` datetime NOT NULL,
  `end_datetime` datetime NOT NULL,
  `venue` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `area_id` bigint DEFAULT NULL,
  `status` enum('draft','published','ongoing','completed','cancelled') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'draft',
  `capacity` int DEFAULT NULL,
  `is_mandatory` tinyint(1) NOT NULL DEFAULT '0',
  `created_by` bigint NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `created_by` (`created_by`),
  KEY `idx_status` (`status`),
  KEY `idx_dates` (`start_datetime`,`end_datetime`),
  KEY `idx_area` (`area_id`),
  KEY `idx_trainings_dates_status` (`start_datetime`,`status`),
  CONSTRAINT `trainings_ibfk_1` FOREIGN KEY (`area_id`) REFERENCES `areas` (`id`) ON DELETE SET NULL,
  CONSTRAINT `trainings_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `trainings_chk_1` CHECK ((`end_datetime` > `start_datetime`))
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `user_alerts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_alerts` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `alert_id` bigint NOT NULL,
  `is_read` tinyint(1) NOT NULL DEFAULT '0',
  `read_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_alert` (`user_id`,`alert_id`),
  KEY `alert_id` (`alert_id`),
  KEY `idx_unread` (`user_id`,`is_read`),
  CONSTRAINT `user_alerts_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `user_alerts_ibfk_2` FOREIGN KEY (`alert_id`) REFERENCES `alerts` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `user_role_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_role_history` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `old_role` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `new_role` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `old_scope_arsen_id` bigint DEFAULT NULL,
  `new_scope_arsen_id` bigint DEFAULT NULL,
  `old_scope_group_id` bigint DEFAULT NULL,
  `new_scope_group_id` bigint DEFAULT NULL,
  `old_scope_squadron_id` bigint DEFAULT NULL,
  `new_scope_squadron_id` bigint DEFAULT NULL,
  `changed_by` bigint DEFAULT NULL,
  `changed_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `changed_by` (`changed_by`),
  KEY `idx_user` (`user_id`),
  KEY `idx_changed_at` (`changed_at`),
  CONSTRAINT `user_role_history_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `user_role_history_ibfk_2` FOREIGN KEY (`changed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` enum('admin','admin_arsen','admin_group','admin_squadron','reservist') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'reservist',
  `scope_arsen_id` bigint DEFAULT NULL,
  `scope_group_id` bigint DEFAULT NULL,
  `scope_squadron_id` bigint DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `last_login_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  KEY `idx_email` (`email`),
  KEY `idx_role` (`role`),
  KEY `idx_active` (`is_active`),
  KEY `fk_user_arsen` (`scope_arsen_id`),
  KEY `fk_user_group` (`scope_group_id`),
  KEY `fk_user_squadron` (`scope_squadron_id`),
  CONSTRAINT `fk_user_arsen` FOREIGN KEY (`scope_arsen_id`) REFERENCES `arsens` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_user_group` FOREIGN KEY (`scope_group_id`) REFERENCES `groups` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_user_squadron` FOREIGN KEY (`scope_squadron_id`) REFERENCES `squadron` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `v_arsen_readiness`;
/*!50001 DROP VIEW IF EXISTS `v_arsen_readiness`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_arsen_readiness` AS SELECT 
 1 AS `arsen_id`,
 1 AS `arsen_name`,
 1 AS `arsen_code`,
 1 AS `total_groups`,
 1 AS `total_squadrons`,
 1 AS `total_reservists`,
 1 AS `active_reservists`,
 1 AS `avg_readiness_score`,
 1 AS `avg_training_participation`,
 1 AS `avg_attendance_rate`,
 1 AS `avg_active_status`,
 1 AS `below_threshold_count`*/;
SET character_set_client = @saved_cs_client;
DROP TABLE IF EXISTS `v_group_readiness`;
/*!50001 DROP VIEW IF EXISTS `v_group_readiness`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_group_readiness` AS SELECT 
 1 AS `group_id`,
 1 AS `group_name`,
 1 AS `group_code`,
 1 AS `arsen_id`,
 1 AS `arsen_name`,
 1 AS `total_squadrons`,
 1 AS `total_reservists`,
 1 AS `active_reservists`,
 1 AS `avg_readiness_score`,
 1 AS `avg_training_participation`,
 1 AS `avg_attendance_rate`,
 1 AS `avg_active_status`,
 1 AS `below_threshold_count`*/;
SET character_set_client = @saved_cs_client;
DROP TABLE IF EXISTS `v_overall_readiness`;
/*!50001 DROP VIEW IF EXISTS `v_overall_readiness`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_overall_readiness` AS SELECT 
 1 AS `total_reservists`,
 1 AS `active_reservists`,
 1 AS `avg_readiness_score`,
 1 AS `avg_training_participation`,
 1 AS `avg_attendance_rate`,
 1 AS `avg_active_status`,
 1 AS `below_threshold_count`,
 1 AS `high_readiness_count`,
 1 AS `medium_readiness_count`,
 1 AS `low_readiness_count`*/;
SET character_set_client = @saved_cs_client;
DROP TABLE IF EXISTS `v_reservist_readiness`;
/*!50001 DROP VIEW IF EXISTS `v_reservist_readiness`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_reservist_readiness` AS SELECT 
 1 AS `reservist_id`,
 1 AS `first_name`,
 1 AS `last_name`,
 1 AS `service_number`,
 1 AS `rank`,
 1 AS `is_active`,
 1 AS `specialization`,
 1 AS `group_id`,
 1 AS `squadron_id`,
 1 AS `arsen_id`,
 1 AS `training_participation_pct`,
 1 AS `attendance_rate_pct`,
 1 AS `active_status_pct`,
 1 AS `readiness_score`*/;
SET character_set_client = @saved_cs_client;
DROP TABLE IF EXISTS `v_squadron_readiness`;
/*!50001 DROP VIEW IF EXISTS `v_squadron_readiness`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_squadron_readiness` AS SELECT 
 1 AS `squadron_id`,
 1 AS `squadron_name`,
 1 AS `squadron_code`,
 1 AS `group_id`,
 1 AS `group_name`,
 1 AS `arsen_id`,
 1 AS `arsen_name`,
 1 AS `total_reservists`,
 1 AS `active_reservists`,
 1 AS `avg_readiness_score`,
 1 AS `avg_training_participation`,
 1 AS `avg_attendance_rate`,
 1 AS `avg_active_status`,
 1 AS `below_threshold_count`*/;
SET character_set_client = @saved_cs_client;

USE `u591572634_pafr`;
/*!50001 DROP VIEW IF EXISTS `v_arsen_readiness`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = cp850 */;
/*!50001 SET character_set_results     = cp850 */;
/*!50001 SET collation_connection      = cp850_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50001 VIEW `v_arsen_readiness` AS select `a`.`id` AS `arsen_id`,`a`.`name` AS `arsen_name`,`a`.`code` AS `arsen_code`,count(distinct `gr`.`group_id`) AS `total_groups`,sum(`gr`.`total_squadrons`) AS `total_squadrons`,sum(`gr`.`total_reservists`) AS `total_reservists`,sum(`gr`.`active_reservists`) AS `active_reservists`,round(avg(`gr`.`avg_readiness_score`),2) AS `avg_readiness_score`,round(avg(`gr`.`avg_training_participation`),2) AS `avg_training_participation`,round(avg(`gr`.`avg_attendance_rate`),2) AS `avg_attendance_rate`,round(avg(`gr`.`avg_active_status`),2) AS `avg_active_status`,sum(`gr`.`below_threshold_count`) AS `below_threshold_count` from (`arsens` `a` left join `v_group_readiness` `gr` on((`gr`.`arsen_id` = `a`.`id`))) group by `a`.`id`,`a`.`name`,`a`.`code` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
/*!50001 DROP VIEW IF EXISTS `v_group_readiness`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = cp850 */;
/*!50001 SET character_set_results     = cp850 */;
/*!50001 SET collation_connection      = cp850_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50001 VIEW `v_group_readiness` AS select `g`.`id` AS `group_id`,`g`.`name` AS `group_name`,`g`.`code` AS `group_code`,`g`.`arsen_id` AS `arsen_id`,`a`.`name` AS `arsen_name`,count(distinct `sr`.`squadron_id`) AS `total_squadrons`,count(distinct `sr`.`total_reservists`) AS `total_reservists`,sum(`sr`.`active_reservists`) AS `active_reservists`,round(avg(`sr`.`avg_readiness_score`),2) AS `avg_readiness_score`,round(avg(`sr`.`avg_training_participation`),2) AS `avg_training_participation`,round(avg(`sr`.`avg_attendance_rate`),2) AS `avg_attendance_rate`,round(avg(`sr`.`avg_active_status`),2) AS `avg_active_status`,sum(`sr`.`below_threshold_count`) AS `below_threshold_count` from ((`groups` `g` join `arsens` `a` on((`g`.`arsen_id` = `a`.`id`))) left join `v_squadron_readiness` `sr` on((`sr`.`group_id` = `g`.`id`))) group by `g`.`id`,`g`.`name`,`g`.`code`,`g`.`arsen_id`,`a`.`name` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
/*!50001 DROP VIEW IF EXISTS `v_overall_readiness`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = cp850 */;
/*!50001 SET character_set_results     = cp850 */;
/*!50001 SET collation_connection      = cp850_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50001 VIEW `v_overall_readiness` AS select count(distinct `v_reservist_readiness`.`reservist_id`) AS `total_reservists`,count(distinct (case when (`v_reservist_readiness`.`is_active` = true) then `v_reservist_readiness`.`reservist_id` end)) AS `active_reservists`,round(avg(`v_reservist_readiness`.`readiness_score`),2) AS `avg_readiness_score`,round(avg(`v_reservist_readiness`.`training_participation_pct`),2) AS `avg_training_participation`,round(avg(`v_reservist_readiness`.`attendance_rate_pct`),2) AS `avg_attendance_rate`,round(avg(`v_reservist_readiness`.`active_status_pct`),2) AS `avg_active_status`,count(distinct (case when (`v_reservist_readiness`.`readiness_score` < 65) then `v_reservist_readiness`.`reservist_id` end)) AS `below_threshold_count`,count(distinct (case when (`v_reservist_readiness`.`readiness_score` >= 80) then `v_reservist_readiness`.`reservist_id` end)) AS `high_readiness_count`,count(distinct (case when ((`v_reservist_readiness`.`readiness_score` >= 65) and (`v_reservist_readiness`.`readiness_score` < 80)) then `v_reservist_readiness`.`reservist_id` end)) AS `medium_readiness_count`,count(distinct (case when ((`v_reservist_readiness`.`readiness_score` < 65) and (`v_reservist_readiness`.`readiness_score` > 0)) then `v_reservist_readiness`.`reservist_id` end)) AS `low_readiness_count` from `v_reservist_readiness` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
/*!50001 DROP VIEW IF EXISTS `v_reservist_readiness`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = cp850 */;
/*!50001 SET character_set_results     = cp850 */;
/*!50001 SET collation_connection      = cp850_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50001 VIEW `v_reservist_readiness` AS select `r`.`id` AS `reservist_id`,`r`.`first_name` AS `first_name`,`r`.`last_name` AS `last_name`,`r`.`service_number` AS `service_number`,`r`.`rank` AS `rank`,`r`.`is_active` AS `is_active`,`r`.`specialization` AS `specialization`,`ra`.`group_id` AS `group_id`,`ra`.`squadron_id` AS `squadron_id`,`g`.`arsen_id` AS `arsen_id`,coalesce((select round(((100.0 * sum((case when (`a`.`status` = 'present') then 1 else 0 end))) / nullif(count(0),0)),2) from ((`internal_training_participants` `itp` join `trainings` `t` on((`itp`.`training_id` = `t`.`id`))) left join `attendance` `a` on(((`a`.`training_id` = `t`.`id`) and (`a`.`reservist_id` = `itp`.`reservist_id`)))) where ((`itp`.`reservist_id` = `r`.`id`) and (`t`.`is_mandatory` = true))),0) AS `training_participation_pct`,coalesce((select round(((100.0 * sum((case when (`a`.`status` in ('present','late')) then 1 else 0 end))) / nullif(count(0),0)),2) from `attendance` `a` where (`a`.`reservist_id` = `r`.`id`)),0) AS `attendance_rate_pct`,(case when (`r`.`is_active` = true) then 100.00 else 0.00 end) AS `active_status_pct`,round(((coalesce((select (((0.40 * 100.0) * sum((case when (`a`.`status` = 'present') then 1 else 0 end))) / nullif(count(0),0)) from ((`internal_training_participants` `itp` join `trainings` `t` on((`itp`.`training_id` = `t`.`id`))) left join `attendance` `a` on(((`a`.`training_id` = `t`.`id`) and (`a`.`reservist_id` = `itp`.`reservist_id`)))) where ((`itp`.`reservist_id` = `r`.`id`) and (`t`.`is_mandatory` = true))),0) + coalesce((select (((0.30 * 100.0) * sum((case when (`a`.`status` in ('present','late')) then 1 else 0 end))) / nullif(count(0),0)) from `attendance` `a` where (`a`.`reservist_id` = `r`.`id`)),0)) + (case when (`r`.`is_active` = true) then 30.00 else 0.00 end)),2) AS `readiness_score` from ((`reservists` `r` left join `reservist_assignments` `ra` on(((`r`.`id` = `ra`.`reservist_id`) and (`ra`.`is_primary` = true)))) left join `groups` `g` on((`ra`.`group_id` = `g`.`id`))) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
/*!50001 DROP VIEW IF EXISTS `v_squadron_readiness`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = cp850 */;
/*!50001 SET character_set_results     = cp850 */;
/*!50001 SET collation_connection      = cp850_general_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50001 VIEW `v_squadron_readiness` AS select `s`.`id` AS `squadron_id`,`s`.`name` AS `squadron_name`,`s`.`code` AS `squadron_code`,`s`.`group_id` AS `group_id`,`g`.`name` AS `group_name`,`g`.`arsen_id` AS `arsen_id`,`a`.`name` AS `arsen_name`,count(distinct `vr`.`reservist_id`) AS `total_reservists`,count(distinct (case when (`vr`.`is_active` = true) then `vr`.`reservist_id` end)) AS `active_reservists`,round(avg(`vr`.`readiness_score`),2) AS `avg_readiness_score`,round(avg(`vr`.`training_participation_pct`),2) AS `avg_training_participation`,round(avg(`vr`.`attendance_rate_pct`),2) AS `avg_attendance_rate`,round(avg(`vr`.`active_status_pct`),2) AS `avg_active_status`,count(distinct (case when (`vr`.`readiness_score` < 65) then `vr`.`reservist_id` end)) AS `below_threshold_count` from (((`squadron` `s` join `groups` `g` on((`s`.`group_id` = `g`.`id`))) join `arsens` `a` on((`g`.`arsen_id` = `a`.`id`))) left join `v_reservist_readiness` `vr` on((`vr`.`squadron_id` = `s`.`id`))) group by `s`.`id`,`s`.`name`,`s`.`code`,`s`.`group_id`,`g`.`name`,`g`.`arsen_id`,`a`.`name` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- -----------------------------------------------------
-- Table areas
-- -----------------------------------------------------
CREATE TABLE areas (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    parent_area_id BIGINT NULL,
    name VARCHAR(200) NOT NULL,
    code VARCHAR(50) NOT NULL,
    description TEXT NULL,
    geographic_boundary JSON NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY code (code),
    INDEX idx_parent (parent_area_id),
    INDEX idx_code (code),
    CONSTRAINT areas_ibfk_1 FOREIGN KEY (parent_area_id) REFERENCES areas(id) ON DELETE SET NULL
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
    created_by BIGINT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_status (status),
    INDEX idx_dates (start_datetime, end_datetime),
    INDEX idx_area (area_id),
    INDEX idx_trainings_dates_status (start_datetime, status),
    CONSTRAINT trainings_ibfk_1 FOREIGN KEY (area_id) REFERENCES areas(id) ON DELETE SET NULL,
    CONSTRAINT trainings_ibfk_2 FOREIGN KEY (created_by) REFERENCES users(id)
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
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_training (training_id),
    INDEX idx_timing (start_time, end_time),
    CONSTRAINT activities_ibfk_1 FOREIGN KEY (training_id) REFERENCES trainings(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table internal_training_participants
-- -----------------------------------------------------
CREATE TABLE internal_training_participants (
    training_id BIGINT NOT NULL,
    reservist_id BIGINT NOT NULL,
    squadron_id BIGINT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (training_id, reservist_id),
    INDEX idx_itp_training_squadron (training_id, squadron_id),
    INDEX idx_itp_squadron (squadron_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table internal_training_attachments
-- -----------------------------------------------------
CREATE TABLE internal_training_attachments (
    id BIGINT NOT NULL AUTO_INCREMENT,
    training_id BIGINT NOT NULL,
    kind VARCHAR(32) NOT NULL DEFAULT 'letter_order',
    stored_filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(500) NOT NULL,
    mime_type VARCHAR(127) NOT NULL,
    size_bytes BIGINT UNSIGNED NOT NULL,
    storage_backend VARCHAR(32) NOT NULL DEFAULT 'local',
    relative_path VARCHAR(1024) NOT NULL,
    uploaded_by BIGINT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_internal_training_kind (training_id, kind),
    INDEX idx_internal_training_created (training_id, created_at),
    CONSTRAINT internal_training_attachments_ibfk_1 FOREIGN KEY (training_id) REFERENCES trainings(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table external_trainings
-- -----------------------------------------------------
CREATE TABLE external_trainings (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    title VARCHAR(255) NOT NULL,
    description TEXT NULL,
    start_date DATE NOT NULL,
    start_time TIME NULL,
    venue VARCHAR(255) NULL,
    status ENUM('draft', 'open', 'closed', 'completed') NOT NULL DEFAULT 'draft',
    capacity INT UNSIGNED NULL,
    squadron_limits JSON NULL COMMENT 'Per-squadron slot limits (array of {squadron_id, slot_limit})',
    registration_fields JSON NULL COMMENT 'Dynamic form field schema (array of field configs)',
    instructor VARCHAR(200) NULL COMMENT 'Facilitator or instructor name',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_status (status),
    INDEX idx_start_date (start_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table external_training_attachments
-- -----------------------------------------------------
CREATE TABLE external_training_attachments (
    id BIGINT NOT NULL AUTO_INCREMENT,
    external_training_id INT UNSIGNED NOT NULL,
    kind VARCHAR(32) NOT NULL DEFAULT 'letter_order',
    stored_filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(500) NOT NULL,
    mime_type VARCHAR(127) NOT NULL,
    size_bytes BIGINT UNSIGNED NOT NULL,
    storage_backend VARCHAR(32) NOT NULL DEFAULT 'local',
    relative_path VARCHAR(1024) NOT NULL,
    uploaded_by BIGINT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_external_training_kind (external_training_id, kind),
    INDEX idx_external_training_created (external_training_id, created_at),
    CONSTRAINT external_training_attachments_ibfk_1 FOREIGN KEY (external_training_id) REFERENCES external_trainings(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table training_registrations
-- -----------------------------------------------------
CREATE TABLE training_registrations (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    training_id INT UNSIGNED NOT NULL,
    participant_data JSON NULL COMMENT 'Key-value pairs keyed by field ID',
    registered_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_training_id (training_id),
    INDEX idx_registered_at (registered_at),
    CONSTRAINT training_registrations_ibfk_1 FOREIGN KEY (training_id) REFERENCES external_trainings(id) ON DELETE CASCADE
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
    UNIQUE KEY uk_reservist_training (reservist_id, training_id),
    INDEX idx_training_status (training_id, status),
    INDEX idx_reservist (reservist_id),
    INDEX idx_dates (created_at),
    INDEX idx_attendance_training_reservist (training_id, reservist_id, status),
    CONSTRAINT attendance_ibfk_1 FOREIGN KEY (reservist_id) REFERENCES reservists(id) ON DELETE CASCADE,
    CONSTRAINT attendance_ibfk_2 FOREIGN KEY (training_id) REFERENCES trainings(id) ON DELETE CASCADE,
    CONSTRAINT attendance_ibfk_3 FOREIGN KEY (recorded_by) REFERENCES users(id)
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
    UNIQUE KEY uk_reservist_date (reservist_id, assessment_date),
    INDEX idx_reservist (reservist_id),
    INDEX idx_assessment_date (assessment_date),
    INDEX idx_overall_score (overall_score),
    INDEX idx_readiness_reservist_date (reservist_id, assessment_date DESC),
    CONSTRAINT readiness_ibfk_1 FOREIGN KEY (reservist_id) REFERENCES reservists(id) ON DELETE CASCADE,
    CONSTRAINT readiness_ibfk_2 FOREIGN KEY (assessed_by) REFERENCES users(id)
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
    INDEX idx_reservist (reservist_id),
    INDEX idx_supply (supply_id),
    INDEX idx_due_date (due_return_date),
    INDEX idx_issuances_reservist_due (reservist_id, returned_date, due_return_date),
    CONSTRAINT supply_issuances_ibfk_1 FOREIGN KEY (reservist_id) REFERENCES reservists(id) ON DELETE CASCADE,
    CONSTRAINT supply_issuances_ibfk_2 FOREIGN KEY (supply_id) REFERENCES supplies(id) ON DELETE CASCADE,
    CONSTRAINT supply_issuances_ibfk_3 FOREIGN KEY (issued_by) REFERENCES users(id),
    CONSTRAINT supply_issuances_ibfk_4 FOREIGN KEY (received_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table reports
-- -----------------------------------------------------
CREATE TABLE reports (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(500) NOT NULL,
    event_type ENUM('internal', 'external') NOT NULL DEFAULT 'internal',
    event_source_id BIGINT DEFAULT NULL COMMENT 'FK to trainings.id or external_trainings.id',
    event_date DATE DEFAULT NULL,
    summary TEXT DEFAULT NULL,
    type ENUM('attendance', 'readiness', 'logistics', 'custom') NOT NULL,
    format ENUM('pdf', 'excel', 'csv') NOT NULL,
    file_path VARCHAR(1000) NOT NULL,
    file_size INT NULL,
    parameters JSON NULL,
    generated_by BIGINT NOT NULL,
    generated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME NULL,
    is_recurring TINYINT(1) DEFAULT 0,
    schedule_pattern VARCHAR(100) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_type (type),
    INDEX idx_generated_at (generated_at),
    INDEX idx_generated_by (generated_by),
    CONSTRAINT reports_ibfk_1 FOREIGN KEY (generated_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table report_participants
-- -----------------------------------------------------
CREATE TABLE report_participants (
    report_id BIGINT NOT NULL,
    reservist_id BIGINT NOT NULL,
    squadron_id BIGINT DEFAULT NULL,
    attendance_status ENUM('present', 'absent', 'late', 'excused') NOT NULL DEFAULT 'present',
    notes VARCHAR(500) DEFAULT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (report_id, reservist_id),
    INDEX idx_rp_report (report_id),
    INDEX idx_rp_reservist (reservist_id),
    INDEX idx_rp_squadron (squadron_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table report_documentations
-- -----------------------------------------------------
CREATE TABLE report_documentations (
    id BIGINT NOT NULL AUTO_INCREMENT,
    report_id BIGINT NOT NULL,
    original_filename VARCHAR(500) NOT NULL,
    file_path VARCHAR(1000) NOT NULL,
    file_size INT DEFAULT NULL,
    mime_type VARCHAR(100) DEFAULT NULL,
    uploaded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    INDEX idx_rd_report (report_id)
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
    target_squadron_id BIGINT NULL,
    target_area_id BIGINT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    start_date DATE NOT NULL DEFAULT (CURRENT_DATE),
    end_date DATE NULL,
    created_by BIGINT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_target (target_role, target_group_id, target_squadron_id),
    INDEX idx_active_dates (is_active, start_date, end_date),
    CONSTRAINT alerts_ibfk_1 FOREIGN KEY (target_group_id) REFERENCES `groups`(id) ON DELETE SET NULL,
    CONSTRAINT alerts_ibfk_2 FOREIGN KEY (target_squadron_id) REFERENCES squadron(id) ON DELETE SET NULL,
    CONSTRAINT alerts_ibfk_3 FOREIGN KEY (target_area_id) REFERENCES areas(id) ON DELETE SET NULL,
    CONSTRAINT alerts_ibfk_4 FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table user_alerts
-- -----------------------------------------------------
CREATE TABLE user_alerts (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    alert_id BIGINT NOT NULL,
    is_read TINYINT(1) NOT NULL DEFAULT 0,
    read_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_user_alert (user_id, alert_id),
    INDEX idx_unread (user_id, is_read),
    CONSTRAINT user_alerts_ibfk_1 FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT user_alerts_ibfk_2 FOREIGN KEY (alert_id) REFERENCES alerts(id) ON DELETE CASCADE
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
    CONSTRAINT system_settings_ibfk_1 FOREIGN KEY (updated_by) REFERENCES users(id)
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
    INDEX idx_user (user_id),
    INDEX idx_action (action),
    INDEX idx_entity (entity_type, entity_id),
    INDEX idx_timestamp (created_at),
    CONSTRAINT audit_logs_ibfk_1 FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table roles
-- -----------------------------------------------------
CREATE TABLE roles (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    description TEXT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table user_role_history
-- -----------------------------------------------------
CREATE TABLE user_role_history (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    old_role VARCHAR(50) NULL,
    new_role VARCHAR(50) NOT NULL,
    old_scope_arsen_id BIGINT NULL,
    new_scope_arsen_id BIGINT NULL,
    old_scope_group_id BIGINT NULL,
    new_scope_group_id BIGINT NULL,
    old_scope_squadron_id BIGINT NULL,
    new_scope_squadron_id BIGINT NULL,
    changed_by BIGINT NULL,
    changed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user (user_id),
    INDEX idx_changed_at (changed_at),
    CONSTRAINT user_role_history_ibfk_1 FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT user_role_history_ibfk_2 FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table announcements
-- -----------------------------------------------------
CREATE TABLE announcements (
    id VARCHAR(36) NOT NULL DEFAULT (UUID()),
    title VARCHAR(255) NOT NULL,
    type ENUM('General','Training','Deployment','Administrative','Emergency') NOT NULL DEFAULT 'General',
    priority ENUM('critical','high','medium','low') NOT NULL DEFAULT 'medium',
    status ENUM('active','inactive') NOT NULL DEFAULT 'active',
    author VARCHAR(100) NOT NULL DEFAULT 'CO Admin',
    body TEXT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_type (type),
    KEY idx_priority (priority),
    KEY idx_status (status),
    KEY idx_created (created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;