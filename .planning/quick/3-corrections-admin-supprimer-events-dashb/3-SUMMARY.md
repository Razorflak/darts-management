---
phase: quick-3
plan: "01"
subsystem: frontend-routing
tags: [admin, routing, layout, sidebar, cleanup]
dependency_graph:
  requires: [quick-2]
  provides: [clean-events-route, empty-admin-dashboard, overlay-sidebar]
  affects: [packages/front/src/routes/(app), packages/front/src/routes/(admin)]
tech_stack:
  added: []
  patterns: [overlay sidebar with position fixed, container mx-auto layout alignment]
key_files:
  created: []
  modified:
    - packages/front/src/routes/(app)/+layout.svelte
    - packages/front/src/routes/(admin)/admin/+page.svelte
    - packages/front/src/routes/(admin)/admin/+page.server.ts
    - packages/front/src/routes/(admin)/+layout.svelte
  deleted:
    - packages/front/src/routes/(app)/events/+page.svelte
    - packages/front/src/routes/(app)/events/+page.server.ts
decisions:
  - "(app)/events route removed entirely — individual event pages (app)/events/[id]/* remain untouched"
  - "Admin sidebar uses position:fixed z-40 overlay — no flex push, content retains full container width"
  - "Admin main gets container mx-auto px-4 py-6 + mt-12 md:mt-0 — identical constraints to (app) layout"
metrics:
  duration: "3 min"
  completed_date: "2026-03-08"
  tasks_completed: 3
  files_modified: 6
---

# Quick Task 3: Corrections admin — delete /events, empty dashboard, sidebar overlay

**One-liner:** Suppression de la route (app)/events, vidage du dashboard /admin, et sidebar admin convertie en overlay position:fixed sans push du contenu.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Supprimer /events et nettoyer la navbar | 7279c5f | Deleted +page.svelte, +page.server.ts; edited (app)/+layout.svelte |
| 2 | Dashboard /admin vide | e754b38 | Replaced admin/+page.svelte and +page.server.ts |
| 3 | Sidebar overlay + largeur contenu alignée | 9a8702b | Refactored (admin)/+layout.svelte |

## What Was Built

### Task 1: Route /events supprimée
- Deleted `(app)/events/+page.svelte` and `(app)/events/+page.server.ts`
- Removed `<NavLi href="/events">Événements</NavLi>` from `(app)/+layout.svelte`
- Routes under `(app)/events/[id]/` are untouched (individual event pages remain)

### Task 2: Dashboard /admin vide
- `admin/+page.svelte` now shows only a label "Dashboard" + h1 "Administration" (same visual pattern as homepage)
- `admin/+page.server.ts` stripped of SQL query and grouped return — returns `{}` with adminFederal protection maintained

### Task 3: Sidebar overlay
- Removed outer `<div class="flex min-h-screen">` wrapper
- `<aside>` changed from `shrink-0` flow positioning to `fixed top-0 left-0 h-full z-40`
- `<main>` changed from `flex-1 p-6 ... overflow-auto` to `container mx-auto px-4 py-6 mt-12 md:mt-0`
- Mobile behavior unchanged (fixed header at top, dropdown overlay)

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

Files exist:
- packages/front/src/routes/(app)/+layout.svelte: FOUND
- packages/front/src/routes/(admin)/admin/+page.svelte: FOUND
- packages/front/src/routes/(admin)/admin/+page.server.ts: FOUND
- packages/front/src/routes/(admin)/+layout.svelte: FOUND
- packages/front/src/routes/(app)/events/+page.svelte: DELETED (expected)
- packages/front/src/routes/(app)/events/+page.server.ts: DELETED (expected)

Commits:
- 7279c5f: chore(quick-3-01): FOUND
- e754b38: feat(quick-3-02): FOUND
- 9a8702b: feat(quick-3-03): FOUND
