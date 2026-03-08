---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: unknown
last_updated: "2026-03-08T20:32:43.116Z"
progress:
  total_phases: 4
  completed_phases: 4
  total_plans: 23
  completed_plans: 23
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-28)

**Core value:** Permettre a un organisateur de creer un tournoi complexe, de le lancer, et que le systeme gere automatiquement la generation des matchs et le suivi des resultats jusqu'aux classements finaux.
**Current focus:** Phase 3 — Player Registration

## Current Position

Phase: 03-player-registration — plan 05 complete (PHASE COMPLETE)
Plan: 03-05 complete (admin roster page, check-in, status management, player add/remove)
Status: 03-05 complete — admin roster at /admin/events/[id]/tournaments/[tid] with all management actions
Last activity: 2026-03-08 - Completed 03-05: admin roster page + tournament status control

Progress: [████░░░░░░] 57% (23/40 plans estimated)

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
| Phase 02-wizard-persistence P06 | 3 | 1 tasks | 1 files |
| Phase 02-wizard-persistence P07 | 4 | 2 tasks | 3 files |
| Phase 02-wizard-persistence P01 | 3 | 2 tasks | 2 files |
| Phase 02-wizard-persistence P02 | 1 | 2 tasks | 7 files |
| Phase 02-wizard-persistence PP05 | 2 | 2 tasks | 2 files |
| Phase 02-wizard-persistence P06 | 5 | 2 tasks | 3 files |
| Phase 02-wizard-persistence P07 | 7 | 2 tasks | 2 files |
| Phase 02-wizard-persistence P08 | 11 | 2 tasks | 11 files |
| Phase 03-player-registration P02 | 3 | 2 tasks | 3 files |
| Phase 03-player-registration P03 | 3 | 3 tasks | 4 files |
| Phase 03.1-teams-and-doubles-registration P01 | 7 | 2 tasks | 11 files |
| Phase 03.1-teams-and-doubles-registration P03 | 7 | 2 tasks | 2 files |
| Phase 03.1-teams-and-doubles-registration P02 | 5 | 2 tasks | 3 files |
| Phase 03-player-registration P04 | 12 | 3 tasks | 11 files |
| Phase 03-player-registration P05 | 4 | 2 tasks | 9 files |

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
- [Phase 02-06]: [02-06]: Bidirectional $effect with string-comparison guard (propIso !== localIso) breaks inbound/outbound loop — stable state reached when both ISO strings match
- [02-07]: Redirect to /events (not 404) when draft not found — avoids leaking event existence to non-owners
- [02-07]: Edit wizard reuses /events/new/save and /events/new/publish — eventId in POST body triggers UPDATE path, no new endpoints needed
- [02-07]: Reprendre link shown only for status === 'draft' — published events are read-only in Phase 2
- [Phase 02-01]: Migration 008 creates normalized phase table replacing phases JSONB column in tournament
- [Phase 02-01]: PublishOptions removed from types.ts — downstream cleanup deferred to plan 02-05
- [Phase 02-05]: PublishStep si ready/started = récapitulatif seul + message informatif, bouton Publier masqué — bouton Enregistrer header suffit
- [Phase 02-05]: Liens d'édition /events pour tous statuts sauf finished — texte 'Reprendre l'édition' pour draft, 'Modifier' pour ready/started
- [Phase 02-wizard-persistence]: [02-06]: toLocalDateISO uses getFullYear/getMonth/getDate — avoids UTC midnight rollback in UTC+ timezones
- [Phase 02-wizard-persistence]: [02-06]: Flowbite-Svelte Datepicker onselect prop receives DateOrRange not DOM Event — use instanceof Date guard for onselect handler
- [Phase 02-wizard-persistence]: [02-06]: registrationDateObj Datepicker uses onselect (one-way) while startDateObj/endDateObj keep bind:value
- [02-07]: TournamentForm Datepicker uses toLocalDateISO + bind:value pattern — same as EventStep
- [02-07]: tournament.startDate = undefined (not '') when cleared — matches optional string type
- [02-07]: TimeInput disabled prop added — EventStep uses disabled={readonly} on TimeInput, required the prop declaration
- [Phase 02-08]: sql<Record<string,unknown>[]> not sql<unknown[]> — postgres.Sql<T> requires T extends readonly (object|undefined)[]
- [Phase 02-08]: [02-08]: Zod schemas centralized in packages/front/src/lib/server/schemas/ per domain; authz schemas in packages/db/src/schemas.ts
- [03-01]: player.user_id TEXT NULL no FK — same pattern as event.organizer_id; Better Auth manages its own user table, cross-schema FK avoided
- [03-01]: tournament_registration deduplication via UNIQUE(tournament_id, player_id) DB constraint — app catches PostgreSQL error 23505
- [03-01]: Partial UNIQUE index player_user_unique_idx WHERE user_id IS NOT NULL — admin-created profiles (NULL user_id) exempt from uniqueness
- [03-01]: player_id FK ON DELETE RESTRICT, tournament_id FK ON DELETE CASCADE — protects registration data, cleans up when tournament deleted
- [Phase 03-02]: ON CONFLICT DO NOTHING in player INSERT + re-SELECT guards against concurrent first-login race conditions
- [Phase 03-02]: birth_date::text cast in SQL — DATE stored as text, parsed by z.string() not z.coerce.date()
- [Phase 03-02]: Name split best-effort for auto-created players: parts[0]=first_name, parts.slice(1).join(' ')||parts[0]=last_name; placeholder birth_date '1900-01-01'
- [Phase 03-03]: Child +layout.server.ts overrides parent (app) redirect to add ?redirectTo=/events/[id] — keeps navbar, preserves return URL
- [Phase 03-03]: EventDetailSchema = EventSchema.omit({ tournaments: true }) — avoids TournamentSchema.min(1) mismatch for player-facing view
- [Phase 03.1-01]: Solo registration creates a team of 1: CREATE team + team_member + tournament_registration in transaction
- [Phase 03.1-01]: Roster query uses json_agg via team_member JOIN — members is array in RosterEntry, not flat player fields
- [Phase 03.1-01]: is_registered uses correlated EXISTS through team_member, not LEFT JOIN on player_id
- [Phase 03.1-03]: partner/search endpoint is global (not filtered by tournament) — [id] param is routing-only
- [Phase 03.1-03]: is_registered (EXISTS+team_member) and json_agg roster were already complete from Plan 01 — only player search department field needed adding
- [Phase 03.1-teams-and-doubles-registration]: rawTx as unknown as postgres.Sql cast in sql.begin() callbacks — TransactionSql strips call signatures, cast restores callability (established pattern)
- [Phase 03.1-teams-and-doubles-registration]: findOrCreate inside sql.begin() for team creation — atomic, idempotent, no ON CONFLICT needed since team has no natural key
- [03-04]: tournament.status enum is [ready, check-in, started, finished] — no draft (events have draft, tournaments do not)
- [03-04]: AdminEventDetailSchema defined in event-schemas.ts per Zod-first rule, not inline in route
- [03-04]: Registration allowed when t.status IN ('ready', 'check-in') AND e.status = 'ready'
- [Phase 03-05]: PlayerSearch searchUrl is optional — falls back to legacy URL for backwards compatibility with existing admin pages
- [Phase 03-05]: STATUS_TRANSITIONS/STATUS_PREV maps in page.svelte enable linear status transitions with forward+back buttons without server-side validation

### Roadmap Evolution

- Phase 03.1 inserted after Phase 3: Teams and Doubles Registration (URGENT) — modèle équipe, inscription double avec modal de recherche partenaire, champ département joueur

### Pending Todos

None yet.

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 2 | Restructuration des routes : section Administration avec dashboard et menu de navigation latéral/mobile | 2026-03-08 | 25cdc7b | [2-restructuration-des-routes-section-admin](./quick/2-restructuration-des-routes-section-admin/) |
| 3 | Corrections admin — supprimer /events, vider dashboard, sidebar overlay | 2026-03-08 | 9a8702b | [3-corrections-admin-supprimer-events-dashb](./quick/3-corrections-admin-supprimer-events-dashb/) |
| 4 | Créer /admin/events liste événements, /admin/entities liste entités, corriger sidebar admin | 2026-03-08 | 2598eb9 | [4-admin-cr-er-admin-events-liste-events-co](./quick/4-admin-cr-er-admin-events-liste-events-co/) |
| 5 | Sidebar admin: lien rouge 'Quitter l'administration' en bas vers la page d'accueil | 2026-03-08 | 419e85f | [5-sidebar-admin-ajouter-lien-rouge-quitter](./quick/5-sidebar-admin-ajouter-lien-rouge-quitter/) |

### Blockers/Concerns

- [Phase 1] Better Auth: event.locals n'est PAS auto-populate — appel manuel auth.api.getSession() obligatoire dans hooks.server.ts
- [Phase 1] Route guards doivent etre dans hooks.server.ts (auth) ET dans chaque action (authz) — jamais dans layout seul
- [Phase 4] BYE placement et seeding double-elimination ont des cas limites non triviaux — tester toutes tailles brackets 3-31
- [Phase 4] pg_advisory_xact_lock(tournament_id) obligatoire pour prevenir double-launch
- [Phase 5] SELECT ... FOR UPDATE obligatoire sur match rows pour prevenir avancement de phase en double
- [Phase 5] Regle tiebreaker FFD non verifiee contre le reglement officiel — a valider avant implementation
- [Phase 5] Traitement des BYE en round-robin (victoire auto ou non-resultat) — a clarifier FFD

## Session Continuity

Last session: 2026-03-08
Stopped at: Completed 03-04 — migration 014 tournament.status, check_in_required in wizard+save+register, admin event detail page /admin/events/[id].
Resume file: None
