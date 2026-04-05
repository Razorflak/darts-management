-- Migration 017: tables d'info structurelles pour les matchs
-- Sépare les métadonnées de structure (bracket, poule) des données de résultat (équipes, scores)
--
-- Deux nouvelles tables :
--   round_robin_match_info : seeds de placement (slot_a/slot_b) + position pour les poules RR
--   bracket_match_info     : structure bracket (W/L/GF), seeds R1, chemins gagnant/perdant
--
-- La table match perd : group_number, round_number, position, advances_to_match_id, advances_to_slot
-- La table match gagne : round_robin_info_id, bracket_info_id, board

-- ─── round_robin_match_info ───────────────────────────────────────────────────

CREATE TABLE round_robin_match_info (
  id            UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID    NOT NULL REFERENCES tournament(id) ON DELETE CASCADE,
  group_number  INTEGER NOT NULL,
  round_number  INTEGER NOT NULL,
  position      INTEGER NOT NULL,
  slot_a        INTEGER NOT NULL,  -- seed 1-based du joueur en slot A dans le groupe
  slot_b        INTEGER NOT NULL   -- seed 1-based du joueur en slot B dans le groupe
);

CREATE INDEX rr_info_tournament_idx ON round_robin_match_info(tournament_id);

-- ─── bracket_match_info ───────────────────────────────────────────────────────
-- Auto-référentielle pour les chemins gagnant/perdant (évite FK circulaire avec match).

CREATE TABLE bracket_match_info (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id          UUID    NOT NULL REFERENCES tournament(id) ON DELETE CASCADE,
  bracket                TEXT    NOT NULL,   -- 'W' | 'L' | 'GF'
  round_number           INTEGER NOT NULL,
  position               INTEGER NOT NULL,
  group_number           INTEGER,            -- numéro de groupe (double KO seulement, null pour SE/DE)
  seed_a                 INTEGER,            -- seed 1-based slot A (premier tour seulement)
  seed_b                 INTEGER,            -- seed 1-based slot B (premier tour seulement)
  winner_goes_to_info_id UUID    REFERENCES bracket_match_info(id) ON DELETE SET NULL,
  winner_goes_to_slot    TEXT,               -- 'a' | 'b'
  loser_goes_to_info_id  UUID    REFERENCES bracket_match_info(id) ON DELETE SET NULL,
  loser_goes_to_slot     TEXT               -- 'a' | 'b'
);

CREATE INDEX bracket_info_tournament_idx ON bracket_match_info(tournament_id);

-- ─── match — retrait des colonnes structurelles, ajout FK info + colonne board ──

ALTER TABLE match
  DROP COLUMN IF EXISTS group_number,
  DROP COLUMN IF EXISTS round_number,
  DROP COLUMN IF EXISTS position,
  DROP COLUMN IF EXISTS advances_to_match_id,
  DROP COLUMN IF EXISTS advances_to_slot,
  ADD COLUMN round_robin_info_id UUID REFERENCES round_robin_match_info(id) ON DELETE SET NULL,
  ADD COLUMN bracket_info_id     UUID REFERENCES bracket_match_info(id)     ON DELETE SET NULL,
  ADD COLUMN board               INTEGER;   -- assignation de cible/table physique (usage futur)

DROP INDEX IF EXISTS match_advances_idx;
CREATE INDEX match_rr_info_idx      ON match(round_robin_info_id);
CREATE INDEX match_bracket_info_idx ON match(bracket_info_id);
