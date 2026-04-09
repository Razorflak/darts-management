<script lang="ts">
import type { MatchDisplay } from "$lib/server/schemas/event-schemas.js"
import type { BracketColumn } from "./bracket-utils.js"
import { isMatchHighlighted } from "./bracket-utils.js"
import MatchCard from "./MatchCard.svelte"

type Props = {
	columns: BracketColumn[]
	bracketFilter: "W" | "LB"
	searchQuery: string
	onMatchClick: (m: MatchDisplay) => void
}

let { columns, bracketFilter, searchQuery, onMatchClick }: Props = $props()

function matchesForColumn(col: BracketColumn): MatchDisplay[] {
	return bracketFilter === "W" ? col.wbMatches : col.lbMatches
}

const showConnectors = $derived(bracketFilter === "W")
</script>

<div class="flex flex-row items-stretch min-w-max">
	{#each columns as col, colIdx}
		{@const colMatches = matchesForColumn(col)}
		{@const isLastColWithMatch = [...columns]
            .reverse()
            .find((c) => matchesForColumn(c).length > 0) === col}
        {@const isFirstColWithMatch = [...columns].find((c) => matchesForColumn(c).length > 0) === col}

		<!-- Colonne de matchs -->
		<div
			class="flex flex-col self-stretch w-80 shrink-0"
		>
			<!-- Header de colonne -->
			<div
				class="mb-2 text-center text-xs font-semibold"
				class:text-green-600={col.allDone}
				class:text-gray-700={!col.allDone}
			>
				{#if colMatches.length > 0}
					{col.label}
				{/if}
			</div>

			<!-- Cartes de match (ou vide si aucun match pour ce bracket dans cette colonne) -->
            <div class="flex grow flex-col justify-around" id="toto">
			{#each colMatches as m}
				<MatchCard
					match={m}
					highlighted={isMatchHighlighted(m, searchQuery)}
					{isLastColWithMatch}
                    {isFirstColWithMatch}
					{onMatchClick}
				/>
			{/each}
            </div>
		</div>

		<!-- Connecteur vertical entre deux colonnes (seulement pour WB) -->
		<!-- {#if showConnectors && colIdx < columns.length - 1}
			{@const nextColMatches = matchesForColumn(columns[colIdx + 1])}
			{#if colMatches.length > 0 && nextColMatches.length > 0}
				<div
					class="connector-between flex flex-shrink-0 flex-col"
					style="width: 0; gap: {gap}px"
				>
					{#each { length: Math.ceil(colMatches.length / 2) } as _, pairIdx}
						{@const botIdx = pairIdx * 2 + 1}
						{@const hasBot = botIdx < colMatches.length}
						<div
							class="relative"
							style="height: {CARD_HEIGHT +
								(hasBot ? CARD_HEIGHT + gap : 0)}px"
						>
							<div
								style="position:absolute; right:0; top:{CARD_HEIGHT /
									2}px; width:16px; height:2px; background:#d1d5db;"
							></div>
							{#if hasBot}
								<div
									style="position:absolute; right:0; bottom:{CARD_HEIGHT /
										2}px; width:16px; height:2px; background:#d1d5db;"
								></div>
								<div
									style="position:absolute; right:0; top:{CARD_HEIGHT /
										2}px; width:2px; height:calc(100% - {CARD_HEIGHT}px); background:#d1d5db;"
								></div>
							{/if}
						</div>
					{/each}
				</div>
			{:else}
				<div style="width: 0;"></div>
			{/if}
		{/if} -->
	{/each}
</div>
