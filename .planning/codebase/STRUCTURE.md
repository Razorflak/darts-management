# Codebase Structure

**Analysis Date:** 2026-02-27

## Directory Layout

```
darts-management/
├── packages/
│   ├── config/                    # Shared configuration packages
│   │   ├── biome-config/          # ESLint/Prettier via Biome
│   │   ├── typescript-config/     # TypeScript compiler config
│   │   └── vitest-config/         # Test runner config
│   ├── db/                        # Database package
│   │   ├── src/
│   │   │   ├── index.ts           # Public export (sql function)
│   │   │   └── client.ts          # PostgreSQL client
│   │   └── prisma/
│   │       └── schema.prisma      # Database schema (currently minimal)
│   ├── front/                     # SvelteKit frontend application
│   │   ├── src/
│   │   │   ├── routes/            # SvelteKit file-based routes
│   │   │   │   ├── +layout.svelte # Root layout
│   │   │   │   ├── +page.svelte   # Home page
│   │   │   │   └── tournaments/
│   │   │   │       └── new/
│   │   │   │           └── +page.svelte # Tournament creation wizard
│   │   │   └── lib/               # Reusable components and utilities
│   │   │       ├── assets/        # Images, icons, static files
│   │   │       ├── styles/
│   │   │       │   └── theme.css  # Global Tailwind theme variables
│   │   │       └── tournament/    # Tournament feature module
│   │   │           ├── components/        # Reusable Svelte components
│   │   │           │   ├── Breadcrumb.svelte
│   │   │           │   ├── EventStep.svelte      # Wizard step 1
│   │   │           │   ├── TournamentStep.svelte # Wizard step 2
│   │   │           │   ├── PublishStep.svelte    # Wizard step 3
│   │   │           │   ├── TournamentForm.svelte
│   │   │           │   ├── TournamentTabs.svelte
│   │   │           │   ├── TournamentTabs.svelte
│   │   │           │   ├── TemplateModal.svelte
│   │   │           │   ├── TimeInput.svelte
│   │   │           │   └── phases/
│   │   │           │       ├── PhasesBuilder.svelte  # Phase list UI
│   │   │           │       ├── PhaseCard.svelte      # Single phase editor
│   │   │           │       ├── AddPhaseMenu.svelte   # Phase type picker
│   │   │           │       └── BracketTiers.svelte   # Bracket configuration
│   │   │           ├── types.ts           # Domain types and discriminated unions
│   │   │           ├── utils.ts           # Factory functions for domain objects
│   │   │           ├── labels.ts          # UI text mappings
│   │   │           ├── templates.ts       # Pre-configured event templates
│   │   │           ├── sortable.ts        # Svelte action for drag-and-drop
│   │   │           └── index.ts           # Re-exports (if needed)
│   │   ├── package.json
│   │   ├── svelte.config.js
│   │   └── tsconfig.json          # Extends packages/config/typescript-config
│   ├── sample/                    # Empty sample package (placeholder)
│   │   └── src/index.ts
│   └── package.json               # Workspace root
├── pnpm-workspace.yaml            # Workspace configuration
├── turbo.json                     # Turborepo build orchestration
├── package.json                   # Root package.json with scripts
├── CLAUDE.md                      # Project instructions
└── .planning/
    └── codebase/                  # Generated analysis documents
```

## Directory Purposes

**`packages/`:**
- Purpose: Monorepo workspace root
- Contains: Isolated packages with independent tsconfig, package.json, build steps

**`packages/config/`:**
- Purpose: Centralized, reusable configuration
- Contains: Three sub-packages (biome-config, typescript-config, vitest-config)
- All other packages extend configs from here via workspace references

**`packages/config/typescript-config/`:**
- Purpose: Shared TypeScript compiler configuration
- Key files: `tsconfig.json` (extends node preset, ESNext target, strict mode enabled)
- Key settings: `composite: true`, `noEmit: true`, `strict: true`, `verbatimModuleSyntax: true`

**`packages/config/biome-config/`:**
- Purpose: Shared ESLint + Prettier configuration
- Contains: `biome.json` (unified linting and formatting)

**`packages/config/vitest-config/`:**
- Purpose: Shared test runner configuration
- Contains: Vitest config for unit tests

**`packages/db/`:**
- Purpose: Database layer (currently prepared but unused by frontend)
- Location: `src/client.ts` exports `sql` function (PostgreSQL via `postgres` npm package)
- Schema: `prisma/schema.prisma` (minimal, defines datasource only)
- Scripts: `db:migrate`, `db:migrate:dev`, `db:migrate:reset` for Prisma Migrate
- Status: Not yet integrated with frontend API

**`packages/front/`:**
- Purpose: SvelteKit-based tournament creation UI
- Root scripts: `dev`, `build`, `preview`, `check`, `lint`, `test:unit`, `test`

**`packages/front/src/routes/`:**
- Purpose: SvelteKit file-based routing
- Layout: `+layout.svelte` wraps all routes
- Current routes:
  - `/` - Home page (`+page.svelte`)
  - `/tournaments/new` - Tournament creation wizard (`tournaments/new/+page.svelte`)

**`packages/front/src/lib/tournament/`:**
- Purpose: Core tournament domain logic and UI
- Organized by concerns (types, utils, labels, templates, components)

**`packages/front/src/lib/tournament/components/`:**
- Breadcrumb: Navigation indicator (not a Flowbite component; custom)
- EventStep: Form for event metadata (step 1 of wizard)
- TournamentStep: Tournament selection and editing interface (step 2)
- TournamentForm: Form for tournament details
- TournamentTabs: Tab-like interface for switching between tournaments
- PublishStep: Review and confirmation (step 3)
- TemplateModal: Modal for selecting pre-configured templates
- TimeInput: Custom time picker component
- phases/: Sub-module for phase management
  - PhasesBuilder: Main list editor with drag-and-drop
  - PhaseCard: Single phase with collapsible details
  - AddPhaseMenu: Dropdown to add new phases
  - BracketTiers: Editor for elimination bracket tiers

**`packages/front/src/lib/tournament/types.ts`:**
- Purpose: Type definitions for tournament domain
- Exports: WizardStep, Category, PhaseType, BracketRound, Phase (discriminated union), EventData, Tournament, PublishOptions

**`packages/front/src/lib/tournament/utils.ts`:**
- Purpose: Factory functions and helpers
- Exports: genId(), createTournament(), createGroupPhase(), createEliminationPhase(), createBracketTier()

**`packages/front/src/lib/tournament/labels.ts`:**
- Purpose: Localization/mapping of domain concepts to UI text
- Exports: CATEGORY_LABELS, PHASE_TYPE_LABELS, BRACKET_ROUND_LABELS (all French)

**`packages/front/src/lib/tournament/templates.ts`:**
- Purpose: Pre-configured event templates
- Exports: EVENT_TEMPLATES array (Comité, Coupe Nationale templates)
- Template types: PhaseTemplate, TournamentTemplate, EventTemplate

**`packages/front/src/lib/tournament/sortable.ts`:**
- Purpose: Svelte action wrapper for SortableJS
- Exports: sortable() action function

**`packages/front/src/lib/styles/theme.css`:**
- Purpose: Global Tailwind v4 design tokens
- Defines: Color palette (primary-50 to primary-900, blue synonyms, surface, border)
- Defines: Typography (--font-sans), radius (--radius-card, --radius-pill), shadows

## Key File Locations

**Entry Points:**
- `packages/front/src/routes/+layout.svelte`: Root layout wrapper
- `packages/front/src/routes/tournaments/new/+page.svelte`: Tournament creation wizard entry

**Configuration:**
- `package.json`: Root workspace config
- `pnpm-workspace.yaml`: Workspace package list
- `turbo.json`: Build task definitions
- `packages/front/package.json`: Frontend dependencies and scripts
- `packages/front/svelte.config.js`: SvelteKit adapter config
- `packages/front/tsconfig.json`: Frontend TypeScript config (extends root config)

**Core Logic:**
- `packages/front/src/lib/tournament/types.ts`: Domain model
- `packages/front/src/lib/tournament/utils.ts`: Factories and helpers
- `packages/front/src/routes/tournaments/new/+page.svelte`: Wizard orchestration

**Testing:**
- `packages/front/src/demo.spec.ts`: Example unit test
- `packages/front/src/routes/page.svelte.spec.ts`: Route test

## Naming Conventions

**Files:**
- Routes: `+page.svelte` (SvelteKit convention), `+layout.svelte`
- Components: PascalCase (e.g., `EventStep.svelte`, `PhaseCard.svelte`)
- Utilities: camelCase (e.g., `sortable.ts`, `utils.ts`)
- Tests: `.spec.ts` suffix (e.g., `demo.spec.ts`)
- Styles: `theme.css` (one global file)

**Directories:**
- Feature modules: camelCase (`tournament/`)
- Sub-features: camelCase (`phases/`)
- Layer directories: camelCase (`components/`, `routes/`, `lib/`)

**TypeScript/JavaScript:**
- Type names: PascalCase (Category, PhaseType, EventData, Tournament)
- Function names: camelCase (createTournament, isGroupPhase)
- Constants: SCREAMING_SNAKE_CASE (CATEGORY_LABELS, BRACKET_ROUNDS)
- Variables: camelCase (startDate, entrants, qualifiers)

**CSS:**
- Tailwind classes: lowercase hyphenated (bg-primary-600, rounded-card, shadow-card)
- Custom properties (CSS variables): kebab-case with double dash prefix (--color-primary-600, --radius-card)

## Where to Add New Code

**New Tournament Feature/Component:**
- Implementation: `packages/front/src/lib/tournament/components/[ComponentName].svelte`
- Tests: `packages/front/src/lib/tournament/components/[ComponentName].spec.ts`
- Types: Add to `packages/front/src/lib/tournament/types.ts` if new domain concept
- Utils: Add factories to `packages/front/src/lib/tournament/utils.ts` if needed

**New Utility/Helper:**
- Shared utilities: `packages/front/src/lib/tournament/utils.ts` (or new file in same directory)
- Label mappings: Add to `packages/front/src/lib/tournament/labels.ts`
- Svelte actions: `packages/front/src/lib/tournament/[actionName].ts`

**New Route/Page:**
- File: `packages/front/src/routes/[route-path]/+page.svelte`
- Layout wrapper (if needed): `packages/front/src/routes/[route-path]/+layout.svelte`

**New Database Feature:**
- Migration: Create via `pnpm db:migrate:dev` in `packages/db/` (generates file in `prisma/migrations/`)
- Client functions: Add to `packages/db/src/` (currently just exports raw sql)

**Database Integration with Frontend:**
- Create API server (separate package or framework integration — not yet planned)
- Export client functions from `packages/db/src/`
- Call from frontend components (currently all state is local)

**Shared Configuration:**
- TypeScript: Modify `packages/config/typescript-config/tsconfig.json`
- Linting: Modify `packages/config/biome-config/biome.json`
- Testing: Modify `packages/config/vitest-config/` files

## Special Directories

**`.planning/`:**
- Purpose: GSD (GitHub Swift Deploy) planning artifacts
- Contains: Codebase analysis documents (ARCHITECTURE.md, STRUCTURE.md, etc.)
- Generated: Yes (by `/gsd:map-codebase` command)
- Committed: Yes (stored in git)

**`.turbo/`:**
- Purpose: Turborepo cache
- Generated: Yes (by turbo during builds)
- Committed: No (.gitignore excludes)

**`node_modules/`:**
- Purpose: npm dependencies
- Generated: Yes (by pnpm install)
- Committed: No (.gitignore excludes)

**`dist/` (build output):**
- Purpose: Compiled output for each package
- Generated: Yes (by `pnpm build`)
- Committed: No (.gitignore excludes, Turbo caches)

**`.svelte-kit/`:**
- Purpose: SvelteKit generated files
- Generated: Yes (by SvelteKit compiler)
- Committed: No (.gitignore excludes)

---

*Structure analysis: 2026-02-27*
