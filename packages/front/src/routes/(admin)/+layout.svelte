<script lang="ts">
import {
	ArrowRightToBracketOutline,
	AwardOutline,
	BarsOutline,
	BuildingOutline,
	ChevronLeftOutline,
	ChevronRightOutline,
	CloseOutline,
	HomeOutline,
} from "flowbite-svelte-icons"

let { children, data } = $props()
let collapsed = $state(false)
let mobileOpen = $state(false)
function toggleCollapse() {
	collapsed = !collapsed
}
function toggleMobileMenu() {
	mobileOpen = !mobileOpen
}
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
			<ChevronRightOutline />
		{:else}
			<ChevronLeftOutline />
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
			<HomeOutline class="shrink-0" />
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
			<AwardOutline class="shrink-0" />
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
			<BuildingOutline class="shrink-0" />
			{#if !collapsed}
				<span class="text-sm font-medium whitespace-nowrap">Entités</span>
			{/if}
		</a>
	</nav>

	<!-- Quitter l'administration -->
	<div class="border-t border-gray-700 py-2">
		<a
			href="/"
			class="flex items-center gap-3 px-3 py-2 hover:bg-red-900/40 rounded mx-1 text-red-400"
			class:justify-center={collapsed}
			title={collapsed ? "Quitter l'administration" : undefined}
		>
			<!-- icône flèche sortie -->
			<ArrowRightToBracketOutline class="shrink-0" />
			{#if !collapsed}
				<span class="text-sm font-medium whitespace-nowrap"
					>Quitter l'administration</span
				>
			{/if}
		</a>
	</div>
</aside>

<!-- Mobile header avec hamburger -->
<div
	class="md:hidden fixed top-0 left-0 right-0 z-30 bg-gray-900 text-white h-12 flex items-center px-4 gap-4"
>
	<button
		onclick={toggleMobileMenu}
		class="p-1"
		aria-label={mobileOpen ? "Fermer le menu" : "Ouvrir le menu"}
	>
		{#if mobileOpen}
			<CloseOutline />
		{:else}
			<BarsOutline />
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
	<nav
		class="md:hidden fixed top-12 left-0 z-20 bg-gray-900 text-white w-56 py-2"
	>
		<a
			href="/admin"
			onclick={toggleMobileMenu}
			class="flex items-center gap-3 px-4 py-3 hover:bg-gray-700"
		>
			<HomeOutline />
			Accueil
		</a>
		<a
			href="/admin/events"
			onclick={toggleMobileMenu}
			class="flex items-center gap-3 px-4 py-3 hover:bg-gray-700"
		>
			<AwardOutline />
			Évènements
		</a>
		<a
			href="/admin/entities"
			onclick={toggleMobileMenu}
			class="flex items-center gap-3 px-4 py-3 hover:bg-gray-700"
		>
			<BuildingOutline />
			Entités
		</a>
		<div class="border-t border-gray-700 mt-1 pt-1">
			<a
				href="/"
				onclick={toggleMobileMenu}
				class="flex items-center gap-3 px-4 py-3 hover:bg-red-900/40 text-red-400"
			>
				<ArrowRightToBracketOutline />
				Quitter l'administration
			</a>
		</div>
	</nav>
{/if}

<!-- Contenu principal : pleine largeur, mêmes paddings que (app) -->
<main class="container mx-auto px-4 py-6 mt-12 md:mt-0">
	{@render children()}
</main>
