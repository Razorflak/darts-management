# Project State

*Reconstructed: 2026-02-28 — no STATE.md found*

## Project Reference

**What:** Plateforme de gestion de tournois pour la fédération française de fléchette traditionnelle
**Core Value:** Permettre à un organisateur de créer un tournoi complexe, le lancer, et que le système gère automatiquement la génération des matchs jusqu'aux classements finaux.

## Current Position

**Phase:** — (définition des requirements)
**Plan:** —
**Status:** Milestone v1.0 démarré — définition des requirements en cours

## Progress

```
[Initialisation] ████░░░░░░░░░░░░░░░░ 20%

✓ PROJECT.md initialisé
✓ Codebase mappée (codebase/)
✓ Recherche stack (research/STACK.md)
✗ ROADMAP.md — à créer
✗ Phases — à planifier
```

## Work Done So Far

- 2026-02-27: Projet initialisé, codebase mappée, recherche stack complétée
- Découverte clé : Lucia v3 déprécié → Better Auth v1.4.x recommandé
- Schéma DB clé : pattern "toujours des équipes" (simples = équipe de 1 joueur)

## Recent Decisions

- Auth : Better Auth v1.4.x (remplace Lucia v3 déprécié)
- Temps réel : SSE natif SvelteKit (pas de sveltekit-sse)
- Génération brackets : fonctions TypeScript pures maison
- Pas d'ORM : raw SQL uniquement via packages/db

## Pending Todos

*(aucun)*

## Blockers / Concerns

- Le wizard de création de tournoi frontend est en cours de développement (git status montre des fichiers modifiés)

## Session Continuity

Last session: 2026-02-28
Stopped at: STATE.md reconstruit — roadmap à créer pour démarrer les phases
Resume file: —
