---
phase: 02-wizard-persistence
plan: 05
subsystem: ui
tags: [svelte, flowbite-svelte, wizard, publish, events-list]

# Dependency graph
requires:
  - phase: 02-wizard-persistence/02-01
    provides: PublishOptions removed from types.ts
  - phase: 02-wizard-persistence/02-04
    provides: edit page passes eventStatus prop to PublishStep
provides:
  - PublishStep sans checkboxes (Checkbox et PublishOptions supprimés)
  - PublishStep conditionne le bouton Publier sur eventStatus draft/undefined
  - Liste /events affiche liens d'édition pour tous statuts != finished
affects: [wave-3, 02-06, 02-07]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Prop eventStatus conditionne l'affichage des actions dans PublishStep"
    - "Liste events: condition sur status !== 'finished' plutôt que status === 'draft'"

key-files:
  created: []
  modified:
    - packages/front/src/lib/tournament/components/PublishStep.svelte
    - packages/front/src/routes/(app)/events/+page.svelte

key-decisions:
  - "PublishStep si ready/started = récapitulatif seul + message informatif (pas de bouton Publier)"
  - "Liens d'édition /events pour tous statuts sauf finished — texte différencié draft vs autres"

patterns-established:
  - "type alias (pas interface) pour Props Svelte — conformément aux conventions TypeScript du projet"

requirements-completed: [EVENT-05, EVENT-06]

# Metrics
duration: 2min
completed: 2026-03-02
---

# Phase 2 Plan 05: PublishStep Cleanup + Events List Edit Links Summary

**PublishStep épuré (suppression checkboxes + PublishOptions) et liste /events avec liens d'édition conditionnels pour tous les statuts éditables (draft, ready, started)**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-02T00:02:03Z
- **Completed:** 2026-03-02T00:04:04Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Suppression des 2 checkboxes "Options de publication" (notifications, openRegistrations) et de leur import Checkbox flowbite-svelte
- Suppression du prop `options: PublishOptions` et de l'import `PublishOptions` dans PublishStep
- Ajout du prop `eventStatus?: 'draft' | 'ready' | 'started'` conditionnant le bouton Publier
- Liste /events affiche maintenant un lien "Modifier →" pour les événements ready et started

## Task Commits

Each task was committed atomically:

1. **Task 1: Refactorer PublishStep — supprimer checkboxes, conditionner le bouton Publier** - `53b1211` (feat)
2. **Task 2: Mettre à jour /events list — liens d'édition pour ready et started** - `529a1ed` (feat)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified
- `packages/front/src/lib/tournament/components/PublishStep.svelte` — Suppression Checkbox/PublishOptions/options block; ajout eventStatus prop; bouton Publier conditionnel
- `packages/front/src/routes/(app)/events/+page.svelte` — Condition status !== 'finished' avec texte différencié draft vs ready/started

## Decisions Made
- PublishStep si ready/started: affiche récapitulatif seul + message informatif "Cet événement est publié. Utilisez Enregistrer pour mettre à jour." — le bouton Enregistrer dans le header du wizard suffit
- Texte du lien d'édition différencié: "Reprendre l'édition →" pour draft, "Modifier →" pour ready et started

## Deviations from Plan

None - plan executed exactly as written.

Note: `edit/+page.svelte` passait déjà `eventStatus={data.eventStatus}` à PublishStep (fait par plan 02-04) et `new/+page.svelte` n'avait jamais de prop `bind:options` — aucune modification supplémentaire requise sur ces fichiers.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Plans 02-05 complete — PublishStep nettoyé, liste /events mise à jour
- Wave 3 dependencies satisfaites pour les plans 02-06 et 02-07
- pnpm typecheck à valider en fin de wave 3 (tous plans complétés)

---
*Phase: 02-wizard-persistence*
*Completed: 2026-03-02*
