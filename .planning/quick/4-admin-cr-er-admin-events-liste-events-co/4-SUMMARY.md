---
phase: quick-4
plan: 4
subsystem: admin-routes
tags: [admin, events, entities, sidebar, sveltekit]
key-files:
  created:
    - packages/front/src/routes/(admin)/admin/events/+page.server.ts
    - packages/front/src/routes/(admin)/admin/events/+page.svelte
    - packages/front/src/routes/(admin)/admin/entities/+page.server.ts
    - packages/front/src/routes/(admin)/admin/entities/+page.svelte
  modified:
    - packages/front/src/routes/(admin)/+layout.svelte
decisions:
  - EntityRowSchema used for /admin/entities (no parent_id needed for list view)
  - Dual-branch SQL query pattern (entityIds empty/not) reused from former (app)/events
  - adminFederal guard on /admin/entities consistent with /admin/entities/new pattern
metrics:
  duration: 6 min
  completed: 2026-03-08T14:16:05Z
  tasks: 3
  files: 5
---

# Quick Task 4: admin /events list, /entities list, sidebar correction

**One-liner:** Admin sidebar updated to Accueil/Évènements/Entités; new /admin/events and /admin/entities list pages created with Zod-validated SQL queries and Flowbite UI.

## Tasks Completed

| Task | Description | Commit |
|------|-------------|--------|
| 1 | Create /admin/events list page | 1923977 |
| 2 | Create /admin/entities list page | 8740ad5 |
| 3 | Fix admin sidebar (3 correct links) | 2598eb9 |

## What Was Built

### /admin/events (+page.server.ts + +page.svelte)
- Dual-branch SQL query: when user has entity roles, includes events visible to those entities (non-draft); otherwise only own events
- Zod validation via `EventListItemSchema`
- Cards with status badge (draft=gray, ready=green, started=blue, finished=indigo)
- Edit link for non-finished events: "Reprendre l'édition →" for draft, "Modifier →" for others
- "Créer un événement" button → /admin/events/new

### /admin/entities (+page.server.ts + +page.svelte)
- adminFederal guard consistent with /admin/entities/new pattern
- SQL: `SELECT id, name, type FROM entity ORDER BY type, name`
- Zod validation via `EntityRowSchema`
- Flowbite Table with type badges (federation=red, ligue=blue, comite=green, club=yellow)
- Empty state message, "Créer une entité" button → /admin/entities/new

### +layout.svelte (sidebar)
- Replaced "Créer un événement" + "Administration" with 3 links: Accueil, Évènements, Entités
- Desktop (aside) and mobile (nav dropdown) both updated
- Icons: house (Accueil), target/circles (Évènements), building (Entités)
- Same HTML/CSS structure preserved throughout

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

Files created:
- packages/front/src/routes/(admin)/admin/events/+page.server.ts - FOUND
- packages/front/src/routes/(admin)/admin/events/+page.svelte - FOUND
- packages/front/src/routes/(admin)/admin/entities/+page.server.ts - FOUND
- packages/front/src/routes/(admin)/admin/entities/+page.svelte - FOUND

Files modified:
- packages/front/src/routes/(admin)/+layout.svelte - FOUND

TypeScript: zero errors across all tasks.
