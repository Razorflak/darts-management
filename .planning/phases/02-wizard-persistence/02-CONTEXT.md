# Phase 2: Wizard Persistence - Context

**Gathered:** 2026-03-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Connecter le wizard de création existant à de vrais server routes SvelteKit — un organisateur remplit le wizard, clique Publier, et l'événement (+ ses tournois + leurs phases) persiste en PostgreSQL. Une liste des événements de l'utilisateur est accessible après connexion.

La logique interne du wizard (composants, types, drag-and-drop) n'est PAS modifiée — on câble le backend sans toucher à l'UI existante.

</domain>

<decisions>
## Implementation Decisions

### Navigation & URLs

- Le wizard migre sous le groupe `(app)` : route `(app)/events/new`
- La liste des événements : `(app)/events` (page d'accueil après connexion)
- La navbar reçoit un lien "Événements" pointant vers `/events`
- Après publication : redirection vers la page de détail de l'événement créé (`/events/[id]`)
- `/tournaments/new` (ancienne route hors (app)) peut être supprimée ou redirigée

### Liste des événements

- Affichage en cards (une par événement)
- Infos par card : nom, dates, lieu, entité organisatrice, statut, nombre de tournois
- Scope : seulement les événements auxquels l'utilisateur est rattaché (créateur ou admin)
- Tri : par date de début décroissante (les plus prochains en premier)

### Validation

- Validation progressive step-by-step : chaque step valide ses champs avant de passer au suivant
- Le serveur revalide tout à la soumission finale (form action SvelteKit)
- En cas d'erreur serveur : message inline dans le PublishStep, l'utilisateur ne perd pas sa saisie

### Statuts de l'événement

- Cycle complet : `draft` → `open` (inscriptions ouvertes) → `started` (lancé, Phase 4) → `finished` (Phase 5/6)
- "Publier" = transition de `draft` vers `open`
- Pas de brouillon sauvegardable en v1 — le wizard crée et publie en une seule action
- L'option `openRegistrations` de PublishOptions détermine si les inscriptions s'ouvrent immédiatement à la publication (sinon `open` mais inscriptions fermées manuellement plus tard)

### Entité organisatrice

- Le sélecteur d'entité dans EventStep est populé depuis `getUserRoles` : liste les entités où l'utilisateur a un rôle `organisateur`, `adminClub`, `adminComite`, `adminLigue`, ou `adminFederal`
- Un adminFederal voit toutes les entités

### Claude's Discretion

- Structure exacte de la table `event` et `tournament` en SQL (à dériver des types TypeScript existants)
- Format de sérialisation des phases (JSON colonne ou table séparée — Claude choisit le plus simple pour v1)
- Gestion des erreurs réseau pendant la soumission
- UX exacte du loading state pendant la publication

</decisions>

<specifics>
## Specific Ideas

- Le wizard reste à 3 steps : EventStep → TournamentStep → PublishStep — la structure ne change pas
- `EventData.entity` devient un ID d'entité (UUID) au lieu d'un label string
- La page de liste `/events` remplace `/` comme point d'entrée principal après connexion

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets

- `$lib/tournament/types.ts` — EventData, Tournament, Phase (GroupPhase | EliminationPhase), PublishOptions déjà typés et utilisés dans le wizard. La couche server devra mapper ces types vers le schéma SQL.
- `$lib/server/authz.ts` (créé en 01-06) — `getUserRoles(userId)` disponible pour filtrer les entités de l'organisateur
- `$lib/server/db.ts` — instance `sql` prête, pattern raw SQL établi (packages/db)
- Composants wizard existants : EventStep, TournamentStep, PublishStep, TournamentForm, PhasesBuilder — à conserver tels quels

### Established Patterns

- Form actions SvelteKit : `+page.server.ts` avec `load` + `actions.default` — pattern établi en 01-03/01-04
- Guard d'auth : vérification `event.locals.user` dans `load` → redirect 303 si absent
- Guard authz : `getUserRoles` + check rôle dans `load` ET `actions.default`
- Tailwind CSS + Flowbite-Svelte pour les composants UI
- Svelte 5 runes : `$state`, `$props`, `$derived`, `$effect.pre()`

### Integration Points

- `packages/front/src/routes/(app)/` — le wizard migre ici (de `routes/tournaments/new/`)
- `packages/front/src/routes/(app)/+layout.svelte` — lien "Événements" à ajouter dans la navbar
- `packages/front/src/routes/(app)/+layout.server.ts` — charge `hasAdminAccess`, peut charger aussi les entités de l'utilisateur si nécessaire
- `packages/db/src/schema/` — nouvelles migrations SQL pour `event` et `tournament`

</code_context>

<deferred>
## Deferred Ideas

- Brouillons sauvegardables — v1.1
- Modification d'un événement existant (édition post-publication) — Phase ultérieure
- Duplication d'événement — Phase ultérieure
- Filtres/recherche dans la liste des événements — Phase 6 ou ultérieure

</deferred>

---

*Phase: 02-wizard-persistence*
*Context gathered: 2026-03-01*
