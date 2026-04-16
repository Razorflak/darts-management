# Darts Management — Refactoring Back-end

## What This Is

Application de gestion de tournois de darts (monorepo pnpm/Turborepo, architecture DDD). Ce milestone est un nettoyage structurel du back-end : consolider les schemas Zod éparpillés, supprimer les doublons dans les repositories, simplifier la couche application, et poser des règles strictes qui serviront de référence pour toute la suite du projet.

## Core Value

Un back-end lisible et sans doublons, avec des règles claires sur où mettre chaque type de code — pour que le prochain ajout de feature ne réintroduise pas de duplication.

## Requirements

### Validated

- ✓ Architecture DDD en couches (domain → db → application → front) — existant
- ✓ Pattern repository avec `createRepository()` + `traced()` — existant
- ✓ Zod-first typing (`z.infer<>`, aucun type inline) — existant (appliqué partiellement)
- ✓ Pas de SQL dans les routes mutations — existant
- ✓ Validation Zod sur tous les SELECT — existant (appliqué partiellement)

### Active

- [ ] Schemas Zod du domaine `tournoi` regroupés logiquement (6 fichiers → structure cohérente)
- [ ] Doublons supprimés dans `tournament-repository.ts` (3 fonctions upsert → 1)
- [ ] `match-repository.ts` (438 lignes) décomposé ou allégé
- [ ] Schemas internes aux repositories extraits / nettoyés
- [ ] Routes API nettoyées et alignées sur les conventions
- [ ] Règles de contribution documentées dans CLAUDE.md (où mettre quoi, patterns interdits)
- [ ] `pnpm lint` et `pnpm typecheck` passent sans erreur après refactoring
- [ ] Tests existants continuent de passer

### Out of Scope

- Nouvelles features fonctionnelles — ce milestone n'ajoute pas de comportement
- Refactoring du frontend (composants Svelte) — hors périmètre
- `referee-assignment.ts` (stub vide, comportement non défini) — laisser en l'état
- Couverture de tests (ajout de nouveaux tests) — désiré mais second milestone

## Context

- **Codebase existante** : architecture DDD 5 couches (domain / db / application / front / logger)
- **Problèmes identifiés** :
  - `packages/domain/src/tournoi/` contient 6 fichiers de schemas (`admin-schemas.ts`, `event-schemas.ts`, `match-schemas.ts`, `phase-schemas.ts`, `schemas.ts`, `tournament-schemas.ts`) sans logique claire de découpage
  - `tournament-repository.ts` : 3 fonctions upsert qui se chevauchent (`upsertTournamentsBatch`, `upsertTournaments`, `upsertSingleTournament`) — l'une probablement morte
  - `match-repository.ts` : 438 lignes avec schemas Zod internes mélangés aux fonctions
  - `launch-repository.ts` : 194 lignes, champs `id:` et `status:` dupliqués dans les schemas internes
  - Schemas Zod internes aux repositories (non exportés) dupliquent parfois des schemas du domaine
- **Casts dangereux** : `as unknown as Row[]` dans checkin, `as unknown as Sql` dans 8 callbacks de transaction
- **Bug connu** : `advancePhase` lit `sql` global au lieu de `tx` dans une transaction

## Constraints

- **Tech stack** : TypeScript strict, Biome (lint/format), Vitest — aucun changement de stack
- **Compatibilité** : les APIs existantes (routes front) ne doivent pas changer de signature
- **Tests** : aucun test existant ne doit régresser
- **Déploiement** : pas de migration DB impliquée

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Périmètre = tout le back (db + domain + application + routes API) | Lisibilité + règles strictes pour la suite | — Pending |
| Garder `referee-assignment.ts` en l'état | Comportement non défini — risque de casser | — Pending |
| Pas de nouvelles features dans ce milestone | Nettoyage d'abord, on verra après | — Pending |

## Evolution

Ce document évolue à chaque transition de phase et à la fin du milestone.

**Après chaque phase** :
1. Requirements invalidés ? → Déplacer vers Out of Scope avec raison
2. Requirements validés ? → Déplacer vers Validated avec référence de phase
3. Nouveaux requirements émergés ? → Ajouter à Active
4. Décisions à logger ? → Ajouter à Key Decisions
5. "What This Is" toujours exact ? → Mettre à jour si drift

**Après le milestone** :
1. Révision complète de toutes les sections
2. Vérifier Core Value — toujours la bonne priorité ?
3. Auditer Out of Scope — raisons toujours valides ?
4. Mettre à jour Context avec l'état actuel

---
*Last updated: 2026-04-16 après initialisation*
