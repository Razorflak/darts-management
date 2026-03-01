-- Migration: Create tournament table linked to event

CREATE TABLE tournament (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id      UUID NOT NULL REFERENCES event(id) ON DELETE CASCADE,
  name          TEXT NOT NULL DEFAULT '',
  club          TEXT,                        -- free-text club name, optional, no FK
  category      TEXT,                        -- matches Category type: 'male' | 'female' | 'junior' | 'veteran' | 'open' | 'mix' | 'double' | 'double_female' | 'double_mix'
  quota         INTEGER NOT NULL DEFAULT 32,
  start_time    TEXT NOT NULL DEFAULT '',    -- 'HH:MM' string
  start_date    DATE,                        -- NULL = same as event.starts_at
  auto_referee  BOOLEAN NOT NULL DEFAULT false,
  phases        JSONB NOT NULL DEFAULT '[]', -- Phase[] serialized as JSON
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX tournament_event_idx ON tournament(event_id);
