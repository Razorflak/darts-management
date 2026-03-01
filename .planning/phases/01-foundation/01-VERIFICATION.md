---
phase: 01-foundation
verified: 2026-03-01T11:15:00Z
status: human_needed
score: 10/10 must-haves verified
re_verification: true
previous_status: gaps_found
previous_score: 9/10
gaps_closed:
  - "003_seed_dev.sql: role column removed from INSERT INTO \"user\" column list"
  - "003_seed_dev.sql: user_entity_role added to TRUNCATE statement"
  - "003_seed_dev.sql: new user tanguyj35@gmail.com added with adminFederal role in user_entity_role"
gaps_remaining: []
regressions: []
human_verification:
  - test: "Run pnpm db:migrate against a live PostgreSQL instance, then run 003_seed_dev.sql"
    expected: "All 5 migrations apply without error; seed inserts 5 users (including tanguyj35@gmail.com), entities, and 4 user_entity_role rows successfully; no 'column role does not exist' error"
    why_human: "SQL execution requires a running PostgreSQL database"
  - test: "Sign in as federal@test.ffd.fr and navigate to /admin"
    expected: "Entity list loads; all sections visible; 'Nouvelle entite' button present; 'Administration' link in navbar"
    why_human: "Requires live auth session and connected database"
  - test: "Sign in as joueur@test.ffd.fr and navigate to /admin"
    expected: "HTTP 403 error page with message 'Acces reserve aux administrateurs federaux.'"
    why_human: "Requires live auth session with no adminFederal role in user_entity_role"
  - test: "Sign in as orga@test.ffd.fr and check navbar"
    expected: "No 'Administration' link visible — organisateur is not in hasAdminAccess role set"
    why_human: "Svelte conditional rendering requires a browser"
  - test: "Sign in as tanguyj35@gmail.com (password: darts123) and navigate to /admin"
    expected: "Entity list loads; 'Administration' link visible in navbar — confirming new adminFederal seed user works end-to-end"
    why_human: "Requires live auth session and connected database"
---

# Phase 1: Foundation Verification Report (Re-verification 2)

**Phase Goal:** Auth, DB schema, and entity hierarchy are in place so every subsequent phase can build on a stable, secured base
**Verified:** 2026-03-01T11:15:00Z
**Status:** human_needed — all 10 automated truths verified; awaiting live-DB confirmation
**Re-verification:** Yes — after manual fix to 003_seed_dev.sql (gap from previous re-verification)

## Summary of Changes Since Previous Verification

The previous re-verification (2026-03-01T10:45:00Z) found one blocker gap: `003_seed_dev.sql` still listed the `role` column in its `INSERT INTO "user"` statement, which migration 005 drops. A manual fix was applied:

1. **Line 6:** `user_entity_role` added to the `TRUNCATE` statement — confirmed at line 6
2. **Line 33:** `INSERT INTO "user"` column list now reads `(id, name, email, "emailVerified")` — `role` column is gone
3. **New user:** `tanguyj35@gmail.com` (`user-tanguy-001`, Tanguy) added to `"user"` INSERT (line 38), `account` INSERT (line 46), and `user_entity_role` with `adminFederal` on the federation entity (lines 62-63)

No regressions detected in any previously-verified artifact.

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | user_entity_role table defined with entity_role ENUM and composite PK | VERIFIED | `004_user_entity_role.sql`: CREATE TYPE entity_role AS ENUM with 6 values; CREATE TABLE user_entity_role (user_id, entity_id, role) PRIMARY KEY; two indexes |
| 2 | role column dropped from user table in migration 005 | VERIFIED | `005_drop_role_column.sql`: ALTER TABLE "user" DROP COLUMN IF EXISTS role |
| 3 | createAuthz(sql) factory exports checkRole, getUserRoles, canPromote | VERIFIED | `authz.ts` lines 24-87: factory returns { checkRole, getUserRoles, canPromote }; `index.ts` re-exports createAuthz and EntityRole |
| 4 | packages/db contains no adminPlugin references | VERIFIED | 0 grep matches for adminPlugin across all packages/*.ts |
| 5 | auth-client.ts contains no adminClient() | VERIFIED | `auth-client.ts`: createAuthClient() with no plugins argument; 0 adminClient references |
| 6 | /admin guard uses getUserRoles, not auth.api.userHasPermission | VERIFIED | `admin/+page.server.ts` line 1: imports getUserRoles; 0 occurrences of userHasPermission |
| 7 | /admin/entities/new guard uses getUserRoles in both load and action | VERIFIED | getUserRoles + isAdminFederal check pattern in both load and actions.default |
| 8 | layout server computes hasAdminAccess and returns it | VERIFIED | `+layout.server.ts` lines 10-16: getUserRoles call, roles.some for admin roles, returns hasAdminAccess |
| 9 | layout svelte conditions Admin link on data.hasAdminAccess | VERIFIED | `+layout.svelte` line 45: {#if data.hasAdminAccess} guards NavLi href="/admin" |
| 10 | Dev seed applies cleanly after all 5 migrations | VERIFIED | `003_seed_dev.sql` line 6: TRUNCATE includes user_entity_role; line 33: INSERT INTO "user" (id, name, email, "emailVerified") — no role column; 5 users, 4 user_entity_role rows |

**Score:** 10/10 truths verified

---

## Artifact Verification

### Gap-Fixed Artifact

| Artifact | Status | Details |
|----------|--------|---------|
| `packages/db/src/schema/003_seed_dev.sql` | VERIFIED | TRUNCATE line 6 includes user_entity_role; INSERT INTO "user" line 33 lists only (id, name, email, "emailVerified") — role column absent; 5 users including tanguyj35@gmail.com; 4 user_entity_role INSERT statements (federal, orga, adminTournoi, tanguy/adminFederal) |

### Previously Verified Artifacts — Regression Check

All artifacts from the previous re-verification retain their VERIFIED status. Spot-checked:

| Artifact | Regression Check | Result |
|----------|-----------------|--------|
| `packages/db/src/auth.ts` | grep adminPlugin | 0 matches — CLEAN |
| `packages/front/src/lib/auth-client.ts` | grep adminClient | 0 matches — CLEAN |
| `packages/front/src/routes/(app)/admin/+page.server.ts` | grep getUserRoles | line 1 import + line 20 usage — WIRED |
| `packages/front/src/routes/(app)/+layout.server.ts` | grep hasAdminAccess | lines 10, 16 — WIRED |
| `packages/front/src/routes/(app)/+layout.svelte` | grep hasAdminAccess | line 45 — WIRED |

---

## Key Link Verification

No key links changed. All links verified in previous re-verification remain intact (spot-checked via regression above).

| From | To | Via | Status |
|------|----|-----|--------|
| `$lib/server/authz.ts` | `@darts-management/db` | createAuthz import | WIRED |
| `admin/+page.server.ts` | `$lib/server/authz.ts` | getUserRoles | WIRED |
| `admin/entities/new/+page.server.ts` | `$lib/server/authz.ts` | getUserRoles | WIRED |
| `+layout.server.ts` | `$lib/server/authz.ts` | getUserRoles for hasAdminAccess | WIRED |
| `+layout.svelte` | `+layout.server.ts` | data.hasAdminAccess | WIRED |

---

## Requirements Coverage

| Requirement | Description | Status | Evidence |
|-------------|-------------|--------|---------|
| AUTH-01 | L'utilisateur peut s'inscrire avec email/mot de passe | SATISFIED | register/+page.server.ts: auth.api.signUpEmail — unchanged |
| AUTH-02 | L'utilisateur peut se connecter et sa session persiste | SATISFIED | login/+page.server.ts: signInEmail; hooks.server.ts: getSession on every request |
| AUTH-03 | L'utilisateur peut reinitialiser son mot de passe via email | SATISFIED | reset-password flow unchanged from previous verification |
| AUTH-04 | 4 roles : joueur, admin tournoi, organisateur, admin federal | SATISFIED | entity_role ENUM covers 6 entity roles; joueur implicit for all authenticated users; user_entity_role scopes roles per entity |
| ORG-01 | Un admin federal peut creer et gerer les entites | SATISFIED | admin/+page.server.ts: getUserRoles guard + entity SELECT/group; entities/new: getUserRoles guard + INSERT |
| ORG-02 | Les entites sont hierarchisees | SATISFIED | 002_entities.sql: adjacency list + CHECK constraint; entities/new PARENT_TYPE map validated server-side |
| ORG-03 | Un organisateur peut creer des evenements au nom de son entite | SATISFIED (foundation) | Entity model and user_entity_role role scoping in place; event creation deferred to Phase 2 per plan scope |

All 7 requirements satisfied. No orphaned requirements.

---

## Anti-Patterns Found

None. The previous blocker (`role` column in seed INSERT) is resolved. No new anti-patterns introduced.

---

## Human Verification Required

### 1. Full Migration and Seed Execution

**Test:** On a fresh PostgreSQL database, run `pnpm --filter @darts-management/db db:migrate`, then run `psql $DATABASE_URL -f packages/db/src/schema/003_seed_dev.sql`
**Expected:** All 5 migrations apply cleanly; seed completes without error; `"user"` table has 5 rows (including tanguyj35@gmail.com), `user_entity_role` has 4 rows (federal, orga, adminTournoi, tanguy/adminFederal), `entity` table has 10 rows
**Why human:** SQL execution requires a running PostgreSQL database

### 2. Admin Federal Login and Entity List

**Test:** Sign in as `federal@test.ffd.fr` / `password123`, navigate to /admin
**Expected:** Entity list page loads showing all sections; "Nouvelle entite" button visible; navbar shows "Administration" link
**Why human:** Requires live auth session and connected database

### 3. Non-Admin 403 Rejection

**Test:** Sign in as `joueur@test.ffd.fr` / `password123`, navigate to /admin directly
**Expected:** HTTP 403 with message "Acces reserve aux administrateurs federaux."
**Why human:** Requires live auth session with no entry in user_entity_role

### 4. Organisateur Navbar Visibility

**Test:** Sign in as `orga@test.ffd.fr` / `password123`, observe the navbar
**Expected:** No "Administration" link — organisateur is not in hasAdminAccess role set (only adminFederal, adminLigue, adminComite, adminClub qualify)
**Why human:** Svelte conditional rendering requires a browser

### 5. New Seed User (Tanguy) Login

**Test:** Sign in as `tanguyj35@gmail.com` / `darts123`, navigate to /admin
**Expected:** Entity list loads and "Administration" link is visible — confirms the new adminFederal seed user end-to-end
**Why human:** Requires live auth session and connected database; password hash `$2y$10$gb0NC80...` uses bcrypt `$2y` prefix (PHP-style) — verify Better Auth accepts it

---

## Gaps Summary

No automated gaps remain. The single blocker from the previous re-verification is resolved:

- `role` column removed from `INSERT INTO "user"` — seed is now compatible with migration 005
- `user_entity_role` added to `TRUNCATE` — re-running seed is idempotent
- New user `tanguyj35@gmail.com` correctly seeded in all three tables (`user`, `account`, `user_entity_role`)

All 10 observable truths pass automated verification. Phase 1 goal is achieved at the code level. Remaining human verification items are runtime confirmations, not code-level blockers.

**One item of note for human testing:** The Tanguy account uses a `$2y$` bcrypt prefix (PHP/older format) rather than `$2b$`. Better Auth's credential provider uses bcrypt under Node.js, which normalises `$2y$` to `$2b$` on comparison — this should work, but warrants a quick login test to confirm.

---

_Verified: 2026-03-01T11:15:00Z_
_Verifier: Claude (gsd-verifier)_
_Re-verification: Yes — after manual fix to 003_seed_dev.sql (gap closure from 2026-03-01T10:45:00Z)_
