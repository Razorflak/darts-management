---
phase: quick-2
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - packages/front/src/routes/(admin)/+layout.server.ts
  - packages/front/src/routes/(admin)/+layout.svelte
  - packages/front/src/routes/(admin)/admin/+page.server.ts
  - packages/front/src/routes/(admin)/admin/+page.svelte
  - packages/front/src/routes/(admin)/admin/entities/new/+page.server.ts
  - packages/front/src/routes/(admin)/admin/entities/new/+page.svelte
  - packages/front/src/routes/(admin)/admin/events/new/+page.server.ts
  - packages/front/src/routes/(admin)/admin/events/new/+page.svelte
  - packages/front/src/routes/(admin)/admin/events/new/save/+server.ts
  - packages/front/src/routes/(admin)/admin/events/new/publish/+server.ts
  - packages/front/src/routes/(admin)/admin/events/[id]/edit/+page.server.ts
  - packages/front/src/routes/(admin)/admin/events/[id]/edit/+page.svelte
  - packages/front/src/routes/(app)/+layout.svelte
autonomous: true
requirements: []

must_haves:
  truths:
    - "GET /admin affiche la page entités avec le sidebar visible"
    - "Le sidebar se collapse/expand sur desktop via bouton flèche"
    - "Sur mobile un bouton hamburger ouvre un menu déroulant avec les liens admin"
    - "GET /admin/events/new affiche le wizard de création d'événement"
    - "GET /admin/events/[id]/edit affiche le wizard d'édition"
    - "Les anciennes routes (app)/admin/* et (app)/events/new, (app)/events/[id]/edit sont supprimées"
  artifacts:
    - path: "packages/front/src/routes/(admin)/+layout.svelte"
      provides: "Layout admin avec sidebar desktop collapsible et menu mobile"
    - path: "packages/front/src/routes/(admin)/+layout.server.ts"
      provides: "Guard hasAdminAccess, redirect /login si non auth"
    - path: "packages/front/src/routes/(admin)/admin/+page.svelte"
      provides: "Page entités migrée (contenu inchangé)"
    - path: "packages/front/src/routes/(admin)/admin/events/new/+page.svelte"
      provides: "Wizard création événement migré"
  key_links:
    - from: "packages/front/src/routes/(admin)/+layout.svelte"
      to: "sidebar state"
      via: "$state(collapsed) rune, toggle bouton"
    - from: "packages/front/src/routes/(app)/+layout.svelte"
      to: "lien /admin"
      via: "NavLi href='/admin' (inchangé)"
---

<objective>
Créer le groupe de routes `(admin)` avec un layout sidebar collapsible sur desktop / menu hamburger mobile, migrer les routes admin existantes (`(app)/admin/*` et `(app)/events/new`, `(app)/events/[id]/edit`) dans ce nouveau groupe, et supprimer les anciennes routes.

Purpose: Séparer l'espace administration de l'espace public avec une navigation dédiée et cohérente.
Output: Groupe `(admin)` fonctionnel avec layout sidebar, toutes les routes admin migrées.
</objective>

<execution_context>
@/home/jta/.claude/get-shit-done/workflows/execute-plan.md
@/home/jta/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@packages/front/CLAUDE.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Créer le layout (admin) avec sidebar collapsible</name>
  <files>
    packages/front/src/routes/(admin)/+layout.server.ts
    packages/front/src/routes/(admin)/+layout.svelte
  </files>
  <action>
Créer le répertoire `packages/front/src/routes/(admin)/`.

**`+layout.server.ts`** — guard admin :
```typescript
import { getUserRoles } from "$lib/server/authz"
import { redirect } from "@sveltejs/kit"
import type { LayoutServerLoad } from "./$types"

export const load: LayoutServerLoad = async ({ locals }) => {
  if (!locals.user) {
    redirect(302, "/login")
  }
  const roles = await getUserRoles(locals.user.id)
  const hasAdminAccess = roles.some((r) =>
    ["adminFederal", "adminLigue", "adminComite", "adminClub"].includes(r.role),
  )
  if (!hasAdminAccess) {
    redirect(302, "/")
  }
  return { user: locals.user, session: locals.session }
}
```

**`+layout.svelte`** — structure sidebar + contenu :

Le layout est divisé en deux zones : sidebar gauche (desktop) + contenu principal.

Structure HTML :
```
<div class="flex min-h-screen">
  <!-- Sidebar desktop (hidden on mobile) -->
  <aside class="hidden md:flex flex-col bg-gray-900 text-white transition-all duration-200"
         class:w-56={!collapsed} class:w-14={collapsed}>

    <!-- Bouton collapse/expand tout en haut -->
    <button onclick={toggleCollapse}
            class="flex items-center justify-center h-12 hover:bg-gray-700 border-b border-gray-700">
      <!-- Icône flèche gauche si expanded, flèche droite si collapsed -->
      {#if collapsed}
        <!-- chevron right SVG 20x20 -->
      {:else}
        <!-- chevron left SVG 20x20 -->
      {/if}
    </button>

    <!-- Nav items -->
    <nav class="flex-1 py-2">
      <a href="/admin" class="flex items-center gap-3 px-3 py-2 hover:bg-gray-700 rounded mx-1"
         class:justify-center={collapsed}>
        <!-- Icône cible/fléchette SVG 20x20 -->
        {#if !collapsed}
          <span class="text-sm font-medium whitespace-nowrap">Événements</span>
        {/if}
      </a>
      <a href="/admin" class="flex items-center gap-3 px-3 py-2 hover:bg-gray-700 rounded mx-1"
         class:justify-center={collapsed}>
        <!-- Icône entités (building) SVG 20x20 -->
        {#if !collapsed}
          <span class="text-sm font-medium whitespace-nowrap">Entités</span>
        {/if}
      </a>
    </nav>
  </aside>

  <!-- Mobile header avec hamburger -->
  <div class="md:hidden fixed top-0 left-0 right-0 z-30 bg-gray-900 text-white h-12 flex items-center px-4 gap-4">
    <button onclick={toggleMobileMenu} class="p-1">
      <!-- hamburger ou X SVG -->
    </button>
    <span class="font-semibold text-sm">Administration</span>
  </div>

  <!-- Mobile dropdown menu (overlay) -->
  {#if mobileOpen}
    <div class="md:hidden fixed inset-0 z-20 bg-black/50" onclick={toggleMobileMenu}></div>
    <nav class="md:hidden fixed top-12 left-0 z-20 bg-gray-900 text-white w-56 py-2">
      <a href="/admin" onclick={toggleMobileMenu} class="flex items-center gap-3 px-4 py-3 hover:bg-gray-700">
        <!-- icône --> Événements
      </a>
      <a href="/admin" onclick={toggleMobileMenu} class="flex items-center gap-3 px-4 py-3 hover:bg-gray-700">
        <!-- icône --> Entités
      </a>
    </nav>
  {/if}

  <!-- Contenu principal -->
  <main class="flex-1 p-6 pt-6 md:pt-6 mt-12 md:mt-0 overflow-auto">
    {@render children()}
  </main>
</div>
```

Script Svelte 5 runes :
```typescript
let { children, data } = $props()
let collapsed = $state(false)
let mobileOpen = $state(false)
function toggleCollapse() { collapsed = !collapsed }
function toggleMobileMenu() { mobileOpen = !mobileOpen }
```

Icônes SVG inline (pas de dépendance externe) :
- Cible/fléchette (Événements) : cercle concentrique simple, 20x20, stroke currentColor
- Entité/bâtiment (Entités) : rectangle avec fenêtres, 20x20, stroke currentColor
- Chevron gauche/droite : path simple stroke currentColor
- Hamburger (3 lignes) / X (croix) : path simple stroke currentColor

Ne pas utiliser flowbite-svelte pour le sidebar — TailwindCSS pur.
  </action>
  <verify>
    <automated>cd /home/jta/Projects/darts-management/master && pnpm typecheck 2>&1 | tail -20</automated>
  </verify>
  <done>Layout (admin) créé, typecheck passe. Le sidebar s'affiche avec icônes + labels sur desktop, hamburger sur mobile visible à la taille mobile.</done>
</task>

<task type="auto">
  <name>Task 2: Migrer les routes admin existantes vers (admin) et supprimer les anciennes</name>
  <files>
    packages/front/src/routes/(admin)/admin/+page.server.ts
    packages/front/src/routes/(admin)/admin/+page.svelte
    packages/front/src/routes/(admin)/admin/entities/new/+page.server.ts
    packages/front/src/routes/(admin)/admin/entities/new/+page.svelte
    packages/front/src/routes/(app)/admin/+page.server.ts (DELETE)
    packages/front/src/routes/(app)/admin/+page.svelte (DELETE)
    packages/front/src/routes/(app)/admin/entities/new/+page.server.ts (DELETE)
    packages/front/src/routes/(app)/admin/entities/new/+page.svelte (DELETE)
  </files>
  <action>
**Copier** les fichiers depuis `(app)/admin/` vers `(admin)/admin/`, puis **supprimer** les originaux.

Fichiers à copier (contenu identique, aucune modification) :
- `(app)/admin/+page.server.ts` → `(admin)/admin/+page.server.ts`
- `(app)/admin/+page.svelte` → `(admin)/admin/+page.svelte`
- `(app)/admin/entities/new/+page.server.ts` → `(admin)/admin/entities/new/+page.server.ts`
- `(app)/admin/entities/new/+page.svelte` → `(admin)/admin/entities/new/+page.svelte`

Ajustement dans `(admin)/admin/+page.server.ts` : le guard `hasAdminAccess` est déjà fait dans le layout `(admin)`, mais la page vérifie `isAdminFederal` spécifiquement — conserver cette vérification granulaire dans la page.

Ajustement dans `(admin)/admin/+page.svelte` : le bouton "+ Nouvelle entité" pointe vers `/admin/entities/new` — URL inchangée, pas de modification nécessaire.

**Supprimer** avec `rm` :
```bash
rm packages/front/src/routes/(app)/admin/+page.server.ts
rm packages/front/src/routes/(app)/admin/+page.svelte
rm packages/front/src/routes/(app)/admin/entities/new/+page.server.ts
rm packages/front/src/routes/(app)/admin/entities/new/+page.svelte
rmdir packages/front/src/routes/(app)/admin/entities/new
rmdir packages/front/src/routes/(app)/admin/entities
rmdir packages/front/src/routes/(app)/admin
```

**Mettre à jour** `(app)/+layout.svelte` : le lien `NavLi href="/admin"` reste identique (URL inchangée). Aucune modification requise.
  </action>
  <verify>
    <automated>cd /home/jta/Projects/darts-management/master && pnpm typecheck 2>&1 | tail -20 && ls packages/front/src/routes/(app)/admin 2>&1 | grep -E "cannot access|No such" || echo "ERROR: (app)/admin still exists"</automated>
  </verify>
  <done>
    - `(admin)/admin/` contient les 4 fichiers migrés
    - `(app)/admin/` n'existe plus
    - typecheck passe
    - GET /admin répond avec le layout sidebar + contenu entités
  </done>
</task>

<task type="auto">
  <name>Task 3: Migrer les routes événements create/edit vers (admin) et supprimer les anciennes</name>
  <files>
    packages/front/src/routes/(admin)/admin/events/new/+page.server.ts
    packages/front/src/routes/(admin)/admin/events/new/+page.svelte
    packages/front/src/routes/(admin)/admin/events/new/save/+server.ts
    packages/front/src/routes/(admin)/admin/events/new/publish/+server.ts
    packages/front/src/routes/(admin)/admin/events/[id]/edit/+page.server.ts
    packages/front/src/routes/(admin)/admin/events/[id]/edit/+page.svelte
    packages/front/src/routes/(app)/events/new/+page.server.ts (DELETE)
    packages/front/src/routes/(app)/events/new/+page.svelte (DELETE)
    packages/front/src/routes/(app)/events/new/save/+server.ts (DELETE)
    packages/front/src/routes/(app)/events/new/publish/+server.ts (DELETE)
    packages/front/src/routes/(app)/events/[id]/edit/+page.server.ts (DELETE)
    packages/front/src/routes/(app)/events/[id]/edit/+page.svelte (DELETE)
  </files>
  <action>
**Copier** les fichiers wizard depuis `(app)/events/new/` et `(app)/events/[id]/edit/` vers `(admin)/admin/events/`, puis **supprimer** les originaux.

Fichiers à copier :
- `(app)/events/new/+page.server.ts` → `(admin)/admin/events/new/+page.server.ts`
- `(app)/events/new/+page.svelte` → `(admin)/admin/events/new/+page.svelte`
- `(app)/events/new/save/+server.ts` → `(admin)/admin/events/new/save/+server.ts`
- `(app)/events/new/publish/+server.ts` → `(admin)/admin/events/new/publish/+server.ts`
- `(app)/events/[id]/edit/+page.server.ts` → `(admin)/admin/events/[id]/edit/+page.server.ts`
- `(app)/events/[id]/edit/+page.svelte` → `(admin)/admin/events/[id]/edit/+page.svelte`

**Redirections après publish/save** : les wizards redirigent vers `/events` après publish. Conserver ce comportement (la liste publique des événements reste dans `(app)`). Pas de modification du contenu des fichiers.

**Supprimer** avec `rm` :
```bash
rm packages/front/src/routes/(app)/events/new/+page.server.ts
rm packages/front/src/routes/(app)/events/new/+page.svelte
rm packages/front/src/routes/(app)/events/new/save/+server.ts
rm packages/front/src/routes/(app)/events/new/publish/+server.ts
rm packages/front/src/routes/(app)/events/[id]/edit/+page.server.ts
rm packages/front/src/routes/(app)/events/[id]/edit/+page.svelte
rmdir packages/front/src/routes/(app)/events/new/save
rmdir packages/front/src/routes/(app)/events/new/publish
rmdir packages/front/src/routes/(app)/events/new
rmdir packages/front/src/routes/(app)/events/[id]/edit
```

**Mettre à jour les liens vers le wizard** dans les fichiers qui pointaient vers `/events/new` ou `/events/[id]/edit` :

Dans `packages/front/src/routes/(app)/events/+page.svelte` :
- Chercher tout lien `href="/events/new"` → remplacer par `href="/admin/events/new"`

Dans `packages/front/src/routes/(app)/events/[id]/+page.svelte` :
- Chercher tout lien `href="/events/{id}/edit"` ou `href={\`/events/${...}/edit\`}` → remplacer par `/admin/events/{id}/edit`

Dans `packages/front/src/routes/(app)/events/[id]/+page.server.ts` :
- Si un redirect vers `/events/{id}/edit` existe → mettre à jour vers `/admin/events/{id}/edit`

Ajouter le lien "Créer un événement" dans le sidebar `(admin)/+layout.svelte` :
- Remplacer le lien "Événements" actuel par `href="/admin/events/new"` avec le label "Créer un événement"
- Ajouter un lien `href="/admin"` pour "Administration" (ou garder les deux liens distincts)

Sidebar final — liens :
1. `href="/admin/events/new"` — icône cible fléchette — label "Créer un événement"
2. `href="/admin"` — icône bâtiment — label "Entités"
  </action>
  <verify>
    <automated>cd /home/jta/Projects/darts-management/master && pnpm typecheck 2>&1 | tail -30</automated>
  </verify>
  <done>
    - `(admin)/admin/events/` contient les 6 fichiers migrés
    - `(app)/events/new/` et `(app)/events/[id]/edit/` n'existent plus
    - Les liens vers le wizard dans `(app)/events/` pointent vers `/admin/events/...`
    - typecheck passe
    - GET /admin/events/new sert le wizard dans le layout sidebar admin
  </done>
</task>

</tasks>

<verification>
```bash
cd /home/jta/Projects/darts-management/master
# Vérifier que les nouvelles routes existent
ls packages/front/src/routes/\(admin\)/admin/
ls packages/front/src/routes/\(admin\)/admin/events/new/
ls packages/front/src/routes/\(admin\)/admin/events/[id]/edit/

# Vérifier que les anciennes routes sont supprimées
ls packages/front/src/routes/\(app\)/admin 2>&1
ls packages/front/src/routes/\(app\)/events/new 2>&1
ls packages/front/src/routes/\(app\)/events/[id]/edit 2>&1

# Typecheck global
pnpm typecheck
```
</verification>

<success_criteria>
- Groupe `(admin)` créé avec layout sidebar desktop collapsible (collapse/expand via bouton flèche) et menu hamburger mobile
- Sidebar contient 2 liens : "Créer un événement" (`/admin/events/new`) et "Entités" (`/admin`)
- Routes `(app)/admin/*` supprimées, migrées sous `(admin)/admin/`
- Routes `(app)/events/new` et `(app)/events/[id]/edit` supprimées, migrées sous `(admin)/admin/events/`
- Liens depuis `(app)/events/` mis à jour vers `/admin/events/`
- `pnpm typecheck` passe sans erreur
- URL `/admin` sert le contenu entités avec le sidebar admin visible
</success_criteria>

<output>
After completion, create `.planning/quick/2-restructuration-des-routes-section-admin/2-SUMMARY.md`
</output>
