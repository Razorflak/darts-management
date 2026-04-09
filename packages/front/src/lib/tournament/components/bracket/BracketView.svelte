<script lang="ts">
import { CompressOutline, ExpandOutline } from "flowbite-svelte-icons"
import { onMount } from "svelte"
import type { MatchDisplay } from "$lib/server/schemas/event-schemas.js"
import BracketSection from "./BracketSection.svelte"
import { buildBracketLayout, isMatchHighlighted } from "./bracket-utils.js"

type Props = {
	matches: MatchDisplay[]
	phaseName: string
	eventId: string
	stickyHeader?: boolean
	onMatchClick: (match: MatchDisplay) => void
}

let { matches, phaseName, stickyHeader = true, onMatchClick }: Props = $props()

// ─── Plein écran ─────────────────────────────────────────────────────────────

let fullscreen = $state(false)

function toggleFullscreen() {
	fullscreen = !fullscreen
}

function handleKeydown(e: KeyboardEvent) {
	if (e.key === "Escape" && fullscreen) fullscreen = false
}

onMount(() => {
	document.addEventListener("keydown", handleKeydown)
	return () => document.removeEventListener("keydown", handleKeydown)
})

// ─── Recherche ───────────────────────────────────────────────────────────────

let searchQuery = $state("")
let scrollContainer: HTMLElement | undefined = $state()

function handleSearch(e: Event) {
	e.preventDefault()
	if (!scrollContainer || !searchQuery.trim()) return
	const first = scrollContainer.querySelector<HTMLElement>("[data-highlighted]")
	first?.scrollIntoView({
		behavior: "smooth",
		block: "center",
		inline: "center",
	})
}

// ─── Layout ──────────────────────────────────────────────────────────────────

let layout = $derived(buildBracketLayout(matches))
</script>

<!-- Conteneur principal -->
<div
	class="bracket-root flex flex-col rounded-lg border border-gray-200 bg-white"
	class:bracket-fullscreen={fullscreen}
>
	<!-- Header -->
	<div
		class="flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-2"
		class:sticky={stickyHeader}
		class:top-0={stickyHeader}
		class:z-10={stickyHeader}
	>
		<div class="min-w-0 flex-1">
			<span class="font-semibold text-gray-800">{phaseName}</span>
			<span class="ml-2 text-sm text-gray-500"
				>{layout.finishedMatches}/{layout.totalMatches} matchs terminés</span
			>
		</div>

		<!-- Recherche -->
		<form onsubmit={handleSearch} class="flex items-center gap-1">
			<input
				type="search"
				placeholder="Rechercher une équipe…"
				bind:value={searchQuery}
				class="w-44 rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
			/>
		</form>

		<!-- Bouton plein écran -->
		<button
			type="button"
			onclick={toggleFullscreen}
			class="rounded p-1 text-gray-500 hover:bg-gray-100"
			title={fullscreen ? "Quitter le plein écran" : "Plein écran"}
		>
			{#if fullscreen}
				<CompressOutline class="h-4 w-4" />
			{:else}
				<ExpandOutline class="h-4 w-4" />
			{/if}
		</button>
	</div>

	<!-- Zone scrollable -->
	<div
		bind:this={scrollContainer}
		class="overflow-auto p-4"
		class:flex-1={fullscreen}
	>
		{#if layout.isSE}
			<!-- Single Elimination : une seule section WB -->
			<BracketSection
				columns={layout.columns}
				bracketFilter="W"
				{searchQuery}
				{onMatchClick}
			/>
		{:else}
			<!-- Double Elimination : WB en haut, LB en bas, séparés -->
			<BracketSection
				columns={layout.columns}
				bracketFilter="W"
				{searchQuery}
				{onMatchClick}
			/>

			<!-- Séparateur WB / LB -->
			<div class="relative my-4 border-t border-dashed border-gray-300">
				<span
					class="absolute left-2 -top-2.5 bg-white px-1 text-xs text-gray-400"
					>Loser Bracket</span
				>
			</div>

			<BracketSection
				columns={layout.columns}
				bracketFilter="LB"
				{searchQuery}
				{onMatchClick}
			/>
		{/if}
	</div>
</div>

<style>
.bracket-fullscreen {
	position: fixed;
	inset: 0;
	z-index: 50;
	border-radius: 0;
}
</style>
