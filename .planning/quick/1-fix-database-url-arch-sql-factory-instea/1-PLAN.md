---
phase: quick-1
plan: 1
type: execute
wave: 1
depends_on: []
files_modified:
  - packages/db/src/client.ts
  - packages/db/src/auth.ts
  - packages/db/src/index.ts
  - packages/front/src/lib/server/db.ts
  - packages/front/src/lib/server/auth.ts
  - packages/front/src/routes/(app)/admin/+page.server.ts
  - packages/front/src/routes/(app)/admin/entities/new/+page.server.ts
autonomous: true
requirements: []

must_haves:
  truths:
    - "SvelteKit starts without DATABASE_URL environment variable error at module load time"
    - "Auth and sql instances are created with env vars sourced from $env/static/private"
    - "All packages/front server routes that use sql query the database correctly"
  artifacts:
    - path: "packages/front/src/lib/server/db.ts"
      provides: "sql singleton initialized via $env/static/private"
      exports: ["sql"]
    - path: "packages/front/src/lib/server/auth.ts"
      provides: "auth singleton initialized via db.ts and $env vars"
      exports: ["auth"]
    - path: "packages/db/src/client.ts"
      provides: "createSql factory (no singleton, no process.env read)"
      exports: ["createSql"]
    - path: "packages/db/src/auth.ts"
      provides: "createAuth factory (no singleton, no process.env read)"
      exports: ["createAuth"]
  key_links:
    - from: "packages/front/src/lib/server/db.ts"
      to: "packages/db/src/client.ts"
      via: "createSql(DATABASE_URL)"
      pattern: "createSql"
    - from: "packages/front/src/lib/server/auth.ts"
      to: "packages/db/src/auth.ts"
      via: "createAuth(sql, smtpConfig)"
      pattern: "createAuth"
    - from: "packages/front/src/routes/(app)/admin/+page.server.ts"
      to: "packages/front/src/lib/server/db.ts"
      via: "import { sql } from '$lib/server/db'"
      pattern: "\\$lib/server/db"
---

<objective>
Fix the DATABASE_URL architecture issue: packages/db currently reads process.env["DATABASE_URL"] at module load time, but SvelteKit env vars must be accessed via '$env/static/private'. Convert packages/db exports to factory functions and create server-only singletons in packages/front.

Purpose: SvelteKit app fails to start because packages/db throws "DATABASE_URL environment variable is required" before $env/static/private is available.
Output: Factory functions in packages/db, initialized singletons in packages/front/src/lib/server/, all imports updated.
</objective>

<execution_context>
@/home/jta/.claude/get-shit-done/workflows/execute-plan.md
@/home/jta/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md

<interfaces>
<!-- Current packages/db exports (to be replaced with factories) -->

From packages/db/src/client.ts (current — singleton, reads process.env):
```typescript
import postgres from "postgres";
const url = process.env["DATABASE_URL"];
if (!url) throw new Error("DATABASE_URL environment variable is required");
export const sql = postgres(url);
```

From packages/db/src/auth.ts (current — singleton, imports sql, reads process.env for SMTP):
```typescript
import { sql } from "./client.js"
export const auth = betterAuth({ database: { dialect: new PostgresJSDialect({ postgres: sql }), ... } })
```

From packages/db/src/index.ts (current):
```typescript
export { sql } from "./client.js"
export { auth } from "./auth.js"
```

<!-- Target shape after this plan -->

packages/db/src/client.ts (factory):
```typescript
export function createSql(databaseUrl: string): postgres.Sql
```

packages/db/src/auth.ts (factory):
```typescript
type SmtpConfig = { host: string; port: number; secure: boolean; user?: string; pass?: string; from: string }
export function createAuth(sql: postgres.Sql, smtp: SmtpConfig): ReturnType<typeof betterAuth>
```

packages/db/src/index.ts (re-export factories only):
```typescript
export { createSql } from "./client.js"
export { createAuth } from "./auth.js"
```

packages/front/src/lib/server/db.ts (new singleton, uses $env/static/private):
```typescript
import { DATABASE_URL } from "$env/static/private"
import { createSql } from "@darts-management/db"
export const sql = createSql(DATABASE_URL)
```

packages/front/src/lib/server/auth.ts (updated singleton):
```typescript
import { DATABASE_URL, SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS, EMAIL_FROM } from "$env/static/private"
import { createAuth } from "@darts-management/db"
import { sql } from "./db.js"
export const auth = createAuth(sql, { host: SMTP_HOST ?? "localhost", ... })
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Convert packages/db to factory functions</name>
  <files>
    packages/db/src/client.ts
    packages/db/src/auth.ts
    packages/db/src/index.ts
  </files>
  <action>
Refactor packages/db to export factory functions instead of singletons. No process.env reads remain.

**packages/db/src/client.ts** — Replace entirely:
```typescript
import postgres from "postgres";

export function createSql(databaseUrl: string): postgres.Sql {
  return postgres(databaseUrl);
}
```
Remove the console.log("JTA", process.env) debug line. Remove the module-level singleton and env check.

**packages/db/src/auth.ts** — Replace entirely. Keep all existing plugin imports unchanged. The function signature receives sql and an smtp config object. The `getRequestEvent` import from "$app/server" stays (it is a SvelteKit internal, not an env var). Remove the module-level `mailer` and `sql` import from "./client.js":
```typescript
import { betterAuth } from "better-auth"
import { admin as adminPlugin } from "better-auth/plugins"
import { sveltekitCookies } from "better-auth/svelte-kit"
import { getRequestEvent } from "$app/server"
import { PostgresJSDialect } from "kysely-postgres-js"
import { createTransport } from "nodemailer"
import type postgres from "postgres"
import { ac, joueur, organisateur, adminTournoi, adminFederal } from "./permissions.js"

type SmtpConfig = {
  host: string
  port: number
  secure: boolean
  user?: string
  pass?: string
  from: string
}

export function createAuth(sql: postgres.Sql, smtp: SmtpConfig): ReturnType<typeof betterAuth> {
  const mailer = createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    auth: smtp.user ? { user: smtp.user, pass: smtp.pass } : undefined,
  })

  return betterAuth({
    database: {
      dialect: new PostgresJSDialect({ postgres: sql }),
      type: "postgresql",
      // NOTE: Do NOT use casing: "snake" -- known bug with postgres.js dialect (issue #4789)
      // Better Auth managed tables use camelCase columns; app tables use snake_case separately.
    },
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
      sendResetPassword: async ({ user, url }) => {
        void mailer.sendMail({
          from: smtp.from,
          to: user.email,
          subject: "Réinitialisation de votre mot de passe FFD",
          text: `Cliquez sur ce lien pour réinitialiser votre mot de passe : ${url}`,
          html: `<p>Réinitialisez votre mot de passe : <a href="${url}">${url}</a></p>`,
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
      sveltekitCookies(getRequestEvent), // MUST be last -- required for SvelteKit form actions (Pitfall #2)
    ],
  })
}
```

**packages/db/src/index.ts** — Replace entirely:
```typescript
export { createSql } from "./client.js"
export { createAuth } from "./client.js"
export type { } from "./auth.js"
```
Wait — correct export:
```typescript
export { createSql } from "./client.js"
export { createAuth } from "./auth.js"
```
  </action>
  <verify>
    <automated>cd /home/jta/Projects/darts-management/master && pnpm --filter @darts-management/db typecheck 2>&1 | tail -20</automated>
  </verify>
  <done>packages/db typechecks clean. No process.env references remain in packages/db/src/. Exports are createSql and createAuth factories only.</done>
</task>

<task type="auto">
  <name>Task 2: Create front server singletons and update all imports</name>
  <files>
    packages/front/src/lib/server/db.ts
    packages/front/src/lib/server/auth.ts
    packages/front/src/routes/(app)/admin/+page.server.ts
    packages/front/src/routes/(app)/admin/entities/new/+page.server.ts
  </files>
  <action>
Create the two new server modules in packages/front and update all imports that previously pointed at @darts-management/db for sql or auth.

**packages/front/src/lib/server/db.ts** — Create new file:
```typescript
// Server-only — never import this from +page.svelte or +layout.svelte
import { DATABASE_URL } from "$env/static/private"
import { createSql } from "@darts-management/db"

export const sql = createSql(DATABASE_URL)
```

**packages/front/src/lib/server/auth.ts** — Replace entirely:
```typescript
// Server-only — never import this from +page.svelte or +layout.svelte
import {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_SECURE,
  SMTP_USER,
  SMTP_PASS,
  EMAIL_FROM,
} from "$env/static/private"
import { createAuth } from "@darts-management/db"
import { sql } from "./db.js"

export const auth = createAuth(sql, {
  host: SMTP_HOST ?? "localhost",
  port: Number(SMTP_PORT ?? "1025"),
  secure: SMTP_SECURE === "true",
  user: SMTP_USER || undefined,
  pass: SMTP_PASS || undefined,
  from: EMAIL_FROM ?? "noreply@ffd.fr",
})
```

**packages/front/src/routes/(app)/admin/+page.server.ts** — Change line 2:
- Remove: `import { sql } from "@darts-management/db"`
- Add: `import { sql } from "$lib/server/db"`

**packages/front/src/routes/(app)/admin/entities/new/+page.server.ts** — Change line 2:
- Remove: `import { sql } from "@darts-management/db"`
- Add: `import { sql } from "$lib/server/db"`

All other files that import `auth` from "$lib/server/auth" are unchanged — they already use the correct local path.
  </action>
  <verify>
    <automated>cd /home/jta/Projects/darts-management/master && pnpm typecheck 2>&1 | tail -30</automated>
  </verify>
  <done>Full monorepo typechecks clean. No file in packages/front imports sql or auth from "@darts-management/db". `$env/static/private` is the sole source of env vars in packages/front.</done>
</task>

</tasks>

<verification>
After both tasks:

1. No process.env reads in packages/db: `grep -r "process\.env" packages/db/src/` returns empty
2. No direct @darts-management/db sql/auth imports in packages/front: `grep -r "from \"@darts-management/db\"" packages/front/src/` returns empty
3. Full typecheck passes: `pnpm typecheck`
4. Build passes: `pnpm build`
</verification>

<success_criteria>
- packages/db exports only createSql and createAuth factory functions — no singletons, no process.env reads
- packages/front/src/lib/server/db.ts and auth.ts are the sole initialization points, using $env/static/private
- All packages/front server routes import sql from "$lib/server/db" and auth from "$lib/server/auth"
- `pnpm typecheck` passes with no errors
- `pnpm build` completes without "DATABASE_URL environment variable is required" error
</success_criteria>

<output>
After completion, create `.planning/quick/1-fix-database-url-arch-sql-factory-instea/1-SUMMARY.md`
</output>
