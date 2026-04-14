<script lang="ts">
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
	searchQuery?: string
}
let { matches, searchQuery = "" }: Props = $props()

const phaseType = $derived(matches[0]?.phase_type ?? "round_robin")

function isGroupPhase(type: string): boolean {
	return type === "round_robin" || type === "double_loss_groups"
}

// Convert round_number to label for KO phases
function roundLabel(roundNumber: number, totalRounds: number): string {
	const distanceFromFinal = totalRounds - 1 - roundNumber
	if (distanceFromFinal === 0) return "Finale"
	if (distanceFromFinal === 1) return "Demi-finales"
	if (distanceFromFinal === 2) return "Quarts de finale"
	return `Tour ${roundNumber + 1}`
}

// For KO phases: group by round_number
const roundGroups = $derived.by(() => {
	if (isGroupPhase(phaseType)) return null
	const allSorted = [...matches].sort((a, b) => a.round_number - b.round_number)
	const totalRounds = Math.max(...allSorted.map((m) => m.round_number)) + 1
	const map = new Map<number, MatchDisplay[]>()
	for (const m of allSorted) {
		if (!map.has(m.round_number)) map.set(m.round_number, [])
		map.get(m.round_number)?.push(m)
	}
	return { rounds: [...map.entries()].sort((a, b) => a[0] - b[0]), totalRounds }
})

const sortedMatches = $derived(
	[...matches].sort((a, b) => a.position - b.position),
)

function teamName(name: string | null, status: string): string {
	if (name) return name
	if (status === "bye") return "BYE"
	return "À déterminer"
}
</script>

{#if isGroupPhase(phaseType)}
	<!-- Phase de poules : tableau plat -->
	<Table>
		<TableHead>
			<TableHeadCell>#</TableHeadCell>
			<TableHeadCell>Équipe A</TableHeadCell>
			<TableHeadCell>vs</TableHeadCell>
			<TableHeadCell>Équipe B</TableHeadCell>
			<TableHeadCell>Arbitre</TableHeadCell>
		</TableHead>
		<TableBody>
			{#each sortedMatches as match}
				{@const highlighted = isMatchHighlighted(match, searchQuery)}
				<TableBodyRow
					data-match-id={match.event_match_id}
					data-highlighted={highlighted ? "" : undefined}
					class={highlighted ? "bg-blue-50" : ""}
				>
					<TableBodyCell class="font-mono text-sm"
						>{match.event_match_id}</TableBodyCell
					>
					<TableBodyCell
						>{teamName(match.team_a_name, match.status)}</TableBodyCell
					>
					<TableBodyCell class="text-center text-gray-400">vs</TableBodyCell>
					<TableBodyCell
						>{teamName(match.team_b_name, match.status)}</TableBodyCell
					>
					<TableBodyCell>{match.referee_name ?? "—"}</TableBodyCell>
				</TableBodyRow>
			{/each}
		</TableBody>
	</Table>
{:else if roundGroups}
	<!-- Phase KO : regroupé par tour -->
	{#each roundGroups.rounds as [ round, roundMatches ]}
		<div class="mb-4">
			<h4 class="mb-2 text-sm font-semibold text-gray-700">
				{roundLabel(round, roundGroups.totalRounds)}
			</h4>
			<Table>
				<TableHead>
					<TableHeadCell>#</TableHeadCell>
					<TableHeadCell>Équipe A</TableHeadCell>
					<TableHeadCell>vs</TableHeadCell>
					<TableHeadCell>Équipe B</TableHeadCell>
					<TableHeadCell>Arbitre</TableHeadCell>
				</TableHead>
				<TableBody>
					{#each roundMatches.sort((a, b) => a.position - b.position) as match}
						{@const highlighted = isMatchHighlighted(match, searchQuery)}
						<TableBodyRow
							data-match-id={match.event_match_id}
							data-highlighted={highlighted ? "" : undefined}
							class={highlighted ? "bg-blue-50" : ""}
						>
							<TableBodyCell class="font-mono text-sm"
								>{match.event_match_id}</TableBodyCell
							>
							<TableBodyCell
								>{teamName(match.team_a_name, match.status)}</TableBodyCell
							>
							<TableBodyCell class="text-center text-gray-400"
								>vs</TableBodyCell
							>
							<TableBodyCell
								>{teamName(match.team_b_name, match.status)}</TableBodyCell
							>
							<TableBodyCell>{match.referee_name ?? "—"}</TableBodyCell>
						</TableBodyRow>
					{/each}
				</TableBody>
			</Table>
		</div>
	{/each}
{/if}
