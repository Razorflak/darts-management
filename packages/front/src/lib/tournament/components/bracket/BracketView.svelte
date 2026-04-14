<script lang="ts">
import type { MatchDisplay } from "$lib/server/schemas/event-schemas.js"
import BracketSection from "./BracketSection.svelte"
import { buildBracketLayout } from "./bracket-utils.js"

type ScrollTrigger = { matchId: number; nonce: number }

type Props = {
	matches: MatchDisplay[]
	phaseName: string
	eventId: string
	onMatchClick: (match: MatchDisplay) => void
	searchQuery?: string
	scrollTrigger?: ScrollTrigger | null
}

let {
	matches,
	phaseName,
	onMatchClick,
	searchQuery = "",
	scrollTrigger = null,
}: Props = $props()

// ─── Layout ──────────────────────────────────────────────────────────────────

let layout = $derived(buildBracketLayout(matches))

// ─── Scroll vers un match ciblé ──────────────────────────────────────────────

let scrollContainer: HTMLElement | undefined = $state()

$effect(() => {
	if (!scrollTrigger || !scrollContainer) return
	const el = scrollContainer.querySelector<HTMLElement>(
		`[data-match-id="${scrollTrigger.matchId}"]`,
	)
	el?.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" })
})

// ─── Resize ──────────────────────────────────────────────────────────────────

const DEFAULT_HEIGHT = 400
const MIN_HEIGHT = 150

let containerHeight = $state(DEFAULT_HEIGHT)
let isResizing = $state(false)

function startResize(e: MouseEvent | TouchEvent) {
	isResizing = true
	const startY = "touches" in e ? e.touches[0].clientY : e.clientY
	const startHeight = containerHeight

	function onMove(ev: MouseEvent | TouchEvent) {
		const y = "touches" in ev ? ev.touches[0].clientY : ev.clientY
		containerHeight = Math.max(MIN_HEIGHT, startHeight + (y - startY))
	}

	function onUp() {
		isResizing = false
		window.removeEventListener("mousemove", onMove)
		window.removeEventListener("mouseup", onUp)
		window.removeEventListener("touchmove", onMove)
		window.removeEventListener("touchend", onUp)
	}

	window.addEventListener("mousemove", onMove)
	window.addEventListener("mouseup", onUp)
	window.addEventListener("touchmove", onMove)
	window.addEventListener("touchend", onUp)
}
</script>

<!-- Conteneur principal -->
<div
	class="bracket-root flex flex-col rounded-lg border border-gray-200 bg-white"
	class:select-none={isResizing}
>
	<!-- Zone scrollable -->
	<div
		bind:this={scrollContainer}
		class="overflow-auto p-4"
		style="height: {containerHeight}px"
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

	<button
		type="button"
		class="resize-handle group flex cursor-ns-resize items-center justify-center border-t border-gray-200 py-1 hover:bg-gray-50 active:bg-gray-100"
		onmousedown={startResize}
		ontouchstart={startResize}
		aria-label="Redimensionner le bracket"
	>
		<div class="h-1 w-8 rounded-full bg-gray-300 group-hover:bg-gray-400"></div>
	</button>
</div>

<style>
.bracket-fullscreen {
	position: fixed;
	inset: 0;
	z-index: 50;
	border-radius: 0;
}
</style>
