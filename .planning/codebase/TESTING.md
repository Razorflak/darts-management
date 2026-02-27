# Testing Patterns

**Analysis Date:** 2026-02-27

## Test Framework

**Runner:**
- Vitest 4.0.18
- Config: `/home/jta/Projects/darts-management/master/packages/front/vite.config.ts`

**Assertion Library:**
- Vitest built-in expect API

**Run Commands:**
```bash
pnpm test              # Run all tests across workspace
pnpm test:unit         # Run unit tests in front package (vitest)
npm run test           # Run tests with --run flag (CI mode)
```

## Test File Organization

**Location:**
- Co-located with source: `src/**/*.spec.ts` and `src/**/*.svelte.spec.ts`

**Naming:**
- Unit tests: `*.spec.ts` (e.g., `demo.spec.ts`)
- Svelte component tests: `*.svelte.spec.ts` (e.g., `page.svelte.spec.ts`)

**Structure:**
```
packages/front/
├── src/
│   ├── demo.spec.ts                           # Unit test
│   └── routes/
│       └── page.svelte.spec.ts                # Component test
```

## Test Structure

**Suite Organization:**
```typescript
import { describe, it, expect } from 'vitest';

describe('sum test', () => {
	it('adds 1 + 2 to equal 3', () => {
		expect(1 + 2).toBe(3);
	});
});
```

**Patterns:**
- Use `describe()` for test suites
- Use `it()` for individual tests
- Simple assertion style: `expect(value).toBe(expected)`
- Async component testing wrapped with render lifecycle

## Mocking

**Framework:** None explicitly configured

**Patterns:**
- Vitest supports mocking via `vi.mock()` if needed
- No mocking examples present in current codebase

**What to Mock:**
- External dependencies (SortableJS, flowbite-svelte) if testing higher-order logic
- API calls (when implemented)

**What NOT to Mock:**
- Type definitions and utility functions
- Direct component rendering (use `vitest-browser-svelte` instead)

## Fixtures and Factories

**Test Data:**
- Utility functions serve as factories: `createTournament()`, `createGroupPhase()`, `createBracketTier()`
- Located in: `/home/jta/Projects/darts-management/master/packages/front/src/lib/tournament/utils.ts`

**Pattern Example:**
```typescript
export function createTournament(): Tournament {
	return {
		id: genId(),
		name: '',
		club: '',
		quota: 32,
		category: null,
		startTime: '',
		phases: [],
	}
}
```

**Location:**
- Test utilities: `src/lib/tournament/utils.ts` (shared with production code)
- Consider creating `__fixtures__` or `testUtils.ts` for test-specific factories

## Browser Testing

**Framework:** Vitest Browser with Playwright provider

**Configuration:**
```typescript
// packages/front/vite.config.ts
browser: {
	enabled: true,
	provider: playwright(),
	instances: [{ browser: 'chromium', headless: true }]
}
```

**Selector Patterns:**
```typescript
// From page.svelte.spec.ts
const heading = page.getByRole('heading', { level: 1 });
await expect.element(heading).toBeInTheDocument();
```

## Coverage

**Requirements:** Not enforced

**Current Status:**
- No coverage configuration in vitest.config.js
- Add via: `coverage: { provider: 'v8' }` if needed

## Test Types

**Unit Tests:**
- Scope: Pure functions and utilities
- Approach: Direct assertion on function output
- Example: `demo.spec.ts` tests basic arithmetic

**Integration Tests:**
- Scope: Component behavior with dependencies
- Approach: Render component, interact with UI, verify output
- Example: `page.svelte.spec.ts` renders Page component and checks heading existence

**E2E Tests:**
- Framework: Not currently used
- Candidate: Playwright (already installed as browser provider)

## Project Configuration

**Vitest Config:**
- Base: `/home/jta/Projects/darts-management/master/packages/config/vitest-config/vitest.config.js`
- Extended in: `/home/jta/Projects/darts-management/master/packages/front/vite.config.ts`

**Projects Configuration:**
- Two test projects defined in vite.config.ts:
  1. **client**: Browser-based tests for Svelte components
     - Runs: `*.svelte.{test,spec}.{js,ts}`
     - Provider: Playwright + Chromium
     - Excludes: `src/lib/server/**`
  2. **server**: Node-based tests for utilities and logic
     - Runs: `*.{test,spec}.{js,ts}` excluding svelte tests
     - Environment: Node.js

**Assertion Settings:**
```typescript
expect: { requireAssertions: true }
```
- Every test must have at least one assertion

## Common Patterns

**Async Testing:**
```typescript
it('should render h1', async () => {
	render(Page);
	const heading = page.getByRole('heading', { level: 1 });
	await expect.element(heading).toBeInTheDocument();
});
```

**Component Rendering:**
- Import: `import { render } from 'vitest-browser-svelte'`
- Use: `render(Component)`
- Browser context available: `page.getByRole()`, `page.getByText()`, etc.

## Svelte-Specific Testing

**Browser Integration:**
- Svelte components tested in actual browser environment (Playwright/Chromium)
- Use `vitest-browser-svelte` for rendering: `render(Page)`
- DOM queries via Playwright query API: `page.getByRole()`, `page.getByText()`

**Component Patterns:**
- Props: Test via component props interface
- Reactivity: Verify state changes affect DOM
- Events: Test event handlers via user interactions

## Future Improvements

**Current Gaps:**
- Limited test coverage (only 2 test files)
- No E2E tests yet
- No component snapshot tests
- No mock data factories separate from production utils.ts

**Recommended Patterns:**
1. Create `src/__fixtures__` directory for test-only data factories
2. Add component tests for complex interactive components (BracketTiers, AddPhaseMenu)
3. Implement E2E tests for complete tournament creation flow
4. Add snapshot tests for UI consistency

---

*Testing analysis: 2026-02-27*
