---
phase: quick-3
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - packages/front/src/routes/(app)/events/+page.svelte
  - packages/front/src/routes/(app)/events/+page.server.ts
  - packages/front/src/routes/(app)/+layout.svelte
  - packages/front/src/routes/(admin)/admin/+page.svelte
  - packages/front/src/routes/(admin)/admin/+page.server.ts
  - packages/front/src/routes/(admin)/+layout.svelte
autonomous: true
requirements: [QUICK-3]

must_haves:
  truths:
    - "La route /events n'est plus accessible (redirige ou 404)"
    - "Le lien 'Événements' a disparu de la navbar (app)"
    - "La page /admin affiche uniquement un titre 'Administration', sans tableau d'entités"
    - "La sidebar admin glisse par-dessus le contenu (overlay) sans déplacer la largeur principale"
    - "Le contenu admin a la même largeur max et les mêmes paddings que le reste de l'app"
  artifacts:
    - path: "packages/front/src/routes/(admin)/+layout.svelte"
      provides: "Layout admin avec sidebar overlay"
    - path: "packages/front/src/routes/(admin)/admin/+page.svelte"
      provides: "Dashboard admin vide"
    - path: "packages/front/src/routes/(app)/+layout.svelte"
      provides: "Navbar sans lien Événements"
  key_links:
    - from: "packages/front/src/routes/(app)/+layout.svelte"
      to: "NavLi href='/events'"
      via: "suppression du NavLi"
      pattern: "href.*events"
    - from: "packages/front/src/routes/(admin)/+layout.svelte"
      to: "main content"
      via: "position:fixed sidebar + main full-width"
      pattern: "fixed.*sidebar"
---

<objective>
Quatre corrections post-quick-2 : supprimer la route /events publique, vider le dashboard /admin, transformer la sidebar admin en overlay (position fixed sans push), et aligner la largeur du contenu admin sur le reste de l'app.

Purpose: Nettoyage de l'interface suite à la restructuration des routes — la section /events n'a plus lieu d'être, le dashboard admin sera rempli plus tard, et la sidebar ne doit pas réduire l'espace de travail.
Output: Routes propres, sidebar overlay, pages cohérentes visuellement.
</objective>

<execution_context>
@/home/jta/.claude/get-shit-done/workflows/execute-plan.md
@/home/jta/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@packages/front/src/routes/(admin)/+layout.svelte
@packages/front/src/routes/(admin)/admin/+page.svelte
@packages/front/src/routes/(admin)/admin/+page.server.ts
@packages/front/src/routes/(app)/+layout.svelte
@packages/front/src/routes/(app)/events/+page.svelte
@packages/front/src/routes/(app)/events/+page.server.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Supprimer /events et nettoyer la navbar</name>
  <files>
    packages/front/src/routes/(app)/events/+page.svelte
    packages/front/src/routes/(app)/events/+page.server.ts
    packages/front/src/routes/(app)/+layout.svelte
  </files>
  <action>
    1. Supprimer les deux fichiers de la route /events :
       - `packages/front/src/routes/(app)/events/+page.svelte`
       - `packages/front/src/routes/(app)/events/+page.server.ts`

       NOTE : Ne pas supprimer `(app)/events/[id]/` — les pages d'événement individuel restent.

    2. Dans `packages/front/src/routes/(app)/+layout.svelte`, supprimer le NavLi qui pointe vers /events :
       ```svelte
       <NavLi href="/events">Événements</NavLi>
       ```
       Garder : NavLi href="/" (Tableau de bord) et le bloc conditionnel `{#if data.hasAdminAccess}` vers /admin.
  </action>
  <verify>
    pnpm --filter front typecheck
    # Vérifier manuellement : GET /events doit retourner 404 (route supprimée)
  </verify>
  <done>
    La route /events n'existe plus. La navbar ne contient plus de lien "Événements". Les routes /events/[id]/* restent intactes.
  </done>
</task>

<task type="auto">
  <name>Task 2: Dashboard /admin vide</name>
  <files>
    packages/front/src/routes/(admin)/admin/+page.svelte
    packages/front/src/routes/(admin)/admin/+page.server.ts
  </files>
  <action>
    1. Remplacer le contenu de `+page.svelte` par un dashboard minimaliste :
       - Supprimer tous les imports Flowbite (Table, Badge, Button, etc.) et la logique de groupage
       - Supprimer le `let { data } = $props()` (plus de données nécessaires)
       - Afficher uniquement un titre h1 "Administration" avec le sous-titre/label habituel de l'app (même style que la homepage : label uppercase en primary-500 + h1 bold)

       Exemple de structure (reprendre le même style visuel que la homepage `(app)/+page.svelte`) :
       ```svelte
       <svelte:head>
         <title>Administration — FFD Darts</title>
       </svelte:head>

       <div class="mb-8">
         <p class="mb-1 text-xs font-semibold uppercase tracking-widest text-primary-500">Dashboard</p>
         <h1 class="text-3xl font-bold text-gray-900">Administration</h1>
       </div>
       ```

    2. Remplacer le contenu de `+page.server.ts` par une load minimale :
       - Conserver uniquement le check d'authentification et la vérification du rôle adminFederal (garder la protection existante)
       - Supprimer la requête SQL sur les entités et le retour `{ grouped }`
       - Retourner `{}` (objet vide)

       ```typescript
       import { getUserRoles } from "$lib/server/authz"
       import { sql } from "$lib/server/db"  // peut être supprimé si non utilisé
       import { error } from "@sveltejs/kit"
       import type { PageServerLoad } from "./$types"

       export const load: PageServerLoad = async ({ locals }) => {
         if (!locals.user) {
           error(401, "Non authentifié")
         }
         const userRoles = await getUserRoles(locals.user.id)
         const isAdminFederal = userRoles.some((r) => r.role === "adminFederal")
         if (!isAdminFederal) {
           error(403, "Accès réservé aux administrateurs fédéraux.")
         }
         return {}
       }
       ```
       Supprimer les imports `sql`, `z`, `EntityWithParentSchema`, `EntityWithParent` qui ne sont plus utilisés.
  </action>
  <verify>pnpm --filter front typecheck</verify>
  <done>
    GET /admin affiche uniquement le titre "Administration" sans tableau d'entités. La protection d'accès adminFederal est maintenue.
  </done>
</task>

<task type="auto">
  <name>Task 3: Sidebar overlay + largeur contenu alignée</name>
  <files>
    packages/front/src/routes/(admin)/+layout.svelte
  </files>
  <action>
    Refactoriser `(admin)/+layout.svelte` pour que :

    1. **Sidebar desktop : overlay, pas de push.** Le layout ne doit plus être un `flex` horizontal qui réserve de l'espace à la sidebar. La sidebar doit être en `position:fixed` et glisser PAR-DESSUS le contenu.

    2. **Contenu principal : pleine largeur, même contraintes que (app).** Le `<main>` doit avoir `class="container mx-auto px-4 py-6"` — exactement comme `(app)/+layout.svelte` — sans décalage lié à la sidebar.

    3. **Sidebar desktop : fixed à gauche, z-index élevé.** Quand ouverte (non collapsed), largeur w-56. Quand collapsed, largeur w-14. Toggle collapse fonctionne toujours.

    4. **Backdrop desktop optionnel.** Pas nécessaire — la sidebar collapsed/expanded est un toggle permanent sur desktop, pas un drawer temporaire. Garder le comportement actuel (toggle collapse) mais en overlay.

    5. **Mobile : comportement inchangé.** Le header mobile fixe en haut et le menu dropdown overlay (déjà correct) restent tels quels. Ajuster `mt-12` sur le main pour compenser le header mobile.

    Structure cible du layout :

    ```svelte
    <script lang="ts">
      let { children, data } = $props()
      let collapsed = $state(false)
      let mobileOpen = $state(false)
      function toggleCollapse() { collapsed = !collapsed }
      function toggleMobileMenu() { mobileOpen = !mobileOpen }
    </script>

    <!-- Sidebar desktop : fixed overlay, hidden on mobile -->
    <aside
      class="hidden md:flex flex-col fixed top-0 left-0 h-full bg-gray-900 text-white z-40 transition-all duration-200"
      class:w-56={!collapsed}
      class:w-14={collapsed}
    >
      <!-- ... bouton collapse + nav items inchangés ... -->
    </aside>

    <!-- Mobile header (inchangé) -->
    <div class="md:hidden fixed top-0 left-0 right-0 z-30 bg-gray-900 text-white h-12 flex items-center px-4 gap-4">
      <!-- ... hamburger inchangé ... -->
    </div>

    <!-- Mobile menu dropdown (inchangé) -->
    {#if mobileOpen}
      <!-- ... backdrop + nav inchangés ... -->
    {/if}

    <!-- Contenu principal : pleine largeur, mêmes paddings que (app) -->
    <main class="container mx-auto px-4 py-6 mt-12 md:mt-0">
      {@render children()}
    </main>
    ```

    Points clés :
    - Retirer `<div class="flex min-h-screen">` wrapper (plus besoin du flex row)
    - `<aside>` passe de `hidden md:flex flex-col ... shrink-0` à `hidden md:flex flex-col fixed top-0 left-0 h-full ... z-40`
    - `<main>` passe de `flex-1 p-6 pt-6 md:pt-6 mt-12 md:mt-0 overflow-auto` à `container mx-auto px-4 py-6 mt-12 md:mt-0`
    - Le contenu sera visuellement sous la sidebar quand celle-ci est ouverte sur les petits écrans desktop (comportement overlay attendu)
  </action>
  <verify>pnpm --filter front typecheck</verify>
  <done>
    La sidebar est en position fixed (overlay). Le contenu admin a container mx-auto px-4 py-6, identique à (app). Sur desktop, la sidebar glisse par-dessus le contenu sans réduire sa largeur.
  </done>
</task>

</tasks>

<verification>
pnpm typecheck

Vérifications manuelles :
- GET /events → 404 (route supprimée)
- Navbar sur / ou /events/[id] → pas de lien "Événements"
- GET /admin → affiche "Administration" sans liste d'entités
- /admin sur desktop → sidebar en overlay (largeur pleine pour le contenu), togglable
- /admin sur mobile → header fixe + dropdown overlay (comportement inchangé)
- Largeur du contenu /admin identique à la page /
</verification>

<success_criteria>
- Route (app)/events supprimée (404), lien navbar retiré
- Dashboard /admin vide (titre seul), load sans requête SQL entités
- Sidebar admin en position fixed z-40, contenu main en container mx-auto px-4 py-6
- pnpm typecheck passe sans erreurs
</success_criteria>

<output>
After completion, create `.planning/quick/3-corrections-admin-supprimer-events-dashb/3-SUMMARY.md`
</output>
