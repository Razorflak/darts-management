-- Migration: Create event table with status enum

CREATE TYPE event_status AS ENUM ('draft', 'ready', 'started', 'finished');

CREATE TABLE event (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  TEXT NOT NULL,
  entity_id             UUID NOT NULL REFERENCES entity(id) ON DELETE RESTRICT,
  organizer_id          TEXT NOT NULL,  -- Better Auth user.id (TEXT, no FK constraint — Better Auth manages its own tables)
  starts_at             DATE NOT NULL,
  ends_at               DATE NOT NULL,
  location              TEXT NOT NULL DEFAULT '',
  registration_opens_at DATE,           -- NULL = open immediately on publish
  status                event_status NOT NULL DEFAULT 'draft',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX event_organizer_idx ON event(organizer_id);
CREATE INDEX event_entity_idx ON event(entity_id);
CREATE INDEX event_status_idx ON event(status);
CREATE INDEX event_starts_at_idx ON event(starts_at DESC);
