<script lang="ts">
import { Alert, Button, Card, Input } from "flowbite-svelte"
import { tick } from "svelte"
import { invalidateAll } from "$app/navigation"
import { apiRoutes } from "$lib/fetch/api"

type Props = { eventId: string }
let { eventId }: Props = $props()

type MatchInfo = {
	id: string
	team_a_name: string | null
	team_b_name: string | null
	referee_name: string | null
	sets_to_win: number
	legs_per_set: number
	status: string
}

let eventMatchId = $state("")
let matchInfo = $state<MatchInfo | null>(null)
let scoreA = $state("")
let scoreB = $state("")
let errorMsg = $state("")
let submitting = $state(false)
let phase = $state<"input-id" | "input-score" | "confirm">("input-id")

let inputIdWrapper = $state<HTMLElement | undefined>(undefined)
let inputScoreAWrapper = $state<HTMLElement | undefined>(undefined)
let inputScoreBWrapper = $state<HTMLElement | undefined>(undefined)
let validerWrapper = $state<HTMLElement | undefined>(undefined)

function resetTile() {
	eventMatchId = ""
	matchInfo = null
	scoreA = ""
	scoreB = ""
	errorMsg = ""
	submitting = false
	phase = "input-id"
}

async function lookupMatch() {
	errorMsg = ""
	const res = await fetch(
		`${apiRoutes.MATCH_LOOKUP.path}?event_id=${eventId}&event_match_id=${eventMatchId}`,
	)
	if (res.ok) {
		matchInfo = await res.json()
		if (matchInfo!.status !== "pending") {
			errorMsg = "Ce match a déjà un résultat"
			return
		}
		phase = "input-score"
		await tick()
		inputScoreAWrapper?.querySelector("input")?.focus()
	} else {
		errorMsg = "Match introuvable"
	}
}

async function submitScore() {
	submitting = true
	const res = await fetch(apiRoutes.MATCH_RESULT.path, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			match_id: matchInfo!.id,
			score_a: Number.parseInt(scoreA),
			score_b: Number.parseInt(scoreB),
		}),
	})
	if (res.ok) {
		resetTile()
		await invalidateAll()
	} else {
		const data = await res.json()
		errorMsg = data.error ?? "Erreur"
	}
	submitting = false
}

async function submitWalkover(side: "a" | "b") {
	submitting = true
	const res = await fetch(apiRoutes.MATCH_RESULT.path, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ match_id: matchInfo!.id, walkover: side }),
	})
	if (res.ok) {
		resetTile()
		await invalidateAll()
	} else {
		const data = await res.json()
		errorMsg = data.error ?? "Erreur"
	}
	submitting = false
}

async function onIdKeydown(e: KeyboardEvent) {
	if (e.key === "Enter") await lookupMatch()
}

async function onScoreAKeydown(e: KeyboardEvent) {
	if (e.key === "Enter") {
		await tick()
		inputScoreBWrapper?.querySelector("input")?.focus()
	}
}

async function onScoreBKeydown(e: KeyboardEvent) {
	if (e.key === "Enter") {
		phase = "confirm"
		await tick()
		validerWrapper?.querySelector("button")?.focus()
	}
}
</script>

<Card class="mb-6">
	<h2 class="mb-3 text-base font-semibold text-gray-800">Saisie rapide</h2>

	{#if phase === "input-id"}
		<div class="flex items-center gap-2">
			<div bind:this={inputIdWrapper}>
				<Input
					type="number"
					min="1"
					placeholder="N° de match"
					bind:value={eventMatchId}
					onkeydown={onIdKeydown}
					class="w-36"
				/>
			</div>
			<Button size="sm" color="primary" onclick={lookupMatch}>Chercher</Button>
		</div>
	{/if}

	{#if matchInfo && phase !== "input-id"}
		<div class="mb-3">
			<p class="text-sm font-medium text-gray-800">
				Match #{eventMatchId} — {matchInfo.team_a_name ?? "Éq. A"} vs {matchInfo.team_b_name ?? "Éq. B"}
			</p>
			{#if matchInfo.referee_name}
				<p class="text-xs text-gray-500">Arbitre : {matchInfo.referee_name}</p>
			{/if}
			<p class="text-xs text-gray-500">
				Format : {matchInfo.sets_to_win} set(s) / {matchInfo.legs_per_set} leg(s)
			</p>
		</div>

		<div class="mb-3 flex items-center gap-3">
			<div bind:this={inputScoreAWrapper}>
				<Input
					type="number"
					min="0"
					placeholder={matchInfo.team_a_name ?? "Éq. A"}
					bind:value={scoreA}
					onkeydown={onScoreAKeydown}
					class="w-24"
				/>
			</div>
			<span class="text-gray-400">–</span>
			<div bind:this={inputScoreBWrapper}>
				<Input
					type="number"
					min="0"
					placeholder={matchInfo.team_b_name ?? "Éq. B"}
					bind:value={scoreB}
					onkeydown={onScoreBKeydown}
					class="w-24"
				/>
			</div>
		</div>

		<div class="flex flex-wrap gap-2">
			<div bind:this={validerWrapper}>
				<Button color="primary" size="sm" disabled={submitting} onclick={submitScore}>
					Valider
				</Button>
			</div>
			<Button
				color="alternative"
				size="sm"
				disabled={submitting}
				onclick={() => submitWalkover("a")}
			>
				Forfait {matchInfo.team_a_name ?? "Éq. A"}
			</Button>
			<Button
				color="alternative"
				size="sm"
				disabled={submitting}
				onclick={() => submitWalkover("b")}
			>
				Forfait {matchInfo.team_b_name ?? "Éq. B"}
			</Button>
			<Button color="light" size="sm" onclick={resetTile}>Annuler</Button>
		</div>
	{/if}

	{#if errorMsg}
		<Alert color="red" class="mt-3">{errorMsg}</Alert>
	{/if}
</Card>
