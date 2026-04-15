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

// biome-ignore lint/correctness/noUnusedVariables: used in Svelte template
function matchesForColumn(col: BracketColumn): MatchDisplay[] {
	return bracketFilter === "W" ? col.wbMatches : col.lbMatches
}

const showConnectors = $derived(bracketFilter === "W")
</script>

<div class="flex flex-row items-stretch min-w-max">
	{#each columns as col, colIdx}
		{@const colMatches = matchesForColumn(col)}
		{@const nextCol = colIdx < columns.length - 1 ? columns[colIdx + 1] : null}
		{@const nextColMatches = nextCol ? matchesForColumn(nextCol) : []}

		<!-- Colonne de matchs -->
		<div class="flex flex-col self-stretch w-80 shrink-0">
			<div
				class="mb-2 text-center text-xs font-semibold"
				class:text-green-600={col.allDone}
				class:text-gray-700={!col.allDone}
			>
				{#if colMatches.length > 0}
					{col.label}
				{/if}
			</div>

			<div class="flex grow flex-col justify-around">
				{#each colMatches as m}
					<MatchCard
						match={m}
						highlighted={isMatchHighlighted(m, searchQuery)}
						{onMatchClick}
					/>
				{/each}
			</div>
		</div>

		<!-- Connecteur entre cette colonne et la suivante -->
		{#if showConnectors && nextCol && colMatches.length > 0 && nextColMatches.length > 0}
			<div class="flex flex-col self-stretch w-8 shrink-0">
				<!-- Espace calé sur la hauteur du header de colonne (text-xs = 16px + mb-2 = 8px) -->
				<div class="mb-2" style="height: 16px"></div>

				<!-- Slots de connecteurs : 1 slot par match dans la colonne suivante -->
				<div class="grow flex flex-col">
					{#each nextColMatches as _, j}
						{@const topA = colMatches[j * 2]}
						{@const botA = colMatches[j * 2 + 1]}
						{@const topBye = !topA || topA.status === "bye"}
						{@const botBye = !botA || botA.status === "bye"}
						{@const vTop = topBye ? 50 : 25}
						{@const vBot = botBye ? 50 : 25}
						<div class="relative flex-1">
							{#if !(topBye && botBye)}
								<!-- Horizontale depuis le match du haut -->
								{#if !topBye}
									<div
										class="absolute bg-gray-300"
										style="top: calc(25% - 1px); left: 0; right: 50%; height: 2px"
									></div>
								{/if}

								<!-- Horizontale depuis le match du bas -->
								{#if !botBye}
									<div
										class="absolute bg-gray-300"
										style="top: calc(75% - 1px); left: 0; right: 50%; height: 2px"
									></div>
								{/if}

								<!-- Verticale reliant les deux branches -->
								<div
									class="absolute bg-gray-300"
									style="left: calc(50% - 1px); width: 2px; top: {vTop}%; bottom: {vBot}%"
								></div>

								<!-- Horizontale vers le match de la colonne suivante -->
								<div
									class="absolute bg-gray-300"
									style="top: calc(50% - 1px); left: 50%; right: 0; height: 2px"
								></div>
							{/if}
						</div>
					{/each}
				</div>
			</div>
		{/if}
	{/each}
</div>
