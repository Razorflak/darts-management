---
phase: quick-2
plan: "01"
subsystem: routing
tags: [admin, sidebar, navigation, routes, migration]
dependency_graph:
  requires: []
  provides:
    - "(admin) route group with collapsible sidebar layout"
    - "Admin guard in layout server (hasAdminAccess)"
    - "/admin and /admin/entities/new migrated to (admin) group"
    - "/admin/events/new and /admin/events/[id]/edit migrated to (admin) group"
  affects:
    - "packages/front/src/routes/(admin)/"
    - "packages/front/src/routes/(app)/events/+page.svelte"
tech_stack:
  added: []
  patterns:
    - "SvelteKit route groups for admin separation"
    - "Pure TailwindCSS collapsible sidebar (no flowbite-svelte dependency)"
    - "Svelte 5 runes: $state, $props for sidebar toggle state"
key_files:
  created:
    - packages/front/src/routes/(admin)/+layout.server.ts
    - packages/front/src/routes/(admin)/+layout.svelte
    - packages/front/src/routes/(admin)/admin/+page.server.ts
    - packages/front/src/routes/(admin)/admin/+page.svelte
    - packages/front/src/routes/(admin)/admin/entities/new/+page.server.ts
    - packages/front/src/routes/(admin)/admin/entities/new/+page.svelte
    - packages/front/src/routes/(admin)/admin/events/new/+page.server.ts
    - packages/front/src/routes/(admin)/admin/events/new/+page.svelte
    - packages/front/src/routes/(admin)/admin/events/new/save/+server.ts
    - packages/front/src/routes/(admin)/admin/events/new/publish/+server.ts
    - packages/front/src/routes/(admin)/admin/events/[id]/edit/+page.server.ts
    - packages/front/src/routes/(admin)/admin/events/[id]/edit/+page.svelte
  modified:
    - packages/front/src/routes/(app)/events/+page.svelte
  deleted:
    - packages/front/src/routes/(app)/admin/+page.server.ts
    - packages/front/src/routes/(app)/admin/+page.svelte
    - packages/front/src/routes/(app)/admin/entities/new/+page.server.ts
    - packages/front/src/routes/(app)/admin/entities/new/+page.svelte
    - packages/front/src/routes/(app)/events/new/+page.server.ts
    - packages/front/src/routes/(app)/events/new/+page.svelte
    - packages/front/src/routes/(app)/events/new/save/+server.ts
    - packages/front/src/routes/(app)/events/new/publish/+server.ts
    - packages/front/src/routes/(app)/events/[id]/edit/+page.server.ts
    - packages/front/src/routes/(app)/events/[id]/edit/+page.svelte
decisions:
  - "Sidebar links hardcoded in layout (not data-driven) — only 2 items, no complexity needed"
  - "Fetch URLs in migrated wizard pages updated to /admin/events/new/save|publish — required since routes moved"
  - "No content changes to migrated pages — purely structural relocation"
metrics:
  duration: "3 min"
  completed_date: "2026-03-08"
  tasks_completed: 3
  files_changed: 13
---

# Quick Task 2: Admin Section Route Restructuration Summary

**One-liner:** SvelteKit (admin) route group with TailwindCSS collapsible sidebar separates admin from public app, all admin routes migrated from (app).

## What Was Built

Created the `(admin)` SvelteKit route group to house all admin-specific routes with a dedicated navigation layout, separate from the `(app)` public layout with its top navbar.

## Tasks Completed

### Task 1: (admin) layout with collapsible sidebar

- `+layout.server.ts`: Guard that checks `hasAdminAccess` (adminFederal, adminLigue, adminComite, adminClub roles) — redirects to `/login` if unauthenticated, `/` if unauthorized
- `+layout.svelte`: Two-zone layout (sidebar + main content)
  - Desktop sidebar: collapsible via chevron button (w-56 expanded, w-14 collapsed), hidden on mobile
  - Mobile: fixed top header with hamburger toggle and dropdown overlay nav
  - Sidebar links: "Créer un événement" (`/admin/events/new`) and "Entités" (`/admin`)
  - Pure TailwindCSS, no flowbite-svelte sidebar — inline SVG icons

### Task 2: Migrate (app)/admin/* to (admin)/admin/

- Moved `/admin` (entities list page) and `/admin/entities/new` from `(app)` to `(admin)` group
- Content unchanged — layout guard handles hasAdminAccess; page-level isAdminFederal check preserved
- Old `(app)/admin/` directory removed entirely

### Task 3: Migrate event wizard routes to (admin)/admin/events/

- Moved `/events/new`, `/events/new/save`, `/events/new/publish`, `/events/[id]/edit` from `(app)` to `(admin)/admin/events/`
- Updated fetch URLs inside migrated wizard pages: `/events/new/save` → `/admin/events/new/save`, `/events/new/publish` → `/admin/events/new/publish`
- Updated links in `(app)/events/+page.svelte`: create button → `/admin/events/new`; edit links → `/admin/events/{id}/edit`
- Old `(app)/events/new/` and `(app)/events/[id]/edit/` removed

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Updated fetch URLs in migrated wizard pages**
- **Found during:** Task 3
- **Issue:** The wizard pages fetched `/events/new/save` and `/events/new/publish` — absolute paths that would 404 after the routes moved to `/admin/events/new/save` etc.
- **Fix:** Updated fetch URLs to `/admin/events/new/save` and `/admin/events/new/publish` in both `new/+page.svelte` and `[id]/edit/+page.svelte`
- **Files modified:** `(admin)/admin/events/new/+page.svelte`, `(admin)/admin/events/[id]/edit/+page.svelte`
- **Commit:** e2c974d

## Commits

| Hash | Message |
|------|---------|
| 70c6541 | feat(quick-2): create (admin) route group with collapsible sidebar layout |
| e96a963 | feat(quick-2): migrate (app)/admin/* routes to (admin)/admin/ |
| e2c974d | feat(quick-2): migrate event wizard routes to (admin)/admin/events and update links |

## Self-Check: PASSED

All 12 created files verified on disk. All 3 task commits verified in git log.
