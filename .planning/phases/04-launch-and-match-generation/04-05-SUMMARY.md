---
phase: 04-launch-and-match-generation
plan: 05
status: completed
completed_at: 2026-04-06
---

# Summary — 04-05 : Seeding drag-and-drop

## Ce qui a été livré

### Schéma Zod (`packages/domain/src/tournoi/admin-schemas.ts`)
- `AdminTournamentSchema` étendu avec `is_seeded: z.boolean()` et `seed_order: z.preprocess(..., z.array(z.string()))` — gère le JSONB via preprocess conforme à la convention CLAUDE.md

### Repository (`packages/db/src/repositories/tournament-repository.ts`)
- Nouvelle fonction `updateSeedOrder(sql, tournamentId, seedOrder)` — UPDATE tournament SET seed_order = ?::jsonb

### Endpoint PATCH (`packages/front/src/routes/api/tournament/seed-order/+server.ts`)
- Valide le payload (tournament_id + seed_order array de UUIDs) via Zod
- Authz : vérifie rôle admin sur l'entité du tournoi
- Retourne 409 si tournoi déjà lancé (LAUNCH-01 lock)
- Persiste via `tournamentRepository.updateSeedOrder`

### Route API déclarée (`packages/front/src/lib/fetch/api.ts`)
- `TOURNAMENT_SEED_ORDER: { method: ["PATCH"], path: "/api/tournament/seed-order" }`

### Server load (`[tid]/+page.server.ts`)
- SELECT étendu avec `t.is_seeded, t.seed_order`
- AdminTournamentSchema parse inclut maintenant ces champs

### UI drag-and-drop (`[tid]/+page.svelte`)
- Section "Ordre de seeding" visible uniquement quand `is_seeded === true` et tournoi non lancé
- Liste `<ol>` avec numéros de seed (1, 2, 3...) et poignées de glissement (☰)
- Drag via HTML5 native (`draggable`, `ondragstart`, `ondragover`, `ondragend`)
- Réordonnement en temps réel via état `seedOrder` (swap sur dragover)
- Sauvegarde automatique au dragend via PATCH `apiRoutes.TOURNAMENT_SEED_ORDER`
- Ordre initial : `seed_order` DB si non vide, sinon ordre d'inscription
- Masqué pour les tournois non seedés (default path inchangé)

## Vérification
- `svelte-check` : 0 erreur, 5 warnings préexistants
- `pnpm lint` : 0 erreur introduite (2 erreurs préexistantes dans fichiers non modifiés)
