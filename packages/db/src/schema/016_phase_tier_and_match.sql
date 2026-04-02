-- Migration 016: phase_tier table, match table, tournament/phase columns for Phase 4
-- Adds:
--   - phase_tier: per-round format configuration for elimination phases
--   - tournament.is_seeded + seed_order: seeding support
--   - phase.sets_to_win + legs_per_set: match format for group phases
--   - match: all matches for all phases generated at launch

-- ─── phase_tier ──────────────────────────────────────────────────────────────
-- Per-round format configuration replacing the JSONB tiers column for generators.
-- NOTE: phase.tiers JSONB is NOT dropped here — still used by the wizard (plan 04 will migrate).

CREATE TABLE phase_tier (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phase_id         UUID NOT NULL REFERENCES phase(id) ON DELETE CASCADE,
  position         INTEGER NOT NULL,
  sets_to_win      INTEGER NOT NULL DEFAULT 2,
  legs_per_set     INTEGER NOT NULL DEFAULT 3,
  qualifiers_count INTEGER
);

CREATE INDEX phase_tier_phase_idx ON phase_tier(phase_id);

-- ─── phase columns ────────────────────────────────────────────────────────────
-- Match format for group phases (round_robin, double_loss_groups).
-- Defaults: best of 3 sets, best of 3 legs per set.

ALTER TABLE phase ADD COLUMN sets_to_win  INTEGER NOT NULL DEFAULT 2;
ALTER TABLE phase ADD COLUMN legs_per_set INTEGER NOT NULL DEFAULT 3;

-- ─── tournament columns ───────────────────────────────────────────────────────
-- Seeding support: is_seeded flag + seed_order as ordered array of team UUIDs.

ALTER TABLE tournament ADD COLUMN is_seeded  BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE tournament ADD COLUMN seed_order JSONB NOT NULL DEFAULT '[]';

-- ─── match ───────────────────────────────────────────────────────────────────
-- All matches for all phases are generated at launch (blank for elimination slots).
-- event_match_id: stable integer ID used within an event for scheduling/display.
-- advances_to_match_id: which match the winner goes to (NULL = final).
-- advances_to_slot: 'a' or 'b' — which slot the winner fills in the next match.

CREATE TABLE match (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phase_id             UUID NOT NULL REFERENCES phase(id) ON DELETE CASCADE,
  event_match_id       INTEGER NOT NULL,
  group_number         INTEGER,
  round_number         INTEGER NOT NULL DEFAULT 0,
  position             INTEGER NOT NULL DEFAULT 0,
  team_a_id            UUID REFERENCES team(id) ON DELETE SET NULL,
  team_b_id            UUID REFERENCES team(id) ON DELETE SET NULL,
  referee_team_id      UUID REFERENCES team(id) ON DELETE SET NULL,
  advances_to_match_id UUID REFERENCES match(id) ON DELETE SET NULL,
  advances_to_slot     TEXT,
  score_a              INTEGER,
  score_b              INTEGER,
  status               TEXT NOT NULL DEFAULT 'pending',
  sets_to_win          INTEGER NOT NULL DEFAULT 2,
  legs_per_set         INTEGER NOT NULL DEFAULT 3,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX match_phase_idx ON match(phase_id);
CREATE INDEX match_event_match_id_idx ON match(event_match_id);
CREATE INDEX match_advances_idx ON match(advances_to_match_id);
