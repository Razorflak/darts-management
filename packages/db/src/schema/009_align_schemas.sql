-- Migration 009: Align DB columns with Zod domain schemas
--
-- event: make starts_at / ends_at nullable (drafts have no date yet)
-- tournament: drop club, quota, start_time; rename start_date → start_at (TIMESTAMPTZ)
-- phase: drop entrants; rename qualifiers → qualifiers_count

-- ─── event ───────────────────────────────────────────────────────────────────
ALTER TABLE event ALTER COLUMN starts_at DROP NOT NULL;
ALTER TABLE event ALTER COLUMN ends_at   DROP NOT NULL;

-- ─── tournament ──────────────────────────────────────────────────────────────
ALTER TABLE tournament DROP COLUMN club;
ALTER TABLE tournament DROP COLUMN quota;
ALTER TABLE tournament DROP COLUMN start_time;

ALTER TABLE tournament RENAME COLUMN start_date TO start_at;
ALTER TABLE tournament ALTER COLUMN start_at TYPE TIMESTAMPTZ
    USING start_at::TIMESTAMPTZ;

-- ─── phase ───────────────────────────────────────────────────────────────────
ALTER TABLE phase DROP COLUMN entrants;
ALTER TABLE phase RENAME COLUMN qualifiers TO qualifiers_count;
