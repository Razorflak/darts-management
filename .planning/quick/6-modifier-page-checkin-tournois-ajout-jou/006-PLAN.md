---
phase: quick-6
plan: 06
type: execute
wave: 1
depends_on: []
files_modified:
  - packages/front/src/routes/(admin)/admin/events/[id]/tournaments/[tid]/register/+server.ts
  - packages/front/src/routes/(admin)/admin/events/[id]/tournaments/[tid]/+page.svelte
autonomous: true
requirements: []
must_haves:
  truths:
    - "Admin peut ajouter un joueur (solo) ou une équipe (double) via une modal"
    - "En double, si les 2 joueurs ont déjà fait équipe, l'équipe existante est réutilisée"
    - "Le bouton 'Tout checker' a disparu"
    - "Un champ texte filtre la liste des inscrits en temps réel"
    - "Les joueurs dans la liste sont séparés par des bordures visibles"
  artifacts:
    - path: "packages/front/src/routes/(admin)/admin/events/[id]/tournaments/[tid]/register/+server.ts"
      provides: "Endpoint POST gérant mode solo et doubles"
    - path: "packages/front/src/routes/(admin)/admin/events/[id]/tournaments/[tid]/+page.svelte"
      provides: "UI complète avec modal ajout, filtre, bordures"
  key_links:
    - from: "+page.svelte modal doubles"
      to: "POST /register"
      via: "fetch avec mode: doubles + player1 + player2"
    - from: "POST /register"
      to: "findOrCreateDoublesTeam"
      via: "import depuis $lib/server/teams.js"
---

<objective>
Refonte de la page d'administration du roster d'un tournoi :

1. Transformer la section "Ajouter un joueur" inline en modal avec bouton contextuel (solo vs double selon catégorie)
2. Le mode double permet de renseigner 2 joueurs (recherche ou création), réutilise l'équipe existante si elle existe déjà
3. Supprimer le bouton "Tout checker"
4. Ajouter un champ de filtre textuel sur la liste des inscrits
5. Ajouter des bordures fines entre les lignes du tableau des inscrits

Purpose: UX admin propre — ajout contextuel par modal, navigation dans les inscrits facilitée.
Output: +page.svelte retravaillé, /register endpoint étendu pour les doubles.
</objective>

<execution_context>
@/home/jta/.claude/get-shit-done/workflows/execute-plan.md
@/home/jta/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@/home/jta/Projects/darts-management/master/.planning/STATE.md

Règle absolue : types Zod-first — toute extension de schéma va dans event-schemas.ts, pas d'inline types.
Pattern établi : `rawTx as unknown as TxSql` dans sql.begin() pour les transactions.
Catégories doubles : "double" | "double_female" | "double_mix" (CategorySchema dans event-schemas.ts).
</context>

<interfaces>
<!-- Contrats existants utilisés par les tâches -->

Depuis packages/front/src/lib/server/teams.ts :
```typescript
export async function findOrCreateSoloTeam(playerId: string): Promise<string>
export async function findOrCreateDoublesTeam(playerIdA: string, playerIdB: string): Promise<string>
```

Depuis packages/front/src/lib/server/schemas/event-schemas.ts :
```typescript
export const CategorySchema = z.enum([
  "male", "female", "junior", "veteran", "open", "mix",
  "double", "double_female", "double_mix"
])
export type PlayerSearchResult = z.infer<typeof PlayerSearchResultSchema>
// PlayerSearchResultSchema: { id, first_name, last_name, birth_date, licence_no, department }
export type RosterEntry = z.infer<typeof RosterEntrySchema>
// RosterEntrySchema: { registration_id, team_id, members: [{player_id, first_name, last_name, department}], checked_in, registered_at }
export type AdminTournament = z.infer<typeof AdminTournamentSchema>
// AdminTournamentSchema: { id, name, category, check_in_required, event_id, event_name, status, entity_id }
```

Depuis register/+server.ts (état actuel) :
```typescript
// Discriminated union actuelle — seulement solo
const AdminRegisterSchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("existing"), player_id: z.string().uuid() }),
  z.object({ mode: z.literal("new"), first_name, last_name, birth_date, licence_no?, department? })
])
// Utilise findOrCreateSoloTeam(playerId)
```

Depuis +page.svelte (état actuel) :
- Composant `PlayerSearch` : props `tournamentId`, `searchUrl?`, `onSelect: (player: PlayerSearchResult) => void`
- Composant `DepartmentSelect` : prop `bind:value`, `placeholder`
- Import Flowbite : `Modal` disponible dans flowbite-svelte
- `data.tournament.category` est de type `Category`
- `baseUrl` = `/admin/events/${eventId}/tournaments/${tournamentId}`
</interfaces>

<tasks>

<task type="auto">
  <name>Task 1 : Étendre le endpoint /register pour les doubles</name>
  <files>packages/front/src/routes/(admin)/admin/events/[id]/tournaments/[tid]/register/+server.ts</files>
  <action>
Étendre AdminRegisterSchema pour ajouter deux nouveaux modes doubles :
- `mode: "doubles_existing"` — deux player_id existants : `{ mode: "doubles_existing", player1_id: z.string().uuid(), player2_id: z.string().uuid() }`
- `mode: "doubles_new"` — un joueur existant + un nouveau : `{ mode: "doubles_new", player1_id: z.string().uuid(), player2_first_name, player2_last_name, player2_birth_date, player2_department? }` et aussi le cas deux nouveaux joueurs : `mode: "doubles_new_both"` avec les champs first_name/last_name/birth_date/department pour les deux.

En pratique, pour simplifier et couvrir tous les cas, utiliser un schéma unique pour doubles :
```
z.object({
  mode: z.literal("doubles"),
  player1: z.discriminatedUnion("type", [
    z.object({ type: z.literal("existing"), id: z.string().uuid() }),
    z.object({ type: z.literal("new"), first_name: z.string().min(1), last_name: z.string().min(1), birth_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), licence_no: z.string().optional(), department: z.string().optional() })
  ]),
  player2: z.discriminatedUnion("type", [
    z.object({ type: z.literal("existing"), id: z.string().uuid() }),
    z.object({ type: z.literal("new"), first_name: z.string().min(1), last_name: z.string().min(1), birth_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), licence_no: z.string().optional(), department: z.string().optional() })
  ])
})
```

Dans le handler POST, après la validation, gérer les 4 modes (existing/new, existing/new, new/existing, new/new) avec une fonction helper `resolvePlayerId(slot, params) → Promise<string>` :
- Si slot.type === "existing" → return slot.id
- Si slot.type === "new" → INSERT INTO player ... RETURNING id → return id

Puis appeler `findOrCreateDoublesTeam(player1Id, player2Id)` importé depuis `$lib/server/teams.js`.

Les modes solo existants (`existing`, `new`) restent inchangés → utilisent `findOrCreateSoloTeam`.

Importer `findOrCreateDoublesTeam` en plus de `findOrCreateSoloTeam`.
  </action>
  <verify>pnpm --filter front typecheck 2>&1 | tail -20</verify>
  <done>typecheck passe sans erreur sur le fichier register/+server.ts ; les 3 branches de mode (existing, new, doubles) sont présentes</done>
</task>

<task type="auto">
  <name>Task 2 : Refonte UI — modal ajout, filtre, bordures, suppression "Tout checker"</name>
  <files>packages/front/src/routes/(admin)/admin/events/[id]/tournaments/[tid]/+page.svelte</files>
  <action>
**Détermination du mode double :**
```svelte
const DOUBLE_CATEGORIES = ["double", "double_female", "double_mix"]
const isDoubles = DOUBLE_CATEGORIES.includes(data.tournament.category)
```

**1. Supprimer le bouton "Tout checker"**
Retirer le bloc `{#if data.tournament.check_in_required}` autour du bouton "Tout checker" (lignes ~188-193 actuel) ainsi que la fonction `checkInAll()`.
Supprimer aussi l'import `checkInAll` si isolé. L'endpoint `/checkin-all` n'est plus appelé côté UI (laisser le serveur en place).

**2. Ajouter filtre de la liste**
Ajouter un `$state` pour le filtre :
```svelte
let filterQuery = $state("")
let filteredRoster = $derived(
  filterQuery.trim().length === 0
    ? roster
    : roster.filter((e) =>
        e.members.some(
          (m) =>
            `${m.last_name} ${m.first_name}`.toLowerCase().includes(filterQuery.toLowerCase()) ||
            `${m.first_name} ${m.last_name}`.toLowerCase().includes(filterQuery.toLowerCase())
        )
      )
)
```
Juste au-dessus du tableau (si roster.length > 0), ajouter un `<Input placeholder="Filtrer les inscrits..." bind:value={filterQuery} class="mb-3" />`.
Dans le `{#each}`, utiliser `filteredRoster` à la place de `roster`.

**3. Ajouter bordures au tableau**
Sur le `<Table>`, ajouter `striped={true}` ou à défaut ajouter `class="border border-gray-200"` sur le composant Table.
Sur chaque `<TableBodyRow>`, ajouter `class="border-b border-gray-100"` pour séparer visuellement les lignes.

**4. Modal "Ajouter un joueur / Ajouter une équipe"**

Remplacer la `<Card class="mt-2">` inline par :
- Un bouton en haut de la section roster (avant ou après le filtre) : `<Button color="primary" size="sm" onclick={() => (showAddModal = true)}>{isDoubles ? "Ajouter une équipe" : "Ajouter un joueur"}</Button>`
- Un composant `<Modal bind:open={showAddModal} title={isDoubles ? "Ajouter une équipe" : "Ajouter un joueur"} size="lg" outsideclose>`

**Contenu de la modal — mode solo :**
Reprendre exactement la Card existante (PlayerSearch + selected player display + "Nouveau joueur" expandable form) mais à l'intérieur de la Modal.
Le bouton "Inscrire" appelle `registerExisting()` puis ferme la modal.
Le bouton "Créer et inscrire" appelle `registerNew()` puis ferme la modal.
Après succès (`window.location.reload()` reste le pattern actuel).

**Contenu de la modal — mode doubles :**
Deux sections empilées, labels "Joueur 1" et "Joueur 2".
Chaque section : un `PlayerSearch` (avec son propre `selectedPlayer1`/`selectedPlayer2`) + son propre toggle "Nouveau joueur" + mini formulaire (Prénom, Nom, Date de naissance, Licence optionnel, Département).

États nécessaires pour doubles :
```svelte
let selectedPlayer1 = $state<PlayerSearchResult | null>(null)
let showNewPlayer1Form = $state(false)
let newPlayer1 = $state({ first: "", last: "", birth: "", licence: "", department: "" })
let selectedPlayer2 = $state<PlayerSearchResult | null>(null)
let showNewPlayer2Form = $state(false)
let newPlayer2 = $state({ first: "", last: "", birth: "", licence: "", department: "" })
```

Bouton "Confirmer l'inscription" (dans `{#snippet footer()}` de la Modal) → appelle `registerDoubles()` :
```typescript
async function registerDoubles() {
  function buildSlot(sel: PlayerSearchResult | null, form: typeof newPlayer1, showForm: boolean) {
    if (sel) return { type: "existing", id: sel.id }
    return {
      type: "new",
      first_name: form.first,
      last_name: form.last,
      birth_date: form.birth,
      licence_no: form.licence || undefined,
      department: form.department || undefined
    }
  }
  const res = await fetch(`${baseUrl}/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      mode: "doubles",
      player1: buildSlot(selectedPlayer1, newPlayer1, showNewPlayer1Form),
      player2: buildSlot(selectedPlayer2, newPlayer2, showNewPlayer2Form)
    })
  })
  if (res.ok) {
    window.location.reload()
  } else {
    const err = await res.json().catch(() => ({}))
    alert(err.message ?? "Erreur lors de l'inscription")
  }
}
```

`showAddModal` initialisé à `false`, réinitialisé sur fermeture de la modal.

**État et imports à ajouter/modifier :**
- Ajouter `Modal` aux imports Flowbite
- Ajouter `let showAddModal = $state(false)`
- Supprimer les états solo qui étaient dans la Card inline (`selectedPlayer`, `showNewPlayerForm`, `newFirst`, `newLast`, `newBirth`, `newLicence`, `newDepartment`) et les remplacer par les états de la modal (solo ou doubles selon branche)
- En solo : garder `selectedPlayer` / `showNewPlayerForm` / `newFirst` etc. mais dans le contexte modal
- `handlePlayerSelected` reste le même pour le mode solo

Ajouter `isDoubles` comme `const` (pas de `$state` — dérivé de `data.tournament.category` qui ne change pas).
  </action>
  <verify>pnpm --filter front typecheck 2>&1 | tail -20</verify>
  <done>
- Bouton contextuel "Ajouter un joueur" ou "Ajouter une équipe" visible selon catégorie
- Modal s'ouvre avec le bon contenu selon isDoubles
- "Tout checker" absent de la page
- Champ filtre présent et fonctionnel (filteredRoster utilisé dans #each)
- Bordures visibles entre les lignes du tableau
- typecheck passe sans erreur
  </done>
</task>

</tasks>

<verification>
```bash
pnpm --filter front typecheck
```
Aucune erreur TypeScript sur les fichiers modifiés.

Test manuel rapide :
1. Ouvrir `/admin/events/[id]/tournaments/[tid]` sur un tournoi solo → vérifier : bouton "Ajouter un joueur", pas de "Tout checker", filtre présent, bordures visibles
2. Ouvrir sur un tournoi double → bouton "Ajouter une équipe", modal avec Joueur 1 + Joueur 2
3. Inscrire un doublon d'équipe existante → l'équipe existante est récupérée (pas d'erreur 409 inattendue)
</verification>

<success_criteria>
- Modal ajout s'ouvre/ferme, bouton contextuel reflète le type de tournoi
- Mode doubles : 2 joueurs renseignés, findOrCreateDoublesTeam appelle la bonne équipe
- Aucune occurrence de "Tout checker" dans +page.svelte
- `filteredRoster` utilisé dans le `{#each}` du tableau
- `border` ou `striped` appliqué sur les lignes du tableau
- typecheck passe
</success_criteria>

<output>
Après complétion, créer `.planning/quick/6-modifier-page-checkin-tournois-ajout-jou/006-SUMMARY.md` avec les fichiers modifiés, décisions clés, et patterns établis.
</output>
