---
status: fixing
trigger: "each-key-duplicate-undefined — Svelte runtime error each_key_duplicate — keyed {#each} block produces duplicate key undefined at indexes 0 and 1"
created: 2026-03-02T00:00:00Z
updated: 2026-03-02T00:20:00Z
---

## Current Focus

hypothesis: EliminationPhase tiers loaded from DB via /events/[id]/edit lack id fields — phases JSONB stored without tier.id (manually inserted test data or pre-normalization save), causing {#each tiers as tier (tier.id)} in BracketTiers.svelte to see multiple items with id === undefined
test: Inspect all code paths that produce Phase/BracketTier objects and check which ones may omit id
expecting: Only the DB-load path in edit/+page.server.ts is unsafe — all other paths (createBracketTier, createEliminationPhase, buildPhase in TemplateModal) generate IDs correctly
next_action: Implement defensive normalization in edit/+page.server.ts to add missing ids to phases and tiers loaded from DB

## Symptoms

expected: Les listes de tournois/phases s'affichent sans erreur
actual: Uncaught Svelte error each_key_duplicate — Keyed each block has duplicate key undefined at indexes 0 and 1
errors: "Uncaught Svelte error: each_key_duplicate\nKeyed each block has duplicate key undefined at indexes 0 and 1"
reproduction: Charger un brouillon d'événement via /events/[id]/edit quand le tournoi en DB a des phases EliminationPhase dont les tiers n'ont pas de champ id
started: Après introduction de la route /events/[id]/edit (plan 02-07)

## Eliminated

- hypothesis: Bug dans AddPhaseMenu.svelte (refactor UI)
  evidence: Le composant ne contient aucun {#each} avec clé — seuls des boutons HTML natifs
  timestamp: 2026-03-02T00:05:00Z

- hypothesis: Bug dans TemplateModal.svelte buildPhase()
  evidence: buildPhase() appelle genId() pour chaque phase ET pour chaque tier — les deux branches (GroupPhase et EliminationPhase) génèrent des IDs corrects
  timestamp: 2026-03-02T00:08:00Z

- hypothesis: Bug dans createBracketTier() / createEliminationPhase()
  evidence: Les deux fonctions dans utils.ts appellent genId() — IDs toujours présents depuis le commit initial 9251a5e
  timestamp: 2026-03-02T00:09:00Z

- hypothesis: Bug dans le chemin addTier() de BracketTiers.svelte
  evidence: addTier() appelle createBracketTier() qui génère un id — le {#each tiers as tier (tier.id)} reçoit toujours des tiers avec id quand ajoutés manuellement
  timestamp: 2026-03-02T00:10:00Z

- hypothesis: Problème de réactivité Svelte 5 $bindable perdant les ids
  evidence: Les deux {#each} avec clé (PhasesBuilder et BracketTiers) utilisent des objets mutés par référence correctement via $bindable — pas de perte d'id documentée dans Svelte 5
  timestamp: 2026-03-02T00:12:00Z

## Evidence

- timestamp: 2026-03-02T00:03:00Z
  checked: Tous les blocs {#each} avec clé dans le codebase
  found: Exactement 2 blocs keyed — PhasesBuilder.svelte:48 ({#each phases as phase, i (phase.id)}) et BracketTiers.svelte:49 ({#each tiers as tier (tier.id)})
  implication: L'erreur vient de l'un de ces deux blocs

- timestamp: 2026-03-02T00:06:00Z
  checked: utils.ts — genId(), createBracketTier(), createEliminationPhase(), createGroupPhase()
  found: Toutes les fonctions factory génèrent des ids via Math.random().toString(36).slice(2, 10) — présent depuis le commit initial
  implication: Les phases/tiers créés via l'UI ont toujours des ids

- timestamp: 2026-03-02T00:07:00Z
  checked: TemplateModal.svelte — buildPhase() et apply()
  found: buildPhase() mappe chaque PhaseTemplate vers une Phase avec id: genId(), et chaque tier avec { id: genId(), round, legs }. Correct.
  implication: L'application d'un template génère bien des ids sur phases ET tiers

- timestamp: 2026-03-02T00:11:00Z
  checked: edit/+page.server.ts — chargement des phases depuis la DB
  found: phases: t.phases as Tournament['phases'] — cast TypeScript brut sans validation ni normalisation. t.phases est de type unknown (JSONB PostgreSQL).
  implication: Si la DB contient des phases sans champ id (données de test insérées manuellement ou format ancien), les tiers n'auront pas d'id et déclencheront each_key_duplicate

- timestamp: 2026-03-02T00:13:00Z
  checked: Schema DB et timing d'introduction de la route edit
  found: La route /events/[id]/edit a été créée au plan 02-07 (commit 115ba38). C'est la PREMIÈRE fois que les phases sont chargées depuis la DB et rendues dans BracketTiers. Avant ce plan, seul le wizard /events/new existait (phases créées en mémoire, jamais depuis la DB).
  implication: Le bug est apparu avec la route edit — les phases en DB peuvent provenir de sessions de test où des données ont été insérées sans ids, ou via save/+server.ts avec des phases corrompues

- timestamp: 2026-03-02T00:15:00Z
  checked: templates.ts — EliminationPhaseTemplate.tiers
  found: Les tiers dans les templates (ex: elim3Tiers) n'ont PAS de champ id: [{ round: 8, legs: 3 }, { round: 4, legs: 4 }, { round: 2, legs: 5 }]. Ces objets ont exactement la structure qui produirait l'erreur si utilisés directement.
  implication: Si ces objets template étaient passés directement à BracketTiers sans passer par buildPhase(), on obtiendrait exactly each_key_duplicate undefined at indexes 0 and 1

- timestamp: 2026-03-02T00:17:00Z
  checked: save/+server.ts — INSERT/UPDATE de phases
  found: JSON.stringify(t.phases) — sérialise les phases telles qu'elles sont dans l'état client. Si le client envoie des phases correctes (avec ids), la DB stocke des ids. Si le client envoie des phases sans ids (impossible via UI normale), la DB stocke sans ids.
  implication: La DB peut contenir des phases sans ids si des données ont été insérées directement (SQL ou sessions de test dev)

## Resolution

root_cause: Le chargement des phases depuis la DB dans edit/+page.server.ts utilise un cast brut (t.phases as Tournament['phases']) sans valider que chaque Phase.id et chaque BracketTier.id existe. Si des tournois en DB ont des tiers sans champ id (données de test manuelles, ou EliminationPhaseTemplate sérialisé directement au lieu d'une EliminationPhase), le composant BracketTiers.svelte reçoit un tableau tiers où tier.id === undefined pour 2+ éléments, déclenchant each_key_duplicate.
fix: Ajouter une fonction normalizePhases() dans edit/+page.server.ts qui parcourt phases[] et ajoute un id généré à tout Phase ou BracketTier qui en manque — utilise une implémentation inline de genId() (Math.random().toString(36).slice(2, 10)) pour rester côté serveur sans import circulaire
verification: empty until verified
files_changed:
  - packages/front/src/routes/(app)/events/[id]/edit/+page.server.ts
