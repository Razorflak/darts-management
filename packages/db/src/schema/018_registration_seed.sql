-- Migration 018: Seed stocké sur tournament_registration, pas sur tournament
-- Remplace tournament.seed_order (JSONB) par tournament_registration.seed (INTEGER).
-- is_seeded reste sur tournament (flag UI).

ALTER TABLE tournament_registration ADD COLUMN seed INTEGER;
ALTER TABLE tournament DROP COLUMN seed_order;
