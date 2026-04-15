<script lang="ts">
import {
	ArrowRightToBracketOutline,
	AwardOutline,
	BarsOutline,
	BuildingOutline,
	HomeOutline,
} from "flowbite-svelte-icons"
import { page } from "$app/stores"

let { children } = $props()
let sidebarOpen = $state(false)

// biome-ignore lint/correctness/noUnusedVariables: utilisée dans le template via {@const}
function isActive(href: string): boolean {
	if (href === "/admin") return $page.url.pathname === "/admin"
	return $page.url.pathname.startsWith(href)
}

const NAV_ITEMS = [
	{ href: "/admin", label: "Accueil", Icon: HomeOutline },
	{ href: "/admin/events", label: "Évènements", Icon: AwardOutline },
	{ href: "/admin/entities", label: "Entités", Icon: BuildingOutline },
]
</script>

<!-- ─── Scrim : apparaît quand la sidebar est ouverte ─── -->
{#if sidebarOpen}
	<button
		type="button"
		class="fixed inset-0 z-40 cursor-default"
		style="background: rgb(0 0 0 / 0.5);"
		onclick={() => (sidebarOpen = false)}
		aria-label="Fermer le menu"
	></button>
{/if}

<!-- ─── Sidebar complète (overlay, mobile + desktop) ─── -->
<aside
	class="fixed left-0 top-0 z-50 flex h-full w-56 flex-col transition-transform duration-200 ease-out"
	class:-translate-x-full={!sidebarOpen}
	style="background: oklch(14% 0.02 264); color: white;"
	aria-hidden={!sidebarOpen}
>
	<!-- Bouton hamburger en tête -->
	<button
		type="button"
		onclick={() => (sidebarOpen = false)}
		class="flex h-14 w-full shrink-0 items-center gap-2 border-b px-4 text-left transition-colors hover:opacity-80"
		style="border-color: oklch(22% 0.02 264);"
		aria-label="Fermer le menu"
	>
		<svg
			aria-hidden="true"
			class="h-5 w-5 shrink-0"
			fill="none"
			viewBox="0 0 24 24"
			stroke="currentColor"
			stroke-width="2"
		>
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				d="M4 6h16M4 12h16M4 18h16"
			/>
		</svg>
		<span class="text-sm font-bold" style="font-family: var(--font-display);"
			>FFD Darts</span
		>
	</button>

	<!-- Label section -->
	<div class="px-4 pb-1 pt-5">
		<span
			class="text-[0.65rem] font-semibold uppercase tracking-widest"
			style="color: oklch(55% 0.02 264);"
		>
			Administration
		</span>
	</div>

	<!-- Nav items -->
	<nav class="flex-1 overflow-hidden py-2">
		{#each NAV_ITEMS as { href, label, Icon } (href)}
			{@const active = isActive(href)}
			<a
				{href}
				onclick={() => (sidebarOpen = false)}
				class="mx-1.5 my-0.5 flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors"
				style="color: {active ? 'white' : 'oklch(70% 0.01 264)'}; background: {active
					? 'oklch(22% 0.03 264)'
					: 'transparent'};"
			>
				<Icon class="h-4.5 w-4.5 shrink-0" />
				<span class="whitespace-nowrap">{label}</span>
				{#if active}
					<div
						class="ml-auto h-1.5 w-1.5 rounded-full"
						style="background: var(--color-primary-400);"
					></div>
				{/if}
			</a>
		{/each}
	</nav>

	<!-- Quitter admin -->
	<div class="border-t pb-2 pt-1" style="border-color: oklch(22% 0.02 264);">
		<a
			href="/"
			onclick={() => (sidebarOpen = false)}
			class="mx-1.5 flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors"
			style="color: oklch(62% 0.15 25);"
		>
			<ArrowRightToBracketOutline class="h-4.5 w-4.5 shrink-0" />
			<span class="whitespace-nowrap">Quitter l'administration</span>
		</a>
	</div>
</aside>

<!-- ─── Mini-sidebar desktop (toujours visible, icônes seules) ─── -->
<aside
	class="fixed left-0 top-0 z-30 hidden h-full w-14 flex-col md:flex"
	style="background: oklch(14% 0.02 264); color: white;"
>
	<!-- Bouton hamburger -->
	<button
		type="button"
		onclick={() => (sidebarOpen = true)}
		class="flex h-14 w-full shrink-0 items-center justify-center border-b transition-colors hover:opacity-80"
		style="border-color: oklch(22% 0.02 264);"
		aria-label="Ouvrir le menu"
	>
		<svg
			aria-hidden="true"
			class="h-5 w-5 shrink-0"
			fill="none"
			viewBox="0 0 24 24"
			stroke="currentColor"
			stroke-width="2"
		>
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				d="M4 6h16M4 12h16M4 18h16"
			/>
		</svg>
	</button>

	<!-- Icônes de navigation -->
	<nav class="flex-1 py-2">
		{#each NAV_ITEMS as { href, label, Icon } (href)}
			{@const active = isActive(href)}
			<a
				{href}
				class="mx-1.5 my-0.5 flex items-center justify-center rounded-lg p-2 transition-colors"
				title={label}
				style="color: {active ? 'white' : 'oklch(70% 0.01 264)'}; background: {active
					? 'oklch(22% 0.03 264)'
					: 'transparent'};"
			>
				<Icon class="h-4.5 w-4.5 shrink-0" />
			</a>
		{/each}
	</nav>

	<!-- Quitter admin (icône seule) -->
	<div class="border-t pb-2 pt-1" style="border-color: oklch(22% 0.02 264);">
		<a
			href="/"
			class="mx-1.5 flex items-center justify-center rounded-lg p-2 transition-colors"
			title="Quitter l'administration"
			style="color: oklch(62% 0.15 25);"
		>
			<ArrowRightToBracketOutline class="h-4.5 w-4.5 shrink-0" />
		</a>
	</div>
</aside>

<!-- ─── Header mobile ─── -->
<div
	class="fixed left-0 right-0 top-0 z-30 flex h-14 items-center gap-3 border-b px-4 md:hidden"
	style="background: oklch(14% 0.02 264); border-color: oklch(22% 0.02 264);"
>
	<button
		type="button"
		onclick={() => (sidebarOpen = true)}
		class="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-white/10"
		aria-label="Ouvrir le menu"
	>
		<BarsOutline class="h-5 w-5 text-white" />
	</button>
	<span
		class="text-sm font-bold text-white"
		style="font-family: var(--font-display);"
	>
		Administration
	</span>
</div>

<!-- ─── Contenu principal ─── -->
<!-- Mobile : pt-20 compense le header fixe (h-14) + espace -->
<!-- Desktop : pl-14 = largeur de la mini-sidebar (w-14), pas de décalage dynamique -->
<main class="min-h-dvh px-4 py-6 pt-20 sm:px-6 md:pl-14 md:pt-6">
	<div class="mx-auto max-w-6xl">{@render children()}</div>
</main>
