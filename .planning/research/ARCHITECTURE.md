# Architecture Research

**Domain:** Tournament management platform (SvelteKit full-stack, subsequent milestone)
**Researched:** 2026-02-28
**Confidence:** HIGH (existing codebase analyzed + official documentation verified)

---

## Context: Brownfield Integration

This is a subsequent milestone on an existing codebase. The architecture decisions below address specifically how new features (auth, hierarchy, persistence, match generation, result entry, standings) integrate with the existing structure — not a greenfield design. Existing code not listed as "modified" should not change.

---

## System Overview

```
┌───────────────────────────────────────────────────────────────────────┐
│                         Browser (Svelte 5 runes)                       │
│                                                                         │
│  ┌──────────────┐  ┌───────────────┐  ┌───────────────┐                │
│  │ Wizard Pages │  │ Event/Match   │  │ Public Views  │                │
│  │ /tournaments │  │ Dashboard     │  │ /events/:id   │                │
│  │ /new         │  │ /events/:id   │  │ /standings    │                │
│  │              │  │ /dashboard    │  │               │                │
│  └──────┬───────┘  └───────┬───────┘  └───────┬───────┘                │
│         │                 │                   │                        │
│         │     EventSource (SSE, v1.1)          │                        │
│         └─────────────────┴───────────────────┘                        │
└─────────────────────────────┬─────────────────────────────────────────┘
                              │ HTTP / Form Actions
┌─────────────────────────────▼─────────────────────────────────────────┐
│                    SvelteKit Server (Node.js)                          │
│                                                                         │
│  hooks.server.ts                                                        │
│  ┌──────────────────────────────────────────────────────────────┐      │
│  │ sequence(betterAuthHandler, sessionLocalsHandler, authGuard) │      │
│  └──────────────────────────────────────────────────────────────┘      │
│                                                                         │
│  +page.server.ts (Form Actions)      +server.ts (API Endpoints)         │
│  ┌──────────────────────────────┐    ┌──────────────────────────────┐   │
│  │ /tournaments/new             │    │ /api/events/[id]/sse         │   │
│  │   action: create             │    │ /api/matches/[id]/result     │   │
│  │ /events/[id]/registrations   │    │                              │   │
│  │   action: register, checkin  │    │                              │   │
│  │ /events/[id]/matches/[id]    │    │                              │   │
│  │   action: enterResult        │    │                              │   │
│  └──────────────────────────────┘    └──────────────────────────────┘   │
│                                                                         │
│  $lib/server/                                                           │
│  ┌────────────┐ ┌──────────────┐ ┌───────────────┐ ┌──────────────┐   │
│  │   auth.ts  │ │  db/queries/ │ │  generation/  │ │  standings/  │   │
│  │ Better Auth│ │  (raw SQL)   │ │  (pure TS)    │ │  (pure TS)   │   │
│  └────────────┘ └──────┬───────┘ └───────────────┘ └──────────────┘   │
└──────────────────────────┬────────────────────────────────────────────┘
                           │ postgres driver (packages/db)
┌──────────────────────────▼────────────────────────────────────────────┐
│                         PostgreSQL                                     │
│                                                                         │
│  Better Auth tables    Federation hierarchy    Tournament domain        │
│  ┌──────────────────┐  ┌──────────────────┐   ┌──────────────────────┐ │
│  │ user             │  │ federation       │   │ event                │ │
│  │ session          │  │ league           │   │ tournament           │ │
│  │ account          │  │ committee        │   │ phase                │ │
│  │ verification     │  │ club             │   │ team                 │ │
│  │ user_role        │  └──────────────────┘   │ registration         │ │
│  └──────────────────┘                         │ match                │ │
│                                               └──────────────────────┘ │
└────────────────────────────────────────────────────────────────────────┘
```

---

## Component Responsibilities

| Component | Responsibility | Status |
|-----------|----------------|--------|
| `hooks.server.ts` | Auth interception, session → locals, route guard | NEW |
| `src/app.d.ts` | Type App.Locals (user, session, organizerOf) | MODIFIED |
| `$lib/server/auth.ts` | Better Auth instance, plugin config, role definitions | NEW |
| `$lib/server/db/` | Raw SQL query functions grouped by domain | NEW |
| `$lib/server/generation/` | Pure TS match generation algorithms | NEW |
| `$lib/server/standings/` | Pure TS standings calculation | NEW |
| `+page.server.ts` (per route) | load() + form actions, session guard, DB calls | NEW |
| `+server.ts` (API routes) | SSE stream endpoint, JSON API for AJAX | NEW |
| `packages/db/` | postgres driver instance, migration tooling | UNCHANGED |
| Wizard components | Existing UI — wired to form action instead of console.log | MODIFIED |

---

## Recommended Project Structure

```
packages/front/src/
├── hooks.server.ts                    # NEW: auth handler + session locals + route guard
├── app.d.ts                           # MODIFIED: App.Locals types
│
├── lib/
│   ├── server/                        # NEW: server-only modules (never imported in client code)
│   │   ├── auth.ts                    # Better Auth instance + role definitions
│   │   ├── db/                        # Raw SQL query functions
│   │   │   ├── events.ts              # CRUD: event, tournament, phase
│   │   │   ├── hierarchy.ts           # federation / league / committee / club queries
│   │   │   ├── registrations.ts       # registration + check-in queries
│   │   │   ├── matches.ts             # match queries + result entry
│   │   │   └── standings.ts           # standings read queries
│   │   ├── generation/                # Pure TS, no DB — match generation algorithms
│   │   │   ├── berger.ts              # Round-robin Berger table generator
│   │   │   ├── elimination.ts         # Single/double elimination bracket generator
│   │   │   └── index.ts               # Unified generateMatches(phase, teams) function
│   │   └── standings/                 # Pure TS standings calculators
│   │       ├── round-robin.ts         # Points, wins, legs tally
│   │       └── elimination.ts         # Bracket progression view
│   │
│   ├── tournament/                    # EXISTING — UI components and types
│   │   ├── types.ts                   # EXISTING (wizard types) — add DB-aware types
│   │   ├── utils.ts                   # EXISTING (factories)
│   │   ├── labels.ts                  # EXISTING
│   │   ├── templates.ts               # EXISTING
│   │   ├── sortable.ts                # EXISTING
│   │   └── components/                # EXISTING wizard components
│   │
│   └── styles/
│       └── theme.css                  # EXISTING
│
└── routes/
    ├── +layout.svelte                 # EXISTING
    ├── +layout.server.ts              # NEW: load session → PageData.user for all routes
    ├── +page.svelte                   # EXISTING home
    │
    ├── (auth)/                        # Route group: auth pages (no nav wrapper needed)
    │   ├── login/
    │   │   └── +page.svelte           # NEW: login form → Better Auth client
    │   └── register/
    │       └── +page.svelte           # NEW: registration form
    │
    ├── (app)/                         # Route group: authenticated app (requires session)
    │   ├── +layout.server.ts          # NEW: guard — redirect to /login if no session
    │   │
    │   ├── tournaments/
    │   │   └── new/
    │   │       ├── +page.svelte       # EXISTING wizard UI — wire publish() to form action
    │   │       └── +page.server.ts    # NEW: action:create → DB insert → redirect
    │   │
    │   └── events/
    │       ├── +page.svelte           # NEW: event list for current user's org
    │       ├── +page.server.ts        # NEW: load() → fetch events by org
    │       └── [id]/
    │           ├── +page.svelte       # NEW: event overview
    │           ├── +page.server.ts    # NEW: load() → event + tournaments + status
    │           ├── registrations/
    │           │   ├── +page.svelte   # NEW: registration management UI
    │           │   └── +page.server.ts # NEW: action:register, action:checkin
    │           ├── launch/
    │           │   └── +page.server.ts # NEW: action:launch → generateMatches() → DB bulk insert
    │           ├── dashboard/
    │           │   ├── +page.svelte   # NEW: day dashboard — all matches status
    │           │   └── +page.server.ts # NEW: load() → all matches grouped by tournament
    │           └── matches/
    │               └── [matchId]/
    │                   ├── +page.svelte    # NEW: match detail + result entry form
    │                   └── +page.server.ts # NEW: action:enterResult → DB + advance
    │
    └── api/
        └── events/
            └── [id]/
                └── sse/
                    └── +server.ts     # NEW (v1.1): SSE stream for real-time updates
```

### Structure Rationale

- **`$lib/server/`:** Colocation of all server-only code. SvelteKit's module system prevents these from leaking into client bundles when imported only from `*.server.ts` files.
- **`$lib/server/db/`:** One file per domain concept. Functions are thin wrappers over `sql` tagged template (from `packages/db`). No repository pattern overhead — just named query functions.
- **`$lib/server/generation/`:** Pure TypeScript with no database dependency. Generates arrays of match records in memory; the `launch` action handles the DB transaction. Pure functions are trivially testable with Vitest.
- **Route groups `(auth)/` and `(app)/`:** SvelteKit parenthesized groups that do not appear in the URL. `(app)/+layout.server.ts` is the single gate for authenticated routes — one file, not scattered guards.
- **`packages/db/`:** Remains unchanged. The `sql` tagged template from `postgres` v3 supports transactions via `sql.begin(...)`.

---

## Architectural Patterns

### Pattern 1: Better Auth + SvelteKit Hooks (sequence)

**What:** Better Auth's `svelteKitHandler` intercepts auth API routes (`/api/auth/*`). A second handler populates `event.locals` with session data. A third handler guards protected routes.

**When to use:** Always — this is the auth integration entry point. Everything downstream depends on `event.locals.user` being populated.

**Trade-offs:** Requires `sequence()` from SvelteKit — simple to compose, but handler order matters: betterAuth must run first so its session cookie is set before locals population.

**Example:**
```typescript
// packages/front/src/hooks.server.ts
import { auth } from '$lib/server/auth'
import { svelteKitHandler } from 'better-auth/svelte-kit'
import { sequence } from '@sveltejs/kit/hooks'
import { building } from '$app/environment'
import { redirect } from '@sveltejs/kit'

const betterAuthHandler: Handle = ({ event, resolve }) =>
  svelteKitHandler({ event, resolve, auth, building })

const sessionLocalsHandler: Handle = async ({ event, resolve }) => {
  const session = await auth.api.getSession({ headers: event.request.headers })
  event.locals.user = session?.user ?? null
  event.locals.session = session?.session ?? null
  return resolve(event)
}

export const handle = sequence(betterAuthHandler, sessionLocalsHandler)
```

```typescript
// packages/front/src/app.d.ts
import type { User, Session } from '$lib/server/auth'

declare global {
  namespace App {
    interface Locals {
      user: User | null
      session: Session | null
    }
    interface PageData {
      user: User | null
    }
  }
}
```

---

### Pattern 2: Route Group Guard (layout.server.ts)

**What:** A `+layout.server.ts` inside the `(app)/` route group throws a redirect if no session exists. This protects every route in the group without per-route boilerplate.

**When to use:** All authenticated routes. Do NOT put authorization logic (role checks) here — only authentication (logged-in check). Role checks belong in individual `+page.server.ts` load/action handlers.

**Trade-offs:** The `+layout.server.ts` guard is correct for authentication because `event.locals` is populated in `hooks.server.ts` before any load function runs. Authorization checks vary per route and cannot be centralized in the layout.

**Example:**
```typescript
// packages/front/src/routes/(app)/+layout.server.ts
import { redirect } from '@sveltejs/kit'
import type { LayoutServerLoad } from './$types'

export const load: LayoutServerLoad = async ({ locals }) => {
  if (!locals.user) throw redirect(303, '/login')
  return { user: locals.user }
}
```

---

### Pattern 3: Form Actions as the Primary Mutation Pattern

**What:** All state-changing operations (create event, register player, enter result) use SvelteKit form actions in `+page.server.ts`. The `<form>` element + `use:enhance` gives progressive enhancement for free.

**When to use:** All mutations. Use `+server.ts` (API routes) only for the SSE stream and any AJAX-only operations that don't have a page equivalent.

**Trade-offs:** Form actions require a page file (`+page.svelte`) to colocate with. The SSE stream and any mobile/third-party API exposure need `+server.ts` instead. For this project's scope, form actions cover all mutations.

**Example (tournament creation — wiring existing wizard to persistence):**
```typescript
// packages/front/src/routes/(app)/tournaments/new/+page.server.ts
import type { Actions, PageServerLoad } from './$types'
import { fail, redirect } from '@sveltejs/kit'
import { createEvent } from '$lib/server/db/events'
import { getOrganizationsByUser } from '$lib/server/db/hierarchy'

export const load: PageServerLoad = async ({ locals }) => {
  const orgs = await getOrganizationsByUser(locals.user!.id)
  return { organizations: orgs }
}

export const actions: Actions = {
  create: async ({ request, locals }) => {
    const data = await request.formData()
    // parse wizard JSON payload sent as hidden field
    const payload = JSON.parse(data.get('payload') as string)

    try {
      const event = await createEvent(payload, locals.user!.id)
      throw redirect(303, `/events/${event.id}`)
    } catch (e) {
      return fail(422, { error: 'Erreur lors de la création' })
    }
  }
}
```

---

### Pattern 4: Database Query Functions (Raw SQL Wrappers)

**What:** Each domain module in `$lib/server/db/` exports named async functions that wrap tagged-template SQL calls. No repository class, no ORM abstraction — just functions.

**When to use:** All database access. Import from the relevant domain file.

**Trade-offs:** Simple and explicit. No query builder means SQL errors surface at runtime not compile-time. Mitigated by TypeScript return types and integration tests.

**Example:**
```typescript
// packages/front/src/lib/server/db/events.ts
import { sql } from '@darts-management/db'

export type EventRow = {
  id: string
  name: string
  entity_id: string
  start_date: string
  status: 'draft' | 'open' | 'live' | 'closed'
}

export async function getEvent(id: string): Promise<EventRow | null> {
  const rows = await sql<EventRow[]>`
    SELECT id, name, entity_id, start_date, status
    FROM event
    WHERE id = ${id}
  `
  return rows[0] ?? null
}

// Transactions use sql.begin()
export async function createEventWithTournaments(
  payload: CreateEventPayload,
  userId: string
): Promise<string> {
  return sql.begin(async (tx) => {
    const [event] = await tx<{ id: string }[]>`
      INSERT INTO event (name, entity_id, start_date, location, status, created_by)
      VALUES (${payload.name}, ${payload.entityId}, ${payload.startDate},
              ${payload.location}, 'draft', ${userId})
      RETURNING id
    `
    for (const tournament of payload.tournaments) {
      await tx`INSERT INTO tournament ...`
      for (const phase of tournament.phases) {
        await tx`INSERT INTO phase ...`
      }
    }
    return event.id
  })
}
```

---

### Pattern 5: Match Generation — Pure Functions, Single Transaction

**What:** Match generation algorithms are pure TypeScript functions that receive a phase configuration and a list of teams, and return arrays of match records (without IDs — IDs are generated by the DB). The launch action runs all generation in-memory, then inserts everything in a single SQL transaction.

**When to use:** The `launch` action only. Never called incrementally.

**Trade-offs:** Generating all matches upfront means the DB transaction for launch can be large (e.g., 200+ match inserts for a multi-tournament event). Postgres handles this fine with a single `sql.begin()`. The benefit is a complete picture of the day from the start.

**Critical design:** Use `advances_to_match_id` foreign keys to encode the bracket graph at generation time. When a result is entered, the system looks up `advances_to_match_id` and `advances_to_slot` to know which match to update. This avoids any runtime bracket-traversal logic.

**Example (Berger algorithm skeleton):**
```typescript
// packages/front/src/lib/server/generation/berger.ts

type MatchRecord = {
  round_number: number
  match_number: number
  group_number: number | null
  team_a_id: string | null  // null = TBD (bye)
  team_b_id: string | null
}

export function generateRoundRobin(
  teams: string[],      // team UUIDs
  groupSize: number     // players per group
): MatchRecord[][] {
  // Classic Berger rotation: fix last player, rotate others
  // Returns rounds × matches — caller assigns group_number
  const n = teams.length % 2 === 0 ? teams.length : teams.length + 1
  const rounds: MatchRecord[][] = []
  const list = [...teams]
  if (list.length % 2 !== 0) list.push('BYE')

  for (let r = 0; r < list.length - 1; r++) {
    const round: MatchRecord[] = []
    for (let m = 0; m < list.length / 2; m++) {
      round.push({
        round_number: r + 1,
        match_number: m + 1,
        group_number: null,
        team_a_id: list[m] === 'BYE' ? null : list[m],
        team_b_id: list[list.length - 1 - m] === 'BYE' ? null : list[list.length - 1 - m],
      })
    }
    rounds.push(round)
    // Berger rotation: fix first, rotate rest
    list.splice(1, 0, list.pop()!)
  }
  return rounds
}
```

---

### Pattern 6: Result Entry → Automatic Phase Advancement

**What:** When a result is entered, the action: (1) validates the result, (2) marks the match `completed`, (3) looks up `advances_to_match_id` and `advances_to_slot`, (4) updates the target match's `team_a_id` or `team_b_id` with the winner. All in one transaction.

**When to use:** `enterResult` form action.

**Trade-offs:** No complex graph traversal needed — the `advances_to_match_id` graph was pre-computed at launch. The action is a simple 3-query transaction. Phase completion detection (all matches done → unlock next phase) is a SQL COUNT check.

**Example:**
```typescript
// packages/front/src/routes/(app)/events/[id]/matches/[matchId]/+page.server.ts
export const actions: Actions = {
  enterResult: async ({ params, request, locals }) => {
    await assertRole(locals.user, 'tournament_admin', params.id)
    const { legsA, legsB } = parseResultForm(await request.formData())

    await sql.begin(async (tx) => {
      // 1. Update match result
      await tx`
        UPDATE match SET legs_a=${legsA}, legs_b=${legsB}, status='completed',
               completed_at=now()
        WHERE id=${params.matchId}
      `
      // 2. Advance winner to next match if bracket link exists
      const [match] = await tx<Match[]>`
        SELECT winner_id, advances_to_match_id, advances_to_slot
        FROM match_winner_view
        WHERE id=${params.matchId}
      `
      if (match.advances_to_match_id) {
        const col = match.advances_to_slot === 'a' ? 'team_a_id' : 'team_b_id'
        await tx`
          UPDATE match SET ${tx(col)}=${match.winner_id}
          WHERE id=${match.advances_to_match_id}
        `
      }
    })
  }
}
```

---

### Pattern 7: Federal Hierarchy — Scoped Authorization

**What:** Every user has a role relative to an entity in the hierarchy. A user can be `organizer` of a Comité and `player` globally. Roles are stored in `user_role(user_id, entity_type, entity_id, role)`. Authorization checks join against this table.

**When to use:** All operations that write to events, registrations, or results. A utility function `assertRole(user, role, entityId?)` centralizes the check.

**Trade-offs:** Simple flat role table is flexible but requires a join on every privileged action. For this project scale (dozens of users per event), not a concern.

**Example schema:**
```sql
CREATE TABLE entity (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type        TEXT NOT NULL CHECK (type IN ('federation','league','committee','club')),
  name        TEXT NOT NULL,
  parent_id   UUID REFERENCES entity(id)  -- NULL for federation root
);

CREATE TABLE user_role (
  user_id     UUID NOT NULL REFERENCES "user"(id),
  entity_id   UUID REFERENCES entity(id),  -- NULL = global role (e.g. player)
  role        TEXT NOT NULL CHECK (role IN ('federation_admin','league_admin',
              'committee_admin','club_organizer','tournament_admin','player')),
  PRIMARY KEY (user_id, COALESCE(entity_id, '00000000-0000-0000-0000-000000000000'::uuid), role)
);
```

---

## Complete Data Model

### Better Auth Tables (generated by CLI, do not hand-write)

```
user (id, name, email, email_verified, image, created_at, updated_at)
session (id, user_id, expires_at, token, ip_address, user_agent)
account (id, user_id, provider_id, provider_type, access_token, ...)
verification (id, identifier, value, expires_at)
```

### Federation Hierarchy

```sql
CREATE TABLE entity (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type        TEXT NOT NULL CHECK (type IN ('federation','league','committee','club')),
  name        TEXT NOT NULL,
  parent_id   UUID REFERENCES entity(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE user_role (
  user_id     UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  entity_id   UUID REFERENCES entity(id) ON DELETE CASCADE,
  role        TEXT NOT NULL CHECK (role IN (
    'federation_admin','league_admin','committee_admin',
    'club_organizer','tournament_admin','player'
  )),
  granted_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, COALESCE(entity_id::text,''), role)
);
```

### Tournament Domain

```sql
CREATE TABLE event (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  entity_id   UUID NOT NULL REFERENCES entity(id),
  start_date  DATE NOT NULL,
  end_date    DATE,
  location    TEXT,
  status      TEXT NOT NULL DEFAULT 'draft'
              CHECK (status IN ('draft','open','live','closed')),
  created_by  UUID NOT NULL REFERENCES "user"(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE tournament (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    UUID NOT NULL REFERENCES event(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  category    TEXT NOT NULL,
  quota       INTEGER NOT NULL,
  start_time  TIME,
  status      TEXT NOT NULL DEFAULT 'pending'
              CHECK (status IN ('pending','live','closed')),
  sort_order  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE phase (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id   UUID NOT NULL REFERENCES tournament(id) ON DELETE CASCADE,
  type            TEXT NOT NULL CHECK (type IN (
                    'round_robin','double_loss_groups','single_elim','double_elim'
                  )),
  sort_order      INTEGER NOT NULL,
  entrants        INTEGER NOT NULL,
  qualifiers      INTEGER,
  players_per_group INTEGER,
  sets_to_win     INTEGER NOT NULL DEFAULT 1,
  legs_per_set    INTEGER NOT NULL DEFAULT 3,
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','active','closed'))
);

CREATE TABLE team (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phase_id  UUID NOT NULL REFERENCES phase(id) ON DELETE CASCADE,
  seed      INTEGER
  -- For doubles: two registrations; for singles: one registration
  -- join table: team_member(team_id, registration_id, position)
);

CREATE TABLE team_member (
  team_id         UUID NOT NULL REFERENCES team(id) ON DELETE CASCADE,
  registration_id UUID NOT NULL REFERENCES registration(id) ON DELETE CASCADE,
  position        INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (team_id, registration_id)
);

CREATE TABLE registration (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    UUID NOT NULL REFERENCES event(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES "user"(id),
  -- For manual entry of unlicensed players:
  guest_name  TEXT,
  club_id     UUID REFERENCES entity(id),
  checked_in  BOOLEAN NOT NULL DEFAULT false,
  checked_in_at TIMESTAMPTZ,
  registered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT registration_identity CHECK (
    (user_id IS NOT NULL) OR (guest_name IS NOT NULL)
  )
);

CREATE TABLE match (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phase_id             UUID NOT NULL REFERENCES phase(id),
  round_number         INTEGER NOT NULL,
  match_number         INTEGER NOT NULL,
  group_number         INTEGER,           -- NULL for elimination phases
  team_a_id            UUID REFERENCES team(id),   -- NULL = TBD
  team_b_id            UUID REFERENCES team(id),   -- NULL = TBD
  referee_id           UUID REFERENCES registration(id),
  sets_a               INTEGER,
  sets_b               INTEGER,
  legs_detail          JSONB,             -- [{set:1, legs_a:3, legs_b:1}, ...]
  status               TEXT NOT NULL DEFAULT 'pending'
                       CHECK (status IN ('pending','in_progress','completed','bye')),
  advances_to_match_id UUID REFERENCES match(id),  -- bracket linkage
  advances_to_slot     TEXT CHECK (advances_to_slot IN ('a','b')),
  table_number         INTEGER,           -- physical table assignment (future)
  scheduled_at         TIMESTAMPTZ,       -- future schedule optimization
  completed_at         TIMESTAMPTZ
);
```

**Key constraint:** The "always team, even in singles" principle (from STACK.md) is implemented via the `team` + `team_member` join table. Single-player tournaments have teams of 1 member.

---

## Data Flows

### Flow 1: Tournament Creation (Wizard → Persistence)

```
User fills wizard (existing UI)
    ↓
publish() in +page.svelte
    ↓  (hidden form field: JSON payload of {event, tournaments})
POST /tournaments/new?/create (form action)
    ↓
+page.server.ts: action:create
    ↓  parse FormData, validate
$lib/server/db/events.ts: createEventWithTournaments()
    ↓  sql.begin() — insert event + N tournaments + M phases
PostgreSQL — returns event.id
    ↓
redirect(303, /events/{id})
```

**Wizard adaptation:** The existing `publish()` function (currently `console.log`) is replaced with a `<form method="POST" action="?/create">` submission. The wizard state (EventData + Tournament[]) is serialized to a hidden `<input name="payload">` field. No wizard component needs to change structurally.

### Flow 2: Tournament Launch (Configuration → Match Generation)

```
Organizer clicks "Lancer le tournoi"
    ↓
POST /events/[id]/launch?/launch (form action)
    ↓
+page.server.ts: action:launch
    ↓  assertRole(user, 'tournament_admin', eventId)
    ↓  load all registrations for event
    ↓  load all tournaments + phases
$lib/server/generation/index.ts: generateMatches(phases, registrations)
    ↓  pure TS — returns MatchRecord[][] (in-memory, no DB yet)
    ↓  assign referee (find available registered player not in match)
$lib/server/db/matches.ts: insertAllMatches(records)
    ↓  sql.begin() — bulk insert teams + team_members + matches
    ↓  update event.status = 'live', all phase.status = 'active'/'pending'
PostgreSQL
    ↓
redirect(303, /events/[id]/dashboard)
```

### Flow 3: Result Entry → Phase Advancement

```
Admin enters result on match page
    ↓
POST /events/[id]/matches/[matchId]?/enterResult
    ↓
+page.server.ts: action:enterResult
    ↓  assertRole(user, 'tournament_admin', eventId)
    ↓  parse legs scores
sql.begin():
    ↓  UPDATE match SET sets_a, sets_b, status='completed', completed_at
    ↓  SELECT advances_to_match_id, advances_to_slot, winner_team_id (via view)
    ↓  if advances_to_match_id: UPDATE match SET team_a/b_id = winner
    ↓  check: all matches in phase completed?
    ↓    YES → UPDATE phase.status = 'closed', next phase.status = 'active'
PostgreSQL
    ↓
invalidate() → load() refetches updated standings/match list
```

### Flow 4: Day Dashboard

```
Admin opens /events/[id]/dashboard
    ↓
+page.server.ts: load()
    ↓  SELECT all matches for event, JOIN phase, tournament
    ↓  GROUP by tournament + round
PostgreSQL — returns denormalized match rows with participant names
    ↓
+page.svelte: renders match grid by tournament column, round row
Status polling: page auto-refresh OR manual reload (v1.0)
    (SSE in v1.1: EventSource → /api/events/[id]/sse)
```

### Flow 5: Player Registration + Check-in

```
Organizer opens /events/[id]/registrations
    ↓
+page.server.ts: load()
    ↓  SELECT registrations for event, LEFT JOIN user (name, club)
PostgreSQL

action:register (add player manually)
    ↓  INSERT registration (user_id OR guest_name + club)
    ↓  check quota not exceeded

action:checkin
    ↓  UPDATE registration SET checked_in=true, checked_in_at=now()
    ↓  WHERE id=registrationId
```

---

## Integration Points

### Better Auth ↔ SvelteKit

| Point | How | Notes |
|-------|-----|-------|
| Auth routes | `svelteKitHandler` in `hooks.server.ts` intercepts `/api/auth/*` | Must be first in `sequence()` |
| Session data | `auth.api.getSession()` in second handle → `event.locals` | Not automatic — explicit population required |
| Route protection | `(app)/+layout.server.ts` redirects if `locals.user === null` | Auth-check only, not role-check |
| Role checks | `assertRole()` utility in each action/load that needs it | Custom function querying `user_role` table |
| Client session | `createAuthClient()` from `better-auth/client` | For login/logout forms in `(auth)/` pages |

### packages/db ↔ packages/front

| Point | How | Notes |
|-------|-----|-------|
| SQL access | `import { sql } from '@darts-management/db'` | Server files only (`*.server.ts`, `$lib/server/`) |
| Migrations | `pnpm --filter @darts-management/db db:migrate:dev` | Better Auth migration added to Prisma migrations |
| Transactions | `sql.begin(async tx => { ... })` | `postgres` v3 API — already in the project |

### Existing Wizard ↔ Server Route

| Point | How | Notes |
|-------|-----|-------|
| `publish()` function | Replaced: form submission instead of `console.log` | +page.svelte wraps wizard in `<form>`, hidden field carries JSON state |
| Entity list (EventStep) | Load function provides real entities from DB | Replaces hard-coded `['Mon Comité', 'Ma Ligue', 'FFD']` |
| `genId()` in utils.ts | Stays for client-side wizard UX | Server assigns real UUIDs on DB insert — client IDs are transient |

---

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 1-10 events/year | Current monolith is correct — no changes needed |
| 50+ concurrent users on launch day | `sql.begin()` for bulk match insert is the bottleneck — consider chunking inserts (still one transaction) |
| Real-time standings for spectators | Add SSE endpoint (already designed for v1.1); PostgreSQL `LISTEN/NOTIFY` via `sql.listen()` (postgres v3 supports this) |
| Multi-region or high availability | Out of scope for this project; SvelteKit node adapter on a single server is the target |

### Scaling Priorities

1. **First bottleneck:** Launch transaction — large bulk insert of 200+ matches. Mitigated by using `sql.begin()` with array input (`sql(matchRecords, 'phase_id', 'round_number', ...)` for multi-row insert in one statement).
2. **Second bottleneck:** Dashboard page load — many matches joined across tables. Mitigated by a dashboard-specific SQL query with explicit column selection (no `SELECT *`) and appropriate indexes on `match(phase_id, status)`.

---

## Anti-Patterns

### Anti-Pattern 1: Authorization in Layout

**What people do:** Put role checks in `+layout.server.ts` to "protect" all child routes.

**Why it's wrong:** SvelteKit load functions run in parallel. A `redirect` from the layout's `load()` does not prevent child `load()` or form `actions` from executing. It only controls rendering.

**Do this instead:** Use `+layout.server.ts` only for the authentication check (`locals.user === null → redirect`). Put role-specific authorization in each `+page.server.ts` action or load.

---

### Anti-Pattern 2: Importing Server Code from Client Components

**What people do:** Import `$lib/server/db/events.ts` from a `.svelte` component or a non-server `.ts` file.

**Why it's wrong:** SvelteKit's Vite plugin will fail with a build error if server-only modules (those importing `postgres`) are bundled for the browser. The `$lib/server/` convention prevents this, but only if the import boundary is respected.

**Do this instead:** All database calls live in `*.server.ts` files or `$lib/server/*.ts`. Data flows to components only via `load()` return values and `form` action responses.

---

### Anti-Pattern 3: Generating Matches Incrementally at Result Time

**What people do:** Only generate the next elimination round's matches after the previous round completes (lazy generation).

**Why it's wrong:** The dashboard ("tableau de bord de la journée") requires knowing all matches upfront to display a complete view. Lazy generation also complicates time-slot assignment if that feature is added later.

**Do this instead:** Generate all matches at launch (including empty bracket slots with `team_a_id = NULL`). Populate bracket slots as results come in via `advances_to_match_id`.

---

### Anti-Pattern 4: Using Better Auth's `user.role` Field for Custom Roles

**What people do:** Use the `user.role` string field from Better Auth's `admin` plugin to store the application's organizational roles.

**Why it's wrong:** Better Auth's `user.role` is a single-value field intended for platform-wide admin flags. This project needs per-entity roles (a user can be admin of one committee and organizer of another).

**Do this instead:** Maintain a separate `user_role(user_id, entity_id, role)` table. Use Better Auth only for authentication (session, login, register). Use `user_role` for all authorization decisions.

---

### Anti-Pattern 5: Raw FormData Parsing Without Validation

**What people do:** Directly use `formData.get('name')` values from form actions without parsing or validating.

**Why it's wrong:** Form actions receive untyped strings. Invalid input causes silent failures or SQL errors at runtime.

**Do this instead:** Parse and validate in the action before touching the DB. Zod is already available at the root — use it for action input validation. Return `fail(422, { errors })` on invalid input so the form can display field-level errors.

---

## Build Order for Phases

Based on dependencies, the correct implementation sequence is:

1. **DB Schema first** — All other work depends on the schema being in place. Better Auth migration + hierarchy + tournament domain tables must exist before any server code is written.

2. **Auth (Better Auth) second** — `hooks.server.ts`, `app.d.ts`, `$lib/server/auth.ts`, login/register pages. Auth must be in place before any route protection is added.

3. **Federal hierarchy third** — Entity CRUD + user_role assignment. EventStep's entity dropdown needs real data; the launch action needs org membership to validate permissions.

4. **Tournament persistence fourth** — Wire wizard publish() to real form action + DB insert. This is the direct continuation of the existing wizard prototype.

5. **Registration + check-in fifth** — Depends on events existing in DB. No dependency on match generation.

6. **Match generation + launch sixth** — Depends on registrations existing. The pure generation functions can be developed in parallel with registration (they only need team lists as input).

7. **Result entry + phase advancement seventh** — Depends on matches existing in DB.

8. **Standings + dashboard eighth** — Read-only views on existing data. Can be built as matches are entered.

9. **SSE (v1.1)** — Deferred. Drop-in enhancement: add `+server.ts` SSE endpoint, replace manual refresh with `EventSource` in client.

---

## Sources

- [Better Auth SvelteKit Integration](https://www.better-auth.com/docs/integrations/svelte-kit) — MEDIUM confidence (WebSearch verified, official docs)
- [SvelteKit Form Actions](https://svelte.dev/docs/kit/form-actions) — HIGH confidence (official SvelteKit docs)
- [SvelteKit Routing](https://svelte.dev/docs/kit/routing) — HIGH confidence (official SvelteKit docs)
- [Protected Routes in SvelteKit (Don't Use +layout.server.ts)](https://gebna.gg/blog/protected-routes-svelte-kit) — MEDIUM confidence (community, verified against SvelteKit docs behavior)
- [PostgreSQL LISTEN/NOTIFY with SvelteKit SSE](https://gornostay25.dev/post/postgresql-listen-notify-sveltekit) — MEDIUM confidence (community article, pattern matches postgres v3 API)
- [postgres.js transaction API](https://github.com/porsager/postgres) — HIGH confidence (library used in packages/db already)
- Existing codebase analysis — HIGH confidence (direct code read)

---

*Architecture research for: Darts management tournament platform — subsequent milestone integration*
*Researched: 2026-02-28*
