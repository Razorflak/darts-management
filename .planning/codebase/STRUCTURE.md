# Structure

## Monorepo Layout

```
packages/
  domain/           # Zod schemas + pure functions (no DB, no network)
  db/               # Repositories + Better Auth + authz + postgres client
  application/      # Use-cases orchestrating domain + db
  front/            # SvelteKit app (presentation only)
  logger/           # Cross-cutting structured logging (Pino + OpenTelemetry)
  mail/             # Nodemailer SMTP integration
  config/
    typescript-config/    # Shared tsconfig bases
    vitest-config/        # Shared Vitest config
```

## packages/domain

```
src/
  organisation/schemas.ts   # Entity hierarchy: fédération, ligue, comité, club
  tournoi/schemas.ts         # Event, Tournament, Phase, BracketTier
  joueur/schemas.ts          # Player, Team, TeamMember, profils
  joueur/format.ts           # formatPlayerInfo — name normalization
  inscription/schemas.ts     # Registration, Roster, CheckIn
  tournoi/services/          # Pure algorithms (e.g. phase-utils)
  index.ts                   # Barrel — re-exports everything
```

## packages/db

```
src/
  repositories/
    player-repository.ts      # searchPlayers, searchPartners, playerExists, createPlayer, linkOrCreatePlayerProfile
    team-repository.ts        # findOrCreateTeam
    tournament-repository.ts  # upsertTournaments, insertPhases, registerTeam, updateCheckin, checkinAll, unregister, updateTournamentStatus
    event-repository.ts       # saveEvent, publishEvent, deleteEvent
    match-repository.ts       # match-related queries
  auth.ts                     # createAuth (Better Auth)
  authz.ts                    # createAuthz, getUserRoles, checkRole
  client.ts                   # createSql (postgres.js)
  index.ts                    # Public package exports
```

## packages/application

```
src/
  {bounded-context}/          # Use-cases per domain context
    *.ts                      # Each file = one use-case
```

## packages/front (SvelteKit)

```
src/
  routes/
    (admin)/                  # Admin-authenticated routes
      admin/events/[id]/
        tournaments/[tid]/    # Tournament management pages
    (app)/                    # Authenticated user routes
    (auth)/                   # Login/register pages
    api/                      # API endpoints (mutations)
  lib/
    server/
      db.ts                   # sql instance
      repos.ts                # Pre-bound repository barrel
      schemas/
        request-schemas.ts    # Zod validation for incoming JSON
        event-schemas.ts      # Re-exports from @darts-management/domain
      event-operations.ts     # Re-exports from @darts-management/db
    fetch/
      api.ts                  # apiRoutes registry — all endpoint paths
    components/               # Shared Svelte components
  hooks.server.ts             # Auth session check + guards
  app.html
```

## Where to Add New Code

| What | Where |
|------|-------|
| New domain type/schema | `packages/domain/src/{context}/schemas.ts` |
| New use-case | `packages/application/src/{context}/` |
| New repository function | `packages/db/src/repositories/{context}-repository.ts` |
| New API route | `packages/front/src/routes/api/{context}/+server.ts` |
| New API route reference | `packages/front/src/lib/fetch/api.ts` → `apiRoutes` |
| New page | `packages/front/src/routes/(admin|app)/...` |
| New request validation | `packages/front/src/lib/server/schemas/request-schemas.ts` |

## Key File Locations

- API routes registry: `packages/front/src/lib/fetch/api.ts`
- Request schemas: `packages/front/src/lib/server/schemas/request-schemas.ts`
- Server hooks: `packages/front/src/hooks.server.ts`
- DB client: `packages/front/src/lib/server/db.ts`
- Pre-bound repos: `packages/front/src/lib/server/repos.ts`
