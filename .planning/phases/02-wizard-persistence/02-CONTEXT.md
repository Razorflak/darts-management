# Phase 2: Wizard Persistence - Context

**Gathered:** 2026-03-01
**Mis à jour:** 2026-03-02
**Status:** Ready for planning — ⚠️ décision schema révisée, replanification nécessaire

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

### Édition selon le statut

- Les événements en statut `draft`, `ready` ET `started` sont éditables depuis la liste des événements
- Seul `finished` est verrouillé (lecture seule / non accessible en édition)
- Si statut `started` : les champs de l'étape 1 (EventStep — nom, dates, lieu, entité, registration_opens_at) sont en **lecture seule** — les tournois (step 2) restent modifiables
- La route `/events/[id]/edit` lève le filtre `AND status = 'draft'` → accepte `draft`, `ready`, `started`

### Navigation dans le wizard (fil d'Ariane)

- Les étapes du Breadcrumb sont **cliquables** : l'utilisateur peut naviguer directement vers n'importe quelle étape
- Pas de validation bloquante à la navigation — l'utilisateur navigue librement
- Le step courant reste mis en évidence visuellement

### Bouton "Enregistrer"

- Présent à chaque step du wizard (pas seulement au PublishStep)
- Sauvegarde l'état courant — validation minimale (nom de l'événement suffisant)
- Pour `ready` et `started` : "Enregistrer" met à jour sans changer le statut

### Bouton "Publier"

- Uniquement sur le PublishStep (step 3)
- Visible uniquement si statut `draft` (pour passer à `ready`)
- Si déjà `ready` ou `started` : le PublishStep affiche uniquement un résumé et le bouton "Enregistrer"
- Validation complète côté serveur avant de passer à `ready`
- En cas d'erreur serveur : message inline dans le PublishStep

### PublishStep — suppression des checkboxes

- Les 2 checkboxes **"Notifier les membres"** et **"Ouvrir les inscriptions"** sont **supprimées**
- Le PublishStep affiche uniquement un résumé de l'événement + bouton Publier (ou Enregistrer si déjà publié)

### Validation

- Validation uniquement à la soumission finale ("Publier")
- L'utilisateur peut naviguer librement entre les steps sans blocage
- "Enregistrer" : validation minimale — nom requis pour identifier l'événement

### Liste des événements (`/events`)

- Affichage en cards (une par événement)
- Infos par card : nom, dates, lieu, entité organisatrice, statut, nombre de tournois
- Scope : événements où l'utilisateur est organisateur ou admin
- Tri : par date de début décroissante
- Draft visibles uniquement par leur créateur

### Entité organisatrice

- Le sélecteur dans EventStep est populé depuis `getUserRoles` : entités où l'utilisateur a un rôle `organisateur`, `adminClub`, `adminComite`, `adminLigue`, ou `adminFederal`
- La valeur stockée est l'UUID de l'entité (pas son label)

### Stockage des phases de tournoi ⚠️ RÉVISÉ

Les phases sont stockées dans une **table dédiée `phase`** (et non plus en colonne JSONB dans `tournament`).

Schéma de la table :
```sql
CREATE TABLE phase (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id        UUID NOT NULL REFERENCES tournament(id) ON DELETE CASCADE,
  position             INTEGER NOT NULL,      -- ordre dans le tournoi
  type                 TEXT NOT NULL,         -- round_robin | double_loss_groups | single_elim | double_elim
  entrants             INTEGER NOT NULL,      -- tous types
  -- Poules (round_robin + double_loss_groups)
  players_per_group    INTEGER,               -- joueurs par poule
  qualifiers_per_group INTEGER,               -- qualifiés par poule
  -- Brackets (single_elim + double_elim)
  qualifiers           INTEGER,               -- qualifiés vers phase suivante (NULL = phase finale)
  tiers                JSONB,                 -- [{id, round, legs}]
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Conséquences :
- La colonne `phases JSONB` de la table `tournament` est supprimée
- Les routes save/publish insèrent dans `phase` (DELETE + re-INSERT à chaque save)
- Le load de l'edit page fait un JOIN ou une requête séparée sur `phase ORDER BY position`
- Le mapping DB → TypeScript `Phase[]` se fait depuis les lignes de `phase`

### Claude's Discretion

- Structure exacte des tables SQL `event` et `tournament` (à dériver des types TypeScript existants)
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
- `packages/db/src/schema/` — nouvelles migrations SQL (`event`, `tournament`, table `phase` dédiée)
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
