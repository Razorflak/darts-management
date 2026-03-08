-- Migration 014: add status column to tournament
-- Values: ready | check-in | started | finished
-- DEFAULT 'ready' — all existing tournaments start in ready state
-- Changed manually by admin via roster page buttons (plan 03-05)

ALTER TABLE tournament
  ADD COLUMN status TEXT NOT NULL DEFAULT 'ready';

CREATE INDEX tournament_status_idx ON tournament(status);
