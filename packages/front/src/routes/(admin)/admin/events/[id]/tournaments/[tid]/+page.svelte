<script lang="ts">
import { Breadcrumb, BreadcrumbItem } from "flowbite-svelte"
import { invalidateAll } from "$app/navigation"
import { apiRoutes } from "$lib/fetch/api"
import type { RosterEntry } from "$lib/server/schemas/event-schemas.js"
import { isDoublesTournament } from "$lib/tournament/utils"
import type { PageData } from "./$types"
import MatchSection from "./MatchSection.svelte"
import RosterTable from "./RosterTable.svelte"
import SeedingOrderList from "./SeedingOrderList.svelte"
import TournamentHeader from "./TournamentHeader.svelte"

let { data }: { data: PageData } = $props()

const eventId = $derived(data.tournament.event_id)
const tournamentId = $derived(data.tournament.id)
const isDoubles = $derived(isDoublesTournament(data.tournament.category))

// svelte-ignore state_referenced_locally
let roster = $state<RosterEntry[]>(data.roster)
let tournamentStatus = $state<"ready" | "check-in" | "started" | "finished">(
	// svelte-ignore state_referenced_locally
	data.tournament.status,
)

const isLaunched = $derived(
	tournamentStatus === "started" || tournamentStatus === "finished",
)

async function handleCancelLaunch() {
	const res = await fetch(apiRoutes.TOURNAMENT_CANCEL.path, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ tournament_id: tournamentId }),
	})
	if (res.ok) {
		tournamentStatus = "check-in"
		await invalidateAll()
	}
}
</script>

<svelte:head>
	<title>{data.tournament.name} — Roster admin</title>
</svelte:head>

<Breadcrumb class="mb-4">
	<BreadcrumbItem href="/admin/events" home>Événements</BreadcrumbItem>
	<BreadcrumbItem href="/admin/events/{eventId}"
		>{data.tournament.event_name}</BreadcrumbItem
	>
	<BreadcrumbItem>{data.tournament.name}</BreadcrumbItem>
</Breadcrumb>

<TournamentHeader
	tournamentName={data.tournament.name}
	eventName={data.tournament.event_name}
	{eventId}
	{tournamentId}
	rosterCount={roster.length}
	bind:status={tournamentStatus}
	onCancelLaunch={handleCancelLaunch}
/>

{#if data.tournament.is_seeded && !isLaunched && roster.length > 0}
	<SeedingOrderList {roster} {tournamentId} />
{/if}

{#if !isLaunched}
	<RosterTable
		bind:roster
		{tournamentId}
		{isDoubles}
		checkInRequired={data.tournament.check_in_required}
		onRegistered={async () => { await invalidateAll() }}
	/>
{:else}
	<MatchSection
		matches={data.matches}
		standingsByPhase={data.standingsByPhase}
		teamNames={data.teamNames}
		eventId={data.tournament.event_id}
	/>
{/if}
