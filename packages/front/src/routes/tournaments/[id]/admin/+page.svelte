<script lang="ts">
	import {
		Table,
		TableBody,
		TableBodyCell,
		TableBodyRow,
		TableHead,
		TableHeadCell,
		Button,
		Badge,
		Input,
		Card
	} from "flowbite-svelte"
	import PlayerSearch from "$lib/tournament/components/PlayerSearch.svelte"
	import type { PageData } from "./$types"
	import type { PlayerSearchResult, RosterEntry } from "$lib/server/schemas/event-schemas.js"

	let { data }: { data: PageData } = $props()

	let roster = $state<RosterEntry[]>(data.roster)

	// Add player state
	let selectedPlayer = $state<PlayerSearchResult | null>(null)
	let showNewPlayerForm = $state(false)
	let newFirst = $state("")
	let newLast = $state("")
	let newBirth = $state("")
	let newLicence = $state("")

	async function checkIn(registrationId: string, value: boolean) {
		await fetch(`/tournaments/${data.tournament.id}/admin/checkin`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ registration_id: registrationId, checked_in: value })
		})
		const entry = roster.find((e) => e.registration_id === registrationId)
		if (entry) entry.checked_in = value
	}

	async function unregister(playerId: string) {
		await fetch(`/tournaments/${data.tournament.id}/admin/unregister`, {
			method: "DELETE",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ player_id: playerId })
		})
		roster = roster.filter((e) => e.player_id !== playerId)
	}

	async function checkInAll() {
		await fetch(`/tournaments/${data.tournament.id}/admin/checkin-all`, { method: "POST" })
		roster = roster.map((e) => ({ ...e, checked_in: true }))
	}

	async function registerExisting() {
		if (!selectedPlayer) return
		const res = await fetch(`/tournaments/${data.tournament.id}/admin/register`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ mode: "existing", player_id: selectedPlayer.id })
		})
		if (res.ok) {
			// Reload the page to refresh roster
			window.location.reload()
		} else {
			const err = await res.json().catch(() => ({}))
			alert(err.message ?? "Erreur lors de l'inscription")
		}
	}

	async function registerNew() {
		const res = await fetch(`/tournaments/${data.tournament.id}/admin/register`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				mode: "new",
				first_name: newFirst,
				last_name: newLast,
				birth_date: newBirth,
				licence_no: newLicence || undefined
			})
		})
		if (res.ok) {
			window.location.reload()
		} else {
			const err = await res.json().catch(() => ({}))
			alert(err.message ?? "Erreur lors de la création du joueur")
		}
	}

	function handlePlayerSelected(player: PlayerSearchResult) {
		selectedPlayer = player
	}
</script>

<div class="p-4">
	<div class="mb-4">
		<h1 class="text-2xl font-bold">{data.tournament.name}</h1>
		<p class="text-gray-500">{data.tournament.event_name}</p>
		<p class="mt-1 text-sm text-gray-600">{roster.length} joueur(s) inscrit(s)</p>
	</div>

	{#if data.tournament.check_in_required}
		<div class="mb-4">
			<Button color="blue" onclick={checkInAll}>Tout checker</Button>
		</div>
	{/if}

	<Table>
		<TableHead>
			<TableHeadCell>Nom</TableHeadCell>
			<TableHeadCell>Licence</TableHeadCell>
			{#if data.tournament.check_in_required}
				<TableHeadCell>Présent</TableHeadCell>
			{/if}
			<TableHeadCell>Actions</TableHeadCell>
		</TableHead>
		<TableBody>
			{#each roster as entry}
				<TableBodyRow>
					<TableBodyCell>{entry.last_name} {entry.first_name}</TableBodyCell>
					<TableBodyCell>{entry.licence_no ?? "—"}</TableBodyCell>
					{#if data.tournament.check_in_required}
						<TableBodyCell>
							{#if entry.checked_in}
								<Button
									size="xs"
									color="green"
									onclick={() => checkIn(entry.registration_id, false)}
								>
									<Badge color="green">Présent ✓</Badge>
								</Button>
							{:else}
								<Button
									size="xs"
									color="light"
									onclick={() => checkIn(entry.registration_id, true)}
								>
									<Badge color="dark">Absent</Badge>
								</Button>
							{/if}
						</TableBodyCell>
					{/if}
					<TableBodyCell>
						<Button color="red" size="xs" onclick={() => unregister(entry.player_id)}>
							Retirer
						</Button>
					</TableBodyCell>
				</TableBodyRow>
			{/each}
		</TableBody>
	</Table>

	<Card class="mt-6">
		<h2 class="mb-4 text-lg font-semibold">Ajouter un joueur</h2>

		<PlayerSearch tournamentId={data.tournament.id} onSelect={handlePlayerSelected} />

		{#if selectedPlayer}
			<div class="mt-3 flex items-center gap-3 rounded-md bg-gray-50 p-3 dark:bg-gray-700">
				<span class="font-medium"
					>{selectedPlayer.last_name} {selectedPlayer.first_name}</span
				>
				{#if selectedPlayer.licence_no}
					<span class="text-sm text-gray-500">#{selectedPlayer.licence_no}</span>
				{/if}
				<Button size="xs" color="blue" onclick={registerExisting}>Inscrire</Button>
				<Button size="xs" color="light" onclick={() => (selectedPlayer = null)}
					>Annuler</Button
				>
			</div>
		{/if}

		<div class="mt-4">
			<button
				type="button"
				class="text-sm text-blue-600 hover:underline dark:text-blue-400"
				onclick={() => (showNewPlayerForm = !showNewPlayerForm)}
			>
				{showNewPlayerForm ? "▲ Masquer" : "▼ Nouveau joueur"}
			</button>

			{#if showNewPlayerForm}
				<div class="mt-3 grid grid-cols-2 gap-3">
					<Input placeholder="Prénom" bind:value={newFirst} />
					<Input placeholder="Nom" bind:value={newLast} />
					<Input type="date" placeholder="Date de naissance" bind:value={newBirth} />
					<Input placeholder="Licence (optionnel)" bind:value={newLicence} />
					<div class="col-span-2">
						<Button color="blue" onclick={registerNew}>Créer et inscrire</Button>
					</div>
				</div>
			{/if}
		</div>
	</Card>
</div>
