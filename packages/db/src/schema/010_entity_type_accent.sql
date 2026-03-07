-- Migration 010: Rename entity_type enum value 'comite' → 'comité' (with accent)
-- Aligns the DB enum with the Zod EntitySchema definition.

ALTER TYPE entity_type RENAME VALUE 'comite' TO 'comité';
