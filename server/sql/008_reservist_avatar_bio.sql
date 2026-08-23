-- Add bio and avatar_url columns to reservists for the Digital ID card.
-- Idempotent: each column is only added if it does not already exist.

SET @db = DATABASE();

SET @has_bio = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'reservists' AND COLUMN_NAME = 'bio'
);
SET @stmt = IF(@has_bio = 0,
  'ALTER TABLE reservists ADD COLUMN `bio` TEXT NULL AFTER `address`',
  'SELECT 1');
PREPARE q FROM @stmt;
EXECUTE q;
DEALLOCATE PREPARE q;

SET @has_avatar = (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'reservists' AND COLUMN_NAME = 'avatar_url'
);
SET @stmt = IF(@has_avatar = 0,
  'ALTER TABLE reservists ADD COLUMN `avatar_url` VARCHAR(512) NULL AFTER `bio`',
  'SELECT 1');
PREPARE q FROM @stmt;
EXECUTE q;
DEALLOCATE PREPARE q;
