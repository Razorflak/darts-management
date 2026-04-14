<script lang="ts">
import { Button, Modal } from "flowbite-svelte"
import { invalidateAll } from "$app/navigation"
import { apiRoutes } from "$lib/fetch/api"
import type { PlayerSearchResult } from "$lib/server/schemas/event-schemas.js"
import PlayerSelector from "./PlayerSelector.svelte"

let {
	open = $bindable(true),
	eventTournaments,
	immediateCheckin = false,
}: {
	open: boolean
	eventTournaments: { id: string; name: string; category: string }[]
	immediateCheckin?: boolean
} = $props()

// Category splitting
const DOUBLES_PREFIX = "double"
const soloTournaments = $derived(
	eventTournaments.filter((t) => !t.category.startsWith(DOUBLES_PREFIX)),
)
const doublesTournaments = $derived(
	eventTournaments.filter((t) => t.category.startsWith(DOUBLES_PREFIX)),
)

// Player 1
let player1 = $state<PlayerSearchResult | null>(null)
let new1 = $state({ first_name: "", last_name: "", department: "" })
let selectedTournaments1 = $state(new Set<string>())

// Player 2
let player2 = $state<PlayerSearchResult | null>(null)
let new2 = $state({ first_name: "", last_name: "", department: "" })
let selectedTournaments2 = $state(new Set<string>())
let section2Open = $state(false)

// Doubles
let selectedDoublesTournaments = $state(new Set<string>())

let submitting = $state(false)
let errorMsg = $state<string | null>(null)

function getPlayerEntry(
	player: PlayerSearchResult | null,
	newPlayer: { first_name: string; last_name: string; department: string },
) {
	if (player) return { id: player.id }
	return {
		first_name: newPlayer.first_name,
		last_name: newPlayer.last_name,
		department: newPlayer.department,
	}
}

function toggleDoubles(tid: string) {
	const next = new Set(selectedDoublesTournaments)
	if (next.has(tid)) next.delete(tid)
	else next.add(tid)
	selectedDoublesTournaments = next
}

async function submit() {
	submitting = true
	errorMsg = null
	const registered: { registrationId: string }[] = []

	try {
		// Register player 1 to solo tournaments
		// Fonction helper pour enregistrer un tournoi
		const registerToTournament = async (
			tournamentId: string,
			team: ReturnType<typeof getPlayerEntry>[],
		) => {
			const res = await fetch(apiRoutes.TOURNAMENT_REGISTER.path, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					tournament_id: tournamentId,
					team,
				}),
			})

			if (!res.ok) {
				const body = await res.json().catch(() => ({}))
				throw new Error(
					(body as { message?: string }).message ??
						`Inscription échouée pour le tournoi ${tournamentId}`,
				)
			}

			const data = await res.json()
			return data.registration_id
				? { registrationId: data.registration_id }
				: null
		}

		// Créer toutes les promesses
		const promises: Promise<{ registrationId: string } | null>[] = []

		// Player 1 solo tournaments
		for (const tid of selectedTournaments1) {
			promises.push(registerToTournament(tid, [getPlayerEntry(player1, new1)]))
		}

		// Player 2 solo tournaments (if section 2 open)
		if (section2Open) {
			for (const tid of selectedTournaments2) {
				promises.push(
					registerToTournament(tid, [getPlayerEntry(player2, new2)]),
				)
			}

			// Doubles tournaments
			for (const tid of selectedDoublesTournaments) {
				promises.push(
					registerToTournament(tid, [
						getPlayerEntry(player1, new1),
						getPlayerEntry(player2, new2),
					]),
				)
			}
		}

		// Exécuter toutes les promesses en parallèle
		const results = await Promise.all(promises)

		// Filtrer les résultats valides
		registered.push(
			...results.filter((r): r is { registrationId: string } => r !== null),
		)

		// Immediate check-in for all registrations just created (checkin screen only).
		if (immediateCheckin) {
			const regIds = registered.map((r) => r.registrationId)
			if (regIds.length > 0) {
				await fetch(apiRoutes.TOURNAMENT_CHECKIN.path, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ registration_ids: regIds, checked_in: true }),
				})
				// Check-in failure is non-blocking (players are registered; check-in can be done manually)
			}
		}

		await invalidateAll()
		open = false
	} catch (err) {
		// Rollback: unregister all registered in this session
		for (const r of registered) {
			try {
				await fetch(apiRoutes.TOURNAMENT_UNEREGISER.path, {
					method: "DELETE",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ registration_id: r.registrationId }),
				})
			} catch {
				// silent — rollback best-effort
			}
		}
		errorMsg = err instanceof Error ? err.message : "Erreur inconnue"
	} finally {
		submitting = false
	}
}

function handleCancel() {
	open = false
}
</script>

<Modal bind:open title="Inscription" size="lg" outsideclose>
	<div class="space-y-6">
		<PlayerSelector
			label="Joueur 1"
			bind:player={player1}
			bind:newPlayer={new1}
			tournaments={soloTournaments}
			bind:selectedTournamentIds={selectedTournaments1}
		/>

		<div>
			<button
				type="button"
				class="text-sm text-blue-600 hover:underline"
				onclick={() => { section2Open = !section2Open }}
			>
				{section2Open ? "— Retirer le joueur 2" : "+ Ajouter un joueur"}
			</button>
		</div>

		{#if section2Open}
			<PlayerSelector
				label="Joueur 2"
				bind:player={player2}
				bind:newPlayer={new2}
				tournaments={soloTournaments}
				bind:selectedTournamentIds={selectedTournaments2}
			/>

			{#if doublesTournaments.length > 0}
				<div class="border-t border-gray-200 pt-4">
					<h3 class="mb-2 font-semibold text-gray-700">Doubles</h3>
					<div class="space-y-1">
						{#each doublesTournaments as t (t.id)}
							<label
								class="flex cursor-pointer items-center gap-2 text-sm text-gray-700"
							>
								<input
									type="checkbox"
									class="rounded"
									checked={selectedDoublesTournaments.has(t.id)}
									onchange={() => toggleDoubles(t.id)}
								>
								{t.name}
							</label>
						{/each}
					</div>
				</div>
			{/if}
		{/if}
	</div>

	{#if errorMsg}
		<p class="mt-3 text-sm text-red-600">{errorMsg}</p>
	{/if}

	{#snippet footer()}
		<Button color="primary" onclick={submit} disabled={submitting}>
			{submitting ? "Inscription en cours…" : "Valider"}
		</Button>
		<Button color="light" onclick={handleCancel} disabled={submitting}
			>Annuler</Button
		>
	{/snippet}
</Modal>
