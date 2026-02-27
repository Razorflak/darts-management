# Darts Management

## What This Is

Plateforme de gestion complète pour la fédération française de fléchette traditionnelle. Elle permet à chaque entité de la hiérarchie fédérale (Fédération > Ligues > Comités > Clubs) d'organiser et gérer ses propres tournois — de la création jusqu'à la publication des classements en temps réel. À terme, la plateforme couvrira aussi la gestion des licenciés et des championnats inter-clubs.

## Core Value

Permettre à un organisateur de créer un tournoi complexe (multi-événements, multi-phases, multi-catégories), de le lancer, et que le système gère automatiquement la génération des matchs et le suivi des résultats jusqu'aux classements finaux.

## Requirements

### Validated

<!-- Issu du prototype existant — fondations UI posées, à connecter à une vraie API -->

- ✓ Wizard de création d'événement (nom, entité organisatrice, dates, lieu) — prototype
- ✓ Configuration multi-tournois dans un même événement — prototype
- ✓ Phases configurables : round-robin, double-défaite, élimination simple/double — prototype
- ✓ Système de templates pour création rapide — prototype
- ✓ Réorganisation des phases par drag-and-drop — prototype
- ✓ Aperçu et confirmation avant publication (PublishStep) — prototype

### Active

<!-- Focus v1 : tournois complets de bout en bout -->

- [ ] Persistance des tournois créés (server routes SvelteKit + PostgreSQL)
- [ ] Authentification et gestion des rôles avec Lucia (organisateur, admin tournoi, joueur, admin fédéral)
- [ ] Gestion de la hiérarchie fédérale (Fédération, Ligues, Comités, Clubs)
- [ ] Inscription des joueurs aux événements (auto-inscription licenciés + saisie manuelle organisateur)
- [ ] Check-in des joueurs le jour J (optionnel, configurable par tournoi)
- [ ] Lancement du tournoi : verrouillage de la configuration et génération de TOUS les matchs de TOUTES les phases
- [ ] Format set/manche configurable par phase
- [ ] Assignation automatique des arbitres aux matchs (joueur disponible dans le tournoi)
- [ ] Saisie des résultats par l'admin du tournoi (depuis feuilles de match papier)
- [ ] Avancement automatique des phases (remplissage des cases au fil des résultats)
- [ ] Classements et tableaux mis à jour en temps réel (SSE)
- [ ] Tableau de bord de la journée : vision globale de tous les matchs

### Out of Scope

- Saisie live des scores à la fléchette (tablette terrain) — post-v1
- Gestion des licenciés et des clubs — phase ultérieure
- Championnats inter-clubs (matchs par équipes, classements saison) — phase ultérieure
- Application mobile native — web-first
- Optimisation automatique des plannings horaires — post-v1 (le modèle de données l'anticipe)

## Context

**Hiérarchie fédérale :**
Fédération Française de Fléchette Traditionnelle > Ligues (régionales) > Comités (départementaux) > Clubs. Chaque entité organise ses propres tournois et gère ses membres.

**Structure d'un tournoi :**
- Un événement contient N tournois (un par catégorie : simples messieurs, doubles dames, open…)
- Chaque tournoi est composé de phases enchaînées (ex : poules → quarts → demi-finales → finale)
- Un match implique 2 joueurs/équipes + 1 arbitre (lui aussi joueur inscrit au tournoi)
- La configuration est libre jusqu'au lancement ; une fois lancé, tout est verrouillé

**Génération des matchs au lancement :**
Tous les matchs de toutes les phases sont générés à vide. Les phases éliminatoires ont leurs cases générées mais vides ; les joueurs sont assignés au fil des résultats des phases précédentes. Cette vision globale permettra à terme d'optimiser les plannings horaires.

**Format des matchs :**
Système de sets et de manches configurable par phase. En pratique actuellement : 1 set, X manches. Conçu pour absorber un changement de règlement fédéral (multi-sets).

**Saisie des résultats :**
Les joueurs remettent leurs feuilles de match à la table de marque. Un admin du tournoi saisit les résultats dans l'application. Pas de saisie live par les joueurs.

**Temps réel :**
Les écrans de classements et de suivi des matchs se mettent à jour automatiquement via SSE (Server-Sent Events).

**Base de code existante :**
Prototype frontend complet pour le wizard de création (SvelteKit + Svelte 5 runes). Package DB préparé (PostgreSQL + Prisma Migrate, raw SQL) mais non connecté au frontend. Le prototype sert de référence UI/UX, l'implémentation finale peut diverger.

## Constraints

- **Tech stack** : SvelteKit (full-stack, server routes) + TypeScript + PostgreSQL — décision arrêtée
- **Auth** : Lucia v3 — sessions-based, intégration SvelteKit native
- **Pas d'ORM** : requêtes SQL brutes uniquement via le package `packages/db`
- **Saisie résultats** : admin du tournoi uniquement (feuilles papier → saisie) — pas de temps réel joueur
- **Arbitrage** : toujours un joueur inscrit au tournoi, assigné automatiquement par le système

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| SvelteKit full-stack (pas de backend séparé) | Partage de types natif, un seul déploiement, monorepo déjà structuré | — Pending |
| Lucia v3 pour l'auth | Intégration SvelteKit native, sessions-based, 100% TypeScript, pas de service externe | — Pending |
| Génération de tous les matchs au lancement | Vision globale de la journée, anticipe l'optimisation des plannings | — Pending |
| Format set/manche configurable par phase | Anticipe un changement de règlement fédéral | — Pending |
| SSE pour le temps réel | Plus simple que WebSocket, suffisant pour updates de résultats/classements | — Pending |
| Prototype = exploration (non bloquant) | Le wizard est une bonne base UI/UX mais l'archi peut évoluer | — Pending |

---
*Last updated: 2026-02-27 after initialization*
