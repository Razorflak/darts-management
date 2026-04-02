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
import { PHASE_TYPE_LABELS } from "$lib/tournament/labels"

type Props = {
	matches: MatchDisplay[]
}
let { matches }: Props = $props()

type PhaseGroup = {
	phase_position: number
	phase_type: string
	phase_id: string
	matchesByGroup: Map<number | null, MatchDisplay[]>
}

// Group matches by phase, then by group_number
const phases = $derived.by(() => {
	const phaseMap = new Map<string, PhaseGroup>()
	for (const m of matches) {
		if (!phaseMap.has(m.phase_id)) {
			phaseMap.set(m.phase_id, {
				phase_position: m.phase_position,
				phase_type: m.phase_type,
				phase_id: m.phase_id,
				matchesByGroup: new Map(),
			})
		}
		const phase = phaseMap.get(m.phase_id)
		if (!phase) continue
		const groupKey = m.group_number
		if (!phase.matchesByGroup.has(groupKey)) {
			phase.matchesByGroup.set(groupKey, [])
		}
		const groupMatches = phase.matchesByGroup.get(groupKey)
		if (groupMatches) groupMatches.push(m)
	}
	return [...phaseMap.values()].sort(
		(a, b) => a.phase_position - b.phase_position,
	)
})

function isGroupPhase(type: string): boolean {
	return type === "round_robin" || type === "double_loss_groups"
}

// Convert group_number (0-based) to letter (A, B, C...)
function groupLetter(n: number): string {
	return String.fromCharCode(65 + n)
}

// Get round label for KO phases
function roundLabel(roundNumber: number, totalRounds: number): string {
	const distanceFromFinal = totalRounds - 1 - roundNumber
	if (distanceFromFinal === 0) return "Finale"
	if (distanceFromFinal === 1) return "Demi-finales"
	if (distanceFromFinal === 2) return "Quarts de finale"
	return `Tour ${roundNumber + 1}`
}

function phaseLabel(type: string, position: number): string {
	const label =
		PHASE_TYPE_LABELS[type as keyof typeof PHASE_TYPE_LABELS] ?? type
	return `Phase ${position + 1} — ${label}`
}

function teamName(name: string | null, status: string): string {
	if (name) return name
	if (status === "bye") return "BYE"
	return "À déterminer"
}
</script>

{#each phases as phase}
	<div class="mb-6">
		<h3 class="mb-3 text-base font-semibold text-gray-800">
			{phaseLabel(phase.phase_type, phase.phase_position)}
		</h3>

		{#if isGroupPhase(phase.phase_type)}
			<!-- Group phase: one table per group -->
			{#each [...phase.matchesByGroup.entries()].sort( (a, b) => (a[0] ?? 0) - (b[0] ?? 0), ) as [groupNum, groupMatches]}
				<div class="mb-4">
					{#if groupNum !== null}
						<h4 class="mb-2 text-sm font-semibold text-gray-700">
							Poule {groupLetter(groupNum)}
						</h4>
					{/if}
					<Table>
						<TableHead>
							<TableHeadCell>#</TableHeadCell>
							<TableHeadCell>Équipe A</TableHeadCell>
							<TableHeadCell>vs</TableHeadCell>
							<TableHeadCell>Équipe B</TableHeadCell>
							<TableHeadCell>Arbitre</TableHeadCell>
						</TableHead>
						<TableBody>
							{#each groupMatches.sort((a, b) => a.position - b.position) as match}
								<TableBodyRow>
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
				</div>
			{/each}
		{:else}
			<!-- KO phase: one table with round headings -->
			{@const allMatchesSorted = [...phase.matchesByGroup.values()]
				.flat()
				.sort((a, b) => a.round_number - b.round_number)}
			{@const totalRounds = Math.max(...allMatchesSorted.map((m) => m.round_number)) + 1}
			{@const roundGroups = allMatchesSorted.reduce(
				(acc, m) => {
					if (!acc.has(m.round_number)) acc.set(m.round_number, [])
					acc.get(m.round_number)!.push(m)
					return acc
				},
				new Map<number, MatchDisplay[]>(),
			)}
			{#each [...roundGroups.entries()].sort((a, b) => a[0] - b[0]) as [round, roundMatches]}
				<div class="mb-4">
					<h4 class="mb-2 text-sm font-semibold text-gray-700">
						{roundLabel(round, totalRounds)}
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
								<TableBodyRow>
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
				</div>
			{/each}
		{/if}
	</div>
{/each}
