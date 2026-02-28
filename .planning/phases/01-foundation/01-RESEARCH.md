# Phase 1: Foundation - Research

**Researched:** 2026-02-28
**Domain:** Authentication (Better Auth), PostgreSQL raw SQL, Entity hierarchy, SvelteKit shell
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Auth flow:**
- Pas de confirmation d'email obligatoire — connexion immédiate après inscription
- Après connexion réussie : redirect vers le dashboard (page d'accueil)
- Reset mot de passe : flow standard 3 étapes (saisie email → lien par email → nouveau mot de passe)
- Shell complet avec navbar dès Phase 1 (layout global partagé entre toutes les pages auth et app)

**Role assignment:**
- À l'inscription, tout le monde est "joueur" par défaut — aucun choix de rôle à l'inscription
- Multi-rôles possible : un utilisateur peut être joueur ET organisateur simultanément
- Attribution des rôles supérieurs : chaque niveau hiérarchique assigne pour son périmètre (admin ligue assigne dans sa ligue, admin comité dans son comité, admin fédéral partout)
- L'admin fédéral est un rôle normal assigné manuellement en DB lors du bootstrap initial

**Entity management UI:**
- Section dédiée "Administration" dans la navbar (accessible aux admins)
- Navigation via liste plate filtrée par type d'entité + parent sélectionnable (pas de tree view, pas de drill-down)
- Formulaire de création d'entité minimal : nom + parent uniquement (Phase 1)
- Chaque niveau peut créer et gérer ses entités enfants directes (admin ligue → Comités, admin comité → Clubs)

**Bootstrap / premier lancement:**
- Premier admin fédéral : seed SQL à exécuter manuellement (script de bootstrap)
- DB vide : l'app affiche la page d'accueil normalement (pas de mode "en configuration")
- Migrations DB : `pnpm db:migrate` à lancer manuellement avant le premier démarrage (pas d'auto-migration)
- Seed de dev complet : données fictives (fédération, ligues, comités, clubs, users de test) pour le développement

### Claude's Discretion
- Design exact de la navbar et du layout shell
- Gestion des erreurs de formulaire (messages, positions)
- Détail du schéma SQL (noms de colonnes, index, contraintes exactes)
- Comportement exact du filtre de liste des entités (UI du sélecteur parent)

### Deferred Ideas (OUT OF SCOPE)
Aucune — la discussion est restée dans le périmètre de Phase 1.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AUTH-01 | L'utilisateur peut s'inscrire avec email/mot de passe | Better Auth emailAndPassword plugin, hooks.server.ts pattern, sveltekitCookies plugin for form actions |
| AUTH-02 | L'utilisateur peut se connecter et sa session persiste entre les rechargements | Better Auth session management, event.locals population, +layout.server.ts session forwarding |
| AUTH-03 | L'utilisateur peut réinitialiser son mot de passe via email | Better Auth sendResetPassword callback, nodemailer SMTP integration, 3-step flow pattern |
| AUTH-04 | Le système distingue 4 rôles : joueur, admin tournoi, organisateur (entité), admin fédéral | Better Auth admin plugin with custom access control (ac), multi-role storage as comma-separated string |
| ORG-01 | Un admin fédéral peut créer et gérer les entités (Fédération, Ligues, Comités, Clubs) | Raw SQL schema for entity table, SvelteKit server actions with authorization checks |
| ORG-02 | Les entités sont hiérarchisées (Ligue → Fédération, Comité → Ligue, Club → Comité) | Self-referencing `parent_id` FK pattern in entity table, adjacency list model |
| ORG-03 | Un organisateur peut créer des événements au nom de son entité | Entity selector query (flat list filtered by type), scoped authorization check |
</phase_requirements>

## Summary

Phase 1 establishes authentication, roles, and the federal entity hierarchy on top of the existing SvelteKit + PostgreSQL monorepo. The project has already chosen Better Auth v1.4.x as the auth library (Lucia v3 deprecated March 2025) and raw SQL via the `postgres` npm package (no ORM) for all application queries. The key technical discovery is that Better Auth does NOT natively support `postgres.js` — it uses Kysely under the hood which requires `pg` (node-postgres). However, the `kysely-postgres-js` dialect package resolves this by allowing Better Auth to share the same `postgres.js` connection used elsewhere, avoiding a dual-driver setup.

The database migration strategy requires clarification: the `packages/db/package.json` already declares `prisma migrate deploy` as `db:migrate`, but the schema.prisma file is nearly empty (no models). For Phase 1, the approach is to define raw SQL migration files and use `prisma migrate` as the migration runner, OR switch to `node-pg-migrate` which runs plain SQL files. Given the existing Prisma devDependency (already installed), using `prisma migrate dev` with raw SQL placed in migration files is the lowest-friction path.

The role system uses Better Auth's admin plugin with a custom access control definition covering the four project roles (joueur, organisateur, admin_tournoi, admin_federal). Multi-role storage is supported natively — roles are stored comma-separated. The entity hierarchy uses a simple adjacency list (self-referencing `parent_id`) which is sufficient for 4 levels (Federation → Ligue → Comite → Club).

**Primary recommendation:** Use `kysely-postgres-js` to give Better Auth access to the existing `postgres.js` connection, define custom roles via the admin plugin with `createAccessControl`, use raw SQL migrations managed via `node-pg-migrate` (cleaner than Prisma for a no-ORM project), and structure the SvelteKit app with route groups `(auth)` and `(app)` sharing a common shell layout.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| better-auth | ^1.4.x | Auth: session, email/password, password reset | Replaces deprecated Lucia v3; native SvelteKit support |
| kysely-postgres-js | latest | Bridge: lets Better Auth use postgres.js | Avoids dual DB driver; postgres.js already in project |
| postgres (existing) | ^3.4.5 | Raw SQL for all app queries | Project standard — already in packages/db |
| nodemailer | ^6.x | SMTP email for password reset | Standard Node.js email; no vendor lock-in |
| node-pg-migrate | ^7.x | Raw SQL migration runner | Purpose-built for PostgreSQL raw SQL; no ORM overhead |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| flowbite-svelte | ^1.31.0 | UI components (Navbar, Forms, Buttons) | Already installed; use for shell navbar |
| @types/nodemailer | latest | TypeScript types for nodemailer | Dev dependency alongside nodemailer |
| zod | 4.x (root) | Form validation schemas | Already at root; use for auth form validation |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| kysely-postgres-js | Add `pg` package separately | Dual DB drivers — two connections to same DB, wasteful |
| node-pg-migrate | Keep prisma migrate | Prisma migrate works but brings ORM expectations; confusing alongside raw SQL |
| nodemailer | resend/postmark SDK | Vendor dependency; nodemailer works with any SMTP including local maildev |

**Installation (packages/db and packages/front):**
```bash
# In packages/db — add Better Auth and its bridge
pnpm add better-auth kysely-postgres-js

# In packages/front — add Better Auth client and email
pnpm add better-auth nodemailer
pnpm add -D @types/nodemailer

# In packages/db — add migration runner
pnpm add -D node-pg-migrate
```

## Architecture Patterns

### Recommended Project Structure

```
packages/
  db/
    src/
      client.ts          # postgres() connection (existing)
      auth.ts            # Better Auth server instance (new)
      schema/
        001_auth.sql     # Better Auth tables migration
        002_entities.sql # entity + role_assignment tables
        003_seed_dev.sql # dev seed data
      index.ts           # exports sql, auth
    package.json         # scripts: db:migrate, db:migrate:dev

packages/front/src/
  hooks.server.ts        # svelteKitHandler + session population in locals
  app.d.ts               # App.Locals typing: user, session
  lib/
    server/
      auth.ts            # re-export of auth from packages/db (server-only)
    auth-client.ts       # createAuthClient (browser)
    auth/
      permissions.ts     # createAccessControl, role definitions
  routes/
    (auth)/              # Route group: login, register, reset-password
      +layout.svelte     # Minimal layout (no navbar)
      login/+page.svelte
      register/+page.svelte
      reset-password/+page.svelte
      reset-password/new/+page.svelte
    (app)/               # Route group: all authenticated pages
      +layout.svelte     # Shell with Navbar
      +layout.server.ts  # Load session, redirect if unauthenticated
      +page.svelte        # Dashboard
      admin/             # Entity management (admin-only)
        +page.svelte
        +page.server.ts
```

### Pattern 1: Better Auth Server Setup with postgres.js

**What:** Configure Better Auth to use the existing postgres.js connection via kysely-postgres-js dialect. Keep auth instance in packages/db so it can be imported by any future package.

**When to use:** Always — this is the single auth server instance.

```typescript
// packages/db/src/auth.ts
// Source: https://www.better-auth.com/docs/adapters/other-relational-databases
import { betterAuth } from "better-auth"
import { admin as adminPlugin } from "better-auth/plugins"
import { sveltekitCookies } from "better-auth/svelte-kit"
import { getRequestEvent } from "$app/server"
import { PostgresJSDialect } from "kysely-postgres-js"
import { sql } from "./client.js"
import { ac, joueur, organisateur, adminTournoi, adminFederal } from "./permissions.js"

export const auth = betterAuth({
  database: {
    dialect: new PostgresJSDialect({ postgres: sql }),
    type: "postgresql",
    // NOTE: casing: "snake" has a known bug with postgres.js dialect.
    // Use explicit field mappings instead (see Pitfall #3).
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // locked decision: immediate login
    sendResetPassword: async ({ user, url }, _request) => {
      // void — do not await (prevents timing attacks)
      void sendResetPasswordEmail(user.email, url)
    },
  },
  plugins: [
    adminPlugin({
      ac,
      roles: { joueur, organisateur, adminTournoi, adminFederal },
      defaultRole: "joueur",
      adminRoles: ["admin_federal"],
    }),
    sveltekitCookies(getRequestEvent),
  ],
})
```

### Pattern 2: hooks.server.ts — Session Population

**What:** Mount Better Auth handler AND manually populate event.locals (svelteKitHandler does NOT auto-populate locals).

**When to use:** Always — this is required for session access in load functions.

```typescript
// packages/front/src/hooks.server.ts
// Source: https://www.better-auth.com/docs/integrations/svelte-kit
import { auth } from "$lib/server/auth"
import { svelteKitHandler } from "better-auth/svelte-kit"
import { building } from "$app/environment"
import { redirect } from "@sveltejs/kit"
import type { Handle } from "@sveltejs/kit"

const authHandle: Handle = async ({ event, resolve }) => {
  const session = await auth.api.getSession({
    headers: event.request.headers,
  })
  event.locals.session = session?.session ?? null
  event.locals.user = session?.user ?? null
  return resolve(event)
}

export const handle: Handle = ({ event, resolve }) =>
  svelteKitHandler({ event, resolve, auth, building })

// Compose with sequence() if you add more handles later
```

### Pattern 3: Role Definitions with Access Control

**What:** Define the four project roles using Better Auth's admin plugin access control system. Multi-role is stored comma-separated automatically.

```typescript
// packages/db/src/permissions.ts
// Source: https://www.better-auth.com/docs/plugins/admin
import { createAccessControl } from "better-auth/plugins/access"
import { defaultStatements, adminAc } from "better-auth/plugins/admin/access"

const statement = {
  ...defaultStatements,
  entity: ["create", "update", "delete", "read"],
  event: ["create", "update", "delete", "read"],
  tournament: ["create", "update", "delete", "manage"],
  user_role: ["assign"],
} as const

export const ac = createAccessControl(statement)

export const joueur = ac.newRole({
  event: ["read"],
  entity: ["read"],
})

export const organisateur = ac.newRole({
  event: ["create", "update", "read"],
  entity: ["read"],
  tournament: ["create", "update", "manage"],
})

export const adminTournoi = ac.newRole({
  ...organisateur.statements,
  tournament: ["create", "update", "delete", "manage"],
})

export const adminFederal = ac.newRole({
  ...adminAc.statements,
  entity: ["create", "update", "delete", "read"],
  event: ["create", "update", "delete", "read"],
  tournament: ["create", "update", "delete", "manage"],
  user_role: ["assign"],
})
```

### Pattern 4: Entity Table Schema (Adjacency List)

**What:** Single `entity` table with self-referencing `parent_id` for the 4-level hierarchy. No recursive CTEs needed for Phase 1 (flat list queries sufficient).

```sql
-- packages/db/src/schema/002_entities.sql
CREATE TYPE entity_type AS ENUM ('federation', 'ligue', 'comite', 'club');

CREATE TABLE entity (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  type        entity_type NOT NULL,
  parent_id   UUID REFERENCES entity(id) ON DELETE RESTRICT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT entity_federation_no_parent CHECK (
    (type = 'federation' AND parent_id IS NULL) OR
    (type != 'federation' AND parent_id IS NOT NULL)
  )
);

CREATE INDEX entity_parent_idx ON entity(parent_id);
CREATE INDEX entity_type_idx ON entity(type);
```

### Pattern 5: Authorization Check Pattern

**What:** Two-layer auth check — authentication in hooks.server.ts, authorization in each server action/load.

```typescript
// In a +page.server.ts (admin page example)
import { auth } from "$lib/server/auth"
import { error, redirect } from "@sveltejs/kit"
import type { PageServerLoad, Actions } from "./$types"

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user) redirect(302, "/login")

  const canManage = await auth.api.userHasPermission({
    body: {
      userId: locals.user.id,
      permissions: { entity: ["create"] },
    },
  })
  if (!canManage.success) error(403, "Forbidden")

  // ... load entities
}
```

### Anti-Patterns to Avoid

- **Auth only in +layout.server.ts:** Layout loads run in parallel with leaf routes — a user could bypass protection. Always check auth in `hooks.server.ts` AND re-check authorization in each action.
- **Awaiting email sends in sendResetPassword:** Creates timing attack vectors. Always use `void sendEmail(...)` without await.
- **Using `casing: "snake"` with postgres.js dialect:** Known bug — queries still use camelCase column names, causing runtime errors. Use explicit `fields` mapping instead.
- **Auto-migration at startup:** Locked decision — migrations are manual (`pnpm db:migrate`). Never call migrate in app startup code.
- **Storing roles in a separate role table outside Better Auth:** Better Auth's admin plugin stores roles in the `user.role` column (comma-separated). Adding a second role system creates sync issues. Use Better Auth's `setRole` API for all role mutations.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Session token creation/validation | Custom JWT or cookie logic | Better Auth | Handles token rotation, expiry, secure cookies, CSRF |
| Password hashing | bcrypt calls manually | Better Auth (built-in) | Timing-safe comparison, configurable rounds |
| Password reset token | Custom token + expiry table | Better Auth emailAndPassword | Already has token generation, 1-hour expiry, one-time use |
| Role permission checking | Custom role string parsing | Better Auth admin plugin `userHasPermission` | Type-safe, consistent with role storage format |
| Migration runner | Custom SQL executor script | node-pg-migrate | Handles ordering, checksums, up/down, history table |

**Key insight:** Better Auth handles the entire auth lifecycle including token generation, session management, and password reset — the only custom code needed is calling the email-sending function in the callbacks.

## Common Pitfalls

### Pitfall 1: svelteKitHandler Does NOT Populate event.locals
**What goes wrong:** Code accesses `event.locals.user` and gets `undefined`, even after calling `svelteKitHandler`.
**Why it happens:** Better Auth's SvelteKit handler only mounts the API routes — it deliberately does NOT auto-populate locals (confirmed in GitHub issue #2188).
**How to avoid:** Always call `auth.api.getSession({ headers: event.request.headers })` in `hooks.server.ts` and manually assign `event.locals.user` and `event.locals.session`.
**Warning signs:** `event.locals.user` is `undefined` in load functions despite being logged in.

### Pitfall 2: sveltekitCookies Plugin Required for Server Actions
**What goes wrong:** Calling `auth.api.signInEmail()` or `auth.api.signUpEmail()` in a SvelteKit form action sets cookies, but the browser never receives them — user stays logged out after sign-in.
**Why it happens:** SvelteKit server actions use a different request/response pipeline from the normal fetch — cookies set on the Response object are dropped.
**How to avoid:** Add `sveltekitCookies(getRequestEvent)` as the **last** plugin in the plugins array. Requires SvelteKit >= 2.20.0 (project uses ^2.50.2 — fine).
**Warning signs:** Sign-in action returns 200 but user is not logged in on next page load.

### Pitfall 3: snake_case Column Mismatch with kysely-postgres-js
**What goes wrong:** Better Auth generates camelCase queries (`emailVerified`, `createdAt`) but the database has snake_case columns — runtime SQL errors on login.
**Why it happens:** The `casing: "snake"` option in Better Auth does not propagate correctly to the Kysely adapter when using postgres.js dialect (GitHub issue #4789).
**How to avoid:** Either (a) let Better Auth create camelCase columns and don't fight it, OR (b) use explicit `fields` mapping in the auth config for each model. Option (a) is simpler for Phase 1.
**Warning signs:** SQL errors mentioning column `email_verified` not found, or vice versa.

### Pitfall 4: Route Group Layout Sharing
**What goes wrong:** Navbar appears on login/register pages, or protected app pages don't redirect when unauthenticated.
**Why it happens:** Incorrect layout nesting — auth pages and app pages share the same layout inadvertently.
**How to avoid:** Use SvelteKit route groups: `(auth)/` for public auth pages (no navbar), `(app)/` for authenticated pages with shell navbar. Each group has its own `+layout.svelte`.
**Warning signs:** Login page shows navbar, or accessing `/admin` without session doesn't redirect.

### Pitfall 5: pg vs postgres.js Dual Driver Confusion
**What goes wrong:** Developer installs `pg` package for Better Auth and ends up with two separate connection pools to the same database.
**Why it happens:** Better Auth documentation only shows `pg` examples — developers follow it without checking kysely-postgres-js.
**How to avoid:** Use `kysely-postgres-js` to pass the existing `sql` instance from `packages/db` to Better Auth. No `pg` package needed.
**Warning signs:** `pg` appears in `node_modules` or `package.json` alongside `postgres`.

### Pitfall 6: Admin Plugin defaultRole vs registration default
**What goes wrong:** New users are assigned no role or the wrong role at registration.
**Why it happens:** `defaultRole` in the admin plugin config must be set explicitly. If omitted, Better Auth may assign `"user"` (the admin plugin default), not `"joueur"`.
**How to avoid:** Set `defaultRole: "joueur"` in the admin plugin configuration. Verify by checking the `user.role` column after test registration.
**Warning signs:** `user.role` is `"user"` or `null` after registration instead of `"joueur"`.

## Code Examples

Verified patterns from official sources:

### Better Auth with postgres.js — Complete auth.ts
```typescript
// packages/db/src/auth.ts
// Source: https://www.better-auth.com/docs/adapters/other-relational-databases
//         https://github.com/kysely-org/kysely-postgres-js
import { betterAuth } from "better-auth"
import { admin as adminPlugin } from "better-auth/plugins"
import { sveltekitCookies } from "better-auth/svelte-kit"
import { getRequestEvent } from "$app/server"
import { PostgresJSDialect } from "kysely-postgres-js"
import { createTransport } from "nodemailer"
import { sql } from "./client.js"
import { ac, joueur, organisateur, adminTournoi, adminFederal } from "./permissions.js"

const mailer = createTransport({
  host: process.env["SMTP_HOST"] ?? "localhost",
  port: Number(process.env["SMTP_PORT"] ?? "1025"),
  secure: process.env["SMTP_SECURE"] === "true",
  auth: process.env["SMTP_USER"]
    ? { user: process.env["SMTP_USER"], pass: process.env["SMTP_PASS"] }
    : undefined,
})

export const auth = betterAuth({
  database: {
    dialect: new PostgresJSDialect({ postgres: sql }),
    type: "postgresql",
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    sendResetPassword: async ({ user, url }) => {
      void mailer.sendMail({
        from: process.env["EMAIL_FROM"] ?? "noreply@ffd.fr",
        to: user.email,
        subject: "Réinitialisation de votre mot de passe FFD",
        text: `Cliquez sur ce lien pour réinitialiser votre mot de passe : ${url}`,
        html: `<p>Cliquez sur ce lien pour réinitialiser votre mot de passe : <a href="${url}">${url}</a></p>`,
      })
    },
  },
  plugins: [
    adminPlugin({
      ac,
      roles: { joueur, organisateur, adminTournoi, adminFederal },
      defaultRole: "joueur",
      adminRoles: ["admin_federal"],
    }),
    sveltekitCookies(getRequestEvent), // MUST be last plugin
  ],
})
```

### app.d.ts TypeScript Locals
```typescript
// packages/front/src/app.d.ts
// Source: https://www.better-auth.com/docs/integrations/svelte-kit
import type { auth } from "$lib/server/auth"

type Session = typeof auth.$Infer.Session.session
type User = typeof auth.$Infer.Session.user

declare global {
  namespace App {
    interface Locals {
      user: User | null
      session: Session | null
    }
  }
}

export {}
```

### Entity flat-list query (raw SQL)
```typescript
// In a server load function
import { sql } from "@darts-management/db"

// Get all entities of a given type with their parent name
const entities = await sql`
  SELECT
    e.id,
    e.name,
    e.type,
    e.parent_id,
    p.name AS parent_name
  FROM entity e
  LEFT JOIN entity p ON p.id = e.parent_id
  WHERE e.type = ${entityType}
  ORDER BY p.name NULLS FIRST, e.name
`
```

### Migration runner script (node-pg-migrate)
```json
// packages/db/package.json scripts section
{
  "db:migrate": "node-pg-migrate up --database-url-var DATABASE_URL --migrations-dir src/schema",
  "db:migrate:dev": "node-pg-migrate up --database-url-var DATABASE_URL --migrations-dir src/schema",
  "db:migrate:create": "node-pg-migrate create --migrations-dir src/schema"
}
```

### Session forwarding in layout (to pass session to client)
```typescript
// packages/front/src/routes/(app)/+layout.server.ts
import { redirect } from "@sveltejs/kit"
import type { LayoutServerLoad } from "./$types"

export const load: LayoutServerLoad = async ({ locals }) => {
  if (!locals.user) {
    redirect(302, "/login")
  }
  return {
    user: locals.user,
    session: locals.session,
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Lucia v3 auth | Better Auth v1.x | Lucia v3 deprecated March 2025 | Must use Better Auth; Lucia migration guide exists |
| `pg` (node-postgres) in Better Auth | kysely-postgres-js dialect | 2025 (community solution) | Can share postgres.js connection; no dual driver |
| Prisma migrations for raw SQL | node-pg-migrate | Design choice | Cleaner for no-ORM projects; Prisma still present as devDep |
| Auth.js / NextAuth | Better Auth | 2024-2025 | Better Auth is now the recommended choice for SvelteKit |

**Deprecated/outdated:**
- Lucia v3: Deprecated March 2025, replaced by Better Auth. Do not use.
- Auth.js v4 for SvelteKit: Still maintained but Better Auth is more ergonomic for SvelteKit.

## Open Questions

1. **Migration runner choice: node-pg-migrate vs keep Prisma**
   - What we know: `prisma` is already a devDependency in `packages/db` (for `prisma migrate deploy`). `node-pg-migrate` is purpose-built for raw SQL.
   - What's unclear: Whether replacing `prisma migrate deploy` with `node-pg-migrate` mid-project causes any issue (it shouldn't since schema.prisma has no models).
   - Recommendation: Switch to `node-pg-migrate` — cleaner fit for the no-ORM decision. Update `db:migrate` script.

2. **Better Auth table casing strategy**
   - What we know: `casing: "snake"` has a known bug with postgres.js dialect (issue #4789 still open as of research date). Explicit `fields` mapping works but is verbose.
   - What's unclear: Whether this bug is fixed in the latest Better Auth version at time of implementation.
   - Recommendation: Default to camelCase columns for Better Auth managed tables (user, session, account, verification). All application tables (entity, etc.) use snake_case as per project convention. Keep the two worlds separate.

3. **Email in dev environment**
   - What we know: Password reset requires a working SMTP sender. Nodemailer works with local SMTP servers.
   - What's unclear: Whether dev setup includes a local mail catcher (maildev, mailhog).
   - Recommendation: Use `maildev` (npm package, runs locally on port 1025/web 1080) for dev. Configure `SMTP_HOST=localhost SMTP_PORT=1025` in `.env.local`.

## Sources

### Primary (HIGH confidence)
- https://www.better-auth.com/docs/integrations/svelte-kit — SvelteKit integration, hooks.server.ts pattern, sveltekitCookies plugin
- https://www.better-auth.com/docs/adapters/postgresql — PostgreSQL adapter (pg-based)
- https://www.better-auth.com/docs/authentication/email-password — Email/password plugin config, sendResetPassword signature
- https://www.better-auth.com/docs/plugins/admin — Admin plugin, custom roles, access control, userHasPermission API
- https://www.better-auth.com/docs/concepts/cli — Migration CLI commands (generate/migrate)
- https://github.com/kysely-org/kysely-postgres-js — postgres.js Kysely dialect (production-ready per maintainer notes)

### Secondary (MEDIUM confidence)
- https://github.com/better-auth/better-auth/issues/2188 — Confirmed: svelteKitHandler does NOT auto-populate event.locals (official issue)
- https://github.com/better-auth/better-auth/issues/4789 — Confirmed: snake_case casing bug with postgres.js dialect
- https://github.com/better-auth/better-auth/issues/3291 — Confirmed: postgres.js not natively supported, closed as won't-fix (Kysely limitation)
- https://salsita.github.io/node-pg-migrate/ — node-pg-migrate documentation

### Tertiary (LOW confidence)
- WebSearch result for kysely-postgres-js + better-auth config example — verified against kysely-postgres-js README structure but not against a live codebase

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — verified via official Better Auth docs + GitHub issues for key caveats
- Architecture: HIGH — SvelteKit route groups pattern is documented; entity adjacency list is standard
- Pitfalls: HIGH — all 6 pitfalls verified via official GitHub issues or official docs
- Migration strategy: MEDIUM — node-pg-migrate is well-documented but switching from prisma script is a minor open question

**Research date:** 2026-02-28
**Valid until:** 2026-03-28 (Better Auth evolves quickly; re-check snake_case bug status before implementing)
