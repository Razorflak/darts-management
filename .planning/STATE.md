---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: unknown
last_updated: "2026-03-01T09:11:08.485Z"
progress:
  total_phases: 1
  completed_phases: 0
  total_plans: 6
  completed_plans: 5
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-28)

**Core value:** Permettre a un organisateur de creer un tournoi complexe, de le lancer, et que le systeme gere automatiquement la generation des matchs et le suivi des resultats jusqu'aux classements finaux.
**Current focus:** Phase 1 — Foundation

## Current Position

Phase: 1 of 6 (Foundation) — COMPLETE
Plan: 5 of 5 in current phase (gap closure plan added)
Status: Phase 1 complete
Last activity: 2026-03-01 — Completed plan 01-05: Custom authorization layer (user_entity_role + authz module)

Progress: [█░░░░░░░░░] 21% (5/24 plans estimated)

## Performance Metrics

**Velocity:**
- Total plans completed: 5
- Average duration: 3 min
- Total execution time: 17 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation | 5 | 17 min | 3 min |

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
- [01-02] flowbite-svelte v1.x Navbar children est un Snippet — NavLi n'a pas de prop active, activeUrl sur NavUl drive l'etat actif
- [01-02] Root +page.svelte supprime — (app)/+page.svelte sert l'URL / via le route group
- [01-02] sequence(betterAuthHandle, authHandle) — betterAuthHandle monte les routes /api/auth/*, authHandle populate locals manuellement
- [Phase 01-03]: Better Auth v1.4.x: forgetPassword renamed to requestPasswordReset — plan had outdated method name
- [Phase 01-03]: Flowbite-Svelte v1.x Alert icon: Svelte 5 snippet syntax ({#snippet icon()}) replaces legacy slot='icon'
- [Phase 01-03]: Anti-enumeration pattern: void requestPasswordReset (do not await), always return sent=true
- [01-04] $effect.pre() pour form repopulation — $state(form?.type) declenche state_referenced_locally warning Svelte 5; $effect.pre est le pattern idiomatique
- [01-04] Permission verifiee dans load ET action — evite bypass par POST direct sans visiter la page
- [Phase quick-1]: createAuth accepts {secret, baseURL, smtp} config — BETTER_AUTH_SECRET via $env/static/private, not process.env
- [Phase quick-1]: adminRoles uses camelCase 'adminFederal' (not snake_case 'admin_federal') matching roles object key
- [Phase 01-05]: createAuthz(sql) factory pattern — matches codebase createAuth/createSql convention; sql injected not module singleton

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

Last session: 2026-03-01
Stopped at: Completed 01-05-PLAN.md — Custom authorization layer (user_entity_role + authz module). Phase 1 complete.
Resume file: None
