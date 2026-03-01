---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: unknown
last_updated: "2026-03-01T14:27:02Z"
progress:
  total_phases: 2
  completed_phases: 2
  total_plans: 10
  completed_plans: 10
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-28)

**Core value:** Permettre a un organisateur de creer un tournoi complexe, de le lancer, et que le systeme gere automatiquement la generation des matchs et le suivi des resultats jusqu'aux classements finaux.
**Current focus:** Phase 2 — Wizard Persistence

## Current Position

Phase: 2 of 6 (Wizard Persistence) — COMPLETE (4 of 4 plans done)
Plan: 4 of 4 in current phase
Status: 02-04 complete — Wizard migrated to /events/new with real persistence, navbar updated, old route removed
Last activity: 2026-03-01 — Completed plan 02-04: Wizard migration and persistence wiring

Progress: [████░░░░░░] 40% (10/24 plans estimated)

## Performance Metrics

**Velocity:**
- Total plans completed: 7
- Average duration: 3 min
- Total execution time: 24 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation | 6 | 19 min | 3 min |
| 02-wizard-persistence | 4 | 10 min | 2.5 min |

*Updated after each plan completion*
| Phase 02-wizard-persistence P02 | 6 | 3 tasks | 5 files |
| Phase 02-wizard-persistence P04 | 3 | 3 tasks | 6 files |

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
- [01-06]: $lib/server/authz.ts wrapper pre-binds createAuthz(sql) — import getUserRoles/checkRole/canPromote directly like importing sql from $lib/server/db
- [01-06]: hasAdminAccess computed server-side in +layout.server.ts — includes adminFederal, adminLigue, adminComite, adminClub; navbar uses data.hasAdminAccess not client-derived role
- [02-01]: organizer_id TEXT sans FK — Better Auth gere ses propres tables, FK cross-schema causerait des conflits
- [02-01]: category stocke en TEXT (pas ENUM SQL) — evite la derive de sync avec le type union TypeScript Category
- [02-01]: phases stocke en JSONB (pas de table separee) — Phase[] toujours lu/ecrit atomiquement, pas de requetes par phase
- [02-01]: club TEXT nullable sans FK — champ texte libre confirme, pas de relation entity
- [02-01]: registration_opens_at DATE nullable — NULL = ouverture immediate a la publication
- [02-03]: Badge draft color 'gray' pas 'dark' — Flowbite-Svelte Badge color prop n'accepte pas 'dark', 'gray' est l'equivalent visuel correct
- [02-03]: Draft visibility rule: organizer_id = userId OR (entity_id = ANY(entityIds) AND status != 'draft') — branche two-query pour eviter ANY() avec tableau vide
- [Phase 02-02]: postgres added as direct front dep for TransactionSql types — Omit<Sql> strips call signatures; rawTx as unknown as postgres.Sql cast restores callable type
- [Phase 02-02]: Status 'ready' transition inside sql.begin() transaction — atomicity ensures draft stays if tournament inserts fail
- [02-04]: publishError typed as string|undefined (not null) in PublishStep prop; page uses null ?? undefined coercion
- [02-04]: Old /tournaments/new deleted immediately when EventStep entities prop was added (breaking typecheck)

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
Stopped at: Completed 02-04-PLAN.md — Wizard migration to /events/new with persistence wiring. Phase 2 complete.
Resume file: None
