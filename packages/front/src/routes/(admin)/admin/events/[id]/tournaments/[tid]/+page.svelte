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
	import DepartmentSelect from "$lib/tournament/components/DepartmentSelect.svelte"
	import type { PageData } from "./$types"
	import type { PlayerSearchResult, RosterEntry } from "$lib/server/schemas/event-schemas.js"

	let { data }: { data: PageData } = $props()

	const eventId = data.tournament.event_id
	const tournamentId = data.tournament.id
	const baseUrl = `/admin/events/${eventId}/tournaments/${tournamentId}`

	let roster = $state<RosterEntry[]>(data.roster)
	let tournamentStatus = $state(data.tournament.status)

	// Add player state
	let selectedPlayer = $state<PlayerSearchResult | null>(null)
	let showNewPlayerForm = $state(false)
	let newFirst = $state("")
	let newLast = $state("")
	let newBirth = $state("")
	let newLicence = $state("")
	let newDepartment = $state("")

	// Status management
	const STATUS_TRANSITIONS: Record<string, string | null> = {
		ready: "check-in",
		"check-in": "started",
		started: "finished",
		finished: null
	}
	const STATUS_PREV: Record<string, string | null> = {
		ready: null,
		"check-in": "ready",
		started: "check-in",
		finished: "started"
	}
	const STATUS_LABELS: Record<string, string> = {
		ready: "Ouvert",
		"check-in": "Check-in",
		started: "Lancé",
		finished: "Terminé"
	}
	const STATUS_COLORS: Record<string, "green" | "yellow" | "blue" | "gray"> = {
		ready: "green",
		"check-in": "yellow",
		started: "blue",
		finished: "gray"
	}

	async function changeStatus(newStatus: string) {
		const res = await fetch(`${baseUrl}/status`, {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ status: newStatus })
		})
		if (res.ok) {
			tournamentStatus = newStatus
		}
	}

	async function checkIn(registrationId: string, value: boolean) {
		await fetch(`${baseUrl}/checkin`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ registration_id: registrationId, checked_in: value })
		})
		const entry = roster.find((e) => e.registration_id === registrationId)
		if (entry) entry.checked_in = value
	}

	async function unregister(teamId: string) {
		await fetch(`${baseUrl}/unregister`, {
			method: "DELETE",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ team_id: teamId })
		})
		roster = roster.filter((e) => e.team_id !== teamId)
	}

	async function checkInAll() {
		await fetch(`${baseUrl}/checkin-all`, { method: "POST" })
		roster = roster.map((e) => ({ ...e, checked_in: true }))
	}

	async function registerExisting() {
		if (!selectedPlayer) return
		const res = await fetch(`${baseUrl}/register`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ mode: "existing", player_id: selectedPlayer.id })
		})
		if (res.ok) {
			window.location.reload()
		} else {
			const err = await res.json().catch(() => ({}))
			alert(err.message ?? "Erreur lors de l'inscription")
		}
	}

	async function registerNew() {
		const res = await fetch(`${baseUrl}/register`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				mode: "new",
				first_name: newFirst,
				last_name: newLast,
				birth_date: newBirth,
				licence_no: newLicence || undefined,
				department: newDepartment || undefined
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

<svelte:head>
	<title>{data.tournament.name} — Roster admin</title>
</svelte:head>

<!-- Breadcrumb -->
<nav class="mb-4 text-sm text-gray-500">
	<a href="/admin/events" class="hover:underline">Événements</a>
	<span class="mx-2">/</span>
	<a href="/admin/events/{eventId}" class="hover:underline">{data.tournament.event_name}</a>
	<span class="mx-2">/</span>
	<span class="text-gray-800">{data.tournament.name}</span>
</nav>

<!-- Tournament header + status management -->
<div class="mb-6">
	<h1 class="text-2xl font-bold text-gray-900">{data.tournament.name}</h1>
	<p class="mt-1 text-sm text-gray-500">{data.tournament.event_name}</p>
	<p class="mt-1 text-sm text-gray-600">
		{roster.length} équipe{roster.length !== 1 ? "s" : ""} inscrite{roster.length !== 1 ? "s" : ""}
	</p>

	<!-- Status badge + transition buttons -->
	<div class="mt-3 flex items-center gap-3">
		<Badge color={STATUS_COLORS[tournamentStatus] ?? "gray"}>
			{STATUS_LABELS[tournamentStatus] ?? tournamentStatus}
		</Badge>
		{#if STATUS_PREV[tournamentStatus]}
			<Button
				size="xs"
				color="light"
				onclick={() => changeStatus(STATUS_PREV[tournamentStatus]!)}
			>
				← {STATUS_LABELS[STATUS_PREV[tournamentStatus]!]}
			</Button>
		{/if}
		{#if STATUS_TRANSITIONS[tournamentStatus]}
			<Button
				size="xs"
				color="primary"
				onclick={() => changeStatus(STATUS_TRANSITIONS[tournamentStatus]!)}
			>
				Passer en {STATUS_LABELS[STATUS_TRANSITIONS[tournamentStatus]!]} →
			</Button>
		{/if}
	</div>
</div>

<!-- Bulk check-in -->
{#if data.tournament.check_in_required}
	<div class="mb-4">
		<Button color="blue" onclick={checkInAll}>Tout checker</Button>
	</div>
{/if}

<!-- Roster table -->
{#if roster.length === 0}
	<p class="mb-6 text-sm text-gray-500">Aucune équipe inscrite pour le moment.</p>
{:else}
	<div class="mb-6">
		<Table>
			<TableHead>
				<TableHeadCell>Équipe</TableHeadCell>
				{#if data.tournament.check_in_required}
					<TableHeadCell>Présent</TableHeadCell>
				{/if}
				<TableHeadCell>Actions</TableHeadCell>
			</TableHead>
			<TableBody>
				{#each roster as entry (entry.registration_id)}
					<TableBodyRow>
						<TableBodyCell>
							{#each entry.members as member, i}
								{member.last_name}
								{member.first_name}{i < entry.members.length - 1 ? " / " : ""}
								{#if member.department}
									<span class="ml-1 text-xs text-gray-400">({member.department})</span>
								{/if}
							{/each}
						</TableBodyCell>
						{#if data.tournament.check_in_required}
							<TableBodyCell>
								{#if entry.checked_in}
									<Button
										size="xs"
										color="green"
										onclick={() => checkIn(entry.registration_id, false)}
									>
										Présent ✓
									</Button>
								{:else}
									<Button
										size="xs"
										color="light"
										onclick={() => checkIn(entry.registration_id, true)}
									>
										Absent
									</Button>
								{/if}
							</TableBodyCell>
						{/if}
						<TableBodyCell>
							<Button color="red" size="xs" onclick={() => unregister(entry.team_id)}>
								Retirer
							</Button>
						</TableBodyCell>
					</TableBodyRow>
				{/each}
			</TableBody>
		</Table>
	</div>
{/if}

<!-- Add player section -->
<Card class="mt-2">
	<h2 class="mb-4 text-lg font-semibold">Ajouter un joueur</h2>

	<!-- PlayerSearch uses the new (admin) search endpoint via searchUrl prop -->
	<PlayerSearch
		tournamentId={tournamentId}
		searchUrl="{baseUrl}/players/search"
		onSelect={handlePlayerSelected}
	/>

	{#if selectedPlayer}
		<div class="mt-3 flex items-center gap-3 rounded-md bg-gray-50 p-3">
			<span class="font-medium">{selectedPlayer.last_name} {selectedPlayer.first_name}</span>
			{#if selectedPlayer.department}
				<span class="text-sm text-gray-500">({selectedPlayer.department})</span>
			{/if}
			{#if selectedPlayer.licence_no}
				<span class="text-sm text-gray-500">#{selectedPlayer.licence_no}</span>
			{/if}
			<Button size="xs" color="blue" onclick={registerExisting}>Inscrire</Button>
			<Button size="xs" color="light" onclick={() => (selectedPlayer = null)}>Annuler</Button>
		</div>
	{/if}

	<div class="mt-4">
		<button
			type="button"
			class="text-sm text-blue-600 hover:underline"
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
					<DepartmentSelect bind:value={newDepartment} placeholder="Département" />
				</div>
				<div class="col-span-2">
					<Button color="blue" onclick={registerNew}>Créer et inscrire</Button>
				</div>
			</div>
		{/if}
	</div>
</Card>
