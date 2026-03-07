-- Migration 011: player profile table
-- player.user_id is TEXT NULL (no FK) — same pattern as event.organizer_id
-- Better Auth manages its own user table; cross-schema FK avoided intentionally

CREATE TABLE player (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     TEXT,
  first_name  TEXT NOT NULL,
  last_name   TEXT NOT NULL,
  birth_date  DATE NOT NULL,
  licence_no  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Fast lookup by linked user account
CREATE INDEX player_user_idx ON player(user_id);

-- Fast name search (admin player search uses ILIKE on last_name, first_name)
CREATE INDEX player_name_idx ON player(last_name, first_name);

-- Prevent duplicate player profiles for the same user account
-- Partial index: only applies where user_id IS NOT NULL (admin-created profiles have NULL user_id)
CREATE UNIQUE INDEX player_user_unique_idx ON player(user_id) WHERE user_id IS NOT NULL;
