# Phase 5: Results and Advancement - Research

**Researched:** 2026-04-06
**Domain:** Match result entry, bracket advancement, round-robin standings, double-elimination generation
**Confidence:** HIGH (all findings from direct codebase inspection)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Interface de saisie**
- D-01: Deux points d'entrée indépendants : (1) tuile de saisie rapide sur `/admin/events/[id]` via `event_match_id`, (2) modal de saisie déclenché par clic sur ligne de `PhaseMatchTable.svelte`
- D-02: La tuile de saisie rapide est visible uniquement si au moins un tournoi de l'événement est `started`
- D-03: Flux clavier de la tuile hub — tout inline, pas de modal : champ `event_match_id` → Enter → infos match → score A → Enter → score B → Enter → bouton Valider → Enter → soumission. Bouton Annuler visible dès l'affichage des infos.
- D-04: Modal depuis la table : clic sur ligne → modal pré-chargé avec infos + champs score. Même logique de validation que la tuile.

**Granularité du score**
- D-05: UI adaptative selon `sets_to_win` : si `= 1` → saisie legs uniquement (score_a / score_b entiers) ; si `> 1` → saisie par set (legs de chaque équipe par set, score = nb sets gagnés calculé)
- D-06: Validation stricte avant enregistrement : gagnant doit avoir exactement le nombre de legs/sets requis. Logique pure dans `packages/domain`.

**Classements round-robin**
- D-07: Standings affichés dans la page tournoi existante `/admin/events/[id]/tournaments/[tid]`, sous la table des matchs. Pas de nouvelle route.
- D-08: Formule de points dans `SCORING_RULES` dans `packages/domain/src/tournoi/scoring.ts` : `WIN: 3, LOSS: 0, WALKOVER_WIN: 3, WALKOVER_LOSS: 0, BYE: 0`
- D-09: Règle de départage dans une fonction isolée `breakTie()` : (1) points, (2) différence de legs, (3) confrontation directe. Placée dans `packages/domain/src/tournoi/scoring.ts`.

**double_elimination**
- D-10: `double_elimination` implémenté en Phase 5. Retirer le `throw new Error("double_elimination phase type not supported yet — deferred")` dans `packages/application/src/tournament/launch-tournament.ts`.
- D-11: Structure Upper (W) + Lower (L) + Grande Finale (GF). La table `bracket_match_info` est déjà prête.
- D-12: Bracket reset conditionnel — la GF est générée au lancement (1 match) ; si le joueur Lower gagne la GF, un match de reset est créé dynamiquement par l'orchestration de résultats.

**Statut ongoing**
- D-13: Pas de statut `ongoing` en Phase 5. Matchs passent directement `pending` → `done` / `walkover` / `bye`.

**Forfait / walkover**
- D-14: Boutons "Forfait Équipe A" / "Forfait Équipe B" dans le modal ou la tuile. Résultat : `status = 'walkover'`, gagnant = l'autre équipe, score = 0-0.

**Affichage table des matchs**
- D-15: Aucun changement à `PhaseMatchTable.svelte` en Phase 5.

### Claude's Discretion
- Ordre exact des colonnes dans le tableau de standings
- Gestion des matchs BYE dans le calcul des standings (pas de points attribués)
- Design des tuiles / spacing dans la tuile de saisie rapide

### Deferred Ideas (OUT OF SCOPE)
- Composants visuels avancés (bracket graphique SVG, standings stylisés, badges couleurs, filtres par statut) → Phase 6
- Statut `ongoing` pour suivi de matchs en cours → Phase 6+
- Modification manuelle des assignations d'arbitres → Phase 5+ (reporté de Phase 4)
- `SCORING_RULES` configurables par tournoi → post-v1
- `breakTie()` configurable par tournoi → post-v1
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| RESULT-01 | L'admin tournoi peut saisir le résultat d'un match (score sets/manches) | Tuile hub + modal sur `PhaseMatchTable`, validation Zod dans domain, API `MATCH_RESULT`, repository `updateMatchResult` |
| RESULT-02 | L'admin tournoi peut enregistrer un forfait ou walkover | Même endpoint, payload `{ walkover: 'a' \| 'b' }`, status `walkover`, score 0-0 |
| RESULT-03 | Après saisie d'un résultat, le système avance automatiquement les joueurs vers les cases suivantes | `submitMatchResult()` dans packages/application orchestre : update match + `advanceWinner()` via `bracket_match_info.winner_goes_to_*` |
| RESULT-04 | Quand tous les matchs d'une phase sont terminés, la phase suivante est déclenchée automatiquement | `triggerNextPhase()` vérifie si tous les matchs done/walkover/bye → seed les qualifiés dans la phase suivante |
</phase_requirements>

---

## Summary

Phase 5 ferme la boucle fonctionnelle du tournoi : saisie des résultats → avancement automatique → classements. Toute la logique de navigation bracket est déjà câblée dans `bracket_match_info` (colonnes `winner_goes_to_info_id`, `winner_goes_to_slot`, `loser_goes_to_info_id`, `loser_goes_to_slot`). Le travail de Phase 5 consiste à lire ces chemins et à mettre à jour les `team_a_id` / `team_b_id` du match cible après chaque résultat.

Le générateur `double_elimination` existe déjà dans `packages/domain/src/tournoi/generators/double-bracket-elimination.ts` mais n'est pas encore branché sur le pattern de `GeneratorResult` (retourne des `BracketMatch[]` avec son propre type, pas des `BracketInfoInsertRow[]`). Il faut l'adapter en `generateDoubleEliminationStructure()` calquée sur `generateSingleEliminationStructure()`. L'avancement dans le bracket double-élimination suit exactement les mêmes colonnes `winner_goes_to_*` et `loser_goes_to_*` que le reste.

Le bracket reset conditionnel de la Grande Finale (si le joueur Lower gagne) est l'unique exception à "tous les matchs générés au lancement" — ce match doit être créé dynamiquement dans la transaction de soumission du résultat de la GF.

**Primary recommendation:** Implémenter dans cet ordre : (1) domain `validateScore` + `SCORING_RULES` + `breakTie`, (2) `generateDoubleEliminationStructure` adapté, (3) `match-repository` + `submitMatchResult` dans application, (4) API endpoint + tuile hub, (5) modal depuis PhaseMatchTable, (6) standings dans page tournoi.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| zod | ^4.3.6 | Validation score, schemas domaine | Déjà utilisé partout, règle absolue Zod-first |
| postgres.js | (via packages/db) | SQL brut, transactions | Déjà utilisé, pas d'ORM |
| Flowbite-Svelte | v1.x | Modal, Input, Button, Table | Déjà utilisé dans tous les composants |
| SvelteKit | (via packages/front) | Routes API, page server | Framework en place |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @opentelemetry/api | (via logger) | `traced()` pour telemetrie dans application | Envelopper les nouvelles fonctions application dans `traced()` |

**Installation:** Aucune nouvelle dépendance requise.

---

## Architecture Patterns

### Recommended Project Structure (nouveaux fichiers Phase 5)

```
packages/domain/src/tournoi/
  scoring.ts                    # SCORING_RULES + breakTie() + validateScore()
  generators/
    double-elimination.ts       # generateDoubleEliminationStructure() (adapter double-bracket-elimination.ts)
    index.ts                    # ajouter l'export de generateDoubleEliminationStructure

packages/db/src/repositories/
  match-repository.ts           # updateMatchResult, advanceWinner, getMatchForResult, lockMatchForUpdate

packages/application/src/tournament/
  submit-match-result.ts        # submitMatchResult() — orchestre domain + db + avancement

packages/front/src/routes/
  api/match/
    result/+server.ts           # POST /api/match/result
    result-by-event-id/+server.ts  # GET /api/match/result-by-event-id (lookup par event_match_id)
  (admin)/admin/events/[id]/
    +page.svelte                # ajouter tuile saisie rapide (conditionnel hasStartedTournament)
  (admin)/admin/events/[id]/tournaments/[tid]/
    +page.svelte                # ajouter standings sous PhaseMatchTable + déclencher modal
    ScoreModal.svelte           # modal de saisie depuis ligne de table
    StandingsTable.svelte       # tableau classements round-robin (discrétion Claude)
```

### Pattern 1: Soumission de résultat (transaction atomique)

**What:** `submitMatchResult()` dans packages/application regroupe : lecture + verrou match, validation, update score, avancement winner dans bracket, vérification phase complète → seed qualifiés.

**When to use:** Toujours, pour garantir l'atomicité résultat + avancement.

```typescript
// packages/application/src/tournament/submit-match-result.ts
export const submitMatchResult = async (
  matchId: string,
  payload: MatchResultPayload,  // { score_a, score_b } | { walkover: 'a' | 'b' }
  userRoles: Array<{ entityId: string; role: string }>,
): Promise<void> => {
  await sql.begin(async (rawTx) => {
    const tx = rawTx as unknown as Sql
    // 1. SELECT ... FOR UPDATE sur le match (évite double-soumission)
    const match = await matchRepo.lockMatchForUpdate(tx, matchId)
    // 2. Authz via entity_id depuis tournament → phase → match
    // 3. validateScore(match, payload) depuis domain — lève Error si invalide
    // 4. updateMatchResult(tx, matchId, payload)
    // 5. advanceWinner(tx, match, winner_team_id)   -- bracket uniquement
    // 6. checkPhaseComplete(tx, match.phase_id) → si oui → seedNextPhase()
  })
}
```

### Pattern 2: Avancement bracket

**What:** Après un résultat, lire `bracket_match_info.winner_goes_to_info_id` + `winner_goes_to_slot` pour localiser le match cible et mettre à jour `team_a_id` ou `team_b_id`.

```sql
-- Trouver le match cible via bracket_match_info
SELECT m.id, bi.winner_goes_to_info_id, bi.winner_goes_to_slot
FROM match m
JOIN bracket_match_info bi ON bi.id = m.bracket_info_id
WHERE m.id = $matchId;

-- Mettre à jour le slot du match suivant
UPDATE match
SET team_a_id = $winnerTeamId   -- ou team_b_id selon winner_goes_to_slot
WHERE bracket_info_id = $winner_goes_to_info_id;
```

**Note critique :** Pour `double_elimination`, le perdant d'un match de bracket Upper doit aussi être avancé via `loser_goes_to_info_id` + `loser_goes_to_slot`. Cela s'applique à tous les matchs Upper (W) et certains matchs Lower (L) qui alimentent la GF.

### Pattern 3: Validation du score (domain pur)

```typescript
// packages/domain/src/tournoi/scoring.ts
export function validateScore(
  match: { sets_to_win: number; legs_per_set: number },
  result: { score_a: number; score_b: number } | { walkover: 'a' | 'b' }
): void {
  if ('walkover' in result) return  // toujours valide
  const { score_a, score_b, sets_to_win, legs_per_set } = { ...match, ...result }
  const winner = Math.max(score_a, score_b)
  const loser = Math.min(score_a, score_b)
  if (winner !== sets_to_win) throw new Error(`ScoreInvalid: le gagnant doit avoir ${sets_to_win} set(s)`)
  if (loser >= sets_to_win) throw new Error(`ScoreInvalid: score ${score_a}-${score_b} impossible`)
}
```

### Pattern 4: Calcul standings round-robin

```typescript
// packages/domain/src/tournoi/scoring.ts
export const SCORING_RULES = {
  WIN: 3,
  LOSS: 0,
  WALKOVER_WIN: 3,
  WALKOVER_LOSS: 0,
  BYE: 0,
} as const

export function computeStandings(matches: MatchRow[]): StandingEntry[] { ... }
export function breakTie(a: StandingEntry, b: StandingEntry, matches: MatchRow[]): number { ... }
```

Les standings sont calculés côté serveur dans le `load()` de la page tournoi, en lisant tous les matchs round-robin terminés pour la phase.

### Pattern 5: Lookup par event_match_id (tuile hub)

La tuile hub envoie l'`event_match_id` (entier sur le bulletin papier) pour charger les infos du match. Cela nécessite un endpoint GET spécifique :

```
GET /api/match/result-by-event-id?event_match_id=42&event_id=<uuid>
```

Retourne les infos du match (team_a_name, team_b_name, referee_name, sets_to_win, legs_per_set, match_id, status).

### Pattern 6: generateDoubleEliminationStructure

Le générateur existant `double-bracket-elimination.ts` retourne `BracketMatch[]` avec son propre type. Il faut l'envelopper dans une fonction `generateDoubleEliminationStructure()` qui produit un `GeneratorResult` (même interface que `generateSingleEliminationStructure`).

```typescript
// packages/domain/src/tournoi/generators/double-elimination.ts
export function generateDoubleEliminationStructure(
  teamCount: number,
  phaseId: string,
  tournamentId: string,
  startEventMatchId: number,
  tierConfig: { round: number; setsToWin: number; legsPerSet: number }[],
): GeneratorResult {
  const rawMatches = generateDoubleEliminationBracket(teamCount)
  // Mapper BracketMatch[] → BracketInfoInsertRow[] + MatchInsertRow[]
  // Même logique que single-elimination mais avec bracket W/L/GF et loser_goes_to_*
}
```

La fonction existante gère déjà : seeding R1, drop-in rounds, reshuffle rounds, GF. Elle n'a PAS le match de reset — celui-ci est créé dynamiquement à la soumission du résultat de la GF si le joueur Lower gagne.

### Anti-Patterns to Avoid

- **SQL direct dans une route API mutation :** toujours passer par `packages/application/` ou `$lib/server/repos`. La route API ne fait qu'appeler `submitMatchResult()`.
- **Avancement sans `SELECT ... FOR UPDATE` :** sans verrou, deux soumissions concurrentes pourraient créer un double-avancement. Toujours `lockMatchForUpdate` au début de la transaction.
- **Types inline :** tous les types dans `packages/domain/src/tournoi/scoring.ts` via `z.infer<>`.
- **Path params dans les routes API :** convention projet = IDs dans le body, jamais dans l'URL.
- **Modifier PhaseMatchTable.svelte en Phase 5 :** composants visuels avancés reportés à Phase 6 (D-15).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Génération double-élimination | Algorithme custom | `generateDoubleEliminationBracket()` dans `double-bracket-elimination.ts` | Déjà implémenté avec garantie rematch-safe (splitAndReverse) |
| Validation Zod | Types TypeScript inline | `z.object({...})` + `z.infer<>` | Règle absolue projet |
| Transaction PostgreSQL | Multiple requêtes séparées | `sql.begin()` avec `rawTx as unknown as Sql` | Pattern établi, atomicité garantie |
| Lookup inverse `bracket_match_info` | Construire un graphe en mémoire | Requête SQL sur `winner_goes_to_info_id` | Les FK sont là pour ça |
| Format des rounds (sets/legs) | Re-lire la config de phase | `match.sets_to_win` / `match.legs_per_set` (déjà sur chaque match row) | Dénormalisé au lancement pour exactement ce cas d'usage |

---

## Common Pitfalls

### Pitfall 1: Double-soumission de résultat
**What goes wrong:** Deux admins soumettent le résultat du même match simultanément → deux avancements dans le bracket.
**Why it happens:** Pas de verrou sur la lecture du match.
**How to avoid:** `SELECT ... FOR UPDATE` obligatoire sur `match` au début de `sql.begin()`. Vérifier que `status = 'pending'` avant d'écrire. Si `status != 'pending'`, lever `Error("MatchAlreadyDone")`.
**Warning signs:** Tests de concurrence qui passent aléatoirement.

### Pitfall 2: Avancement losers bracket double-élimination
**What goes wrong:** N'avancer que le gagnant, oublier d'avancer le perdant vers `loser_goes_to_info_id` pour les matchs Upper.
**Why it happens:** Single-elimination n'a pas de `loser_goes_to_*`. Copier le pattern SE sans s'adapter.
**How to avoid:** `advanceWinner()` doit avoir une branche pour les matchs avec `loser_goes_to_info_id != null` → update `team_[loser_goes_to_slot]_id` du match loser-cible.
**Warning signs:** Matchs Lower avec `team_a_id = null` alors qu'un perdant devrait être assigné.

### Pitfall 3: Phase complète avec des BYE non terminés
**What goes wrong:** Compter les matchs BYE comme `pending` → la phase n'est jamais considérée complète.
**Why it happens:** `WHERE status NOT IN ('done', 'walkover', 'bye')` oublie les BYE.
**How to avoid:** Une phase est complète quand `COUNT(*) = COUNT(CASE WHEN status IN ('done', 'walkover', 'bye') THEN 1 END)`. Les BYE sont déjà en statut `bye` au lancement.
**Warning signs:** `triggerNextPhase()` ne se déclenche jamais malgré tous les matchs vrais terminés.

### Pitfall 4: Bracket reset GF créé avec event_match_id dupliqué
**What goes wrong:** Le match de reset est créé dynamiquement avec un `event_match_id` qui existe déjà dans l'événement.
**Why it happens:** `countEventMatches()` lu hors transaction → race condition avec un autre tournoi.
**How to avoid:** Lire `MAX(event_match_id)` dans la même transaction avec advisory lock (même pattern que `launchTournament` : `pg_advisory_xact_lock(hashtext(event_id))`).
**Warning signs:** Violation de contrainte unique `match_event_match_id`.

### Pitfall 5: Standings calculés sur des matchs non terminés
**What goes wrong:** Un match `pending` avec score NULL est inclus dans le calcul → standings incorrects.
**Why it happens:** Jointure sans filtre `WHERE status IN ('done', 'walkover')`.
**How to avoid:** Toujours filtrer `WHERE m.status IN ('done', 'walkover')` dans la requête standings.

### Pitfall 6: event_match_id partagé entre événements
**What goes wrong:** La tuile hub cherche un match par `event_match_id` sans filtrer par `event_id` → mauvais match retourné si même ID dans un autre événement.
**Why it happens:** `event_match_id` est séquentiel par événement, pas global.
**How to avoid:** La requête de lookup doit toujours joindre `JOIN phase p ON p.id = m.phase_id JOIN tournament t ON t.id = p.tournament_id WHERE t.event_id = $eventId`.

---

## Code Examples

### Lookup match par event_match_id
```sql
-- Source: pattern établi dans launch-repository.ts (countEventMatches)
SELECT m.id, m.status, m.sets_to_win, m.legs_per_set,
       m.team_a_id, m.team_b_id, m.score_a, m.score_b,
       m.round_robin_info_id, m.bracket_info_id,
       -- team names via subquery (pattern +page.server.ts tid)
       (SELECT string_agg(pl.first_name || ' ' || pl.last_name, ' / ' ORDER BY pl.last_name)
        FROM team_member tm JOIN player pl ON pl.id = tm.player_id
        WHERE tm.team_id = m.team_a_id) AS team_a_name,
       (SELECT string_agg(pl.first_name || ' ' || pl.last_name, ' / ' ORDER BY pl.last_name)
        FROM team_member tm JOIN player pl ON pl.id = tm.player_id
        WHERE tm.team_id = m.team_b_id) AS team_b_name
FROM match m
JOIN phase p ON p.id = m.phase_id
JOIN tournament t ON t.id = p.tournament_id
WHERE m.event_match_id = $eventMatchId
  AND t.event_id = $eventId
```

### Avancement bracket (winner)
```sql
-- Source: bracket_match_info structure (017_match_info_tables.sql)
UPDATE match
SET team_a_id = $winnerTeamId  -- si winner_goes_to_slot = 'a'
FROM bracket_match_info target_bi
WHERE match.bracket_info_id = target_bi.id
  AND target_bi.id = (
    SELECT bi.winner_goes_to_info_id
    FROM match m2
    JOIN bracket_match_info bi ON bi.id = m2.bracket_info_id
    WHERE m2.id = $matchId
  )
```

### Avancement bracket (loser → double-élimination)
```sql
UPDATE match
SET team_b_id = $loserTeamId  -- si loser_goes_to_slot = 'b'
FROM bracket_match_info target_bi
WHERE match.bracket_info_id = target_bi.id
  AND target_bi.id = (
    SELECT bi.loser_goes_to_info_id
    FROM match m2
    JOIN bracket_match_info bi ON bi.id = m2.bracket_info_id
    WHERE m2.id = $matchId
  )
```

### Vérification phase complète
```sql
SELECT
  COUNT(*) AS total,
  COUNT(CASE WHEN status IN ('done', 'walkover', 'bye') THEN 1 END) AS finished
FROM match
WHERE phase_id = $phaseId
```

### createRepository pattern (pour match-repository)
```typescript
// Source: packages/db/src/repositories/utils.ts + tournament-repository.ts
import { createRepository } from "./utils.js"
import { sql as defaultSql } from "../client.js"

const internalMatchRepo = {
  lockMatchForUpdate: async (sql: Sql, matchId: string) => { ... },
  updateMatchResult: async (sql: Sql, matchId: string, ...) => { ... },
  advanceWinnerInBracket: async (sql: Sql, matchId: string, winnerTeamId: string) => { ... },
  advanceLoserInBracket: async (sql: Sql, matchId: string, loserTeamId: string) => { ... },
  checkPhaseComplete: async (sql: Sql, phaseId: string): Promise<boolean> => { ... },
}

export const matchRepository = createRepository(defaultSql, internalMatchRepo)
export const getMatchRepositoryWithSql = (sql: Sql) =>
  createRepository(sql, internalMatchRepo)
```

### generateDoubleEliminationStructure (adaptation)
```typescript
// Source: packages/domain/src/tournoi/generators/double-bracket-elimination.ts
// Adapter en produisant GeneratorResult comme generateSingleEliminationStructure
import { generateDoubleEliminationBracket } from "./double-bracket-elimination.js"
import type { BracketInfoInsertRow, GeneratorResult, MatchInsertRow } from "../match-schemas.js"

export function generateDoubleEliminationStructure(
  teamCount: number,
  phaseId: string,
  tournamentId: string,
  startEventMatchId: number,
  defaultFormat: { setsToWin: number; legsPerSet: number },
): GeneratorResult {
  const rawMatches = generateDoubleEliminationBracket(teamCount)
  // Mapper chaque BracketMatch → { BracketInfoInsertRow + MatchInsertRow }
  // Conserver winner_goes_to_info_id / loser_goes_to_info_id (déjà calculés)
  // ...
}
```

### API endpoint soumission résultat (pattern établi)
```typescript
// Source: packages/front/src/routes/api/tournament/launch/+server.ts
import { submitMatchResult } from "@darts-management/application"
import { json, error } from "@sveltejs/kit"

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) return error(401, ...)
  const body = await request.json()
  // Valider avec RequestSchema Zod dans request-schemas.ts
  const roles = await getUserRoles(locals.user.id)
  try {
    await submitMatchResult(body.match_id, body, roles)
    return json({ ok: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : ""
    if (msg === "Forbidden") return error(403, ...)
    if (msg === "MatchAlreadyDone") return json({ error: msg }, { status: 409 })
    if (msg.startsWith("ScoreInvalid:")) return json({ error: msg }, { status: 422 })
    ...
  }
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `advances_to_match_id` / `advances_to_slot` directs sur match | Tables séparées `bracket_match_info` avec `winner_goes_to_info_id` / `loser_goes_to_info_id` | Phase 4 (migration 017) | L'avancement lit dans `bracket_match_info` via JOIN, pas depuis la table `match` |
| `double_elimination` : `throw new Error("not supported")` | Implémenté via `generateDoubleEliminationStructure()` | Phase 5 | Retirer le throw dans `launch-tournament.ts` ligne ~134 |
| Seed sur `tournament.seed_order` JSONB | Seed sur `tournament_registration.seed` INTEGER | Migration 018 | Les queries de roster déjà adaptées dans `+page.server.ts` tid |

**Note sur `MatchDisplaySchema` :** Elle inclut déjà `score_a` / `score_b` — non encore exposés dans la table. La Phase 5 peut les ajouter dans la query SQL de `+page.server.ts` tid et dans `MatchDisplaySchema` pour afficher les scores dans `PhaseMatchTable`.

---

## Open Questions

1. **Règle tiebreaker FFD officielle non vérifiée**
   - Ce qu'on sait : order → points → diff legs → confrontation directe (D-09)
   - Ce qui est flou : le règlement FFD officiel n'a pas été consulté — cette règle est raisonnée, pas officielle
   - Recommandation : implémenter `breakTie()` avec ce comportement ; la fonction est isolée et prévue pour évoluer sans refactoring

2. **BYE en round-robin : victoire auto ou non-résultat ?**
   - Ce qu'on sait : `SCORING_RULES.BYE = 0` (D-08) → pas de points pour le BYE
   - Ce qui est flou : est-ce que l'équipe qui "gagne" contre BYE reçoit WIN (3 pts) ou ne compte pas ?
   - Recommandation (discrétion Claude) : traiter BYE comme victoire auto (WIN: 3 pts pour l'équipe présente) dans le calcul standings — le score 0-0 status `bye` est déjà présent. La logique `breakTie` l'exclut du calcul de diff legs.

3. **Seed des qualifiés round-robin vers la phase suivante**
   - Ce qu'on sait : les slots de la phase suivante ont `seed_a` / `seed_b` dans `bracket_match_info` (seeds 1-based relatifs au groupe)
   - Ce qui est flou : l'ordre de seeding des qualifiés issus de plusieurs poules (Poule A 1er, Poule B 1er, Poule A 2ème...) — le générateur round-robin produit des slots mais le mapping qualifiés → slots reste à définir
   - Recommandation : utiliser l'ordre classement par poule (1er Poule A = seed 1, 1er Poule B = seed 2, etc.) — même logique que `assignTeamsToPhase0` dans generators/defaults.ts

---

## Environment Availability

Step 2.6: SKIPPED (pas de nouvelles dépendances externes — tous les outils et services sont déjà en place)

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (via packages/scripts et packages/front) |
| Config file | `packages/scripts/vitest.config.ts` (pour tests d'intégration) |
| Quick run command | `pnpm --filter @darts-management/domain test` (si script ajouté) ou `pnpm test` |
| Full suite command | `pnpm test` |

**Note :** Le package `domain` n'a pas de script `"test"` dans son `package.json`. Les tests Vitest dans `generators/__tests__/` semblent exécutés via un mécanisme non standard (peut-être `pnpm test` à la racine via turbo ou `vitest run` direct). Wave 0 doit ajouter `"test": "vitest run"` dans `packages/domain/package.json`.

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| RESULT-01 | `validateScore()` rejette un score impossible (ex: 2-2 en BO3) | unit | `vitest run packages/domain/src/tournoi/scoring.test.ts` | ❌ Wave 0 |
| RESULT-01 | `validateScore()` accepte un score valide | unit | idem | ❌ Wave 0 |
| RESULT-02 | `validateScore()` accepte un walkover sans valider le score | unit | idem | ❌ Wave 0 |
| RESULT-03 | `computeStandings()` calcule points, wins, diff legs | unit | `vitest run packages/domain/src/tournoi/scoring.test.ts` | ❌ Wave 0 |
| RESULT-03 | `breakTie()` départage deux équipes à égalité de points | unit | idem | ❌ Wave 0 |
| RESULT-04 | `generateDoubleEliminationStructure()` produit la bonne structure | unit | `vitest run packages/domain/src/tournoi/generators/__tests__/double-elimination.test.ts` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** Typecheck (`pnpm typecheck`) + lint (`pnpm lint`)
- **Per wave merge:** `pnpm test` (full suite)
- **Phase gate:** Full suite green avant `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `packages/domain/src/tournoi/scoring.test.ts` — couvre `validateScore`, `computeStandings`, `breakTie`
- [ ] `packages/domain/src/tournoi/generators/__tests__/double-elimination.test.ts` — couvre `generateDoubleEliminationStructure`
- [ ] Script `"test"` dans `packages/domain/package.json` — absent actuellement

---

## Project Constraints (from CLAUDE.md)

| Directive | Impact Phase 5 |
|-----------|----------------|
| Aucun SQL dans les routes API mutation — passer par `packages/application/` | `submitMatchResult()` dans application, route API n'orchestre pas |
| Routes API dans `packages/front/src/routes/api/` avec IDs dans le body, pas de path params | `/api/match/result` avec `match_id` dans le body |
| Ajouter toute nouvelle route dans `apiRoutes` dans `$lib/fetch/api.ts` | Ajouter `MATCH_RESULT`, `MATCH_LOOKUP_BY_EVENT_ID` |
| Zod-first : pas de types inline, tous via `z.infer<>` | `MatchResultPayloadSchema`, `StandingEntrySchema`, etc. dans domain |
| `packages/domain` : aucune dépendance vers `db` ou `front` | `scoring.ts` et `generateDoubleEliminationStructure` : fonctions pures uniquement |
| `packages/db` : chaque fonction repository prend `sql: Sql` en premier paramètre | `match-repository.ts` suit le pattern `createRepository` |
| Lever `Error("Forbidden")` / `Error("NotFound")` dans db — la couche front mappe en HTTP | `submitMatchResult` dans application lève ces erreurs |
| `pnpm lint` doit passer avant livraison | Vérifier avec Biome après chaque fichier |
| `packages/application/` : nouvelles fonctions enveloppées dans `traced()` avant export | `submitMatchResult`, `advanceWinner`, `triggerNextPhase` dans `traced()` |
| `packages/front/src/routes/(admin)` : load functions peuvent utiliser `sql` directement pour les SELECT | standings calculés dans `+page.server.ts` (tid) avec sql direct — conforme |
| `RegistrationModal.svelte` comme référence pour les modals Flowbite | `ScoreModal.svelte` suit le même pattern open/close |

---

## Sources

### Primary (HIGH confidence)
- Code source direct — `packages/db/src/schema/016_phase_tier_and_match.sql` — structure table match, statuts, sets_to_win/legs_per_set
- Code source direct — `packages/db/src/schema/017_match_info_tables.sql` — tables round_robin_match_info et bracket_match_info, colonnes winner/loser_goes_to_*
- Code source direct — `packages/domain/src/tournoi/generators/double-bracket-elimination.ts` — générateur DE existant et fonctionnel
- Code source direct — `packages/domain/src/tournoi/match-schemas.ts` — MatchRowSchema, BracketInfoInsertRowSchema
- Code source direct — `packages/application/src/tournament/launch-tournament.ts` — pattern transaction + throw double_elimination ligne ~134
- Code source direct — `packages/db/src/repositories/launch-repository.ts` — pattern createRepository, lockTournamentStatus FOR UPDATE
- Code source direct — `packages/front/src/routes/(admin)/admin/events/[id]/tournaments/[tid]/+page.server.ts` — query matchs existante avec JOIN bracket_match_info

### Secondary (MEDIUM confidence)
- Code source direct — `packages/domain/src/tournoi/admin-schemas.ts` — MatchDisplaySchema (score_a/score_b absents → à ajouter)
- Code source direct — `packages/front/src/lib/fetch/api.ts` — liste apiRoutes à compléter

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — aucune nouvelle dépendance, tout inspecté directement dans le code
- Architecture: HIGH — patterns établis dans launch-tournament.ts, launch-repository.ts, directement transposables
- Pitfalls: HIGH — identifiés depuis les notes STATE.md ("SELECT ... FOR UPDATE obligatoire") et l'analyse du schema DB
- Générateur double-élimination: HIGH — code existant complet, adaptation structurelle seulement

**Research date:** 2026-04-06
**Valid until:** 2026-05-06 (stack stable, aucune dépendance externe volatile)
