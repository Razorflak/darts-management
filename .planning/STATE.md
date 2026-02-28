# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-28)

**Core value:** Permettre a un organisateur de creer un tournoi complexe, de le lancer, et que le systeme gere automatiquement la generation des matchs et le suivi des resultats jusqu'aux classements finaux.
**Current focus:** Phase 1 — Foundation

## Current Position

Phase: 1 of 6 (Foundation)
Plan: 1 of 4 in current phase
Status: In progress
Last activity: 2026-02-28 — Completed plan 01-01: DB foundation (Better Auth, permissions, migrations)

Progress: [░░░░░░░░░░] 4% (1/24 plans estimated)

## Performance Metrics

**Velocity:**
- Total plans completed: 1
- Average duration: 2 min
- Total execution time: 2 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation | 1 | 2 min | 2 min |

*Updated after each plan completion*

## Accumulated Context

### Decisions

- Auth: Better Auth v1.4.x (Lucia v3 deprecated mars 2025)
- Temps reel: SSE natif SvelteKit — defere a v1.1 (hors scope v1.0)
- Generation brackets: fonctions TypeScript pures (pas de bibliotheque externe)
- Pas d'ORM: raw SQL uniquement via packages/db
- Pattern donnees: toujours des equipes, meme en simples (equipe de 1 joueur)
- [01-01] kysely-postgres-js dialect pour Better Auth — partage la connexion postgres.js existante (pas de dual-driver)
- [01-01] node-pg-migrate remplace prisma migrate scripts (meilleur fit pour projet sans ORM)
- [01-01] Tables Better Auth en camelCase — bug connu avec casing: "snake" + postgres.js dialect (issue #4789)
- [01-01] requireEmailVerification: false — connexion immediate apres inscription (decision produit)
- [01-01] defaultRole: "joueur" dans admin plugin — tous les nouveaux utilisateurs commencent en joueur
- [01-01] sveltekitCookies en dernier plugin — obligatoire pour les form actions SvelteKit

### Pending Todos

None yet.

### Blockers/Concerns

- [Phase 1] Better Auth: event.locals n'est PAS auto-populate — appel manuel auth.api.getSession() obligatoire dans hooks.server.ts
- [Phase 1] Route guards doivent etre dans hooks.server.ts (auth) ET dans chaque action (authz) — jamais dans layout seul
- [Phase 4] BYE placement et seeding double-elimination ont des cas limites non triviaux — tester toutes tailles brackets 3-31
- [Phase 4] pg_advisory_xact_lock(tournament_id) obligatoire pour prevenir double-launch
- [Phase 5] SELECT ... FOR UPDATE obligatoire sur match rows pour prevenir avancement de phase en double
- [Phase 5] Regle tiebreaker FFD non verifiee contre le reglement officiel — a valider avant implementation
- [Phase 5] Traitement des BYE en round-robin (victoire auto ou non-resultat) — a clarifier FFD

## Session Continuity

Last session: 2026-02-28
Stopped at: Completed 01-01-PLAN.md — DB foundation: Better Auth, permissions, migrations, dev seed
Resume file: None
