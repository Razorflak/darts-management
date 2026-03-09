-- Migration 015: make player.birth_date nullable
-- birth_date was NOT NULL with '1900-01-01' as placeholder for unknown dates.
-- Making it nullable allows proper representation of missing data.

ALTER TABLE player ALTER COLUMN birth_date DROP NOT NULL;
