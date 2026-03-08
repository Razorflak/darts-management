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
  <!-- Bouton collapse/expand -->
  <button
    onclick={toggleCollapse}
    class="flex items-center justify-center h-12 hover:bg-gray-700 border-b border-gray-700 w-full"
    aria-label={collapsed ? "Développer le menu" : "Réduire le menu"}
  >
    {#if collapsed}
      <!-- chevron right -->
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M7.5 5l5 5-5 5" />
      </svg>
    {:else}
      <!-- chevron left -->
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M12.5 5l-5 5 5 5" />
      </svg>
    {/if}
  </button>

  <!-- Nav items -->
  <nav class="flex-1 py-2">
    <!-- Accueil -->
    <a
      href="/admin"
      class="flex items-center gap-3 px-3 py-2 hover:bg-gray-700 rounded mx-1"
      class:justify-center={collapsed}
      title={collapsed ? "Accueil" : undefined}
    >
      <!-- icône maison -->
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class="shrink-0">
        <path d="M3 9.5L10 3l7 6.5V19a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" />
        <path d="M8 20V13h4v7" />
      </svg>
      {#if !collapsed}
        <span class="text-sm font-medium whitespace-nowrap">Accueil</span>
      {/if}
    </a>

    <!-- Évènements -->
    <a
      href="/admin/events"
      class="flex items-center gap-3 px-3 py-2 hover:bg-gray-700 rounded mx-1"
      class:justify-center={collapsed}
      title={collapsed ? "Évènements" : undefined}
    >
      <!-- icône cible/fléchette -->
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class="shrink-0">
        <circle cx="10" cy="10" r="8" />
        <circle cx="10" cy="10" r="4" />
        <circle cx="10" cy="10" r="1" fill="currentColor" stroke="none" />
      </svg>
      {#if !collapsed}
        <span class="text-sm font-medium whitespace-nowrap">Évènements</span>
      {/if}
    </a>

    <!-- Entités -->
    <a
      href="/admin/entities"
      class="flex items-center gap-3 px-3 py-2 hover:bg-gray-700 rounded mx-1"
      class:justify-center={collapsed}
      title={collapsed ? "Entités" : undefined}
    >
      <!-- icône bâtiment -->
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class="shrink-0">
        <rect x="3" y="7" width="14" height="11" rx="1" />
        <path d="M6 7V5a4 4 0 0 1 8 0v2" />
        <rect x="8" y="11" width="4" height="7" />
      </svg>
      {#if !collapsed}
        <span class="text-sm font-medium whitespace-nowrap">Entités</span>
      {/if}
    </a>
  </nav>
</aside>

<!-- Mobile header avec hamburger -->
<div class="md:hidden fixed top-0 left-0 right-0 z-30 bg-gray-900 text-white h-12 flex items-center px-4 gap-4">
  <button onclick={toggleMobileMenu} class="p-1" aria-label={mobileOpen ? "Fermer le menu" : "Ouvrir le menu"}>
    {#if mobileOpen}
      <!-- X -->
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M18 6L6 18M6 6l12 12" />
      </svg>
    {:else}
      <!-- Hamburger -->
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M3 12h18M3 6h18M3 18h18" />
      </svg>
    {/if}
  </button>
  <span class="font-semibold text-sm">Administration</span>
</div>

<!-- Mobile dropdown menu (overlay) -->
{#if mobileOpen}
  <div
    class="md:hidden fixed inset-0 z-20 bg-black/50"
    onclick={toggleMobileMenu}
    role="presentation"
  ></div>
  <nav class="md:hidden fixed top-12 left-0 z-20 bg-gray-900 text-white w-56 py-2">
    <a
      href="/admin"
      onclick={toggleMobileMenu}
      class="flex items-center gap-3 px-4 py-3 hover:bg-gray-700"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M3 9.5L10 3l7 6.5V19a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" />
        <path d="M8 20V13h4v7" />
      </svg>
      Accueil
    </a>
    <a
      href="/admin/events"
      onclick={toggleMobileMenu}
      class="flex items-center gap-3 px-4 py-3 hover:bg-gray-700"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <circle cx="10" cy="10" r="8" />
        <circle cx="10" cy="10" r="4" />
        <circle cx="10" cy="10" r="1" fill="currentColor" stroke="none" />
      </svg>
      Évènements
    </a>
    <a
      href="/admin/entities"
      onclick={toggleMobileMenu}
      class="flex items-center gap-3 px-4 py-3 hover:bg-gray-700"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <rect x="3" y="7" width="14" height="11" rx="1" />
        <path d="M6 7V5a4 4 0 0 1 8 0v2" />
        <rect x="8" y="11" width="4" height="7" />
      </svg>
      Entités
    </a>
  </nav>
{/if}

<!-- Contenu principal : pleine largeur, mêmes paddings que (app) -->
<main class="container mx-auto px-4 py-6 mt-12 md:mt-0">
  {@render children()}
</main>
