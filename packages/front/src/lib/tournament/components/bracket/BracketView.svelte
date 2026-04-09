<script lang="ts">
import { CompressOutline, ExpandOutline } from "flowbite-svelte-icons"
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

// ─── Recherche ───────────────────────────────────────────────────────────────

let searchQuery = $state("")
let searchIndex = $state(0)
let scrollContainer: HTMLElement | undefined = $state()

$effect(() => {
	// reset l'index quand la query change
	searchQuery
	searchIndex = -1
})

function getResults(): HTMLElement[] {
	if (!scrollContainer) return []
	return Array.from(
		scrollContainer.querySelectorAll<HTMLElement>("[data-highlighted]"),
	)
}

function scrollToIndex(idx: number) {
	const results = getResults()
	if (!results.length) return
	const clamped = ((idx % results.length) + results.length) % results.length
	searchIndex = clamped
	results[clamped]?.scrollIntoView({
		behavior: "smooth",
		block: "center",
		inline: "center",
	})
}

function handleSearch(e: Event) {
	e.preventDefault()
	scrollToIndex(searchIndex + 1)
}

function handleSearchNext() {
	scrollToIndex(searchIndex + 1)
}

function handleSearchPrev() {
	scrollToIndex(searchIndex - 1)
}

let searchResultCount = $state(0)

$effect(() => {
	// dépendance réactive sur searchQuery — s'exécute après le rendu
	searchQuery
	searchResultCount =
		scrollContainer?.querySelectorAll("[data-highlighted]").length ?? 0
})

// ─── Layout ──────────────────────────────────────────────────────────────────

let layout = $derived(buildBracketLayout(matches))

// ─── Resize ──────────────────────────────────────────────────────────────────

const DEFAULT_HEIGHT = 400
const MIN_HEIGHT = 150

let containerHeight = $state(DEFAULT_HEIGHT)
let isResizing = $state(false)
</script>

<!-- Conteneur principal -->
<div
	class="bracket-root flex flex-col rounded-lg border border-gray-200 bg-white"
	class:select-none={isResizing}
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
				>{layout.finishedMatches}/{layout.totalMatches}
				matchs terminés</span
			>
		</div>

		<!-- Recherche -->
		<form onsubmit={handleSearch} class="flex items-center gap-1">
			<input
				type="search"
				placeholder="Rechercher une équipe…"
				bind:value={searchQuery}
				class="w-44 rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
			>
			{#if searchQuery.trim() && searchResultCount > 0}
				{#if searchIndex >= 0}
					<span class="text-xs text-gray-500 tabular-nums">
						{searchIndex + 1}/{searchResultCount}
					</span>
				{/if}
				<button
					type="button"
					onclick={handleSearchPrev}
					class="rounded px-1 py-0.5 text-gray-500 hover:bg-gray-100"
					title="Résultat précédent"
				>
					‹
				</button>
				<button
					type="submit"
					class="rounded px-1 py-0.5 text-gray-500 hover:bg-gray-100"
					title="Résultat suivant"
				>
					›
				</button>
			{/if}
		</form>
	</div>

	<!-- Zone scrollable -->
	<div
		bind:this={scrollContainer}
		class="overflow-auto p-4"
		style={`height: ${containerHeight}px`}
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
