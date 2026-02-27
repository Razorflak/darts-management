# Codebase Concerns

**Analysis Date:** 2026-02-27

## Critical Issues

### API Integration Not Implemented
**Issue:** Tournament creation wizard submits to console only, no actual data persistence.

**Files:**
- `packages/front/src/routes/tournaments/new/+page.svelte` (line 38)

**Impact:**
- Complete feature non-functional; data is lost on page navigation
- Users cannot actually create tournaments
- No backend integration exists yet

**Current State:**
```typescript
function publish() {
	// TODO: submit to API
	console.log('Publish', JSON.stringify({ event, tournaments, publishOptions }))
	goto('/')
}
```

**Fix approach:**
- Implement API endpoint to accept tournament creation payload
- Add proper error handling and user feedback
- Store structured data in PostgreSQL via `packages/db`

---

## Tech Debt

### Weak ID Generation
**Issue:** Uses `Math.random().toString(36).slice(2, 10)` for all entity IDs.

**Files:**
- `packages/front/src/lib/tournament/utils.ts` (line 3-5)

**Problems:**
- Not cryptographically secure
- Collision risk in distributed environments
- Database will need to regenerate IDs on save
- No guaranteed uniqueness across sessions

**Current Pattern:**
```typescript
export function genId(): string {
	return Math.random().toString(36).slice(2, 10)
}
```

**Fix approach:**
- Use UUID v4 library (e.g., `uuid` package)
- Or use database-generated IDs on server-side save
- Treat client-side IDs as temporary identifiers only

---

### Incomplete Validation
**Issue:** Forms use `required` HTML attributes but no TypeScript validation.

**Files:**
- `packages/front/src/lib/tournament/components/EventStep.svelte`
- `packages/front/src/lib/tournament/components/TournamentForm.svelte`
- `packages/front/src/lib/tournament/components/PublishStep.svelte`

**Problems:**
- HTML5 validation can be bypassed
- No business logic validation (e.g., startDate <= endDate, quota > 0, playersPerGroup <= entrants)
- No validation before API submission
- Invalid data could reach backend

**Examples Missing:**
- Tournament quota must be ≥ 2
- Start date must not be after end date
- Players per group must not exceed entrants in a phase
- qualifiers must not exceed entrants
- Qualifiers per group must be sensible (≤ playersPerGroup typically)

**Fix approach:**
- Add Zod/Valibot schema validation for EventData, Tournament, Phase types
- Validate before proceeding to next step
- Validate before API submission
- Show user-friendly validation errors

---

### Unreliable Date Handling
**Issue:** Complex Date object conversion logic with timezone edge cases.

**Files:**
- `packages/front/src/lib/tournament/components/EventStep.svelte` (lines 14-27)
- `packages/front/src/lib/tournament/components/TemplateModal.svelte` (lines 20-27)
- `packages/front/src/lib/tournament/components/PublishStep.svelte` (lines 23-29)

**Problems:**
- Multiple date conversion patterns across codebase
- `new Date(event.startDate + 'T00:00')` assumes UTC, may fail across timezones
- `toISOString().slice(0, 10)` discards time information
- Datepicker Date objects + ISO string conversions scattered everywhere
- Tournament has optional `startDate` field that may diverge from event startDate

**Current Patterns:**
```typescript
// EventStep.svelte
let startDateObj = $state<Date | undefined>(
	event.startDate ? new Date(event.startDate + 'T00:00') : undefined,
)

// TemplateModal.svelte
function toISO(date: Date): string {
	return date.toISOString().slice(0, 10)
}

// PublishStep.svelte
const d = new Date(`${date}T${time || '00:00'}`)
```

**Fix approach:**
- Create centralized date utility module (e.g., `src/lib/tournament/dateUtils.ts`)
- Use date-fns or Day.js for consistent formatting
- Store dates as ISO strings throughout (YYYY-MM-DD)
- Handle timezone explicitly (likely local user time, not UTC)
- Document date semantics (event date vs tournament date vs phase date)

---

### Malformed HTML in TemplateModal
**Issue:** Invalid Datepicker implementation with debugging code left behind.

**Files:**
- `packages/front/src/lib/tournament/components/TemplateModal.svelte` (lines 117-129)

**Problems:**
```svelte
<div class="flex flex-row border-t border-gray-100 pt-4">
	<p class="mb-2 text-sm font-medium text-gray-700">...</p>
	<Datepicker
        style="toto"                    <!-- Invalid style attribute -->
		bind:value={startDateObj}
        inline={true}                   <!-- Appears to be test code -->
		locale="fr-FR"
		...
	/>
</div>
```

- `style="toto"` is invalid CSS
- `inline={true}` may not be appropriate for modal context
- Date picker appears inside paragraph container hierarchy
- No label associated with Datepicker

**Fix approach:**
- Remove debug attributes (`style="toto"`)
- Verify correct Flowbite-Svelte Datepicker props
- Restructure layout to proper form hierarchy
- Add proper ARIA labels for accessibility
- Test date selection UX in modal context

---

## Design Issues

### Complex Type Discrimination
**Issue:** Union types `Phase = GroupPhase | EliminationPhase` require runtime type guards throughout codebase.

**Files:**
- `packages/front/src/lib/tournament/types.ts` (line 61)
- `packages/front/src/lib/tournament/components/PublishStep.svelte` (lines 6-11)
- `packages/front/src/lib/tournament/components/phases/PhaseCard.svelte` (lines 17-22)
- `packages/front/src/lib/tournament/components/TemplateModal.svelte` (lines 30-51)

**Pattern Repeated:**
```typescript
function isGroupPhase(p: Phase): p is GroupPhase {
	return p.type === 'round_robin' || p.type === 'double_loss_groups'
}
function isEliminationPhase(p: Phase): p is EliminationPhase {
	return p.type === 'single_elim' || p.type === 'double_elim'
}
```

**Problems:**
- Type guard logic duplicated in at least 3 files
- Easy to introduce bugs if discriminant values change
- No exhaustiveness checking at compile time
- TypeScript narrowing doesn't always work reliably

**Fix approach:**
- Extract type guards to `packages/front/src/lib/tournament/typeGuards.ts`
- Use discriminated union properly
- Consider switch statements instead of if-chains
- Add exhaustiveness checks

---

### Mixed Concerns in Components
**Issue:** Components handle too many responsibilities: state management, validation, type narrowing, data transformation.

**Files:**
- `packages/front/src/lib/tournament/components/PublishStep.svelte` (128 lines)
- `packages/front/src/lib/tournament/components/EventStep.svelte` (124 lines)
- `packages/front/src/lib/tournament/components/TemplateModal.svelte` (138 lines)

**Problems:**
- TemplateModal both selects template AND handles date selection AND transforms template to tournament data
- EventStep binds to individual form fields across scattered inputs
- No clear separation between display logic and data transformation
- Hard to test data transformation logic in isolation

**Fix approach:**
- Extract `applyTemplate()` logic to pure function in utils
- Create form state manager or composable
- Keep components small (ideal < 80 lines)
- Move data transformations to utils

---

## Missing Features

### No Form State Persistence
**Issue:** Wizard state is lost on page refresh.

**Files:**
- `packages/front/src/routes/tournaments/new/+page.svelte`

**Impact:**
- Users lose all input if they accidentally refresh mid-wizard
- No draft autosave mechanism
- Frustrating UX for complex multi-step form

**Fix approach:**
- Store step state in URL query params or browser localStorage
- Implement autosave on data changes
- Add "unsaved changes" warning on navigation

---

### No Constraint Documentation
**Issue:** Tournament structure constraints not documented in code.

**Files:**
- `packages/front/src/lib/tournament/types.ts`

**Examples Missing:**
- Tournament quota range validation (type says quota: number, no constraints)
- Phase entrants can't be arbitrarily assigned
- Bracket rounds (4096, 2048, etc) are power-of-2 only—why? Not documented
- What happens if qualifiers > entrants?
- Can phases be empty?

**Fix approach:**
- Add JSDoc comments with constraints
- Consider branded types for constrained numbers
- Document tournament flow rules

---

## Database Integration Gaps

### No Database Package Integration
**Issue:** `packages/db` exists but is not connected to frontend or used anywhere.

**Files:**
- `packages/db/src/index.ts` - only exports `sql` from client
- `packages/db/prisma/schema.prisma` - contains only datasource config
- No models defined yet

**Impact:**
- Cannot persist any tournament data
- No API to build against
- Database models may not align with frontend types

**Fix approach:**
- Complete Prisma schema (Event, Tournament, Phase models)
- Implement database client
- Create API routes in `packages/front/src/routes/api/`
- Align types between frontend and database

---

## Test Coverage Gaps

### No Tests for Tournament Wizard
**Impact:**
- Type guards untested
- Template application logic untested
- Date conversion edge cases not caught
- Form validation (if added) needs tests

**Files with No Tests:**
- `packages/front/src/lib/tournament/` (entire module)
- `packages/front/src/lib/tournament/components/` (all components)
- `packages/front/src/routes/tournaments/new/+page.svelte`

**Recommendation:**
- Add unit tests for utils (genId, createTournament, template application)
- Add component tests for EventStep, PublishStep form logic
- Add integration tests for wizard flow

---

## Security Considerations

### No Input Sanitization
**Issue:** User input (tournament name, location, etc.) passed directly to console and will be sent to API.

**Files:**
- All form components

**Risk:**
- XSS if data is rendered without escaping on backend
- SQL injection if raw SQL queries used on backend (note: memory says "no ORM — raw SQL only")
- HTML/script injection in tournament names

**Current Mitigation:**
- Svelte auto-escapes by default
- Frontend input type constraints (some)

**Recommendations:**
- Validate and sanitize on backend before storage
- Use parameterized queries for all database access
- Document that frontend input is untrusted

---

### ID Predictability
**Issue:** Weak random IDs could allow users to guess tournament URLs or IDs.

**Files:**
- `packages/front/src/lib/tournament/utils.ts` (genId)

**Risk:**
- If tournaments get URLs like `/tournament/abc123def`, enumeration is trivial
- Authentication/authorization must be strict on backend

**Fix approach:**
- Use UUID v4 for all identifiers
- Implement proper authorization checks (not just ID obscurity)

---

## Performance Considerations

### Template Data Hardcoded
**Issue:** EVENT_TEMPLATES is 221 lines of hardcoded template data in bundle.

**Files:**
- `packages/front/src/lib/tournament/templates.ts`

**Impact:**
- All templates loaded even if user never opens template modal
- Template changes require redeploy
- Cannot add templates dynamically

**Fix approach:**
- Load templates from API endpoint
- Cache in browser
- Make templates configurable on backend

---

## Fragile Areas

### BracketRound Enum at Risk
**Issue:** BracketRound type is fixed list of power-of-2 values. Easy to break constraint.

**Files:**
- `packages/front/src/lib/tournament/types.ts` (line 21)

**Why Fragile:**
- Used as array index in many places
- No validation that only valid rounds are used
- Comment says "covers up to 4096 players" but limit is implied, not enforced
- If someone adds non-power-of-2 value, bracket math breaks silently

**Fix approach:**
- Add validation function `isValidBracketRound()`
- Document power-of-2 requirement
- Consider using branded types for compile-time safety

---

## Data Consistency Issues

### Tournament vs Event Date Mismatch Possible
**Issue:** Tournament can have optional `startDate` different from Event `startDate`.

**Files:**
- `packages/front/src/lib/tournament/types.ts` (lines 27-34, 63-73)
- Comment at line 70-71 suggests multi-day events where tournaments can be on different days

**Problems:**
- UI doesn't clearly show tournament can be on different date
- No validation that tournament date is within event date range
- Template modal sets tournament dates with `dayOffset` — fragile offset logic

**Current Code:**
```typescript
interface Tournament {
	startDate?: string  // Different from event startDate
	startTime: string
}

// In TemplateModal.svelte:
startDate: toISO(addDays(startDateObj!, t.dayOffset ?? 0))
```

**Risk:**
- User could create tournament on invalid date
- Multi-day event validation missing
- Offset logic in modal is not enforced by types

**Fix approach:**
- Make relationship explicit: `multidayEventDates: { start: string; end: string }`
- Validate tournament dates are within event date range
- Add explicit UI support for multi-day events

---

## Summary of Blockers

| Issue | Severity | Blocker |
|-------|----------|---------|
| No API implementation | Critical | Yes - feature non-functional |
| Weak ID generation | High | Yes - will fail at scale |
| No validation | High | Yes - invalid data reaches DB |
| Database not integrated | Critical | Yes - no persistence |
| Malformed HTML in modal | Medium | Yes - UX broken |
| Missing Prisma schema | Critical | Yes - cannot start backend |

---

*Concerns audit: 2026-02-27*
