<script lang="ts">
import type { StandingEntry } from "@darts-management/domain"
import {
	Table,
	TableBody,
	TableBodyCell,
	TableBodyRow,
	TableHead,
	TableHeadCell,
} from "flowbite-svelte"
import type { MatchDisplay } from "$lib/server/schemas/event-schemas.js"
import { isMatchHighlighted } from "$lib/tournament/components/bracket/bracket-utils.js"

type Props = {
	matches: MatchDisplay[]
	standings: StandingEntry[] | undefined
	teamNames: Map<string, string>
	searchQuery?: string
	onMatchClick: (match: MatchDisplay) => void
}

let {
	matches,
	standings,
	teamNames,
	searchQuery = "",
	onMatchClick,
}: Props = $props()

function teamName(name: string | null, status: string): string {
	if (name) return name
	if (status === "bye") return "BYE"
	return "À déterminer"
}

function scoreDisplay(match: MatchDisplay): string {
	if (match.status === "walkover") return "W.O."
	if (match.score_a !== null && match.score_b !== null)
		return `${match.score_a} — ${match.score_b}`
	return "— —"
}

function isWinner(match: MatchDisplay, side: "a" | "b"): boolean {
	if (match.score_a === null || match.score_b === null) return false
	return side === "a"
		? match.score_a > match.score_b
		: match.score_b > match.score_a
}

const roundGroups = $derived.by(() => {
	const filtered = matches.filter((m) => m.status !== "bye")
	const map = new Map<number, MatchDisplay[]>()
	for (const m of filtered) {
		if (!map.has(m.round_number)) map.set(m.round_number, [])
		map.get(m.round_number)?.push(m)
	}
	return [...map.entries()]
		.sort(([a], [b]) => a - b)
		.map(([round, ms]) => ({
			round,
			roundMatches: [...ms].sort((a, b) => a.position - b.position),
		}))
})
</script>

<div class="flex flex-col gap-6 md:flex-row">
	<!-- Liste des matchs -->
	<div class="min-w-0 flex-1">
		<h3 class="mb-2 text-sm font-semibold text-gray-700">Matchs</h3>
		{#each roundGroups as { round, roundMatches }, roundIdx}
			<p
				class="mb-1 text-xs font-semibold uppercase text-gray-400"
				class:mt-3={roundIdx > 0}
			>
				Round {round + 1}
			</p>
			{#each roundMatches as match}
				{@const highlighted = isMatchHighlighted(match, searchQuery)}
				<button
					type="button"
					onclick={() => onMatchClick(match)}
					data-match-id={match.event_match_id}
					class="w-full cursor-pointer items-center rounded px-2 py-1 text-sm transition-colors hover:bg-gray-50"
					class:bg-blue-50={highlighted}
					style="display: grid; grid-template-columns: 1fr auto 1fr; gap: 0 0.5rem;"
				>
					<span
						class="truncate text-right"
						class:font-semibold={isWinner(match, "a")}
					>
						{teamName(match.team_a_name, match.status)}
					</span>
					<span class="font-mono font-semibold tabular-nums text-gray-600">
						{scoreDisplay(match)}
					</span>
					<span
						class="truncate text-left"
						class:font-semibold={isWinner(match, "b")}
					>
						{teamName(match.team_b_name, match.status)}
					</span>
				</button>
			{/each}
		{/each}
	</div>

	<!-- Classement -->
	{#if standings && standings.length > 0}
		<div class="w-full md:w-auto md:shrink-0">
			<h3 class="mb-2 text-sm font-semibold text-gray-700">Classement</h3>
			<Table class="text-sm">
				<TableHead>
					<TableHeadCell class="w-8">#</TableHeadCell>
					<TableHeadCell>Équipe</TableHeadCell>
					<TableHeadCell class="text-center">Pts</TableHeadCell>
					<TableHeadCell class="text-center">V</TableHeadCell>
					<TableHeadCell class="text-center">D</TableHeadCell>
					<TableHeadCell class="text-center">Diff</TableHeadCell>
				</TableHead>
				<TableBody>
					{#each standings as entry, i}
						<TableBodyRow>
							<TableBodyCell class="font-medium text-gray-500"
								>{i + 1}</TableBodyCell
							>
							<TableBodyCell
								>{teamNames.get(entry.team_id) ?? entry.team_id}</TableBodyCell
							>
							<TableBodyCell class="text-center font-semibold"
								>{entry.points}</TableBodyCell
							>
							<TableBodyCell class="text-center">{entry.wins}</TableBodyCell>
							<TableBodyCell class="text-center">{entry.losses}</TableBodyCell>
							<TableBodyCell class="text-center">
								{entry.leg_diff > 0 ? `+${entry.leg_diff}` : entry.leg_diff}
							</TableBodyCell>
						</TableBodyRow>
					{/each}
				</TableBody>
			</Table>
		</div>
	{/if}
</div>
