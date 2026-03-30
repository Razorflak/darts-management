<script lang="ts">
import { Button, Modal } from "flowbite-svelte"
import { apiRoutes } from "$lib/fetch/api"
import type { PlayerSearchResult } from "$lib/server/schemas/event-schemas.js"
import MinimumPlayerCreationForm from "$lib/tournament/components/MinimumPlayerCreationForm.svelte"
import PlayerSearch from "$lib/tournament/components/PlayerSearch.svelte"

let {
	eventId,
	date: _date,
	tournaments,
	onClose,
}: {
	eventId: string
	date: string
	tournaments: { id: string; name: string; category: string }[]
	onClose: () => void
} = $props()

// Category splitting
const DOUBLES_PREFIX = "double"
const soloTournaments = $derived(
	tournaments.filter((t) => !t.category.startsWith(DOUBLES_PREFIX)),
)
const doublesTournaments = $derived(
	tournaments.filter((t) => t.category.startsWith(DOUBLES_PREFIX)),
)

// Player 1
let player1 = $state<PlayerSearchResult | null>(null)
let showCreate1 = $state(false)
let new1 = $state({ first_name: "", last_name: "", department: "" })

// Player 2
let player2 = $state<PlayerSearchResult | null>(null)
let showCreate2 = $state(false)
let new2 = $state({ first_name: "", last_name: "", department: "" })
let section2Open = $state(false)

// Tournament selections
let selectedTournaments1 = $state<Set<string>>(new Set())
let selectedTournaments2 = $state<Set<string>>(new Set())
let selectedDoublesTournaments = $state<Set<string>>(new Set())

let submitting = $state(false)
let errorMsg = $state<string | null>(null)

let open = $state(true)

function toggleTournament1(tid: string) {
	const next = new Set(selectedTournaments1)
	if (next.has(tid)) next.delete(tid)
	else next.add(tid)
	selectedTournaments1 = next
}
function toggleTournament2(tid: string) {
	const next = new Set(selectedTournaments2)
	if (next.has(tid)) next.delete(tid)
	else next.add(tid)
	selectedTournaments2 = next
}
function toggleDoubles(tid: string) {
	const next = new Set(selectedDoublesTournaments)
	if (next.has(tid)) next.delete(tid)
	else next.add(tid)
	selectedDoublesTournaments = next
}

function getPlayer1Entry() {
	if (player1) return { id: player1.id }
	return {
		first_name: new1.first_name,
		last_name: new1.last_name,
		department: new1.department,
	}
}
function getPlayer2Entry() {
	if (player2) return { id: player2.id }
	return {
		first_name: new2.first_name,
		last_name: new2.last_name,
		department: new2.department,
	}
}

async function submit() {
	submitting = true
	errorMsg = null
	const registered: { registrationId: string }[] = []

	try {
		// Register player 1 to solo tournaments
		for (const tid of selectedTournaments1) {
			const res = await fetch(apiRoutes.TOURNAMENT_REGISTER.path, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ tournament_id: tid, team: [getPlayer1Entry()] }),
			})
			if (!res.ok) {
				const body = await res.json().catch(() => ({}))
				throw new Error(
					(body as { message?: string }).message ??
						`Inscription échouée pour le joueur 1`,
				)
			}
			const data = await res.json()
			if (data.registration_id)
				registered.push({ registrationId: data.registration_id })
		}

		// Register player 2 to solo tournaments (if section 2 open)
		if (section2Open) {
			for (const tid of selectedTournaments2) {
				const res = await fetch(apiRoutes.TOURNAMENT_REGISTER.path, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						tournament_id: tid,
						team: [getPlayer2Entry()],
					}),
				})
				if (!res.ok) {
					const body = await res.json().catch(() => ({}))
					throw new Error(
						(body as { message?: string }).message ??
							`Inscription échouée pour le joueur 2`,
					)
				}
				const data = await res.json()
				if (data.registration_id)
					registered.push({ registrationId: data.registration_id })
			}
		}

		// Register doubles (both players together, if section 2 open)
		if (section2Open) {
			for (const tid of selectedDoublesTournaments) {
				const res = await fetch(apiRoutes.TOURNAMENT_REGISTER.path, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						tournament_id: tid,
						team: [getPlayer1Entry(), getPlayer2Entry()],
					}),
				})
				if (!res.ok) {
					const body = await res.json().catch(() => ({}))
					throw new Error(
						(body as { message?: string }).message ??
							`Inscription doubles échouée`,
					)
				}
				const data = await res.json()
				if (data.registration_id)
					registered.push({ registrationId: data.registration_id })
			}
		}

		// Immediate check-in for all registrations just created.
		const regIds = registered.map((r) => r.registrationId)
		if (regIds.length > 0) {
			await fetch(`/admin/events/${eventId}/checkin/team-checkin`, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ registration_ids: regIds, checked_in: true }),
			})
			// Check-in failure is non-blocking (players are registered; check-in can be done manually)
		}

		open = false
		onClose()
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

function handleClose() {
	open = false
	onClose()
}
</script>

<Modal bind:open title="Inscription" size="lg" outsideclose onclose={handleClose}>
	<div class="space-y-6">
		<!-- Section 1 — Joueur 1 -->
		<div>
			<h3 class="mb-2 font-semibold text-gray-700">Joueur 1</h3>
			{#if player1}
				<div class="flex items-center gap-2 rounded bg-gray-50 p-2">
					<span class="font-medium">{player1.last_name} {player1.first_name}</span>
					{#if player1.department}
						<span class="text-sm text-gray-500">({player1.department})</span>
					{/if}
					<Button
						size="xs"
						color="light"
						onclick={() => {
							player1 = null
						}}>Changer</Button
					>
				</div>
			{:else if !showCreate1}
				<PlayerSearch
					mode="all"
					onSelect={(p) => {
						player1 = p
						showCreate1 = false
					}}
				/>
			{/if}
			{#if !player1}
				<div class="mt-3">
					<button
						type="button"
						class="text-sm text-blue-600 hover:underline"
						onclick={() => {
							showCreate1 = !showCreate1
							player1 = null
						}}
					>
						{showCreate1 ? "▲ Annuler la création" : "▼ Joueur non trouvé ? Créer un joueur"}
					</button>
					{#if showCreate1}
						<MinimumPlayerCreationForm
							bind:first_name={new1.first_name}
							bind:last_name={new1.last_name}
							bind:department={new1.department}
						/>
					{/if}
				</div>
			{/if}

			<!-- Solo tournaments for player 1 -->
			{#if soloTournaments.length > 0}
				<div class="mt-3 space-y-1">
					{#each soloTournaments as t (t.id)}
						<label class="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
							<input
								type="checkbox"
								class="rounded"
								checked={selectedTournaments1.has(t.id)}
								onchange={() => toggleTournament1(t.id)}
							/>
							{t.name}
						</label>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Toggle section 2 -->
		<div>
			<button
				type="button"
				class="text-sm text-blue-600 hover:underline"
				onclick={() => {
					section2Open = !section2Open
				}}
			>
				{section2Open ? "— Retirer le joueur 2" : "+ Ajouter un joueur"}
			</button>
		</div>

		<!-- Section 2 — Joueur 2 (visible only when section2Open) -->
		{#if section2Open}
			<div>
				<h3 class="mb-2 font-semibold text-gray-700">Joueur 2</h3>
				{#if player2}
					<div class="flex items-center gap-2 rounded bg-gray-50 p-2">
						<span class="font-medium">{player2.last_name} {player2.first_name}</span>
						{#if player2.department}
							<span class="text-sm text-gray-500">({player2.department})</span>
						{/if}
						<Button
							size="xs"
							color="light"
							onclick={() => {
								player2 = null
							}}>Changer</Button
						>
					</div>
				{:else if !showCreate2}
					<PlayerSearch
						mode="all"
						onSelect={(p) => {
							player2 = p
							showCreate2 = false
						}}
					/>
				{/if}
				{#if !player2}
					<div class="mt-3">
						<button
							type="button"
							class="text-sm text-blue-600 hover:underline"
							onclick={() => {
								showCreate2 = !showCreate2
								player2 = null
							}}
						>
							{showCreate2 ? "▲ Annuler la création" : "▼ Joueur non trouvé ? Créer un joueur"}
						</button>
						{#if showCreate2}
							<MinimumPlayerCreationForm
								bind:first_name={new2.first_name}
								bind:last_name={new2.last_name}
								bind:department={new2.department}
							/>
						{/if}
					</div>
				{/if}

				<!-- Solo tournaments for player 2 -->
				{#if soloTournaments.length > 0}
					<div class="mt-3 space-y-1">
						{#each soloTournaments as t (t.id)}
							<label
								class="flex cursor-pointer items-center gap-2 text-sm text-gray-700"
							>
								<input
									type="checkbox"
									class="rounded"
									checked={selectedTournaments2.has(t.id)}
									onchange={() => toggleTournament2(t.id)}
								/>
								{t.name}
							</label>
						{/each}
					</div>
				{/if}
			</div>

			<!-- Doubles tournaments (common, visible only when section 2 open) -->
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
								/>
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
		<Button color="light" onclick={handleClose} disabled={submitting}>Annuler</Button>
	{/snippet}
</Modal>
