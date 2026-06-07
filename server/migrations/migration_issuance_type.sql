-- Migration: Add issuance_type column to supply_issuances table
-- Adds issuance_type field to distinguish between 'issued' and 'personal' issuances
-- Run once against your pafr database.

ALTER TABLE `supply_issuances`
  ADD COLUMN `issuance_type` enum('issued','personal') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'issued' AFTER `due_return_date`;