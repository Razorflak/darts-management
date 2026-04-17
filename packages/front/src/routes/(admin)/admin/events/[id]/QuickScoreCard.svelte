<script lang="ts">
import { Alert, Button, Card, Input } from "flowbite-svelte"
import { apiRoutes } from "$lib/fetch/api"
import type { MatchDisplay } from "$lib/server/schemas/event-schemas.js"
import ScoreForm from "$lib/tournament/components/ScoreForm.svelte"

type Props = { eventId: string }
let { eventId }: Props = $props()

let eventMatchId = $state("")
let matchInfo = $state<MatchDisplay | null>(null)
let errorMsg = $state("")

function resetTile() {
	eventMatchId = ""
	matchInfo = null
	errorMsg = ""
}

async function lookupMatch() {
	errorMsg = ""
	const res = await fetch(
		`${apiRoutes.MATCH_LOOKUP.path}?event_id=${eventId}&event_match_id=${eventMatchId}`,
	)
	if (res.ok) {
		const data: MatchDisplay = await res.json()
		if (data.status !== "pending") {
			errorMsg = "Ce match a déjà un résultat"
			return
		}
		matchInfo = data
	} else {
		errorMsg = "Match introuvable"
	}
}

async function onIdKeydown(e: KeyboardEvent) {
	if (e.key === "Enter") await lookupMatch()
}
</script>

<Card class="mb-6">
	<h2 class="mb-3 text-base font-semibold text-gray-800">Saisie rapide</h2>

	{#if !matchInfo}
		<div class="flex items-center gap-2">
			<Input
				type="number"
				min="1"
				placeholder="N° de match"
				bind:value={eventMatchId}
				onkeydown={onIdKeydown}
				class="w-36"
			/>
			<Button size="sm" color="primary" onclick={lookupMatch}>Chercher</Button>
		</div>
		{#if errorMsg}
			<Alert color="red" class="mt-3">{errorMsg}</Alert>
		{/if}
	{:else}
		<p class="mb-3 text-sm text-gray-500">
			Match #{matchInfo.event_match_id}
			— Phase {matchInfo.phase_position} — Round {matchInfo.round_number}
		</p>
		<ScoreForm match={matchInfo} {eventId} onclose={resetTile} />
	{/if}
</Card>
