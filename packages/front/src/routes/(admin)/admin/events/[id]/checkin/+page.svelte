<script lang="ts">
import {
	Badge,
	Button,
	Table,
	TableBody,
	TableBodyCell,
	TableBodyRow,
	TableHead,
	TableHeadCell,
} from "flowbite-svelte"
import { CloseOutline, TrashBinOutline } from "flowbite-svelte-icons"
import { invalidateAll } from "$app/navigation"
import { confirm } from "$lib/confirm.svelte.js"
import { apiRoutes } from "$lib/fetch/api"
import type {
	CheckinPlayer,
	CheckinRegistration,
} from "$lib/server/schemas/event-schemas.js"
import type { PageData } from "./$types"
import CheckinRegistrationModal from "./CheckinRegistrationModal.svelte"

let { data }: { data: PageData } = $props()

function deepCopyPlayers(source: PageData["players"]) {
	return source.map((p) => ({
		...p,
		registrations: p.registrations.map((r) => ({ ...r })),
	}))
}

// Copie locale mutable pour les mises à jour optimistes
let players = $state(deepCopyPlayers(data.players))

// Resynchronise depuis le serveur après invalidateAll
$effect(() => {
	players = deepCopyPlayers(data.players)
})

let search = $state("")
let showUncheckedOnly = $state(false)
let modalOpen = $state(false)

function isFullyChecked(p: CheckinPlayer): boolean {
	return (
		p.registrations.length > 0 && p.registrations.every((r) => r.checked_in)
	)
}

let checkedCount = $derived(players.filter(isFullyChecked).length)
let totalCount = $derived(players.length)
let progressPct = $derived(
	totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0,
)

let filteredPlayers = $derived(
	players.filter((p) => {
		const nameMatch =
			search.trim() === "" ||
			`${p.first_name} ${p.last_name}`
				.toLowerCase()
				.includes(search.trim().toLowerCase())
		const uncheckedMatch = !showUncheckedOnly || !isFullyChecked(p)
		return nameMatch && uncheckedMatch
	}),
)

function syncPartners(
	affectedRegistrationIds: string[],
	newCheckedIn: boolean,
) {
	for (const player of players) {
		for (const reg of player.registrations) {
			if (affectedRegistrationIds.includes(reg.registration_id)) {
				reg.checked_in = newCheckedIn
			}
		}
	}
}

async function checkinAll(p: CheckinPlayer) {
	const ids = p.registrations
		.filter((r) => !r.checked_in)
		.map((r) => r.registration_id)
	if (ids.length === 0) return
	const res = await fetch(apiRoutes.TOURNAMENT_CHECKIN.path, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ registration_ids: ids, checked_in: true }),
	})
	if (res.ok) {
		syncPartners(ids, true)
	}
}

async function unregisterPlayer(p: CheckinPlayer) {
	const ok = await confirm(
		`Désinscrire ${p.first_name} ${p.last_name} de tous ses tournois ?`,
	)
	if (!ok) return
	await Promise.all(
		p.registrations.map((reg) =>
			fetch(apiRoutes.TOURNAMENT_UNEREGISER.path, {
				method: "DELETE",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ registration_id: reg.registration_id }),
			}),
		),
	)
	await invalidateAll()
}

async function toggleRegistration(p: CheckinPlayer, reg: CheckinRegistration) {
	const newState = !reg.checked_in
	if (!newState) {
		const ok = await confirm(
			`Annuler le check-in pour ${p.first_name} ${p.last_name} — ${reg.tournament_name} ?`,
		)
		if (!ok) return
	}
	const res = await fetch(apiRoutes.TOURNAMENT_CHECKIN.path, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			registration_ids: [reg.registration_id],
			checked_in: newState,
		}),
	})
	if (res.ok) {
		syncPartners([reg.registration_id], newState)
	}
}
</script>

<svelte:head>
	<title>Check-in {data.date} — {data.event.name}</title>
</svelte:head>

<!-- Breadcrumb -->
<nav class="mb-4 text-sm text-gray-500">
	<a href="/admin/events" class="hover:underline">Événements</a>
	<span class="mx-2">/</span>
	<a href="/admin/events/{data.event.id}" class="hover:underline"
		>{data.event.name}</a
	>
	<span class="mx-2">/</span>
	<span class="text-gray-800">
		Check-in {new Date(data.date).toLocaleDateString("fr-FR", {
			day: "numeric",
			month: "long",
		})}
	</span>
</nav>

<!-- Progress bar -->
<div class="mb-6">
	<div class="mb-1 flex items-center justify-between text-sm text-gray-600">
		<span>{checkedCount} / {totalCount} joueurs checkés</span>
		<span>{progressPct}%</span>
	</div>
	<div class="h-3 w-full overflow-hidden rounded-full bg-gray-200">
		<div
			class="h-3 rounded-full bg-green-500 transition-all"
			style="width: {progressPct}%"
		></div>
	</div>
</div>

<!-- Controls row -->
<div class="mb-4 flex flex-wrap items-center gap-3">
	<!-- Search -->
	<div class="relative flex w-96 items-center rounded-lg border border-gray-300 focus-within:ring-2 focus-within:ring-blue-500">
		<input
			type="text"
			placeholder="Rechercher un joueur..."
			bind:value={search}
			class="w-full bg-transparent py-2 pl-3 text-sm outline-none {search && filteredPlayers.length === 1 ? 'pr-36' : 'pr-8'}"
			onkeydown={(e) => {
				if (e.key === 'Enter' && filteredPlayers.length === 1) {
					checkinAll(filteredPlayers[0])
				}
			}}
		/>
		<div class="absolute right-2 flex items-center gap-1.5">
			{#if search && filteredPlayers.length === 1}
				<span class="pointer-events-none shrink-0 rounded bg-blue-100 px-1.5 py-0.5 text-xs font-medium text-blue-700">
					Entrer pour valider
				</span>
			{/if}
			{#if search}
				<button
					type="button"
					onclick={() => (search = "")}
					class="text-gray-400 hover:text-gray-700"
					aria-label="Effacer la recherche"
				>
					<CloseOutline class="h-3.5 w-3.5" />
				</button>
			{/if}
		</div>
	</div>
	<label class="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
		<input type="checkbox" bind:checked={showUncheckedOnly} class="rounded" />
		Afficher uniquement les joueurs non checkés
	</label>
	<div class="ml-auto">
		<Button onclick={() => (modalOpen = true)} color="primary" size="sm"
			>Inscription</Button
		>
	</div>
</div>

<!-- Player list -->
{#if filteredPlayers.length === 0}
	<p class="text-sm text-gray-500">
		{#if players.length === 0}
			Aucun joueur inscrit à un tournoi en check-in ce jour.
		{:else}
			Aucun joueur correspondant aux filtres.
		{/if}
	</p>
{:else}
	<Table>
		<TableHead>
			<TableHeadCell>Joueur</TableHeadCell>
			<TableHeadCell></TableHeadCell>
			<TableHeadCell>Tournois</TableHeadCell>
			<TableHeadCell></TableHeadCell>
		</TableHead>
		<TableBody>
			{#each filteredPlayers as player (player.player_id)}
				<TableBodyRow>
					<TableBodyCell class="font-medium whitespace-nowrap w-px">
						{player.first_name}
						{player.last_name}
					</TableBodyCell>
					<TableBodyCell class="font-medium whitespace-nowrap w-px">
						{#if isFullyChecked(player)}
							<Badge color="green" class="ml-2">Checké</Badge>
						{/if}
					</TableBodyCell>
					<TableBodyCell>
						<div class="flex flex-wrap gap-2">
							{#each player.registrations as reg (reg.registration_id)}
								<button
									onclick={() => toggleRegistration(player, reg)}
									class="rounded px-2 py-1 text-xs font-medium transition-colors {reg.checked_in
										? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
										: 'bg-gray-100 text-gray-600 hover:bg-gray-200'}"
								>
									{reg.tournament_name}
									{reg.checked_in ? "✓" : ""}
								</button>
							{/each}
						</div>
					</TableBodyCell>
					<TableBodyCell class="whitespace-nowrap">
							<Button
								onclick={() => checkinAll(player)}
								color="green"
								size="xs"
								disabled={isFullyChecked(player)}
							>
								Check-in tous
							</Button>
					</TableBodyCell>
					<TableBodyCell class="whitespace-nowrap">
							<Button
								onclick={() => unregisterPlayer(player)}
								color="red"
								size="xs"
								aria-label="Désinscrire"
							>
								<TrashBinOutline class="h-3.5 w-3.5" />
							</Button>
					</TableBodyCell>
				</TableBodyRow>
			{/each}
		</TableBody>
	</Table>
{/if}

{#if modalOpen}
	<CheckinRegistrationModal bind:open={modalOpen} eventTournaments={data.eventTournaments} />
{/if}
