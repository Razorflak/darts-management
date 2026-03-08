---
phase: quick-4
plan: 4
type: execute
wave: 1
depends_on: []
files_modified:
  - packages/front/src/routes/(admin)/admin/events/+page.svelte
  - packages/front/src/routes/(admin)/admin/events/+page.server.ts
  - packages/front/src/routes/(admin)/admin/entities/+page.svelte
  - packages/front/src/routes/(admin)/admin/entities/+page.server.ts
  - packages/front/src/routes/(admin)/+layout.svelte
autonomous: true
requirements: [quick-4]
must_haves:
  truths:
    - "La sidebar affiche Accueil (→ /admin), Évènements (→ /admin/events), Entités (→ /admin/entities)"
    - "Le lien 'Administration' (icône bâtiment) a été retiré de la sidebar"
    - "La page /admin/events liste les événements de l'organisateur avec cartes et bouton Créer"
    - "La page /admin/entities liste les entités avec bouton Créer une entité"
  artifacts:
    - path: packages/front/src/routes/(admin)/admin/events/+page.svelte
      provides: Liste des événements admin
    - path: packages/front/src/routes/(admin)/admin/events/+page.server.ts
      provides: Chargement des événements admin
    - path: packages/front/src/routes/(admin)/admin/entities/+page.svelte
      provides: Liste des entités admin
    - path: packages/front/src/routes/(admin)/admin/entities/+page.server.ts
      provides: Chargement des entités admin
    - path: packages/front/src/routes/(admin)/+layout.svelte
      provides: Sidebar corrigée avec les 3 bons liens
  key_links:
    - from: packages/front/src/routes/(admin)/+layout.svelte
      to: /admin/events
      via: lien sidebar Évènements
    - from: packages/front/src/routes/(admin)/+layout.svelte
      to: /admin/entities
      via: lien sidebar Entités
---

<objective>
Créer la liste des événements admin (/admin/events), créer la liste des entités admin (/admin/entities), et corriger la sidebar admin pour afficher les trois liens corrects : Accueil, Évènements, Entités.

Purpose: La sidebar admin était incomplète (lien "Administration" générique au lieu de liens fonctionnels), et la page /admin/events n'existait pas après la suppression de (app)/events en quick-3.
Output: 2 nouvelles routes admin + sidebar corrigée.
</objective>

<execution_context>
@/home/jta/.claude/get-shit-done/workflows/execute-plan.md
@/home/jta/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md

Schémas disponibles :
- `EventListItemSchema`, `EventListItem` dans `$lib/server/schemas/event-schemas.ts`
- `EntityRowSchema`, `EntityRow`, `EntityWithParentSchema`, `EntityWithParent` dans `$lib/server/schemas/entity-schemas.ts`

Patterns établis :
- `getUserRoles` importé de `$lib/server/authz`
- `sql` importé de `$lib/server/db`
- Validation Zod : `z.array(Schema).parse(rawRows)`
- Guard admin : `error(403, ...)` si pas adminFederal
- Guard auth : `if (!locals.user) error(401, ...)`
- Auth dans `(admin)/+layout.server.ts` — les pages enfants peuvent supposer `locals.user` existant

Contenu récupéré de git (commit e2c974d) — ancienne page (app)/events/+page.server.ts :
```typescript
// Requête events avec dual-branch (entityIds vide ou non)
// Renvoie : { events: EventListItem[] }
// WHERE e.organizer_id = user.id OR (e.entity_id = ANY(entityIds) AND status != 'draft')
```

Icônes SVG inline utilisées dans la sidebar actuelle :
- Cible/fléchette (3 cercles concentriques) — déjà présente pour "Créer un événement"
- Bâtiment (rect + path arc) — présente pour "Administration" (à retirer)
</context>

<tasks>

<task type="auto">
  <name>Task 1 : Créer /admin/events (liste des événements)</name>
  <files>
    packages/front/src/routes/(admin)/admin/events/+page.server.ts
    packages/front/src/routes/(admin)/admin/events/+page.svelte
  </files>
  <action>
Créer les deux fichiers de la liste des événements admin.

**+page.server.ts** — reprendre la logique de l'ancienne (app)/events/+page.server.ts :

```typescript
import { redirect } from "@sveltejs/kit"
import { sql } from "$lib/server/db"
import { getUserRoles } from "$lib/server/authz"
import type { PageServerLoad } from "./$types"
import { z } from "zod"
import { EventListItemSchema, type EventListItem } from "$lib/server/schemas/event-schemas.js"

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user) redirect(302, "/login")
  const roles = await getUserRoles(locals.user.id)
  const entityIds = roles.map((r) => r.entityId)

  const rawEvents = entityIds.length > 0
    ? await sql<Record<string, unknown>[]>`
        SELECT e.id, e.name, e.status,
          e.starts_at::text AS starts_at,
          e.ends_at::text AS ends_at,
          e.location,
          e.registration_opens_at::text AS registration_opens_at,
          en.name AS entity_name,
          COUNT(t.id)::int AS tournament_count
        FROM event e
        JOIN entity en ON en.id = e.entity_id
        LEFT JOIN tournament t ON t.event_id = e.id
        WHERE e.organizer_id = ${locals.user.id}
          OR (e.entity_id = ANY(${entityIds}) AND e.status != 'draft')
        GROUP BY e.id, en.name
        ORDER BY e.starts_at DESC`
    : await sql<Record<string, unknown>[]>`
        SELECT e.id, e.name, e.status,
          e.starts_at::text AS starts_at,
          e.ends_at::text AS ends_at,
          e.location,
          e.registration_opens_at::text AS registration_opens_at,
          en.name AS entity_name,
          COUNT(t.id)::int AS tournament_count
        FROM event e
        JOIN entity en ON en.id = e.entity_id
        LEFT JOIN tournament t ON t.event_id = e.id
        WHERE e.organizer_id = ${locals.user.id}
        GROUP BY e.id, en.name
        ORDER BY e.starts_at DESC`

  const events: EventListItem[] = z.array(EventListItemSchema).parse(rawEvents)
  return { events }
}
```

**+page.svelte** — reprendre la page (app)/events/+page.svelte (récupérée depuis git) avec les adaptations admin :
- Titre "Mes événements", bouton "Créer un événement" → `/admin/events/new`
- Cartes Flowbite `Card` avec badge statut (STATUS_LABELS / STATUS_COLORS)
- Lien édition → `/admin/events/{event.id}/edit` pour statuts != finished
- Texte "Reprendre l'édition →" pour draft, "Modifier →" pour les autres
- Importer `formatDate` depuis `$lib/date/utils.js`
- Badge colors : draft="gray", ready="green", started="blue", finished="indigo"
- Utiliser Svelte 5 runes : `let { data } = $props()`
  </action>
  <verify>pnpm --filter front typecheck 2>&1 | grep -E "error|Error" | head -20</verify>
  <done>La page /admin/events se charge sans erreur TypeScript. Les événements de l'organisateur s'affichent en cartes avec badge statut et lien d'édition.</done>
</task>

<task type="auto">
  <name>Task 2 : Créer /admin/entities (liste des entités)</name>
  <files>
    packages/front/src/routes/(admin)/admin/entities/+page.server.ts
    packages/front/src/routes/(admin)/admin/entities/+page.svelte
  </files>
  <action>
Créer la page liste des entités (inexistante jusqu'ici — seul /admin/entities/new existait).

**+page.server.ts** :
- Guard auth : `if (!locals.user) error(401, ...)`
- Guard adminFederal via `getUserRoles` (même pattern que entities/new)
- Requête SQL : `SELECT id, name, type, parent_id FROM entity ORDER BY type, name`
- Valider avec `z.array(EntityRowSchema).parse(rawEntities)` (EntityRowSchema de `$lib/server/schemas/entity-schemas.js`)
- Retourner `{ entities }`

**+page.svelte** :
- Titre "Entités", bouton "Créer une entité" → `/admin/entities/new`
- Labels de type : `{ federation: "Fédération", ligue: "Ligue", comite: "Comité", club: "Club" }`
- Table ou liste simple avec colonnes : Nom, Type, Actions (aucune pour l'instant)
- Si `entities.length === 0` : message vide "Aucune entité."
- Svelte 5 runes, composants Flowbite (Table, Badge, Button)
- Badge colors : federation="red", ligue="blue", comite="green", club="yellow"
  </action>
  <verify>pnpm --filter front typecheck 2>&1 | grep -E "error|Error" | head -20</verify>
  <done>La page /admin/entities se charge et liste les entités avec leur type. Le bouton "Créer une entité" pointe vers /admin/entities/new.</done>
</task>

<task type="auto">
  <name>Task 3 : Corriger la sidebar admin</name>
  <files>
    packages/front/src/routes/(admin)/+layout.svelte
  </files>
  <action>
Modifier `packages/front/src/routes/(admin)/+layout.svelte` pour remplacer les deux liens actuels par trois liens corrects.

**Liens actuels à remplacer :**
1. "Créer un événement" → `/admin/events/new` (à retirer)
2. "Administration" → `/admin` (à retirer)

**Liens à mettre à la place (dans cet ordre) :**

1. **Accueil** → `/admin`
   - Icône maison SVG inline (path: M3 9.5L10 3l7 6.5V19a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z + M8 20V13h4v7)
   - Label : "Accueil"

2. **Évènements** → `/admin/events`
   - Icône cible/fléchette — réutiliser l'icône déjà présente dans la sidebar (3 cercles concentriques)
   - Label : "Évènements"

3. **Entités** → `/admin/entities`
   - Icône bâtiment — réutiliser l'icône déjà présente (rect + path arc)
   - Label : "Entités"

Appliquer la même modification dans la section desktop (aside) ET la section mobile (nav dropdown).

Le bouton title (collapsed) doit aussi être mis à jour : title={collapsed ? "Accueil" : undefined}, etc.

Conserver strictement le même style et structure HTML/CSS — changer seulement les href, labels et l'ordre des liens.
  </action>
  <verify>pnpm --filter front typecheck 2>&1 | grep -E "error|Error" | head -20</verify>
  <done>La sidebar affiche exactement 3 liens : Accueil, Évènements, Entités. Le lien "Administration" n'est plus présent. La sidebar desktop et mobile sont cohérentes.</done>
</task>

</tasks>

<verification>
```bash
pnpm --filter front typecheck
```
Aucune erreur TypeScript. Les 3 routes existent et la sidebar contient les 3 liens corrects.
</verification>

<success_criteria>
- `packages/front/src/routes/(admin)/admin/events/+page.svelte` et `+page.server.ts` créés et fonctionnels
- `packages/front/src/routes/(admin)/admin/entities/+page.svelte` et `+page.server.ts` créés et fonctionnels
- Sidebar : "Accueil" → /admin, "Évènements" → /admin/events, "Entités" → /admin/entities
- Lien "Administration" absent de la sidebar
- Zéro erreur TypeScript
</success_criteria>

<output>
Après exécution, créer `.planning/quick/4-admin-cr-er-admin-events-liste-events-co/4-SUMMARY.md` avec les fichiers créés/modifiés, décisions prises, et patterns notables.
</output>
