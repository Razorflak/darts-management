-- Migration 013: team model — teams, team_member, player.department, refactor tournament_registration
-- Introduces the team abstraction: every registration is now a team (solo = team of 1).
-- Replaces tournament_registration.player_id with team_id.

-- 1. Add department column to player
ALTER TABLE player
  ADD COLUMN department VARCHAR(50);

-- 2. Create team table
CREATE TABLE team (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Create team_member table
--    FK to team: CASCADE — if team is deleted, membership is cleaned up
--    FK to player: RESTRICT — cannot delete a player who is a team member
CREATE TABLE team_member (
  team_id   UUID NOT NULL REFERENCES team(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES player(id) ON DELETE RESTRICT,
  PRIMARY KEY (team_id, player_id)
);

CREATE INDEX team_member_player_idx ON team_member(player_id);

-- 4. Add team_id column to tournament_registration (nullable initially for migration)
ALTER TABLE tournament_registration
  ADD COLUMN team_id UUID REFERENCES team(id) ON DELETE RESTRICT;

-- 5. Migrate existing registrations: create one solo team per registration
--    Skip registrations where player_id is NULL (defensive guard)
WITH reg_with_teams AS (
  SELECT id AS reg_id, player_id, gen_random_uuid() AS new_team_id
  FROM tournament_registration
  WHERE player_id IS NOT NULL
),
_ins_teams AS (
  INSERT INTO team (id)
  SELECT new_team_id FROM reg_with_teams
  RETURNING id
),
_ins_members AS (
  INSERT INTO team_member (team_id, player_id)
  SELECT new_team_id, player_id FROM reg_with_teams
)
UPDATE tournament_registration r
SET team_id = rt.new_team_id
FROM reg_with_teams rt
WHERE r.id = rt.reg_id;

-- 6. Make team_id NOT NULL now that all rows are populated
ALTER TABLE tournament_registration
  ALTER COLUMN team_id SET NOT NULL;

-- 7. Drop the old player_id column
ALTER TABLE tournament_registration
  DROP COLUMN player_id;

-- 8. Add unique constraint: one team per tournament
ALTER TABLE tournament_registration
  ADD CONSTRAINT reg_team_tournament_unique UNIQUE (tournament_id, team_id);

-- 9. Replace the old player index with a team index
DROP INDEX IF EXISTS reg_player_idx;
CREATE INDEX reg_team_idx ON tournament_registration(team_id);
