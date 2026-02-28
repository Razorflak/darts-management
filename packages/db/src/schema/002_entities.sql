-- Entity hierarchy using adjacency list pattern
-- Supports 4 levels: federation -> ligue -> comite -> club

CREATE TYPE entity_type AS ENUM ('federation', 'ligue', 'comite', 'club');

CREATE TABLE IF NOT EXISTS entity (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  type        entity_type NOT NULL,
  parent_id   UUID REFERENCES entity(id) ON DELETE RESTRICT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT entity_federation_no_parent CHECK (
    (type = 'federation' AND parent_id IS NULL) OR
    (type != 'federation' AND parent_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS entity_parent_idx ON entity(parent_id);
CREATE INDEX IF NOT EXISTS entity_type_idx ON entity(type);
