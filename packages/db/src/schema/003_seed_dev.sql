-- DEV SEED -- run manually: psql $DATABASE_URL -f packages/db/src/schema/003_seed_dev.sql
-- NOT a node-pg-migrate migration file
-- Populates: 1 federation, 2 ligues, 4 comites, 3 clubs, 4 test users with distinct roles

-- Truncate in reverse dependency order
TRUNCATE account, session, verification, entity, "user" CASCADE;

-- Federation
INSERT INTO entity (id, name, type) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Fédération Française de Darts', 'federation');

-- Ligues
INSERT INTO entity (id, name, type, parent_id) VALUES
  ('00000000-0000-0000-0000-000000000010', 'Ligue Île-de-France', 'ligue', '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000011', 'Ligue Occitanie', 'ligue', '00000000-0000-0000-0000-000000000001');

-- Comites
INSERT INTO entity (id, name, type, parent_id) VALUES
  ('00000000-0000-0000-0000-000000000020', 'Comité Paris', 'comite', '00000000-0000-0000-0000-000000000010'),
  ('00000000-0000-0000-0000-000000000021', 'Comité Seine-et-Marne', 'comite', '00000000-0000-0000-0000-000000000010'),
  ('00000000-0000-0000-0000-000000000022', 'Comité Hérault', 'comite', '00000000-0000-0000-0000-000000000011'),
  ('00000000-0000-0000-0000-000000000023', 'Comité Gard', 'comite', '00000000-0000-0000-0000-000000000011');

-- Clubs
INSERT INTO entity (id, name, type, parent_id) VALUES
  ('00000000-0000-0000-0000-000000000030', 'Club Darts Paris Centre', 'club', '00000000-0000-0000-0000-000000000020'),
  ('00000000-0000-0000-0000-000000000031', 'Club Darts Montmartre', 'club', '00000000-0000-0000-0000-000000000020'),
  ('00000000-0000-0000-0000-000000000032', 'Club Darts Montpellier', 'club', '00000000-0000-0000-0000-000000000022');

-- Test users (password = "password123" for all)
-- bcrypt hash: $2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lHuu
INSERT INTO "user" (id, name, email, "emailVerified", role) VALUES
  ('user-joueur-001',  'Jean Joueur',       'joueur@test.ffd.fr',  TRUE, 'joueur'),
  ('user-org-001',     'Marie Organisatrice','orga@test.ffd.fr',    TRUE, 'organisateur'),
  ('user-admin-001',   'Pierre Admin',      'admin@test.ffd.fr',   TRUE, 'admin_tournoi'),
  ('user-federal-001', 'Sophie Fédérale',   'federal@test.ffd.fr', TRUE, 'admin_federal');

-- Accounts (email/password provider)
INSERT INTO account (id, "accountId", "providerId", "userId", password) VALUES
  ('acc-joueur-001',  'joueur@test.ffd.fr',  'credential', 'user-joueur-001',  '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lHuu'),
  ('acc-org-001',     'orga@test.ffd.fr',    'credential', 'user-org-001',     '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lHuu'),
  ('acc-admin-001',   'admin@test.ffd.fr',   'credential', 'user-admin-001',   '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lHuu'),
  ('acc-federal-001', 'federal@test.ffd.fr', 'credential', 'user-federal-001', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lHuu');

-- Rôles des utilisateurs de test dans user_entity_role
-- federal@test.ffd.fr → adminFederal sur la fédération
INSERT INTO user_entity_role (user_id, entity_id, role) VALUES
  ('user-federal-001', '00000000-0000-0000-0000-000000000001', 'adminFederal');

-- orga@test.ffd.fr → organisateur sur Ligue Île-de-France
INSERT INTO user_entity_role (user_id, entity_id, role) VALUES
  ('user-org-001', '00000000-0000-0000-0000-000000000010', 'organisateur');

-- admin@test.ffd.fr → adminTournoi sur Comité Paris
INSERT INTO user_entity_role (user_id, entity_id, role) VALUES
  ('user-admin-001', '00000000-0000-0000-0000-000000000020', 'adminTournoi');

-- joueur@test.ffd.fr → aucun rôle dans user_entity_role (joueur est implicite pour tout user authentifié)
