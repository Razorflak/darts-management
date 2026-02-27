# Technology Stack

**Analysis Date:** 2026-02-27

## Languages

**Primary:**
- TypeScript 5.9.3 - All packages use strict TypeScript with ESNext target

**Secondary:**
- Svelte 5.51.0 - Frontend UI components in packages/front
- JavaScript (Node.js) - Test and build scripts

## Runtime

**Environment:**
- Node.js (version not pinned - no .nvmrc or .node-version file)

**Package Manager:**
- pnpm 10.16.1
- Lockfile: pnpm-lock.yaml (managed by pnpm)

## Frameworks

**Core:**
- SvelteKit 2.50.2 - Full-stack web framework for packages/front
  - Adapter: @sveltejs/adapter-auto for environment detection
  - Pages route: packages/front/src/routes/
  - Layout: packages/front/src/routes/+layout.svelte

**Styling:**
- Tailwind CSS 4.1.18 - Utility-first CSS framework
  - Integration: @tailwindcss/vite 4.1.18 for Vite
  - Theme config: packages/front/src/lib/styles/theme.css with custom variables

**Component Library:**
- Flowbite-Svelte 1.31.0 - Pre-built Svelte components
- Flowbite-Svelte-Icons 3.1.0 - SVG icons

**UI Utilities:**
- SortableJS 1.15.6 - Drag-and-drop list reordering
  - Wrapper: packages/front/src/lib/tournament/sortable.ts (Svelte action)

**Build & Dev:**
- Vite 7.3.1 - Fast bundler and dev server
- @sveltejs/vite-plugin-svelte 6.2.4 - Svelte integration for Vite
- vite-plugin-devtools-json 1.0.0 - Development tools plugin

**Testing:**
- Vitest 4.0.18 - Fast unit test framework (extends Vite config)
- @vitest/browser-playwright 4.0.18 - Browser automation testing
- vitest-browser-svelte 2.0.2 - Svelte component testing utilities
- Playwright 1.58.1 - Browser automation driver (chromium)
- Config: packages/config/vitest-config/ (shared across packages)

**Code Quality:**
- Biome 2.4.4 - Fast linter and formatter
  - Config: packages/config/biome-config/biome.json
  - Replaces ESLint + Prettier in development
- ESLint 9.39.2 - JavaScript linter (in packages/front)
- @eslint/js 9.39.2 - Core rules
- eslint-plugin-svelte 3.14.0 - Svelte linting
- typescript-eslint 8.54.0 - TypeScript support
- eslint-config-prettier 10.1.8 - Prettier conflict resolution
- Prettier 3.8.1 - Code formatter (in packages/front)
- prettier-plugin-svelte 3.4.1 - Svelte formatting
- prettier-plugin-tailwindcss 0.7.2 - Tailwind class ordering

**Type Checking:**
- svelte-check 4.3.6 - Svelte component type validation

## Key Dependencies

**Critical:**
- zod 4.3.6 - Schema validation library (at root level)

**Database:**
- postgres 3.4.5 - PostgreSQL client (packages/db)
- prisma 6.0.0 - Database toolkit and migration tool (packages/db dev dependency)
  - Migrations: packages/db/prisma/ (Prisma Migrate format)
  - Schema: packages/db/prisma/schema.prisma (PostgreSQL datasource)

**Monorepo Management:**
- turbo 2.8.10 - Monorepo build orchestrator
  - Config: turbo.json
  - Manages build, dev, lint, test, and typecheck tasks

**Type Definitions:**
- @types/node 25.3.0 and 24.x (frontend) - Node.js type definitions
- @types/sortablejs 1.15.8 - SortableJS type definitions

**Shared Configs (workspace packages):**
- @darts-management/biome-config - Shared Biome linting rules
- @darts-management/typescript-config - Shared TypeScript configuration
- @darts-management/vitest-config - Shared Vitest test configuration

## Configuration Files

**Environment:**
- .env file present (contains DATABASE_URL and other runtime config)
- Turbo monitors .env.*local for cache busting
- No example .env file committed (configuration not tracked)

**Build Configuration:**
- turbo.json - Monorepo task definitions
- packages/config/biome-config/biome.json - Linting rules
  - Formatter: Tab indentation, double quotes, no semicolons
  - Organizes imports automatically
  - Recommended rules with custom a11y overrides

**TypeScript:**
- Root extends packages/config/typescript-config/tsconfig.json
- strict: true, target: ESNext, module: NodeNext
- verbatimModuleSyntax: true for exact module syntax

**Frontend (SvelteKit):**
- svelte.config.js - Uses @sveltejs/adapter-auto
- vite.config.ts - Browser and server test environments
- Vitest projects: client (Playwright/chromium), server (Node)

**Database:**
- Prisma schema: packages/db/prisma/schema.prisma
- datasource: PostgreSQL (requires DATABASE_URL)
- No pre-built migrations (fresh schema only)

## Platform Requirements

**Development:**
- Node.js (version not specified)
- pnpm 10.16.1 or compatible
- PostgreSQL database (for DATABASE_URL)

**Production:**
- Node.js runtime (SvelteKit auto-adapter determines platform)
- PostgreSQL 12+ (inferred from Prisma 6.0)
- Environment variable: DATABASE_URL

## Scripts

**Root Level (turbo-orchestrated):**
```bash
pnpm build        # Build all packages (turbo run build)
pnpm dev          # Development server (turbo run dev, persistent)
pnpm lint         # Lint all packages
pnpm test         # Run all tests
pnpm typecheck    # Type check all packages
```

**Frontend (packages/front):**
```bash
npm run dev              # Vite dev server
npm run build           # Vite production build
npm run check           # Type check Svelte components
npm run lint            # ESLint + Prettier check
npm run format          # Prettier format
npm run test:unit       # Vitest watch mode
npm run test            # Vitest single run
```

**Database (packages/db):**
```bash
npm run db:migrate      # Apply migrations to prod database
npm run db:migrate:dev  # Apply migrations to dev database
npm run db:migrate:reset # Reset database to migration 0
npm run typecheck       # Type check TypeScript
```

---

*Stack analysis: 2026-02-27*
