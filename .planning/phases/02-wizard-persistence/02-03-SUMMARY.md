---
plan: 02-03
status: complete
completed: 2026-03-02
---

## Summary

Rewrote save and publish endpoints to write phases to the dedicated `phase` table instead of JSONB column.

## Key Files

### Modified
- `packages/front/src/routes/(app)/events/new/save/+server.ts` — INSERT INTO phase per tournament phase
- `packages/front/src/routes/(app)/events/new/publish/+server.ts` — same pattern for publish path

## What Was Built

Both save (draft) and publish endpoints now:
1. INSERT INTO tournament (without phases column — removed in 02-01)
2. Loop over each tournament's phases and INSERT INTO phase table
3. DELETE + re-INSERT pattern for updates (idempotent)
4. Correct column mapping: GroupPhase → players_per_group/qualifiers_per_group, EliminationPhase → qualifiers/tiers JSONB

## Commits
- c0a5dba: feat(02-03): rewrite save/publish endpoints — write phases to phase table
