# Phase 2: Wizard Persistence - Context

**Gathered:** 2026-03-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Connecter le wizard de création existant à de vrais server routes SvelteKit — un organisateur remplit le wizard, sauvegarde en brouillon ou publie, et l'événement (+ ses tournois + leurs phases) persiste en PostgreSQL. Une liste des événements de l'utilisateur est accessible après connexion.

La logique interne du wizard (composants, types, drag-and-drop) n'est PAS modifiée — on câble le backend sans refactorer l'UI existante.

</domain>

<decisions>
## Implementation Decisions

### Navigation & URLs

- Le wizard migre sous le groupe `(app)` : route `(app)/events/new`
- La liste des événements : `(app)/events`
- La navbar reçoit un lien "Événements" pointant vers `/events`
- Après "Publier" : redirection vers `/events` (liste des événements)
- Après "Enregistrer" : redirection vers `/events` également (ou reste sur le wizard — Claude choisit ce qui est le plus naturel)
- L'ancienne route `/tournaments/new` est supprimée

### Statuts de l'événement

Cycle : `draft` → `ready` → `started` → `finished`

- **`draft`** : événement sauvegardé mais non visible — seul l'organisateur peut le voir dans sa liste
- **`ready`** : événement publié, visible pour les inscriptions si `registration_opens_at` est dépassée (ou nulle = ouverture immédiate)
- **`started`** : tournoi lancé (Phase 4) — configuration verrouillée
- **`finished`** : tournoi terminé (Phase 5/6)

### Champ `registration_opens_at`

- Champ date optionnel sur l'événement (pas sur les tournois individuels)
- Nom de colonne SQL : `registration_opens_at`
- Logique d'ouverture : statut `ready` ET (`registration_opens_at IS NULL` OU `today >= registration_opens_at`)
- Si `registration_opens_at IS NULL` : inscriptions ouvertes dès la publication
- Pas de job automatique côté serveur — la visibilité est calculée à la lecture (check côté serveur dans le load)

### Bouton "Enregistrer" (brouillon)

- Présent à chaque step du wizard (pas seulement au PublishStep)
- Sauvegarde l'état courant en `draft` — validation minimale (nom de l'événement suffisant)
- Validation complète uniquement au clic "Publier"
- Un draft peut être repris et édité depuis la liste des événements

### Bouton "Publier"

- Uniquement sur le PublishStep (step 3)
- Validation complète côté serveur avant de passer à `ready`
- En cas d'erreur serveur : message inline dans le PublishStep

### Validation

- Validation uniquement à la soumission finale ("Publier")
- L'utilisateur peut naviguer librement entre les steps sans blocage
- "Enregistrer" (brouillon) : validation minimale — nom requis pour identifier l'événement

### Liste des événements (`/events`)

- Affichage en cards (une par événement)
- Infos par card : nom, dates, lieu, entité organisatrice, statut, nombre de tournois
- Scope : événements où l'utilisateur est organisateur ou admin
- Tri : par date de début décroissante
- Draft visibles uniquement par leur créateur

### Entité organisatrice

- Le sélecteur dans EventStep est populé depuis `getUserRoles` : entités où l'utilisateur a un rôle `organisateur`, `adminClub`, `adminComite`, `adminLigue`, ou `adminFederal`
- La valeur stockée est l'UUID de l'entité (pas son label)

### Claude's Discretion

- Structure exacte des tables SQL `event` et `tournament` (à dériver des types TypeScript existants)
- Sérialisation des phases de tournoi (colonne JSON ou table relationnelle — privilégier la simplicité pour v1)
- UX exacte du bouton "Enregistrer" dans le wizard (position, libellé, comportement si aucun nom saisi)
- Gestion des erreurs réseau

</decisions>

<specifics>
## Specific Ideas

- Le bouton "Enregistrer" doit être visible à tout moment dans le wizard — probablement dans le header ou le footer commun, pas dans chaque step individuellement
- `registration_opens_at` affiché dans EventStep (step 1) aux côtés des dates de l'événement
- La liste `/events` est la page d'atterrissage principale après connexion (remplace `/`)

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets

- `$lib/tournament/types.ts` — `EventData`, `Tournament`, `Phase` (GroupPhase | EliminationPhase), `PublishOptions` déjà typés. Le server route mappera ces types vers le schéma SQL.
- `$lib/server/authz.ts` (01-06) — `getUserRoles(userId)` pour filtrer les entités de l'organisateur
- `$lib/server/db.ts` — instance `sql` prête, pattern raw SQL établi
- Tous les composants wizard (EventStep, TournamentStep, PublishStep, PhasesBuilder…) — conservés tels quels, seul le câblage change

### Established Patterns

- Form actions SvelteKit : `+page.server.ts` avec `load` + `actions` nommées (pattern 01-03/01-04)
- Guard auth : `event.locals.user` dans `load` → redirect 303 si absent
- Guard authz : `getUserRoles` + check rôle dans `load` ET `actions`
- Flowbite-Svelte + Tailwind CSS pour l'UI
- Svelte 5 runes : `$state`, `$props`, `$derived`, `$effect.pre()`

### Integration Points

- `packages/front/src/routes/(app)/` — le wizard et la liste atterrissent ici
- `packages/front/src/routes/(app)/+layout.svelte` — lien "Événements" à ajouter dans la navbar
- `packages/db/src/schema/` — nouvelles migrations SQL (`event`, `tournament`, phases)
- `packages/front/src/routes/tournaments/new/` — à supprimer

</code_context>

<deferred>
## Deferred Ideas

- Cache localStorage pour reprendre l'édition en cours de session — hors scope v1
- Modification d'un événement existant post-publication — phase ultérieure
- Duplication d'événement — phase ultérieure
- Filtres / recherche dans la liste des événements — Phase 6 ou ultérieure
- Job automatique pour déclencher l'ouverture des inscriptions à la date prévue — v1.1

</deferred>

---

*Phase: 02-wizard-persistence*
*Context gathered: 2026-03-01*
