-- DEV SEED -- run manually: psql $DATABASE_URL -f packages/db/src/seeds/seed_dev.sql
-- NOT a node-pg-migrate migration file
-- Populates: 1 federation, 2 ligues, 4 comites, 3 clubs, 4 test users with distinct roles

-- Federation
INSERT INTO entity (id, name, type) VALUES
  ('00000000-0000-4000-8000-000000000001', 'Fédération Française de Darts', 'federation');

-- Rôles des utilisateurs de test dans user_entity_role
-- federal@test.ffd.fr → adminFederal sur la fédération
INSERT INTO user_entity_role (user_id, entity_id, role) VALUES
  ('5ef275bb-e6f3-4177-9005-e85fef421d4f', '00000000-0000-4000-8000-000000000001', 'adminFederal');

