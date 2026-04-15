<script lang="ts">
import {
	ArrowRightToBracketOutline,
	AwardOutline,
	BarsOutline,
	BuildingOutline,
	CloseOutline,
	HomeOutline,
} from "flowbite-svelte-icons"
import { page } from "$app/stores"

let { children } = $props()
let collapsed = $state(false)
let mobileOpen = $state(false)

function toggleCollapse() {
	collapsed = !collapsed
}
function closeMobile() {
	mobileOpen = false
}

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

<!-- ─── Sidebar desktop ─── -->
<aside
	class="hidden md:flex flex-col fixed top-0 left-0 h-full z-40 transition-[width] duration-200 overflow-hidden"
	style="background: oklch(14% 0.02 264); color: white; width: {collapsed ? '3.5rem' : '14rem'};"
>
	<!-- Bouton collapse -->
	<button
		type="button"
		onclick={toggleCollapse}
		class="flex h-14 w-full items-center justify-center border-b transition-colors hover:opacity-80"
		style="border-color: oklch(22% 0.02 264);"
		aria-label={collapsed ? "Développer le menu" : "Réduire le menu"}
	>
		{#if collapsed}
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
		{:else}
			<div class="flex w-full items-center gap-2 px-4">
				<svg
					aria-hidden="true"
					viewBox="0 0 24 24"
					fill="none"
					stroke="white"
					stroke-width="2.5"
					stroke-linecap="round"
					stroke-linejoin="round"
					class="h-5 w-5 shrink-0"
				>
					<circle cx="12" cy="12" r="10" />
					<circle cx="12" cy="12" r="6" />
					<circle cx="12" cy="12" r="2" />
				</svg>
				<span
					class="whitespace-nowrap text-sm font-bold"
					style="font-family: var(--font-display);"
				>
					FFD Darts
				</span>
				<svg
					aria-hidden="true"
					class="ml-auto h-4 w-4 shrink-0 opacity-40"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
					stroke-width="2"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						d="M15 19l-7-7 7-7"
					/>
				</svg>
			</div>
		{/if}
	</button>

	<!-- Label section -->
	{#if !collapsed}
		<div class="px-4 pt-5 pb-1">
			<span
				class="text-[0.65rem] font-semibold uppercase tracking-widest"
				style="color: oklch(55% 0.02 264);"
			>
				Administration
			</span>
		</div>
	{/if}

	<!-- Nav items -->
	<nav class="flex-1 py-2 overflow-hidden">
		{#each NAV_ITEMS as { href, label, Icon } (href)}
			{@const active = isActive(href)}
			<a
				{href}
				class="mx-1.5 my-0.5 flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors"
				class:justify-center={collapsed}
				title={collapsed ? label : undefined}
				style="color: {active ? 'white' : 'oklch(70% 0.01 264)'}; background: {active ? 'oklch(22% 0.03 264)' : 'transparent'};"
			>
				<Icon class="h-4.5 w-4.5 shrink-0" />
				{#if !collapsed}
					<span class="whitespace-nowrap">{label}</span>
					{#if active}
						<div
							class="ml-auto h-1.5 w-1.5 rounded-full"
							style="background: var(--color-primary-400);"
						></div>
					{/if}
				{/if}
			</a>
		{/each}
	</nav>

	<!-- Quitter admin -->
	<div class="border-t pb-2 pt-1" style="border-color: oklch(22% 0.02 264);">
		<a
			href="/"
			class="mx-1.5 flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors"
			class:justify-center={collapsed}
			title={collapsed ? "Quitter l'administration" : undefined}
			style="color: oklch(62% 0.15 25);"
		>
			<ArrowRightToBracketOutline class="h-4.5 w-4.5 shrink-0" />
			{#if !collapsed}
				<span class="whitespace-nowrap">Quitter l'administration</span>
			{/if}
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
		onclick={() => (mobileOpen = !mobileOpen)}
		class="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-white/10"
		aria-label={mobileOpen ? "Fermer le menu" : "Ouvrir le menu"}
	>
		{#if mobileOpen}
			<CloseOutline class="h-5 w-5 text-white" />
		{:else}
			<BarsOutline class="h-5 w-5 text-white" />
		{/if}
	</button>
	<span
		class="text-sm font-bold text-white"
		style="font-family: var(--font-display);"
	>
		Administration
	</span>
</div>

<!-- ─── Menu mobile (drawer) ─── -->
{#if mobileOpen}
	<!-- Scrim -->
	<button
		type="button"
		class="fixed inset-0 z-20 md:hidden"
		style="background: rgb(0 0 0 / 0.5);"
		onclick={closeMobile}
		aria-label="Fermer le menu"
	></button>

	<!-- Drawer -->
	<nav
		class="fixed left-0 top-14 z-20 h-[calc(100dvh-3.5rem)] w-60 overflow-y-auto py-2 md:hidden"
		style="background: oklch(14% 0.02 264);"
	>
		{#each NAV_ITEMS as { href, label, Icon } (href)}
			{@const active = isActive(href)}
			<a
				{href}
				onclick={closeMobile}
				class="mx-2 my-0.5 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors"
				style="color: {active ? 'white' : 'oklch(70% 0.01 264)'}; background: {active ? 'oklch(22% 0.03 264)' : 'transparent'};"
			>
				<Icon class="h-4.5 w-4.5 shrink-0" />
				{label}
			</a>
		{/each}
		<div
			class="mx-2 mt-2 border-t pt-2"
			style="border-color: oklch(22% 0.02 264);"
		>
			<a
				href="/"
				onclick={closeMobile}
				class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors"
				style="color: oklch(62% 0.15 25);"
			>
				<ArrowRightToBracketOutline class="h-4.5 w-4.5 shrink-0" />
				Quitter l'administration
			</a>
		</div>
	</nav>
{/if}

<!-- ─── Contenu principal ─── -->
<!-- Offset sidebar sur md+ : collapsed = 3.5rem, expanded = 14rem -->
<main
	class="min-h-dvh px-4 py-6 pt-20 transition-[padding] duration-200 sm:px-6 md:pt-6"
	style="padding-left: max(1rem, {collapsed ? '5.5rem' : '16rem'});"
>
	<div class="mx-auto max-w-6xl">{@render children()}</div>
</main>
