<script lang="ts">
import { Badge, Button } from "flowbite-svelte"
import { confirm } from "$lib/confirm.svelte.js"
import type {
	CheckinPlayer,
	CheckinRegistration,
} from "$lib/server/schemas/event-schemas.js"
import type { PageData } from "./$types"
import CheckinRegistrationModal from "./CheckinRegistrationModal.svelte"

let { data }: { data: PageData } = $props()

// svelte-ignore state_referenced_locally
let players = $state(
	data.players.map((p) => ({
		...p,
		registrations: p.registrations.map((r) => ({ ...r })),
	})),
)
let search = $state("")
let showUncheckedOnly = $state(false)
let modalOpen = $state(false)

// A player is fully checked if ALL their registrations are checked_in
function isFullyChecked(p: CheckinPlayer): boolean {
	return (
		p.registrations.length > 0 && p.registrations.every((r) => r.checked_in)
	)
}

// Progress
let checkedCount = $derived(players.filter(isFullyChecked).length)
let totalCount = $derived(players.length)
let progressPct = $derived(
	totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0,
)

// Filtered display list
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

// Sync checked_in state for all players who share any of the affected registration_ids.
// This ensures a doubles partner's row updates instantly without a page reload.
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
	const res = await fetch(
		`/admin/events/${data.event.id}/checkin/team-checkin`,
		{
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ registration_ids: ids, checked_in: true }),
		},
	)
	if (res.ok) {
		syncPartners(ids, true)
	}
}

async function toggleRegistration(p: CheckinPlayer, reg: CheckinRegistration) {
	const newState = !reg.checked_in
	if (!newState) {
		const ok = await confirm(
			`Annuler le check-in pour ${p.first_name} ${p.last_name} — ${reg.tournament_name} ?`,
		)
		if (!ok) return
	}
	const res = await fetch(
		`/admin/events/${data.event.id}/checkin/team-checkin`,
		{
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				registration_ids: [reg.registration_id],
				checked_in: newState,
			}),
		},
	)
	if (res.ok) {
		syncPartners([reg.registration_id], newState)
	}
}

function onModalClose() {
	modalOpen = false
	// Reload page to refresh player list after registration
	window.location.reload()
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
	<input
		type="text"
		placeholder="Rechercher un joueur..."
		bind:value={search}
		class="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
	/>
	{#if search}
		<button
			onclick={() => (search = "")}
			class="text-sm text-gray-500 hover:text-gray-800">✕ Vider</button
		>
	{/if}
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
	<div class="space-y-2">
		{#each filteredPlayers as player (player.player_id)}
			<div
				class="flex flex-wrap items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3"
			>
				<!-- Name + fully-checked badge -->
				<div class="min-w-[180px] font-medium text-gray-900">
					{player.first_name}
					{player.last_name}
					{#if isFullyChecked(player)}
						<Badge color="green" class="ml-2">Checké</Badge>
					{/if}
				</div>

				<!-- Per-tournament small buttons -->
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

				<!-- Bulk check-in button -->
				<div class="ml-auto">
					<Button
						onclick={() => checkinAll(player)}
						color="green"
						size="sm"
						disabled={isFullyChecked(player)}
					>
						Check-in tous
					</Button>
				</div>
			</div>
		{/each}
	</div>
{/if}

{#if modalOpen}
	<CheckinRegistrationModal
		eventId={data.event.id}
		date={data.date}
		tournaments={data.tournaments}
		onClose={onModalClose}
	/>
{/if}
