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
		Modal
	} from "flowbite-svelte"
	import PlayerSearch from "$lib/tournament/components/PlayerSearch.svelte"
	import DepartmentSelect from "$lib/tournament/components/DepartmentSelect.svelte"
	import type { PageData } from "./$types"
	import type { PlayerSearchResult, RosterEntry } from "$lib/server/schemas/event-schemas.js"

	let { data }: { data: PageData } = $props()

	const eventId = data.tournament.event_id
	const tournamentId = data.tournament.id
	const baseUrl = `/admin/events/${eventId}/tournaments/${tournamentId}`

	const DOUBLE_CATEGORIES = ["double", "double_female", "double_mix"]
	const isDoubles = DOUBLE_CATEGORIES.includes(data.tournament.category)

	let roster = $state<RosterEntry[]>(data.roster)
	let tournamentStatus = $state(data.tournament.status)

	// Filter
	let filterQuery = $state("")
	let filteredRoster = $derived(
		filterQuery.trim().length === 0
			? roster
			: roster.filter((e) =>
					e.members.some(
						(m) =>
							`${m.last_name} ${m.first_name}`.toLowerCase().includes(filterQuery.toLowerCase()) ||
							`${m.first_name} ${m.last_name}`.toLowerCase().includes(filterQuery.toLowerCase())
					)
				)
	)

	// Modal state
	let showAddModal = $state(false)

	// Solo add state
	let selectedPlayer = $state<PlayerSearchResult | null>(null)
	let showNewPlayerForm = $state(false)
	let newFirst = $state("")
	let newLast = $state("")
	let newBirth = $state("")
	let newLicence = $state("")
	let newDepartment = $state("")

	// Doubles add state
	let selectedPlayer1 = $state<PlayerSearchResult | null>(null)
	let showNewPlayer1Form = $state(false)
	let newPlayer1 = $state({ first: "", last: "", birth: "", licence: "", department: "" })
	let selectedPlayer2 = $state<PlayerSearchResult | null>(null)
	let showNewPlayer2Form = $state(false)
	let newPlayer2 = $state({ first: "", last: "", birth: "", licence: "", department: "" })

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

	function buildSlot(
		sel: PlayerSearchResult | null,
		form: { first: string; last: string; birth: string; licence: string; department: string }
	) {
		if (sel) return { type: "existing" as const, id: sel.id }
		return {
			type: "new" as const,
			first_name: form.first,
			last_name: form.last,
			birth_date: form.birth,
			licence_no: form.licence || undefined,
			department: form.department || undefined
		}
	}

	async function registerDoubles() {
		const res = await fetch(`${baseUrl}/register`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				mode: "doubles",
				player1: buildSlot(selectedPlayer1, newPlayer1),
				player2: buildSlot(selectedPlayer2, newPlayer2)
			})
		})
		if (res.ok) {
			window.location.reload()
		} else {
			const err = await res.json().catch(() => ({}))
			alert(err.message ?? "Erreur lors de l'inscription")
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
		{roster.length} équipe{roster.length !== 1 ? "s" : ""} inscrite{roster.length !== 1
			? "s"
			: ""}
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
				&larr; {STATUS_LABELS[STATUS_PREV[tournamentStatus]!]}
			</Button>
		{/if}
		{#if STATUS_TRANSITIONS[tournamentStatus]}
			<Button
				size="xs"
				color="primary"
				onclick={() => changeStatus(STATUS_TRANSITIONS[tournamentStatus]!)}
			>
				Passer en {STATUS_LABELS[STATUS_TRANSITIONS[tournamentStatus]!]} &rarr;
			</Button>
		{/if}
	</div>
</div>

<!-- Add button + filter -->
<div class="mb-4 flex items-center gap-3">
	<Button color="primary" size="sm" onclick={() => (showAddModal = true)}>
		{isDoubles ? "Ajouter une équipe" : "Ajouter un joueur"}
	</Button>
	{#if roster.length > 0}
		<Input placeholder="Filtrer les inscrits..." bind:value={filterQuery} class="max-w-xs" />
	{/if}
</div>

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
				{#each filteredRoster as entry (entry.registration_id)}
					<TableBodyRow class="border-b border-gray-100">
						<TableBodyCell>
							{#each entry.members as member, i}
								{member.last_name}
								{member.first_name}{i < entry.members.length - 1 ? " / " : ""}
								{#if member.department}
									<span class="ml-1 text-xs text-gray-400"
										>({member.department})</span
									>
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

<!-- Add player / team modal -->
<Modal
	bind:open={showAddModal}
	title={isDoubles ? "Ajouter une équipe" : "Ajouter un joueur"}
	size="lg"
	outsideclose
>
	{#if isDoubles}
		<!-- Doubles mode: two player slots -->
		<div class="space-y-6">
			<!-- Player 1 -->
			<div>
				<h3 class="mb-2 font-semibold text-gray-700">Joueur 1</h3>
				<PlayerSearch
					{tournamentId}
					searchUrl="{baseUrl}/players/search"
					onSelect={(p) => {
						selectedPlayer1 = p
					}}
				/>
				{#if selectedPlayer1}
					<div class="mt-2 flex items-center gap-2 rounded-md bg-gray-50 p-2">
						<span class="font-medium"
							>{selectedPlayer1.last_name} {selectedPlayer1.first_name}</span
						>
						{#if selectedPlayer1.department}
							<span class="text-sm text-gray-500">({selectedPlayer1.department})</span>
						{/if}
						<Button size="xs" color="light" onclick={() => (selectedPlayer1 = null)}>
							Changer
						</Button>
					</div>
				{/if}
				<div class="mt-2">
					<button
						type="button"
						class="text-sm text-blue-600 hover:underline"
						onclick={() => (showNewPlayer1Form = !showNewPlayer1Form)}
					>
						{showNewPlayer1Form ? "▲ Masquer" : "▼ Nouveau joueur"}
					</button>
					{#if showNewPlayer1Form}
						<div class="mt-2 grid grid-cols-2 gap-2">
							<Input placeholder="Prénom" bind:value={newPlayer1.first} />
							<Input placeholder="Nom" bind:value={newPlayer1.last} />
							<Input type="date" placeholder="Date de naissance" bind:value={newPlayer1.birth} />
							<Input placeholder="Licence (optionnel)" bind:value={newPlayer1.licence} />
							<div class="col-span-2">
								<DepartmentSelect bind:value={newPlayer1.department} placeholder="Département" />
							</div>
						</div>
					{/if}
				</div>
			</div>

			<!-- Player 2 -->
			<div>
				<h3 class="mb-2 font-semibold text-gray-700">Joueur 2</h3>
				<PlayerSearch
					{tournamentId}
					searchUrl="{baseUrl}/players/search"
					onSelect={(p) => {
						selectedPlayer2 = p
					}}
				/>
				{#if selectedPlayer2}
					<div class="mt-2 flex items-center gap-2 rounded-md bg-gray-50 p-2">
						<span class="font-medium"
							>{selectedPlayer2.last_name} {selectedPlayer2.first_name}</span
						>
						{#if selectedPlayer2.department}
							<span class="text-sm text-gray-500">({selectedPlayer2.department})</span>
						{/if}
						<Button size="xs" color="light" onclick={() => (selectedPlayer2 = null)}>
							Changer
						</Button>
					</div>
				{/if}
				<div class="mt-2">
					<button
						type="button"
						class="text-sm text-blue-600 hover:underline"
						onclick={() => (showNewPlayer2Form = !showNewPlayer2Form)}
					>
						{showNewPlayer2Form ? "▲ Masquer" : "▼ Nouveau joueur"}
					</button>
					{#if showNewPlayer2Form}
						<div class="mt-2 grid grid-cols-2 gap-2">
							<Input placeholder="Prénom" bind:value={newPlayer2.first} />
							<Input placeholder="Nom" bind:value={newPlayer2.last} />
							<Input type="date" placeholder="Date de naissance" bind:value={newPlayer2.birth} />
							<Input placeholder="Licence (optionnel)" bind:value={newPlayer2.licence} />
							<div class="col-span-2">
								<DepartmentSelect bind:value={newPlayer2.department} placeholder="Département" />
							</div>
						</div>
					{/if}
				</div>
			</div>
		</div>

		{#snippet footer()}
			<Button color="primary" onclick={registerDoubles}>Confirmer l'inscription</Button>
			<Button color="light" onclick={() => (showAddModal = false)}>Annuler</Button>
		{/snippet}
	{:else}
		<!-- Solo mode -->
		<PlayerSearch
			{tournamentId}
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

		{#snippet footer()}
			<Button color="light" onclick={() => (showAddModal = false)}>Fermer</Button>
		{/snippet}
	{/if}
</Modal>
