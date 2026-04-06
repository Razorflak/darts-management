# Phase 5: Results and Advancement - Context

**Gathered:** 2026-04-06
**Status:** Ready for planning

<domain>
## Phase Boundary

La Phase 5 livre la boucle complète résultats → avancement :
- Saisie des scores pour tout match (legs ou sets+legs selon format configuré)
- Enregistrement d'un forfait / walkover
- Avancement automatique du gagnant vers le prochain slot du bracket (`advances_to_*`)
- Classements round-robin (points, victoires/défaites, diff legs, départage)
- Déclenchement automatique de la phase suivante quand tous les matchs d'une phase sont terminés
- Implémentation du générateur `double_elimination` (manquant en Phase 4) + avancement dans ce bracket

Hors scope Phase 5 : composants visuels avancés (bracket graphique SVG, standings stylisés) → Phase 6.

</domain>

<decisions>
## Implementation Decisions

### Interface de saisie

- **D-01:** Deux points d'entrée indépendants :
  1. **Tuile de saisie rapide** sur le hub événement `/admin/events/[id]` — saisie par `event_match_id` (depuis les bulletins papier)
  2. **Modal de saisie** déclenché par clic sur n'importe quelle ligne de `PhaseMatchTable.svelte`

- **D-02:** La tuile de saisie rapide est **visible uniquement si au moins un tournoi de l'événement est `started`**. Absente sinon.

- **D-03:** Flux clavier de la tuile hub (tout inline, pas de modal) :
  - **État initial** : titre de la tuile + champ `event_match_id` uniquement
  - L'admin saisit l'`event_match_id` + **Enter** → les infos du match s'affichent dans la tuile (Équipe A vs Équipe B, Arbitre, format), focus automatique sur le champ score Équipe A
  - Score Équipe A + **Enter** → focus sur le champ score Équipe B
  - Score Équipe B + **Enter** → focus sur le bouton **Valider**
  - **Enter** sur Valider → soumission (le double Enter final donne le temps de vérifier la saisie)
  - Bouton **Annuler** visible dès que les infos du match s'affichent → réinitialise la tuile à l'état initial

- **D-04:** Modal depuis la table : clic sur une ligne ouvre un modal pré-chargé avec les infos du match (équipes, arbitre, format) et les champs de score. Même logique de validation que la tuile.

### Granularité du score

- **D-05:** UI adaptative selon `sets_to_win` du match :
  - `sets_to_win = 1` (cas courant actuel) : **saisie de legs uniquement** — deux champs entiers (score_a / score_b)
  - `sets_to_win > 1` : **saisie par set** — pour chaque set, les legs de chaque équipe ; score_a/score_b = nombre de sets gagnés calculé à partir des legs

- **D-06:** **Validation stricte** avant enregistrement :
  - Le gagnant doit avoir exactement le nombre de legs/sets requis (ex. legs_per_set=3 → gagnant a 2 legs si BO3)
  - Score impossible rejeté avec message d'erreur explicite (ex. "Score invalide : 2-2 impossible en BO3")
  - La logique de validation est une fonction pure dans `packages/domain`

### Classements round-robin

- **D-07:** Les standings sont affichés dans la **page tournoi existante** `/admin/events/[id]/tournaments/[tid]`, sous la table des matchs, organisés par phase de type `round_robin`. Pas de nouvelle route.

- **D-08:** Formule de points dans un **objet de constantes nommé** (prévu pour évoluer) :
  ```typescript
  export const SCORING_RULES = {
    WIN: 3,
    LOSS: 0,
    WALKOVER_WIN: 3,
    WALKOVER_LOSS: 0,
    BYE: 0,
  } as const
  ```
  Placé dans `packages/domain/src/tournoi/scoring.ts`.

- **D-09:** Règle de départage dans une **fonction isolée `breakTie()`** (prévue pour évoluer) :
  1. Points (SCORING_RULES)
  2. Différence de legs (legs gagnés - legs concédés sur l'ensemble des matchs de poule)
  3. Confrontation directe entre les ex-aequo
  Placée dans `packages/domain/src/tournoi/scoring.ts`.

### double_elimination

- **D-10:** Le type de phase `double_elimination` est **implémenté en Phase 5**. Retirer le `throw new Error("double_elimination phase type not supported in Phase 4")` de `launchTournament`.

- **D-11:** Structure du bracket : **Upper (W) + Lower (L) + Grande Finale (GF)**. La table `bracket_match_info` a déjà les colonnes `bracket`, `loser_goes_to_info_id`, `winner_goes_to_info_id` prévues pour ça.

- **D-12:** **Bracket reset conditionnel** — exception explicite à la règle "tous les matchs générés au lancement" :
  - La GF est générée au lancement (1 match)
  - Si le joueur du Lower bracket gagne la GF, **un match de reset est créé dynamiquement** par l'orchestration de résultats (le joueur Upper n'avait pas encore eu de défaite)
  - Si le joueur Upper gagne la GF, le tournoi est terminé (pas de reset)

### Statut 'ongoing'

- **D-13:** **Pas de statut `ongoing` en Phase 5.** Les matchs passent directement de `pending` à `done` (score validé), `walkover` (forfait) ou `bye`. Le statut `ongoing` reste pour une future phase de suivi en temps réel.

### Forfait / walkover

- **D-14:** Dans le modal de saisie (ou la tuile hub) : boutons **"Forfait Équipe A"** / **"Forfait Équipe B"**. Résultat : status = `walkover`, le gagnant = l'autre équipe, score = 0-0.

### Affichage (table des matchs)

- **D-15:** **Aucun changement à `PhaseMatchTable.svelte` en Phase 5.** Les composants visuels avancés (bracket graphique, standings stylisés, badges couleurs, filtres) sont reportés à Phase 6.

### Claude's Discretion

- Ordre exact des colonnes dans le tableau de standings
- Gestion des matchs BYE dans le calcul des standings (pas de points attribués)
- Design des tuiles / spacing dans la tuile de saisie rapide

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Schéma DB actuel
- `packages/db/src/schema/016_phase_tier_and_match.sql` — table match (score_a, score_b, status, sets_to_win, legs_per_set, team_a_id, team_b_id, referee_team_id)
- `packages/db/src/schema/017_match_info_tables.sql` — tables round_robin_match_info et bracket_match_info (structure bracket, chemins winner/loser)
- `packages/db/src/schema/018_registration_seed.sql` — dernière migration appliquée

### Schemas Zod domaine
- `packages/domain/src/tournoi/match-schemas.ts` — MatchRowSchema, MatchInsertRowSchema, MatchStatusSchema, BracketInfoInsertRowSchema, RoundRobinInfoInsertRowSchema
- `packages/domain/src/index.ts` — barrel domain (exports à compléter pour Phase 5)

### Architecture DDD et conventions
- `CLAUDE.md` — règles absolues placement du code (domain / db / front), convention routes API (dossier api/, pas de path params, body seulement)
- `.planning/PROJECT.md` — contraintes tech stack, décisions clés
- `.planning/phases/04-launch-and-match-generation/04-CONTEXT.md` — décisions héritées Phase 4 (packages/application, DDD, event_match_id, double_elimination throw à retirer)

### Algorithmes de génération Phase 4 (pour double_elimination)
- `packages/domain/src/tournoi/generators/` — générateurs existants (ko-seeding, round-robin) — référence pour implémenter double_elimination

### Page et composants existants
- `packages/front/src/routes/(admin)/admin/events/[id]/tournaments/[tid]/+page.server.ts` — page tournoi admin (load query matchs existante)
- `packages/front/src/routes/(admin)/admin/events/[id]/tournaments/[tid]/PhaseMatchTable.svelte` — composant table matchs (ne pas modifier en Phase 5)
- `packages/front/src/routes/(admin)/admin/events/[id]/+page.server.ts` — hub événement (ajouter la tuile de saisie rapide ici)

### Requirements Phase 5
- `.planning/REQUIREMENTS.md` §RESULT — RESULT-01 à RESULT-04

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `PhaseMatchTable.svelte` — affichage des matchs par phase/groupe, non modifié en Phase 5 mais le clic sur ligne déclenche le modal de saisie
- `RegistrationModal.svelte` — pattern modal existant pour référence (structure open/close, Flowbite Modal)
- `sql.begin()` dans `packages/db/src/repositories/` — pattern transaction pour l'orchestration d'avancement (atomicité résultat + avancement)
- `packages/application/` — package existant depuis Phase 4, c'est ici que va la logique d'orchestration résultat + avancement (croise domain et db)

### Established Patterns
- Zod-first : toute validation de score dans `packages/domain`, types inférés via `z.infer<>`
- Routes API : `packages/front/src/routes/api/` (jamais de SQL direct), pas de path params, IDs dans le body
- `event_match_id` : entier séquentiel visible sur les bulletins papier → clé de la tuile de saisie rapide

### Integration Points
- Hub événement `/admin/events/[id]` → ajouter la tuile de saisie rapide (conditionnel `hasStartedTournament`)
- Page tournoi `/admin/events/[id]/tournaments/[tid]` → (1) clic sur ligne de PhaseMatchTable ouvre modal, (2) standings affichés sous la table des matchs
- `packages/application/` → nouvelle fonction `submitMatchResult()` + `advanceWinner()` + `triggerNextPhase()`
- `packages/domain/src/tournoi/scoring.ts` → nouveau fichier (SCORING_RULES + breakTie + validateScore)
- `packages/db/src/repositories/match-repository.ts` → nouveau repository pour update match + avancement

</code_context>

<specifics>
## Specific Ideas

- La tuile de saisie rapide sur le hub événement est inspirée d'une expérience de saisie "de table de marque" : l'admin reçoit un bulletin, tape l'ID, les infos apparaissent, il saisit les scores clavier-only sans toucher la souris. Optimisé pour fluidité en conditions de tournoi.
- Le double Enter final (focus Valider → Enter) est volontaire : donne le temps à l'admin de vérifier sa saisie avant de confirmer.
- `SCORING_RULES` et `breakTie()` sont explicitement prévus pour évoluer — les mettre dans un objet/fonction séparée est une exigence, pas une suggestion.
- Le match de reset du `double_elimination` est une exception consciente à la règle "tous les matchs générés au lancement". Ce choix est intentionnel.

</specifics>

<deferred>
## Deferred Ideas

- Composants visuels avancés (bracket graphique SVG, standings stylisés, badges couleurs, filtres par statut) → **Phase 6**
- Statut `ongoing` pour suivi de matchs en cours → **Phase 6+** (temps réel, SSE)
- Modification manuelle des assignations d'arbitres → **Phase 5+** (reporté de Phase 4)
- `SCORING_RULES` configurables par tournoi (pour l'instant constantes globales) → **post-v1**
- `breakTie()` configurable par tournoi → **post-v1**

</deferred>

---

*Phase: 05-results-and-advancement*
*Context gathered: 2026-04-06*
