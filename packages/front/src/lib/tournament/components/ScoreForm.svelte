<script lang="ts">
import { Alert, Button, ButtonGroup, Input, Popover } from "flowbite-svelte"
import { fly } from "svelte/transition"
import { invalidateAll } from "$app/navigation"
import { apiRoutes } from "$lib/fetch/api"
import type { MatchDisplay } from "$lib/server/schemas/event-schemas.js"

type Props = {
	match: MatchDisplay | null
	eventId: string
	onclose: () => void
}
let { match, eventId, onclose }: Props = $props()

let submitting = $state(false)
let errorMsg = $state("")

// Legs-only mode (sets_to_win === 1)
let legA = $state("")
let legB = $state("")

// Set-by-set mode: array of { a, b } per set
let sets = $state<{ a: string; b: string }[]>([])

// Refs pour la navigation clavier (wrapper divs autour des ButtonGroups)
let legARef = $state<HTMLDivElement | null>(null)
let legBRef = $state<HTMLDivElement | null>(null)
let setInputRefs = $state<(HTMLDivElement | null)[]>([])

$effect(() => {
	if (match && match.sets_to_win > 1) {
		const maxSets = 2 * match.sets_to_win - 1
		sets = Array.from({ length: maxSets }, () => ({ a: "", b: "" }))
		setInputRefs = Array(maxSets * 2).fill(null)
	}
	legA = ""
	legB = ""
	errorMsg = ""
})

// Focus le premier champ à l'ouverture
$effect(() => {
	if (match && !isMatchOver) {
		const raf = requestAnimationFrame(() => {
			if (match.sets_to_win === 1) {
				legARef?.querySelector("input")?.focus()
			} else {
				setInputRefs[0]?.querySelector("input")?.focus()
			}
		})
		return () => cancelAnimationFrame(raf)
	}
})

const isMatchOver = $derived(match?.status !== "pending")

const teamsAssigned = $derived(
	match !== null && match.team_a_id !== null && match.team_b_id !== null,
)

// Nombre max de manches qu'une équipe peut gagner (pour remporter un set ou le match)
const maxLegs = $derived(Math.ceil((match?.legs_per_set ?? 1) / 2))

const formatLabel = $derived(
	match
		? match.sets_to_win === 1
			? `en ${maxLegs} manches gagnantes`
			: `en ${match.sets_to_win} sets gagnants (${maxLegs} manches/set)`
		: "",
)

function clamp(value: number): number {
	return Math.min(maxLegs, Math.max(0, value))
}

function incLeg(side: "a" | "b") {
	if (side === "a") legA = String(clamp((parseInt(legA, 10) || 0) + 1))
	else legB = String(clamp((parseInt(legB, 10) || 0) + 1))
}

function decLeg(side: "a" | "b") {
	if (side === "a") legA = String(clamp((parseInt(legA, 10) || 0) - 1))
	else legB = String(clamp((parseInt(legB, 10) || 0) - 1))
}

function clampLeg(side: "a" | "b") {
	if (side === "a") legA = String(clamp(parseInt(legA, 10) || 0))
	else legB = String(clamp(parseInt(legB, 10) || 0))
}

function incSet(i: number, side: "a" | "b") {
	sets[i][side] = String(clamp((parseInt(sets[i][side], 10) || 0) + 1))
}

function decSet(i: number, side: "a" | "b") {
	sets[i][side] = String(clamp((parseInt(sets[i][side], 10) || 0) - 1))
}

function clampSet(i: number, side: "a" | "b") {
	sets[i][side] = String(clamp(parseInt(sets[i][side], 10) || 0))
}

function focusRef(ref: HTMLDivElement | null) {
	ref?.querySelector("input")?.focus()
}

function handleLegKeydown(e: KeyboardEvent, side: "a" | "b") {
	if (e.key !== "Enter") return
	e.preventDefault()
	if (side === "a") {
		focusRef(legBRef)
	} else {
		handleValider()
	}
}

function handleSetKeydown(e: KeyboardEvent, i: number, side: "a" | "b") {
	if (e.key !== "Enter") return
	e.preventDefault()
	if (side === "a") {
		focusRef(setInputRefs[i * 2 + 1] ?? null)
	} else {
		const next = setInputRefs[(i + 1) * 2] ?? null
		if (next) {
			focusRef(next)
		} else {
			handleValider()
		}
	}
}

function computeSetScore(): { score_a: number; score_b: number } {
	let setsA = 0
	let setsB = 0
	const requiredLegs = Math.ceil((match?.legs_per_set ?? 1) / 2)
	for (const s of sets) {
		const a = parseInt(s.a, 10) || 0
		const b = parseInt(s.b, 10) || 0
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
		body: JSON.stringify({ match_id: match?.id, ...payload }),
	})
	if (res.ok) {
		onclose()
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
		submit({
			score_a: parseInt(legA, 10) || 0,
			score_b: parseInt(legB, 10) || 0,
		})
	} else {
		const { score_a, score_b } = computeSetScore()
		submit({ score_a, score_b })
	}
}
</script>

{#if match}
	<div class="mb-4 text-center">
		<p class="text-base font-semibold text-gray-800">
			{match.team_a_name ?? "Équipe A"}
			<span class="mx-2 text-gray-400">vs</span>
			{match.team_b_name ?? "Équipe B"}
		</p>
		<p class="mt-1 text-xs text-gray-500">{formatLabel}</p>
		{#if match.referee_name}
			<p class="mt-1 text-sm text-gray-500">Arbitre : {match.referee_name}</p>
		{/if}
		{#if isMatchOver}
			<p class="mt-2 text-sm font-medium text-green-700">
				Résultat : {match.score_a} – {match.score_b}
				{#if match.status === "walkover"}
					(walkover)
				{/if}
			</p>
		{/if}
	</div>

	{#if !teamsAssigned}
		<Alert color="yellow" class="mb-3">
			Ce match n'a pas encore ses deux équipes assignées.
		</Alert>
	{/if}

	{#if !isMatchOver}
		{#if match.sets_to_win === 1}
			<!-- Legs-only mode -->
			<div class="flex items-center justify-center gap-4">
				<div class="text-center">
					<p class="mb-1 text-xs text-gray-500">
						{match.team_a_name ?? "Équipe A"}
					</p>
					<div bind:this={legARef} onkeydown={(e) => handleLegKeydown(e, "a")}>
						<ButtonGroup>
							<Button
								size="sm"
								color="light"
								class="px-3"
								disabled={!teamsAssigned}
								onclick={() => decLeg("a")}
								>−</Button
							>
							<Input
								type="number"
								min="0"
								max={maxLegs}
								bind:value={legA}
								class="w-20 text-center"
								placeholder="0"
								disabled={!teamsAssigned}
								oninput={() => clampLeg("a")}
							/>
							<Button
								size="sm"
								color="light"
								class="px-3"
								disabled={!teamsAssigned}
								onclick={() => incLeg("a")}
								>+</Button
							>
						</ButtonGroup>
					</div>
				</div>
				<span class="text-xl text-gray-400">–</span>
				<div class="text-center">
					<p class="mb-1 text-xs text-gray-500">
						{match.team_b_name ?? "Équipe B"}
					</p>
					<div bind:this={legBRef} onkeydown={(e) => handleLegKeydown(e, "b")}>
						<ButtonGroup>
							<Button
								size="sm"
								color="light"
								class="px-3"
								disabled={!teamsAssigned}
								onclick={() => decLeg("b")}
								>−</Button
							>
							<Input
								type="number"
								min="0"
								max={maxLegs}
								bind:value={legB}
								class="w-20 text-center"
								placeholder="0"
								disabled={!teamsAssigned}
								oninput={() => clampLeg("b")}
							/>
							<Button
								size="sm"
								color="light"
								class="px-3"
								disabled={!teamsAssigned}
								onclick={() => incLeg("b")}
								>+</Button
							>
						</ButtonGroup>
					</div>
				</div>
			</div>
		{:else}
			<!-- Set-by-set mode -->
			<div class="space-y-2">
				<div
					class="grid grid-cols-3 gap-2 text-center text-xs font-medium text-gray-500"
				>
					<span>{match.team_a_name ?? "Éq. A"}</span>
					<span>Set</span>
					<span>{match.team_b_name ?? "Éq. B"}</span>
				</div>
				{#each sets as s, i}
					<div class="grid grid-cols-3 items-center gap-2">
						<div
							bind:this={setInputRefs[i * 2]}
							onkeydown={(e) => handleSetKeydown(e, i, "a")}
						>
							<ButtonGroup>
								<Button
									size="sm"
									color="light"
									class="px-2"
									disabled={!teamsAssigned}
									onclick={() => decSet(i, "a")}
									>−</Button
								>
								<Input
									type="number"
									min="0"
									max={maxLegs}
									bind:value={s.a}
									class="text-center"
									placeholder="0"
									disabled={!teamsAssigned}
									oninput={() => clampSet(i, "a")}
								/>
								<Button
									size="sm"
									color="light"
									class="px-2"
									disabled={!teamsAssigned}
									onclick={() => incSet(i, "a")}
									>+</Button
								>
							</ButtonGroup>
						</div>
						<span class="text-center text-xs text-gray-400">Set {i + 1}</span>
						<div
							bind:this={setInputRefs[i * 2 + 1]}
							onkeydown={(e) => handleSetKeydown(e, i, "b")}
						>
							<ButtonGroup>
								<Button
									size="sm"
									color="light"
									class="px-2"
									disabled={!teamsAssigned}
									onclick={() => decSet(i, "b")}
									>−</Button
								>
								<Input
									type="number"
									min="0"
									max={maxLegs}
									bind:value={s.b}
									class="text-center"
									placeholder="0"
									disabled={!teamsAssigned}
									oninput={() => clampSet(i, "b")}
								/>
								<Button
									size="sm"
									color="light"
									class="px-2"
									disabled={!teamsAssigned}
									onclick={() => incSet(i, "b")}
									>+</Button
								>
							</ButtonGroup>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	{/if}

	{#if errorMsg}
		<Alert color="red" class="mt-3">{errorMsg}</Alert>
	{/if}

	<div class="mt-4 flex flex-wrap justify-between gap-2">
		<div class="flex gap-2">
			{#if !isMatchOver}
				<Button
					id="forfait-btn"
					color="alternative"
					size="sm"
					disabled={submitting || !teamsAssigned}
				>
					Forfait
				</Button>
				<Popover
					triggeredBy="#forfait-btn"
					trigger="click"
					placement="top"
					transition={fly}
					transitionParams={{ y: 8, duration: 350, opacity: 0 }}
					class="text-sm"
				>
					<div class="flex flex-col gap-2 p-1">
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
					</div>
				</Popover>
			{/if}
		</div>
		<div class="flex gap-2">
			<Button color="light" onclick={onclose}>Fermer</Button>
			{#if !isMatchOver}
				<Button
					color="primary"
					disabled={submitting || !teamsAssigned}
					onclick={handleValider}
				>
					{submitting ? "Envoi..." : "Valider"}
				</Button>
			{/if}
		</div>
	</div>
{/if}
