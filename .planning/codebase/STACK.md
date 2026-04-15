# Technology Stack

**Analysis Date:** 2026-04-16

## Languages

**Primary:**
- TypeScript 5.9.x - All packages (domain, db, application, front, logger)

**Secondary:**
- SQL - Database migrations in `packages/db/src/schema/` (raw `.sql` files via node-pg-migrate)
- Svelte (5.x) - Frontend components in `packages/front/src/`

## Runtime

**Environment:**
- Node.js (LTS) - Server-side execution for SvelteKit adapter-node and DB layer
- Browser (Chromium) - Client-side Svelte 5 components

**Package Manager:**
- pnpm 10.16.1
- Lockfile: `pnpm-lock.yaml` (present)

## Frameworks

**Core:**
- SvelteKit 2.53.x (`@sveltejs/kit`) - Full-stack web framework, adapter-node for Node.js production (`packages/front/`)
- Svelte 5.51.x - UI component framework with runes

**Build/Dev:**
- Turborepo 2.8.x (`turbo`) - Monorepo task orchestration, config in `turbo.json`
- Vite 7.3.x - Frontend bundler/dev server, config in `packages/front/vite.config.ts`
- `@sveltejs/adapter-node` 5.5.x - Production adapter: outputs `packages/front/build/index.js`

**Testing:**
- Vitest 4.x - Unit and integration test runner
  - Server tests: `environment: "node"`, includes `src/**/*.{test,spec}.{js,ts}` (excluding svelte)
  - Client tests: browser mode via Playwright (Chromium headless), includes `src/**/*.svelte.{test,spec}.{js,ts}`
- `@vitest/browser-playwright` + `vitest-browser-svelte` - Browser component testing

**Linting/Formatting:**
- Biome 2.4.9 (`@biomejs/biome`) - Single tool for lint + format across all packages
  - Root config: `biome.json` (extends `@darts-management/biome-config/biome`)
  - Per-package `biome.json` extends workspace config

## Key Dependencies

**Critical:**
- `zod` 4.3.6 - Schema validation and TypeScript type derivation; used in `domain`, `db`, `front` as single source of truth for all types
- `postgres` 3.4.x (`postgres.js`) - PostgreSQL driver used in `packages/db/src/client.ts`; connection pool max=5, idle_timeout=20s
- `better-auth` 1.4.x - Authentication library with email+password and SvelteKit cookies plugin; configured in `packages/db/src/auth.ts`
- `kysely-postgres-js` 3.0.x - Kysely dialect adapter for postgres.js, used by Better Auth for its own tables

**Infrastructure:**
- `@opentelemetry/api` 1.9.x - OpenTelemetry API for tracing, used in `packages/db/src/client.ts` and `packages/logger/`
- `pino` 10.x - Structured logging, configured in `packages/logger/src/`
- `nodemailer` 8.x - Email sending for password reset in `packages/db/src/auth.ts`
- `node-pg-migrate` 8.x - SQL migration runner; migrations in `packages/db/src/schema/`

**UI:**
- `flowbite-svelte` 1.31.x + `flowbite-svelte-icons` 3.1.x - UI component library based on Tailwind CSS
- `tailwindcss` 4.1.x + `@tailwindcss/vite` - Utility-first CSS, integrated via Vite plugin
- `sortablejs` 1.15.x - Drag-and-drop sorting for tournament seeding UI
- `dayjs` 1.11.x - Date formatting and manipulation

**Utility:**
- `uuid` 13.0.x - UUID generation in domain and front packages

## Monorepo Workspace Packages

| Package | Name | Purpose |
|---------|------|---------|
| `packages/config/biome-config` | `@darts-management/biome-config` | Shared Biome config |
| `packages/config/typescript-config` | `@darts-management/typescript-config` | Shared tsconfig base |
| `packages/config/vitest-config` | `@darts-management/vitest-config` | Shared Vitest config |
| `packages/domain` | `@darts-management/domain` | Zod schemas + pure business logic |
| `packages/db` | `@darts-management/db` | Repositories, auth, authz, SQL client |
| `packages/application` | `@darts-management/application` | Application services (cross-repo orchestration) |
| `packages/logger` | `@darts-management/logger` | Pino logger + OpenTelemetry SDK setup |
| `packages/mail` | `@darts-management/mail` | MailDev local dev SMTP server |
| `packages/front` | `front` | SvelteKit frontend application |

## Configuration

**Environment:**
- `.env` at monorepo root (loaded by Vite dev server into `process.env`)
- `packages/front/.env` for frontend-specific vars
- Loaded at build time via `vite.config.ts` custom plugin (`loadEnv`)
- Runtime access via SvelteKit `$env/dynamic/private`

**Key environment variables required:**
- `DATABASE_URL` - PostgreSQL connection string (read by `packages/db/src/client.ts`)
- `BETTER_AUTH_SECRET` - Authentication signing secret
- `BETTER_AUTH_URL` - Base URL for auth callbacks
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS` - Email transport
- `EMAIL_FROM` - From address for outgoing emails
- `OTEL_EXPORTER_OTLP_ENDPOINT` - OpenTelemetry collector endpoint (default: `http://localhost:4318`)
- `OTEL_EXPORTER_OTLP_AUTH_TOKEN` - Optional auth token for OTLP exporter
- `DEBUG_SQL` - Set to `"true"` to log SQL statements as OpenTelemetry span attributes

**Build:**
- `turbo.json` - Defines task graph: `build` depends on `^build`; `dev` and `prod` are non-cached persistent tasks
- `packages/front/svelte.config.js` - SvelteKit config with `adapter-node`
- `packages/front/vite.config.ts` - Vite config with Tailwind, SvelteKit, Playwright test projects

## Platform Requirements

**Development:**
- Node.js + pnpm 10.16.1
- PostgreSQL database (connection via `DATABASE_URL`)
- Optional: MailDev SMTP server (`packages/mail` — `pnpm dev` runs `maildev --smtp 1025 --web 1080`)
- Optional: SigNoz observability stack via `docker-compose.observability.yml`

**Production:**
- Node.js server running `packages/front/build/index.js` (SvelteKit adapter-node output)
- Deployment target includes Railway (`sveltekit-production.up.railway.app` in Vite `allowedHosts`)
- PostgreSQL database required at runtime

---

*Stack analysis: 2026-04-16*
