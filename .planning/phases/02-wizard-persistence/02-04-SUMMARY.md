---
plan: 02-04
status: complete
completed: 2026-03-02
---

## Summary

Edit route now accepts draft/ready/started events. EventStep is read-only when started. Breadcrumb steps are clickable.

## Key Files

### Modified
- `packages/front/src/routes/(app)/events/[id]/edit/+page.server.ts` — filter IN ('draft','ready','started'), load phases from phase table, return eventStatus
- `packages/front/src/routes/(app)/events/[id]/edit/+page.svelte` — pass eventStatus to components
- `packages/front/src/lib/tournament/components/EventStep.svelte` — readonly prop, fieldset disabled when started
- `packages/front/src/lib/tournament/components/Breadcrumb.svelte` — onStepClick prop, steps clickable
- `packages/front/src/routes/(app)/events/new/+page.svelte` — breadcrumb wired with step navigation

## What Was Built

- Edit route accepts ready and started events (not just draft)
- Phases loaded from `phase` table via JOIN, grouped by tournament_id
- EventStep fields disabled (fieldset) when eventStatus === 'started'
- Breadcrumb steps are now buttons with onStepClick handler

## Commits
- 19a9626: feat(02-04): edit route accepts ready/started, EventStep readonly, Breadcrumb cliquable
