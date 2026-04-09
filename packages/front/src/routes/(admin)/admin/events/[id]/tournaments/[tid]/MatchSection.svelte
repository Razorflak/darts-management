<script lang="ts">
import type { StandingEntry } from "@darts-management/domain"
import { Alert } from "flowbite-svelte"
import type { MatchDisplay } from "$lib/server/schemas/event-schemas.js"
import { BracketView } from "$lib/tournament/components/bracket/index.js"
import PhaseMatchTable from "./PhaseMatchTable.svelte"
import ScoreModal from "./ScoreModal.svelte"
import StandingsTable from "./StandingsTable.svelte"

let {
	matches,
	standingsByPhase,
	teamNames,
	eventId,
}: {
	matches: MatchDisplay[]
	standingsByPhase: Record<string, StandingEntry[]> | null
	teamNames: Record<string, string>
	eventId: string
} = $props()

let scoreModalOpen = $state(false)
let selectedMatch = $state<MatchDisplay | null>(null)

const BRACKET_TYPES = new Set([
	"single_elimination",
	"double_elimination",
	"double_loss_groups",
])

function groupLabel(n: number): string {
	return String.fromCharCode(65 + n)
}

// Grouper les matchs par phase, puis par group_number
const phaseGroups = $derived.by(() => {
	const phaseMap = new Map<
		string,
		{
			phaseType: string
			phasePosition: number
			groups: Map<number | null, MatchDisplay[]>
		}
	>()
	for (const m of matches) {
		if (!phaseMap.has(m.phase_id)) {
			phaseMap.set(m.phase_id, {
				phaseType: m.phase_type,
				phasePosition: m.phase_position,
				groups: new Map(),
			})
		}
		const phase = phaseMap.get(m.phase_id)!
		if (!phase.groups.has(m.group_number)) phase.groups.set(m.group_number, [])
		phase.groups.get(m.group_number)!.push(m)
	}
	return [...phaseMap.entries()]
		.sort(([, a], [, b]) => a.phasePosition - b.phasePosition)
		.map(([phaseId, { phaseType, phasePosition, groups }]) => ({
			phaseId,
			phaseType,
			phasePosition,
			groups: [...groups.entries()].sort(([a], [b]) => (a ?? -1) - (b ?? -1)),
		}))
})

function openScoreModal(m: MatchDisplay) {
	selectedMatch = m
	scoreModalOpen = true
}

function handleMatchAreaClick(e: MouseEvent) {
	const row = (e.target as HTMLElement).closest("tr")
	if (!row) return
	const firstCell = row.querySelector("td")
	if (!firstCell) return
	const eventMatchId = Number.parseInt(firstCell.textContent?.trim() ?? "", 10)
	if (Number.isNaN(eventMatchId)) return
	const m = matches.find((match) => match.event_match_id === eventMatchId)
	if (m) openScoreModal(m)
}
</script>

{#if matches.length === 0}
	<p class="mb-6 text-sm text-gray-500">
		Les matchs seront affichés après le lancement du tournoi.
	</p>
	<Alert color="yellow" class="mt-4">
		Aucun match généré. Le lancement semble avoir échoué. Essayez d'annuler et relancer.
	</Alert>
{:else}
	<section class="mb-6">
		<h2 class="mb-4 text-base font-semibold text-gray-800">Matchs générés</h2>

		{#each phaseGroups as { phaseId, phaseType, phasePosition, groups }}
			{@const baseLabel = `Phase ${phasePosition + 1}`}
			{@const multipleGroups = groups.length > 1}

			{#each groups as [groupNumber, groupMatches]}
				{@const phaseName = groupNumber !== null && multipleGroups
					? `${baseLabel} — Groupe ${groupLabel(groupNumber)}`
					: baseLabel}

				{#if BRACKET_TYPES.has(phaseType)}
					<div class="mb-6">
						<BracketView
							matches={groupMatches}
							{phaseName}
							{eventId}
							onMatchClick={openScoreModal}
						/>
					</div>
				{:else}
					<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
					<div onclick={handleMatchAreaClick} class="cursor-pointer">
						<PhaseMatchTable matches={groupMatches} />
					</div>
					{#if standingsByPhase && groupNumber !== null}
						{@const standingKey = `${phaseId}-${groupNumber}`}
						{@const standings = standingsByPhase[standingKey]}
						{#if standings}
							<div class="mt-4">
								<h3 class="mb-2 text-sm font-semibold text-gray-700">
									Classement — Groupe {groupLabel(groupNumber)}
								</h3>
								<StandingsTable {standings} teamNames={new Map(Object.entries(teamNames))} />
							</div>
						{/if}
					{/if}
				{/if}
			{/each}
		{/each}
	</section>
{/if}

<ScoreModal bind:open={scoreModalOpen} match={selectedMatch} {eventId} />
