-- Migration: Create user_entity_role table
-- Remplace la colonne role globale par des rôles scopés par entité

CREATE TYPE entity_role AS ENUM (
  'organisateur',
  'adminTournoi',
  'adminClub',
  'adminComite',
  'adminLigue',
  'adminFederal'
);

CREATE TABLE user_entity_role (
  user_id    TEXT NOT NULL,
  entity_id  UUID NOT NULL REFERENCES entity(id) ON DELETE CASCADE,
  role       entity_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  PRIMARY KEY (user_id, entity_id, role)
);

CREATE INDEX user_entity_role_user_idx ON user_entity_role(user_id);
CREATE INDEX user_entity_role_entity_idx ON user_entity_role(entity_id);
