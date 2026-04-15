<script lang="ts">
import type { MatchDisplay } from "$lib/server/schemas/event-schemas.js"
import { CARD_HEIGHT } from "./bracket-utils.js"

type Props = {
	match: MatchDisplay
	highlighted: boolean
	onMatchClick: (m: MatchDisplay) => void
}

let { match: m, highlighted, onMatchClick }: Props = $props()

const isDone = $derived(
	m.status === "done" || m.status === "walkover" || m.status === "bye",
)

const isBye = $derived(m.status === "bye")
</script>

<!-- Carte de match -->
<div class="relative" class:invisible={isBye}>
	<button
		type="button"
		class="match-card w-full cursor-pointer select-none overflow-hidden rounded border text-xs mb-4 mt-4"
		class:border-gray-200={!highlighted && !isDone}
		class:bg-white={!highlighted && !isDone}
		class:border-green-200={isDone && !highlighted}
		class:bg-green-50={isDone && !highlighted}
		class:border-blue-400={highlighted}
		class:ring-2={highlighted}
		class:ring-blue-300={highlighted}
		disabled={isBye}
		style="height: {CARD_HEIGHT}px; text-align: left;"
		data-match-id={m.event_match_id}
		data-highlighted={highlighted ? "" : undefined}
		onclick={isBye ? undefined : () => onMatchClick(m)}
	>
		<div
			class="border-b border-gray-100 bg-gray-50 px-2 py-0.5 font-semibold text-gray-500 "
		>
			Match #{m.event_match_id}
		</div>
		<div class="flex flex-col gap-0.5 px-2 py-1">
			<div class="flex items-center justify-between gap-1">
				<span
					class="min-w-0 flex-1 truncate"
					class:font-semibold={typeof m.score_a === "number" &&
						typeof m.score_b === "number" &&
						m.score_a > m.score_b}
				>
					{m.team_a_name ?? "À déterminer"}
				</span>
				<span class="text-right font-mono font-bold text-gray-700"
					>{m.score_a ?? "–"}</span
				>
			</div>
			<div class="flex items-center justify-between gap-1">
				<span
					class="min-w-0 flex-1 truncate"
					class:font-semibold={typeof m.score_a === "number" &&
						typeof m.score_b === "number" &&
						m.score_b > m.score_a}
				>
					{m.team_b_name ?? "À déterminer"}
				</span>
				<span class="text-right font-mono font-bold text-gray-700"
					>{m.score_b ?? "–"}</span
				>
			</div>
			{#if m.loser_goes_to_event_match_id !== null}
				<div class="mt-0.5 text-[10px] text-gray-400">
					↓ Perdant → #{m.loser_goes_to_event_match_id}
				</div>
			{/if}
		</div>
	</button>
</div>

<style>
.match-card {
	transition: box-shadow 0.1s;
}

.match-card:hover:not(:disabled) {
	box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
}
</style>
