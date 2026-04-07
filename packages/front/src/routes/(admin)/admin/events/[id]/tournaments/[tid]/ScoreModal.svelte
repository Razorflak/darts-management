<script lang="ts">
import { Alert, Button, Input, Modal } from "flowbite-svelte"
import { invalidateAll } from "$app/navigation"
import { apiRoutes } from "$lib/fetch/api"
import type { MatchDisplay } from "$lib/server/schemas/event-schemas.js"

type Props = {
	open: boolean
	match: MatchDisplay | null
	eventId: string
}
let { open = $bindable(), match, eventId }: Props = $props()

let submitting = $state(false)
let errorMsg = $state("")

// Legs-only mode (sets_to_win === 1)
let legA = $state("")
let legB = $state("")

// Set-by-set mode: array of { a, b } per set
let sets = $state<{ a: string; b: string }[]>([])

$effect(() => {
	if (match && match.sets_to_win > 1) {
		const maxSets = 2 * match.sets_to_win - 1
		sets = Array.from({ length: maxSets }, () => ({ a: "", b: "" }))
	}
	legA = ""
	legB = ""
	errorMsg = ""
})

const isReadOnly = $derived(match?.status !== "pending")

function computeSetScore(): { score_a: number; score_b: number } {
	let setsA = 0
	let setsB = 0
	const requiredLegs = Math.ceil((match?.legs_per_set ?? 1) / 2)
	for (const s of sets) {
		const a = parseInt(s.a) || 0
		const b = parseInt(s.b) || 0
		if (a >= requiredLegs) setsA++
		else if (b >= requiredLegs) setsB++
	}
	return { score_a: setsA, score_b: setsB }
}

async function submit(payload: Record<string, unknown>) {
	submitting = true
	errorMsg = ""
	const res = await fetch(apiRoutes.MATCH_RESULT.path, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ match_id: match!.id, ...payload }),
	})
	if (res.ok) {
		open = false
		await invalidateAll()
	} else {
		const data = await res.json()
		errorMsg = data.error ?? "Erreur inconnue"
	}
	submitting = false
}

function handleValider() {
	if (!match) return
	if (match.sets_to_win === 1) {
		submit({ score_a: parseInt(legA) || 0, score_b: parseInt(legB) || 0 })
	} else {
		const { score_a, score_b } = computeSetScore()
		submit({ score_a, score_b })
	}
}
</script>

<Modal title="Match #{match?.event_match_id ?? ''}" bind:open size="md">
	{#if match}
		<div class="mb-4 text-center">
			<p class="text-base font-semibold text-gray-800">
				{match.team_a_name ?? "Équipe A"}
				<span class="mx-2 text-gray-400">vs</span>
				{match.team_b_name ?? "Équipe B"}
			</p>
			{#if match.referee_name}
				<p class="mt-1 text-sm text-gray-500">Arbitre : {match.referee_name}</p>
			{/if}
			{#if isReadOnly}
				<p class="mt-2 text-sm font-medium text-green-700">
					Résultat : {match.score_a} – {match.score_b}
					{#if match.status === "walkover"}(walkover){/if}
				</p>
			{/if}
		</div>

		{#if !isReadOnly}
			{#if match.sets_to_win === 1}
				<!-- Legs-only mode -->
				<div class="flex items-center justify-center gap-4">
					<div class="text-center">
						<p class="mb-1 text-xs text-gray-500">{match.team_a_name ?? "Équipe A"}</p>
						<Input type="number" min="0" bind:value={legA} class="w-20 text-center" placeholder="0" />
					</div>
					<span class="text-xl text-gray-400">–</span>
					<div class="text-center">
						<p class="mb-1 text-xs text-gray-500">{match.team_b_name ?? "Équipe B"}</p>
						<Input type="number" min="0" bind:value={legB} class="w-20 text-center" placeholder="0" />
					</div>
				</div>
			{:else}
				<!-- Set-by-set mode -->
				<div class="space-y-2">
					<div class="grid grid-cols-3 gap-2 text-center text-xs font-medium text-gray-500">
						<span>{match.team_a_name ?? "Éq. A"}</span>
						<span>Set</span>
						<span>{match.team_b_name ?? "Éq. B"}</span>
					</div>
					{#each sets as s, i}
						<div class="grid grid-cols-3 items-center gap-2">
							<Input type="number" min="0" bind:value={s.a} class="text-center" placeholder="0" />
							<span class="text-center text-xs text-gray-400">Set {i + 1}</span>
							<Input type="number" min="0" bind:value={s.b} class="text-center" placeholder="0" />
						</div>
					{/each}
				</div>
			{/if}
		{/if}

		{#if errorMsg}
			<Alert color="red" class="mt-3">{errorMsg}</Alert>
		{/if}
	{/if}

	{#snippet footer()}
		<div class="flex w-full flex-wrap justify-between gap-2">
			<div class="flex gap-2">
				{#if !isReadOnly}
					<Button
						color="alternative"
						size="sm"
						disabled={submitting}
						onclick={() => submit({ walkover: "a" })}
					>
						Forfait {match?.team_a_name ?? "Éq. A"}
					</Button>
					<Button
						color="alternative"
						size="sm"
						disabled={submitting}
						onclick={() => submit({ walkover: "b" })}
					>
						Forfait {match?.team_b_name ?? "Éq. B"}
					</Button>
				{/if}
			</div>
			<div class="flex gap-2">
				<Button color="light" onclick={() => (open = false)}>Fermer</Button>
				{#if !isReadOnly}
					<Button color="primary" disabled={submitting} onclick={handleValider}>
						{submitting ? "Envoi..." : "Valider"}
					</Button>
				{/if}
			</div>
		</div>
	{/snippet}
</Modal>
