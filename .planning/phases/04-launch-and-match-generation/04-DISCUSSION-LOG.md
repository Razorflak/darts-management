# Phase 4: Launch and Match Generation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-02
**Phase:** 04-launch-and-match-generation
**Areas discussed:** Architecture DDD, Sets/manches configuration, Seeding UI, Double KO taille variable, Affichage post-lancement

---

## Architecture DDD + Tests

| Option | Description | Selected |
|--------|-------------|----------|
| Générateurs dans `packages/front/lib/server/` | Comme suggéré par le research.md | |
| Générateurs dans `packages/domain/` | Fonctions pures sans dépendance DB, per CLAUDE.md | ✓ |
| Orchestration dans `packages/front/` | Inline dans les routes | |
| Nouveau package `packages/application/` | Orchestration cross-packages | ✓ |

**User's choice:** Architecture DDD stricte — générateurs dans `packages/domain/`, orchestration dans nouveau package `packages/application/`, accès DB dans `packages/db/`.

**Notes:** Tests unitaires obligatoires pour les algos de génération. L'utilisateur a fourni l'algo de seeding bracket KO standard (JavaScript) à adapter en TypeScript. Pour l'algo post-poule (sortie de poule → KO), l'utilisateur veut un premier jet récursif qui évite les affrontements de joueurs de la même poule.

---

## Sets/manches — Configuration UX

| Option | Description | Selected |
|--------|-------------|----------|
| Dans le wizard (PhaseCard) | Lors de la création/édition du tournoi | |
| Sur la page /launch | Formulaire éditable avant confirmation | |
| Page roster tournoi | Section configurable avant lancement | |

**User's choice:** "C'est déjà configuré dans phase.tiers, mais je n'aime pas au final le json en base de données, déplace ces infos dans une table."

**Notes:** L'utilisateur veut normaliser la colonne JSONB `phase.tiers` en table `phase_tier` (phase_id, position, sets_to_win, legs_per_set, qualifiers_count). Une ligne par round pour les phases élimination, une ligne pour les phases poule.

---

## Table phase_tier — Structure

| Option | Description | Selected |
|--------|-------------|----------|
| Table `phase_tier` | phase_id, position, sets_to_win, legs_per_set, qualifiers_count | ✓ |
| Colonne directe sur phase | sets_to_win + legs_per_set directement sur la table phase | |

**User's choice:** Table `phase_tier` (recommandée).

---

## Seeding UI — Réordonnement des équipes

| Option | Description | Selected |
|--------|-------------|----------|
| Drag-and-drop | Liste réordonnable visuellement | ✓ |
| Boutons ↑/↓ | Monter/descendre par ligne | |
| Inputs numérotés | Champ 'Seed #' par ligne | |

**User's choice:** Drag-and-drop (recommandé).

---

## Affichage post-lancement MVP

| Option | Description | Selected |
|--------|-------------|----------|
| Tableaux simples | Poules : tableau avec event_match_id + équipes + arbitre. Bracket KO : liste par round | ✓ |
| Arbre visuel basique | SVG/CSS avec connexions | |
| Texte brut | Simple liste de tous les matchs | |

**User's choice:** Tableaux simples (recommandé).

---

## Double KO taille variable

| Option | Description | Selected |
|--------|-------------|----------|
| Bloquer si != 8 | Avertissement page /launch | |
| Adapter automatiquement | Algo variable (complexe) | |
| Puissances de 2 obligatoires | Valider dans le wizard | ✓ |

**User's choice:** "Dans la création de tournois, on va forcer la sélection sur une valeur de puissances de 2."

**Notes:** La validation se fait dans le wizard (PhaseCard) — `players_per_group` doit être une puissance de 2 pour les phases `double_loss_groups`. Valeurs acceptées : 4, 8, 16, 32.

---

## Claude's Discretion

- Algorithme exact de calcul du `event_match_id`
- Ordre des matchs au sein d'une poule round-robin
- Design CSS du drag-and-drop seeding
- Nombre de `phase_tier` rows pour les phases poule (1 row)
