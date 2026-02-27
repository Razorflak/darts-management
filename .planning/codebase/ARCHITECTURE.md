# Architecture

**Analysis Date:** 2026-02-27

## Pattern Overview

**Overall:** Monorepo with modular separation: frontend (SvelteKit), database package, and shared configurations.

**Key Characteristics:**
- Monorepo structure using pnpm workspaces managed by Turborepo
- Multi-step wizard pattern for tournament event creation
- Component-driven UI with reactive state management (Svelte 5 runes)
- Type-driven architecture using discriminated unions for phase types
- Shared configuration packages for TypeScript, Biome linting, and Vitest

## Layers

**Configuration Layer (`packages/config/`):**
- Purpose: Centralized, shared configuration for all packages
- Location: `packages/config/typescript-config/`, `packages/config/biome-config/`, `packages/config/vitest-config/`
- Contains: TypeScript compiler options, ESLint/Prettier rules via Biome, Vitest test config
- Depends on: Nothing (foundation layer)
- Used by: All other packages extend from these configs

**Database Layer (`packages/db/`):**
- Purpose: Raw SQL database client and migration management
- Location: `packages/db/src/` and `packages/db/prisma/`
- Contains: PostgreSQL client via `postgres` npm package, Prisma migration scripts
- Depends on: postgres driver, Prisma for migrations
- Used by: Frontend (currently unused but prepared for API integration)
- Exports: `sql` function from `packages/db/src/index.ts`

**Frontend Application Layer (`packages/front/`):**
- Purpose: SvelteKit UI application for tournament management
- Location: `packages/front/src/`
- Contains: Routes, components, business logic, and styling
- Depends on: Flowbite-Svelte components, SortableJS, Tailwind CSS
- Exports: Not a shared package (private)

**Feature Modules within Frontend:**
- **Tournament Module** (`packages/front/src/lib/tournament/`)
  - Purpose: All tournament and event creation logic
  - Core responsibility: Multi-step wizard for creating tournament events
  - Contains: Types, utilities, components, templates, and labels

## Data Flow

**Tournament Creation Wizard:**

1. **Step 1 - Event Definition** (`EventStep.svelte`)
   - User fills EventData (name, entity, dates, location)
   - Form validation on submit
   - Transitions to Step 2

2. **Step 2 - Tournament Configuration** (`TournamentStep.svelte`)
   - Displays TournamentTabs for multi-tournament management
   - Active tournament edited via TournamentForm
   - TournamentForm composes:
     - Basic fields (name, quota, category, startTime)
     - PhasesBuilder for managing phases
   - Transitions to Step 3

3. **Step 3 - Review & Publish** (`PublishStep.svelte`)
   - Renders hierarchical recap: Event → Tournaments → Phases
   - Type guards (isGroupPhase, isEliminationPhase) narrow Phase union
   - User confirms publication options
   - Calls `createTournament()` on publish (currently logs to console, TODO: API submit)

**State Management:**
- Wizard state (step: 1|2|3) stored in page component via `$state`
- EventData and Tournament[] managed at page level via `$bindable()`
- Child components receive data via props with `$bindable()` for two-way binding
- No global state manager; all state flows through component hierarchy

**Data Structures:**
```
EventData {
  name, entity, startDate, startTime, endDate, location
}

Tournament {
  id, name, club, quota, category, startTime, startDate?, phases[]
}

Phase = GroupPhase | EliminationPhase

GroupPhase {
  id, type: 'round_robin' | 'double_loss_groups'
  entrants, qualifiers, playersPerGroup
}

EliminationPhase {
  id, type: 'single_elim' | 'double_elim'
  entrants, tiers: BracketTier[], qualifiers?
}

BracketTier {
  id, round: BracketRound (power-of-2: 2, 4, 8, ..., 4096)
  legs: number
}
```

## Key Abstractions

**Phase Discriminated Union:**
- Purpose: Type-safe handling of different tournament phase types
- Location: `packages/front/src/lib/tournament/types.ts`
- Pattern: Discriminant field `type` narrows to GroupPhase or EliminationPhase
- Usage: Type guards in components (isGroupPhase, isEliminationPhase) narrow union before accessing phase-specific fields

**Template System:**
- Purpose: Pre-configured event+tournament+phase templates for rapid creation
- Location: `packages/front/src/lib/tournament/templates.ts`
- Contains: EVENT_TEMPLATES array with two built-in templates (Comité, Coupe Nationale)
- Template types: PhaseTemplate, TournamentTemplate, EventTemplate (no IDs; generated on apply)
- Usage: TemplateModal applies template to wizard state

**Sortable Action:**
- Purpose: Encapsulate SortableJS library for Svelte
- Location: `packages/front/src/lib/tournament/sortable.ts`
- Pattern: Svelte action wrapping SortableJS.create() with lifecycle management
- Used by: PhasesBuilder for drag-and-drop phase reordering

**Label Dictionaries:**
- Purpose: Centralized UI text for domain concepts (categories, phase types, bracket rounds)
- Location: `packages/front/src/lib/tournament/labels.ts`
- Files: CATEGORY_LABELS, PHASE_TYPE_LABELS, BRACKET_ROUND_LABELS
- Usage: Maps enum values to French display text

**Utility Factories:**
- Purpose: Generate domain objects with sensible defaults and random IDs
- Location: `packages/front/src/lib/tournament/utils.ts`
- Functions: createTournament(), createGroupPhase(), createEliminationPhase(), createBracketTier()
- ID generation: Simple but non-cryptographic (Math.random().toString(36))

## Entry Points

**Application Root:**
- Location: `packages/front/src/routes/+layout.svelte`
- Triggers: SvelteKit app initialization
- Responsibilities: Loads global CSS, renders child routes

**Tournament Creation Route:**
- Location: `packages/front/src/routes/tournaments/new/+page.svelte`
- Triggers: User navigates to `/tournaments/new`
- Responsibilities:
  - Manages wizard state (step 1, 2, 3)
  - Maintains EventData and Tournament[] state
  - Orchestrates step transitions
  - Calls publish() on final submission (currently TODO)

**API Boundary (Planned):**
- `createTournament()` function in +page.svelte currently logs state
- TODO: Replace with actual API call to backend
- Expected endpoint: POST to `/api/tournaments` or similar

## Error Handling

**Strategy:** Minimal error handling currently present. Validation relies on HTML form `required` attributes.

**Patterns:**
- Form validation: HTML5 form validation (required fields)
- Database availability: Not yet connected to frontend (DB package exists, unused)
- No try/catch blocks in component code
- No error boundaries or fallback UI

**Known Gaps:**
- No API error handling (API not yet implemented)
- No validation feedback beyond browser defaults
- No error recovery or retry logic

## Cross-Cutting Concerns

**Logging:**
- Approach: `console.log()` in publish() handler
- No structured logging framework
- TODO: Replace with proper API instrumentation

**Validation:**
- Approach: HTML form validation + component-level state checks
- No schema validation (Zod available in root but unused in frontend)
- Type safety via TypeScript catches structural errors

**Authentication:**
- Approach: Stubbed (mock entities list in EventStep)
- Current: Hard-coded entity options ['Mon Comité', 'Ma Ligue', 'FFD']
- TODO: Replace with auth system and dynamic entity list

**Styling:**
- Approach: Tailwind CSS v4 with custom theme variables
- Theme location: `packages/front/src/lib/styles/theme.css`
- Design tokens: Primary color palette (primary-50 to primary-900), surfaces, borders, radius, shadows
- Component library: Flowbite-Svelte for standard UI controls

**Routing:**
- Framework: SvelteKit file-based routing
- Adapter: auto (environment-agnostic)
- Current routes: `/`, `/tournaments/new`
- Navigation: `goto()` from `$app/navigation`

---

*Architecture analysis: 2026-02-27*
