-- Migration: Add Reservist Training Status fields
-- Adds checkable training statuses: BCMT, ADT, VADT, ROTC, and Others (with specify text)
-- Run once against your pafr database.
ALTER TABLE `reservists`
  ADD COLUMN `status_bcmt`  tinyint(1) NOT NULL DEFAULT 0 COMMENT 'Basic Citizen Military Training completed'     AFTER `basic_training_date`,
  ADD COLUMN `status_adt`   tinyint(1) NOT NULL DEFAULT 0 COMMENT 'Active Duty Training completed'                AFTER `status_bcmt`,
  ADD COLUMN `status_vadt`  tinyint(1) NOT NULL DEFAULT 0 COMMENT 'Voluntary Active Duty Training completed'      AFTER `status_adt`,
  ADD COLUMN `status_rotc`  tinyint(1) NOT NULL DEFAULT 0 COMMENT 'Reserve Officers Training Corps completed'     AFTER `status_vadt`,
  ADD COLUMN `status_others` varchar(255) DEFAULT NULL    COMMENT 'Other training status (free-text specification)' AFTER `status_rotc`;
