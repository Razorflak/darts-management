# Phase 4: Launch and Match Generation - Context

**Gathered:** 2026-04-02 (updated from 2026-03-31)
**Status:** Ready for planning

<domain>
## Phase Boundary

Un admin tournoi peut déclencher le lancement d'un tournoi, ce qui verrouille sa configuration et génère atomiquement tous les matchs de toutes les phases en une seule transaction PostgreSQL. Le lancement dispose d'une page de confirmation dédiée. Après lancement réussi, la page tournoi affiche les poules et brackets dans des tableaux simples (perfectionnés en Phase 6). La saisie des résultats et l'avancement de phases appartiennent à la Phase 5.

</domain>

<decisions>
## Implementation Decisions

### Architecture DDD — Placement du code

- **Générateurs de matchs** (fonctions pures) → `packages/domain/src/tournoi/generators/` — pas de dépendance DB, logique métier pure per CLAUDE.md
- **Orchestration du lancement** → nouveau package `packages/application/` (patterns croisés domain + db sans coupler les packages entre eux)
- **Accès DB** → `packages/db/src/repositories/` (repositories existants + nouveau launch-repository)
- **Frontend** → `packages/front/` (pages /launch, page tournoi post-lancement)
- ⚠️ **Correction research.md** : le research suggère `packages/front/src/lib/server/match-generators/` — INVALIDE. Les générateurs purs vont dans `packages/domain`.

### Tests unitaires

- Les algos de génération dans `packages/domain` **doivent** avoir des tests unitaires (Vitest)
- Tester toutes les tailles de brackets (3 à 31 joueurs pour KO), toutes tailles de poules round-robin, et les cas limites (poule avec reste, seeding croisé)

### Schéma DB — Normalisation de `phase.tiers`

- **Remplacer** la colonne JSONB `phase.tiers` par une table normalisée `phase_tier`
- Structure `phase_tier` :
  ```sql
  phase_tier(
    id UUID PK,
    phase_id UUID NOT NULL REFERENCES phase(id) ON DELETE CASCADE,
    position INTEGER NOT NULL,  -- numéro du round/tier
    sets_to_win INTEGER NOT NULL DEFAULT 2,
    legs_per_set INTEGER NOT NULL DEFAULT 3,
    qualifiers_count INTEGER  -- pour phases élim (combien de qualifiés à ce tier)
  )
  ```
- Une ligne par round/tier pour les phases élimination, une seule ligne pour les phases poule
- `BracketTierSchema` Zod mis à jour pour refléter cette structure plate
- Le wizard (PhaseCard) utilise cette structure pour configurer sets/manches par round

### Déclenchement du lancement (inchangé)

- Bouton "Lancer" à deux endroits : page roster du tournoi (`/tournaments/[tid]`) ET page détail de l'événement (`/events/[id]`)
- Le bouton navigue vers `/admin/events/[id]/tournaments/[tid]/launch`
- La page /launch affiche : récapitulatif des inscrits, avertissements contextuels (peu d'inscrits, check-in incomplet…), aperçu de la structure générée (groupes + nombre de matchs par phase)
- Pas de condition bloquante — le bouton est toujours actif, les avertissements sont informatifs
- Le lancement est confirmé sur la page /launch par un bouton "Confirmer"
- Statut du tournoi après lancement réussi : `started`
- Annulation possible par un admin supérieur : supprime les matchs générés, conserve les inscriptions
- En cas d'échec (rollback) : message d'erreur sur la page /launch, bouton réessayer

### Formation des groupes round-robin (inchangé)

- Ajouter une option "Seedé" au wizard de création de tournoi (`is_seeded` sur le tournoi)
- Si seedé : l'admin ordonne les équipes depuis la page roster avant de lancer (drag-and-drop)
- Si non seedé : ordre aléatoire appliqué à la génération
- La génération traite toujours la liste comme seedée (même logique de distribution)
- Distribution : **snake seeding** — Seed 1 → Groupe A, Seed 2 → B, Seed 3 → C, Seed 4 → C, Seed 5 → B, Seed 6 → A…
- Taille des groupes : `players_per_group` déjà en base de données
- Si le nombre d'inscrits n'est pas divisible : remplir les groupes à `players_per_group`, le dernier groupe reçoit les joueurs restants (groupe plus petit)
- Round-robin : chaque équipe affronte toutes les autres exactement une fois

### Seeding UI — Réordonnement sur le roster

- **Drag-and-drop** sur la page roster `/admin/events/[id]/tournaments/[tid]` (cohérent avec le drag-and-drop du wizard pour les phases)
- Visible uniquement quand `tournament.is_seeded = true`
- L'ordre est sauvegardé dans `tournament.seed_order` (JSONB array de team IDs)

### Format poule double KO

- **Contrainte wizard** : `players_per_group` doit être une **puissance de 2** pour les phases `double_loss_groups` — validation dans le wizard lors de la création/édition (pas seulement à la génération)
- Valeurs acceptées : 4, 8, 16, 32
- Structure bracket fixe adapté à la taille (N joueurs, N/2 qualifiants) :
  - **R1** : N/2 matchs, tout le monde joue → N/2 vainqueurs (upper), N/2 perdants (lower)
  - **R2 Upper** : vainqueurs R1 → N/4 qualifiés seed 1-2, perdants passent en last-chance
  - **R2 Lower** : perdants R1 → vainqueurs passent en last-chance, 2 défaites = éliminés
  - **R3 Last chance** : perdants R2 Upper vs vainqueurs R2 Lower → qualifiés seed 3-4
- Contrainte "pas de revanche" garantie par le bracket fixe

### Algorithme bracket KO (phase élimination)

Utiliser l'algo de seeding standard fourni, adapté en TypeScript :

```typescript
function getBracket(participantsCount: number): Array<[number | null, number | null]> {
  const rounds = Math.ceil(Math.log2(participantsCount))
  const bracketSize = Math.pow(2, rounds)
  // BYEs = null (seed > participantsCount → null)
  let matches: Array<[number, number]> = [[1, 2]]
  for (let round = 1; round < rounds; round++) {
    const roundMatches: Array<[number, number]> = []
    const sum = Math.pow(2, round + 1) + 1
    for (const [a, b] of matches) {
      roundMatches.push([a, sum - a])
      roundMatches.push([sum - b, b])
    }
    matches = roundMatches
  }
  return matches.map(([a, b]) => [
    a <= participantsCount ? a : null,
    b <= participantsCount ? b : null,
  ])
}
```

### Algorithme post-poule (sortie de poule → bracket KO)

- **Algo récursif** anti-rematch de même poule :
  1. Classer tous les qualifiés par seed (1er poule A, 1er poule B, ..., 2e poule A, 2e poule B, ...)
  2. Récursivement : si deux slots du bracket sont occupés par des joueurs de la même poule, permuter avec le slot le plus proche de l'autre côté du bracket qui est de poule différente
  3. Une fois toutes les paires de même poule séparées, appliquer l'algo `getBracket` sur les seeds résultants
- Premier jet de l'algo à implémenter dans `packages/domain/src/tournoi/generators/ko-seeding.ts`

### Phase élimination KO — seeding croisé (inchangé)

- Qualification : `qualifiers_count` (sur la phase KO, via `phase_tier`) détermine le nombre de joueurs qualifiés en KO
- Seeding croisé : 1er groupe A vs 2e groupe B, 1er groupe B vs 2e groupe A, etc.

### Assignation des arbitres (inchangé)

- Option par tournoi (`auto_referee` déjà configurable)
- Algo déterministe :
  - Pour chaque match, identifier les équipes non-jouantes au même slot temporel
  - Parmi ces équipes disponibles, choisir celle qui a le moins de matchs arbitrés assignés
- Fonctionne pour singles (équipe de 1) et doubles (équipe de 2) — toujours modèle `team`
- Assignations visibles en lecture seule après génération — pas modifiables en Phase 4

### `event_match_id` (inchangé)

- Entier séquentiel unique sur tous les matchs de l'événement (tous tournois confondus)
- Permet la saisie rapide par ID sur le hub événement (Phase 5)

### Feedback post-lancement — Tableaux simples

- Redirection après lancement réussi : `/admin/events/[id]/tournaments/[tid]`
- La page tournoi post-lancement affiche :
  - **Poules** : tableau par groupe, chaque ligne = `event_match_id | Équipe A vs Équipe B | Arbitre`
  - **Bracket KO** : liste des matchs par round (pas d'arbre graphique SVG) — Phase 6 perfectionnera
- Objectif Phase 4 : fonctionnel, pas esthétique

### Lock concurrent

- `pg_advisory_xact_lock(tournament_id::bigint)` dans la transaction de lancement pour prévenir le double-launch concurrent (déjà identifié comme blocker dans STATE.md)

### Claude's Discretion

- Algorithme exact de calcul du `event_match_id` (séquentiel par ordre de génération)
- Ordre des matchs au sein d'une poule round-robin (rotation Berger standard)
- Design CSS du drag-and-drop seeding (utiliser sortable existant du wizard si disponible)
- Nombre exact de `phase_tier` rows pour les phases poule (1 row suffit)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Schéma DB actuel
- `packages/db/src/schema/009_align_schemas.sql` — colonnes phase, tournament actuelles
- `packages/db/src/schema/013_teams.sql` — tables team, team_member, tournament_registration
- `packages/db/src/schema/014_tournament_status.sql` — enum status tournament
- `packages/db/src/schema/015_player_birth_date_nullable.sql` — dernière migration appliquée

### Architecture DDD du projet
- `CLAUDE.md` — règles absolues de placement du code (domain / db / front), convention routes API, Zod-first
- `.planning/PROJECT.md` — contraintes tech stack, décisions clés

### Schemas Zod existants
- `packages/front/src/lib/server/schemas/event-schemas.ts` — TournamentSchema, PhaseSchema, BracketTierSchema (à migrer vers phase_tier)
- `packages/domain/src/index.ts` — barrel domain (ajouter les exports generators ici)

### Patterns codebase établis
- `packages/db/src/repositories/team-repository.ts` — pattern transaction sql.begin() + rawTx cast
- `packages/front/src/routes/api/tournament/register/+server.ts` — pattern route API + repos

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `PhaseCard.svelte` — configurer sets_to_win/legs_per_set ici (ajouter champs à la card existante)
- `RegistrationModal.svelte` — pattern modal existant pour le drag-and-drop seeding UI
- `sql.begin()` pattern — dans team-repository.ts et event-repository.ts pour les transactions
- Flowbite-svelte Table, Badge, Alert — pour la page /launch (warnings) et l'affichage post-lancement

### Established Patterns
- `createSql` / `sql` injection dans les repositories (pas de singleton module)
- `rawTx as unknown as postgres.Sql` cast dans les callbacks sql.begin() — pattern établi
- Zod-first : tous les types dérivés de schemas, jamais de types inline

### Integration Points
- Page roster `/admin/events/[id]/tournaments/[tid]` → ajouter bouton "Lancer" + drag-and-drop seeding
- Page événement `/admin/events/[id]` → ajouter bouton "Lancer" par tournoi
- Nouvelle page `/admin/events/[id]/tournaments/[tid]/launch` à créer
- `packages/application/` → nouveau package à créer (ajouter au pnpm workspace)

</code_context>

<specifics>
## Specific Ideas

- La page /launch est une vraie page de préparation (pas un modal) — comparable à un écran de confirmation pré-déploiement
- Le hub événement `/admin/events/[id]` contiendra une zone de saisie rapide de résultats par `event_match_id` — mais c'est Phase 5
- La page tournoi `/tournaments/[tid]` devient la page centrale pour tout ce qui est spécifique à un tournoi (roster, matchs, brackets, progression)
- L'algo de bracket KO (getBracket) a été fourni par l'utilisateur — l'adapter tel quel en TypeScript
- La contrainte puissance de 2 pour `players_per_group` en double KO = validation dans le wizard (pas seulement à la génération)

</specifics>

<deferred>
## Deferred Ideas

- Zone de saisie rapide de résultats par `event_match_id` sur le hub événement — Phase 5
- Modification manuelle des assignations d'arbitres — Phase 5 ou ultérieur
- Perfectionnement visuel des brackets (arbre SVG/CSS) — Phase 6
- Classements et standings dans les poules — Phase 5
- Généralisation du bracket double KO pour tailles non-puissance de 2 — post-v1

</deferred>

---

*Phase: 04-launch-and-match-generation*
*Context gathered: 2026-04-02 (updated)*
