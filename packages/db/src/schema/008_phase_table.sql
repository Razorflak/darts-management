-- Migration 008: Replace phases JSONB column with dedicated phase table
-- Per CONTEXT.md decision: phases stored in normalized phase table, not JSONB

CREATE TABLE phase (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id        UUID NOT NULL REFERENCES tournament(id) ON DELETE CASCADE,
  position             INTEGER NOT NULL,
  type                 TEXT NOT NULL,
  entrants             INTEGER NOT NULL,
  players_per_group    INTEGER,
  qualifiers_per_group INTEGER,
  qualifiers           INTEGER,
  tiers                JSONB,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX phase_tournament_idx ON phase(tournament_id);

-- Remove legacy JSONB column from tournament
ALTER TABLE tournament DROP COLUMN phases;
