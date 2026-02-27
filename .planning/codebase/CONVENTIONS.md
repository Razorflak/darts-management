# Coding Conventions

**Analysis Date:** 2026-02-27

## Naming Patterns

**Files:**
- TypeScript utilities: `camelCase.ts` (e.g., `types.ts`, `utils.ts`, `labels.ts`)
- Svelte components: `PascalCase.svelte` (e.g., `TournamentForm.svelte`, `EventStep.svelte`)
- Test files: `*.spec.ts` or `*.svelte.spec.ts` suffix (e.g., `demo.spec.ts`, `page.svelte.spec.ts`)

**Functions:**
- camelCase for all functions: `genId()`, `createTournament()`, `createGroupPhase()`
- Event handlers in Svelte: `handleAdd()`, `onSortEnd()` pattern
- Svelte actions: camelCase (e.g., `sortable()`)

**Variables:**
- camelCase for all variables and constants
- State variables: `let open = $state(false)`, `let addOpen = $state(false)`
- Runes prefer `$state()`, `$bindable()`, `$props()`, `$derived()` pattern

**Types:**
- Use `type` declarations over `interface` (per CLAUDE.md convention: "utilisation des types pour typescript plutôt que les interfaces")
- Union types: `PhaseType = 'round_robin' | 'double_loss_groups' | ...`
- Literal union types for discriminated unions: `type Phase = GroupPhase | EliminationPhase`
- Generic type parameters: `Record<Key, Value>` for mappings, seen in `CATEGORY_LABELS: Record<Category, string>`

## Code Style

**Formatting:**
- Tool: Prettier (with tab indentation)
- Indentation: Tabs (`useTabs: true`)
- Quote style: Single quotes for TypeScript/JavaScript
- Quote style: Double quotes for Biome config override
- Trailing commas: None (`trailingComma: "none"`)
- Print width: 100 characters
- Semicolons: Not needed (asNeeded) in Biome, Prettier handles

**Linting:**
- Frontend: ESLint + Prettier integration
  - Config: `/home/jta/Projects/darts-management/master/packages/front/eslint.config.js`
  - Extends: `@eslint/js`, `typescript-eslint`, `eslint-plugin-svelte`, `prettier`
  - No-undef disabled for TypeScript projects (per typescript-eslint recommendation)
- Biome (for other packages like `sample`):
  - Config: `/home/jta/Projects/darts-management/master/packages/config/biome-config/biome.json`
  - Recommended rules enabled
  - Custom override: `a11y.useGenericFontNames` off

## Import Organization

**Order:**
1. External dependencies (`from 'svelte'`, `from 'flowbite-svelte'`)
2. Internal type imports (`from './types.js'`, `from '../types.js'`)
3. Internal data/constants (`from './labels.js'`, `from './utils.js'`)
4. Local component imports (Svelte components)

**Example from `BracketTiers.svelte`:**
```typescript
import { BRACKET_ROUNDS } from '../../types.js'
import type { BracketTier, BracketRound } from '../../types.js'
import { BRACKET_ROUND_LABELS } from '../../labels.js'
import { sortable } from '../../sortable.js'
import { createBracketTier } from '../../utils.js'
import { Input } from 'flowbite-svelte'
```

**Path Aliases:**
- No path aliases detected (uses relative imports exclusively)
- SvelteKit alias `$lib` available but not used; explicit relative paths preferred

## Error Handling

**Patterns:**
- Type narrowing with explicit checks in discriminated unions
- Filter operations for type safety: `tiers.filter((t) => t.id !== id)`
- No explicit error handling visible (functional, reactive components)
- Validation via TypeScript types and Zod (present in dependencies, not heavily used yet)

## Logging

**Framework:** None detected

**Patterns:**
- No logging infrastructure in place
- Use `console` if needed (available via browser globals)

## Comments

**When to Comment:**
- JSDoc comments for Svelte actions explaining usage: `/** Svelte action that wraps SortableJS. Usage: <ul use:sortable={{...}}> */`
- Inline comments for non-obvious transformations and logic
- Examples: array reassignment transformations in `BracketTiers.svelte`

**JSDoc/TSDoc:**
- Minimal usage - only for public actions and exports
- Example in `sortable.ts`:
```typescript
/**
 * Svelte action that wraps SortableJS.
 * Usage: <ul use:sortable={{ group: 'phases', animation: 150, onEnd }}>
 */
export function sortable(node: HTMLElement, options: Sortable.Options) { ... }
```

## Function Design

**Size:**
- Functions generally kept to 10-40 lines
- Utility factories like `createTournament()` keep state initialization compact
- Event handlers remain inline or short standalone functions

**Parameters:**
- Props pattern in Svelte: `interface Props { ... }` followed by `let { prop = $bindable() }: Props = $props()`
- No parameter object destructuring in simple cases
- Type safety via explicit type arguments

**Return Values:**
- Functions return typed objects explicitly
- Example: `createTournament(): Tournament` returns fully typed structure
- Discriminated unions returned for phase creation

## Module Design

**Exports:**
- Named exports for all functions and types
- No default exports observed
- Types always exported for consumption

**Barrel Files:**
- `/home/jta/Projects/darts-management/master/packages/front/src/lib/index.ts` exists (empty in practice)
- Relative imports preferred over barrel imports

**Svelte Component Props:**
- Props interface declared at top of `<script>` block
- Single props object destructured with runes: `let { tournament = $bindable() }: Props = $props()`
- Explicit types on Props interface

## TypeScript Configuration

**Strict Mode:** Enabled (`"strict": true`)

**Key Settings:**
- `allowJs: true`, `checkJs: true` - JavaScript files type-checked
- `moduleResolution: "bundler"` - modern resolution
- `forceConsistentCasingInFileNames: true` - case sensitivity enforced
- `rewriteRelativeImportExtensions: true` - rewrites imports with `.js` extensions

---

*Convention analysis: 2026-02-27*
