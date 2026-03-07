-- Migration 012: tournament registration and check-in support

-- Add check-in mode flag to tournament
-- false = all registered players count as present at launch (no check-in needed)
-- true  = only checked-in players count at launch (Phase 4 will enforce this)
ALTER TABLE tournament
  ADD COLUMN check_in_required BOOLEAN NOT NULL DEFAULT false;

-- Registration table: one row per (player, tournament) pair
-- UNIQUE constraint is the sole deduplication mechanism (application catches error code 23505)
CREATE TABLE tournament_registration (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES tournament(id) ON DELETE CASCADE,
  player_id     UUID NOT NULL REFERENCES player(id) ON DELETE RESTRICT,
  checked_in    BOOLEAN NOT NULL DEFAULT false,
  registered_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (tournament_id, player_id)
);

-- Fast roster lookup by tournament
CREATE INDEX reg_tournament_idx ON tournament_registration(tournament_id);

-- Fast lookup of all tournaments a player is in
CREATE INDEX reg_player_idx ON tournament_registration(player_id);
