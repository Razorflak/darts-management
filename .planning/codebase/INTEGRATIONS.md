# External Integrations

**Analysis Date:** 2026-02-27

## APIs & External Services

**Not detected** - No third-party API integrations configured or implemented in codebase. No HTTP clients (axios, node-fetch) or API SDKs imported.

## Data Storage

**Databases:**
- PostgreSQL
  - Connection: DATABASE_URL environment variable
  - Client: postgres 3.4.5 (native Node.js driver)
  - Location: `packages/db/src/client.ts` exports `sql` instance
  - Usage: Raw SQL queries via postgres driver (no ORM)
  - Migration tool: Prisma Migrate (prisma 6.0.0)
  - Schema: `packages/db/prisma/schema.prisma` (PostgreSQL datasource)
  - Export: `packages/db/src/index.ts` re-exports sql client

**File Storage:**
- Local filesystem only - No cloud storage integration detected

**Caching:**
- Not implemented - No caching layer detected (Redis, Memcached, etc.)

## Authentication & Identity

**Auth Provider:**
- Not implemented - No authentication system configured
- No auth libraries present (next-auth, Supabase, Auth0, etc.)

**Session Management:**
- Not detected - No session management library present

## Monitoring & Observability

**Error Tracking:**
- Not detected - No error tracking service configured (Sentry, Rollbar, etc.)

**Logs:**
- Console-based only (standard Node.js/browser console)
- No structured logging library present
- No log aggregation service configured

**Performance Monitoring:**
- Not detected - No APM (Application Performance Monitoring) service

## CI/CD & Deployment

**Hosting:**
- Not specified in codebase
- SvelteKit uses @sveltejs/adapter-auto which supports multiple targets

**CI Pipeline:**
- Not detected - No GitHub Actions, GitLab CI, or other CI/CD configuration in repository

**Build System:**
- Turbo 2.8.10 - Local monorepo orchestration only
- No cloud build services configured

## Environment Configuration

**Required environment variables:**
- `DATABASE_URL` - PostgreSQL connection string (critical)
  - Format: postgres://user:password@host:port/database
  - Required at: packages/db/src/client.ts (throws error if missing)

**Optional environment variables:**
- `.env.*local` files monitored by Turbo for cache busting
- No additional services configured that would require API keys

**Secrets location:**
- .env file (not committed to git, handled locally)
- No secret management system detected (Vault, 1Password, etc.)

## Webhooks & Callbacks

**Incoming:**
- Not implemented - No webhook endpoints detected

**Outgoing:**
- Not implemented - No webhook or callback mechanisms found

## Development Tools & Services

**Browser Automation:**
- Playwright 1.58.1 - For browser-based testing in Vitest
  - Driver: Chromium only
  - Purpose: Component testing and browser test environment

**Type Checking:**
- TypeScript 5.9.3 - All packages
- svelte-check 4.3.6 - Svelte component type validation
- No LSP or IDE-specific integration detected beyond standard editors

## Package Management

**Private Registry:**
- Not detected - Uses public npm registry only
- All workspace packages use internal references via `workspace:*`

## No Third-Party Integrations

**Current State:**
This is a frontend-focused monorepo with minimal external dependencies. The stack is:
- **Frontend:** SvelteKit + Tailwind + component library
- **Database:** PostgreSQL with raw SQL queries
- **Testing:** Vitest + browser automation
- **Linting:** Biome

**Notable Absences:**
- No API integrations (Stripe, payment processors, etc.)
- No auth system (would need implementation)
- No external data sources beyond PostgreSQL
- No analytics or monitoring
- No CDN or static hosting service
- No email or notification service
- No cloud storage

**Future Integration Points:**
When adding external services, configuration would typically:
1. Add env vars to .env file
2. Add SDK package to relevant workspace
3. Initialize client in appropriate layer (frontend or backend)
4. Implement error handling and type safety with Zod schemas

---

*Integration audit: 2026-02-27*
