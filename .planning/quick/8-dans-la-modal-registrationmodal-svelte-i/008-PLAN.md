---
phase: quick-8
plan: 008
type: execute
wave: 1
depends_on: []
files_modified:
  - packages/front/src/lib/tournament/components/PlayerSearch.svelte
  - packages/front/src/routes/(admin)/admin/events/[id]/tournaments/[tid]/RegistrationModal.svelte
autonomous: true
requirements: []

must_haves:
  truths:
    - "La liste de résultats PlayerSearch ne dépasse pas les bords de la modal (dropdown visible entier)"
    - "En mode solo, un bouton 'Créer un joueur' ouvre un formulaire inline (prénom, nom, date naissance, département)"
    - "En mode doubles, chaque slot joueur dispose du même bouton 'Créer un joueur'"
    - "La soumission du formulaire de création envoie mode: 'new' / type: 'new' au register endpoint"
  artifacts:
    - path: packages/front/src/lib/tournament/components/PlayerSearch.svelte
      provides: Dropdown avec position:fixed + getBoundingClientRect (non clippé par overflow parent)
    - path: packages/front/src/routes/(admin)/admin/events/[id]/tournaments/[tid]/RegistrationModal.svelte
      provides: Formulaire création joueur pour chaque slot (solo et doubles)
  key_links:
    - from: RegistrationModal.svelte
      to: register/+server.ts
      via: fetch POST body avec mode/type 'new'
      pattern: "mode.*new|type.*new"
---

<objective>
Corriger deux problèmes dans RegistrationModal.svelte : dropdown PlayerSearch clippé par la modal, et absence de formulaire de création de joueur.

Purpose: L'admin doit pouvoir créer un joueur directement depuis la modal d'ajout au roster, et voir les résultats de recherche sans qu'ils soient coupés.
Output: PlayerSearch avec dropdown fixed, RegistrationModal avec formulaire création joueur (solo + doubles).
</objective>

<execution_context>
@/home/jta/.claude/get-shit-done/workflows/execute-plan.md
@/home/jta/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md

Référence — DepartmentSelect utilise déjà position:fixed + getBoundingClientRect pour son dropdown (évite le clipping dans les modals) :
packages/front/src/lib/tournament/components/DepartmentSelect.svelte (lignes 52-56, 119)

Référence — DoublesModal a le pattern showCreateForm + formulaire création joueur :
packages/front/src/lib/tournament/components/DoublesModal.svelte

Register endpoint — schemas déjà en place :
- mode: "new" → { first_name, last_name, birth_date (YYYY-MM-DD), licence_no?, department? }
- mode: "doubles" + player1/player2: { type: "new", first_name, last_name, birth_date, licence_no?, department? }

<interfaces>
<!-- PlayerSearch actuel — dropdown avec `absolute z-10` clippé par overflow:hidden du Modal Flowbite -->
<!-- Solution : même pattern que DepartmentSelect : position:fixed, getBoundingClientRect() sur l'input -->

From register/+server.ts — schemas acceptés :
```typescript
// Solo — créer un joueur
{ mode: "new", first_name: string, last_name: string, birth_date: string /* YYYY-MM-DD */, licence_no?: string, department?: string }

// Doubles — slot avec nouveau joueur
{ type: "new", first_name: string, last_name: string, birth_date: string, licence_no?: string, department?: string }
```

From event-schemas.ts :
```typescript
export type PlayerSearchResult = {
  id: string
  first_name: string
  last_name: string
  licence_no: string | null
  department: string | null
}
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1 : Corriger PlayerSearch.svelte — dropdown position:fixed</name>
  <files>packages/front/src/lib/tournament/components/PlayerSearch.svelte</files>
  <action>
Adapter le dropdown de résultats pour utiliser `position:fixed` avec coordonnées calculées par `getBoundingClientRect()`, comme DepartmentSelect.svelte le fait déjà.

Changements à apporter :
1. Ajouter `let inputEl: HTMLInputElement | undefined = $state()` et `bind:this={inputEl}` sur l'`<Input>`.
   - Flowbite Input n'expose pas `bind:this` directement. Utiliser un wrapper `<div>` avec `bind:this` ou switcher vers un `<input>` natif avec les mêmes classes Tailwind que PlayerSearch utilise déjà. Utiliser `<input>` natif avec les classes Tailwind existantes du codebase : `class="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"`.
2. Ajouter `let dropdownStyle = $state("")` et une fonction `updatePosition()` qui calcule `top`, `left`, `width` depuis `inputEl.getBoundingClientRect()`.
3. Appeler `updatePosition()` dans l'`$effect` juste avant/après avoir setté `open = results.length > 0`.
4. Ajouter `<svelte:window onscroll={updatePosition} onresize={updatePosition} />`.
5. Sur la `<ul>` des résultats : remplacer `class="absolute z-10 mt-1 ..."` par `style="position:fixed;{dropdownStyle};z-index:9999"` + garder les classes de style visuel (border, bg, shadow, overflow-auto, max-h-60, rounded-md).

Le `<div class="relative">` wrapper peut rester (il ne cause pas de problème, la ul ne sera plus absolute dedans).
  </action>
  <verify>pnpm typecheck 2>&1 | grep -E "PlayerSearch|error" | head -20</verify>
  <done>PlayerSearch.svelte compile sans erreur de type. Le dropdown s'affiche par-dessus la modal sans être clippé (vérification visuelle en Task 3).</done>
</task>

<task type="auto">
  <name>Task 2 : Ajouter formulaire création joueur dans RegistrationModal.svelte</name>
  <files>packages/front/src/routes/(admin)/admin/events/[id]/tournaments/[tid]/RegistrationModal.svelte</files>
  <action>
Ajouter le pattern "Créer un joueur" dans RegistrationModal.svelte pour les modes solo et doubles.

**État à ajouter (dans le `<script>`) :**
```typescript
// Formulaire création — solo
let showCreateSolo = $state(false)
let newSolo = $state({ first_name: "", last_name: "", birth_date: "", licence_no: "", department: "" })

// Formulaire création — doubles (un par slot)
let showCreateP1 = $state(false)
let newP1 = $state({ first_name: "", last_name: "", birth_date: "", licence_no: "", department: "" })
let showCreateP2 = $state(false)
let newP2 = $state({ first_name: "", last_name: "", birth_date: "", licence_no: "", department: "" })
```

**Réinitialiser dans `reset()` :**
```typescript
showCreateSolo = false; newSolo = { first_name: "", last_name: "", birth_date: "", licence_no: "", department: "" }
showCreateP1 = false; newP1 = { ... }
showCreateP2 = false; newP2 = { ... }
```

**Modifier `confirm()` :**
- Mode solo : si `showCreateSolo` → `body = { mode: "new", ...newSolo, licence_no: newSolo.licence_no || undefined, department: newSolo.department || undefined }`
- Mode doubles slot 1 : si `showCreateP1` → `player1: { type: "new", ...newP1, ... }` sinon `player1: { type: "existing", id: selectedPlayer1.id }`
- Idem slot 2

**Modifier `canConfirm` :**
```typescript
const canConfirm = $derived(
  isDoubles
    ? (selectedPlayer1 !== null || showCreateP1) && (selectedPlayer2 !== null || showCreateP2)
    : selectedPlayer !== null || showCreateSolo,
)
```

**Dans le template — mode solo (après le `<PlayerSearch>` existant) :**
```svelte
<!-- Bouton toggle création -->
<div class="mt-3">
  <button
    type="button"
    class="text-sm text-blue-600 hover:underline"
    onclick={() => { showCreateSolo = !showCreateSolo; selectedPlayer = null }}
  >
    {showCreateSolo ? "▲ Annuler la création" : "▼ Joueur non trouvé ? Créer un joueur"}
  </button>
  {#if showCreateSolo}
    <div class="mt-3 grid grid-cols-2 gap-3">
      <input class="..." placeholder="Prénom *" bind:value={newSolo.first_name} />
      <input class="..." placeholder="Nom *" bind:value={newSolo.last_name} />
      <input class="col-span-2 ..." type="date" placeholder="Date de naissance *" bind:value={newSolo.birth_date} />
      <input class="..." placeholder="N° licence" bind:value={newSolo.licence_no} />
      <input class="..." placeholder="Département" bind:value={newSolo.department} />
    </div>
  {/if}
</div>
```

Ajouter le même bloc "Créer un joueur" sous chaque slot PlayerSearch en mode doubles (showCreateP1/newP1 pour slot 1, showCreateP2/newP2 pour slot 2). Quand `showCreateP1=true`, masquer le PlayerSearch du slot 1 (et vice-versa).

**Classes Tailwind pour les inputs natifs** (cohérence avec le reste de l'app) :
`block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-primary-500 focus:ring-primary-500`

**Imports à ajouter** : `Input` est déjà importé de flowbite-svelte. Pour les inputs du formulaire de création, utiliser `<input>` natif avec les classes ci-dessus (pas de composant Flowbite Input car `bind:value` fonctionne directement).

**Validation côté client (canConfirm guard dans confirm()) :**
- Si `showCreateSolo` : vérifier `newSolo.first_name && newSolo.last_name && newSolo.birth_date` avant fetch, sinon `errorMsg = "Prénom, nom et date de naissance obligatoires"`
- Idem pour les slots doubles.
  </action>
  <verify>pnpm typecheck 2>&1 | grep -E "RegistrationModal|error" | head -20</verify>
  <done>RegistrationModal.svelte compile sans erreur. Un bouton "Créer un joueur" apparaît sous la recherche pour chaque slot. La soumission envoie le bon payload JSON au register endpoint.</done>
</task>

<task type="checkpoint:human-verify">
  <what-built>
    - PlayerSearch dropdown utilise position:fixed — ne dépasse plus des bords de la modal
    - RegistrationModal a un formulaire de création pour chaque slot (solo et doubles)
  </what-built>
  <how-to-verify>
    1. Ouvrir un tournoi admin : /admin/events/[id]/tournaments/[tid]
    2. Cliquer "Ajouter un joueur" (ou "Ajouter une équipe" en doubles)
    3. Taper dans la recherche : la liste de résultats doit s'afficher par-dessus la modal sans être clippée
    4. Cliquer "Joueur non trouvé ? Créer un joueur" : le formulaire doit apparaître (prénom, nom, date naissance, etc.)
    5. Remplir le formulaire et confirmer : le joueur doit être créé et inscrit au tournoi
    6. En mode doubles, vérifier que chaque slot a son propre bouton "Créer un joueur"
  </how-to-verify>
  <resume-signal>Taper "approved" si les deux corrections fonctionnent, ou décrire les problèmes rencontrés.</resume-signal>
</task>

</tasks>

<verification>
pnpm typecheck
</verification>

<success_criteria>
- PlayerSearch dropdown visible sans clipping dans la modal
- Formulaire création joueur fonctionnel en mode solo et doubles
- Payload "new" envoyé correctement au register endpoint
- pnpm typecheck passe sans erreurs sur les fichiers modifiés
</success_criteria>

<output>
Après complétion, créer `.planning/quick/8-dans-la-modal-registrationmodal-svelte-i/008-SUMMARY.md`
</output>
