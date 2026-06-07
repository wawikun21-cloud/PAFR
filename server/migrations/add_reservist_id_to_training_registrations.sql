-- Migration: Add reservist_id column to training_registrations table
-- This allows external training registrations to link to reservist records

ALTER TABLE training_registrations 
ADD COLUMN `reservist_id` bigint DEFAULT NULL,
ADD CONSTRAINT `training_registrations_ibfk_2` 
  FOREIGN KEY (`reservist_id`) REFERENCES `reservists` (`id`) ON DELETE SET NULL;

-- Create an index for faster lookups
CREATE INDEX `idx_tr_reservist_id` ON `training_registrations` (`reservist_id`);

-- Migrate existing participant_data to reservist_id column where possible
UPDATE training_registrations tr
SET tr.reservist_id = JSON_UNQUOTE(JSON_EXTRACT(tr.participant_data, '$.reservist_id'))
WHERE JSON_EXTRACT(tr.participant_data, '$.reservist_id') IS NOT NULL
  AND JSON_UNQUOTE(JSON_EXTRACT(tr.participant_data, '$.reservist_id')) REGEXP '^[0-9]+$';

-- Add back the original LEFT JOIN query for compatibility
-- This query now works with the reservist_id column:
-- SELECT tr.id AS registration_id, tr.participant_data, tr.registered_at,
--        r.id AS reservist_id, r.first_name, r.last_name, r.rank, r.service_number, r.qr_code
-- FROM training_registrations tr
-- LEFT JOIN reservists r ON r.id = tr.reservist_id
-- WHERE tr.training_id = ?