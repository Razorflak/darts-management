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
import { goto } from "$app/navigation"
import { confirm } from "$lib/confirm.svelte.js"
import { apiRoutes } from "$lib/fetch/api"
import type { CheckinDay } from "$lib/server/schemas/event-schemas.js"
import RegistrationModal from "$lib/tournament/components/RegistrationModal.svelte"
import {
	CATEGORY_LABELS,
	EVENT_DETAIL_STATUS_COLORS,
	TOURNAMENT_STATUS_COLORS,
	TOURNAMENT_STATUS_LABELS,
} from "$lib/tournament/labels"
import type { PageData } from "./$types"
import QuickScoreCard from "./QuickScoreCard.svelte"

let { data }: { data: PageData } = $props()

let registrationModalOpen = $state(false)

async function startDayCheckin(day: CheckinDay) {
	if (day.any_ready) {
		const ok = await confirm(
			"Cette action passera tous les tournois de cette journée en statut check-in",
		)
		if (!ok) return
	}
	const readyIds = day.tournament_ids.filter(
		(id) => data.tournaments.find((t) => t.id === id)?.status === "ready",
	)
	await Promise.all(
		readyIds.map((tournament_id) =>
			fetch(apiRoutes.TOURNAMENT_STATUS.path, {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ tournament_id, status: "check-in" }),
			}),
		),
	)
	goto(`/admin/events/${data.event.id}/checkin?date=${day.date}`)
}
</script>

<svelte:head> <title>{data.event.name} — Administration</title> </svelte:head>

{#if data.hasStartedTournament}
	<QuickScoreCard eventId={data.event.id} />
{/if}

<!-- Breadcrumb -->
<nav class="mb-4 text-sm text-gray-500">
	<a href="/admin/events" class="hover:underline">Événements</a>
	<span class="mx-2">/</span>
	<span class="text-gray-800">{data.event.name}</span>
</nav>

<!-- Event header -->
<div class="mb-6 flex items-start justify-between">
	<div>
		<h1 class="text-2xl font-bold text-gray-900">{data.event.name}</h1>
		<p class="mt-1 text-sm text-gray-500">
			{data.event.entity_name}
			· {data.event.location}
		</p>
		<div class="mt-2">
			<Badge color={EVENT_DETAIL_STATUS_COLORS[data.event.status]}
				>{data.event.status}</Badge
			>
		</div>
	</div>
	<div class="flex gap-2">
		<Button
			onclick={() => (registrationModalOpen = true)}
			color="primary"
			size="sm"
			>Inscrire un joueur</Button
		>
		<Button href="/admin/events/{data.event.id}/edit" color="light" size="sm"
			>Modifier l'événement</Button
		>
	</div>
</div>

<!-- Day check-in buttons -->
{#if registrationModalOpen}
	<RegistrationModal
		bind:open={registrationModalOpen}
		eventTournaments={data.tournaments}
	/>
{/if}

{#if data.checkinDays.length > 0}
	<div class="mb-6">
		<h2 class="mb-3 text-base font-semibold text-gray-800">
			Check-in par journée
		</h2>
		<div class="flex flex-wrap gap-3">
			{#each data.checkinDays as day (day.date)}
				{#if day.any_ready || day.any_checkin}
					<Button
						onclick={() => startDayCheckin(day)}
						color={day.any_checkin ? "yellow" : "primary"}
						size="sm"
					>
						Check-in
						{new Date(day.date).toLocaleDateString("fr-FR", {
							day: "numeric",
							month: "long",
						})}
					</Button>
				{/if}
			{/each}
		</div>
	</div>
{/if}

<!-- Tournaments table -->
<h2 class="mb-3 text-base font-semibold text-gray-800">
	Tournois ({data.tournaments.length})
</h2>

{#if data.tournaments.length === 0}
	<p class="text-sm text-gray-500">
		Aucun tournoi configuré pour cet événement.
	</p>
{:else}
	<Table>
		<TableHead>
			<TableHeadCell>Tournoi</TableHeadCell>
			<TableHeadCell>Catégorie</TableHeadCell>
			<TableHeadCell>Statut</TableHeadCell>
			<TableHeadCell>Inscrits</TableHeadCell>
			<TableHeadCell>Check-in</TableHeadCell>
			<TableHeadCell></TableHeadCell>
		</TableHead>
		<TableBody>
			{#each data.tournaments as t (t.id)}
				<TableBodyRow>
					<TableBodyCell class="font-medium">{t.name}</TableBodyCell>
					<TableBodyCell>{CATEGORY_LABELS[t.category]}</TableBodyCell>
					<TableBodyCell>
						<Badge color={TOURNAMENT_STATUS_COLORS[t.status] ?? "gray"}
							>{TOURNAMENT_STATUS_LABELS[t.status] ?? t.status}</Badge
						>
					</TableBodyCell>
					<TableBodyCell>{t.registration_count}</TableBodyCell>
					<TableBodyCell>{t.check_in_required ? "Oui" : "Non"}</TableBodyCell>
					<TableBodyCell>
						<div class="flex gap-2">
							<Button
								href="/admin/events/{data.event.id}/tournaments/{t.id}"
								size="xs"
								color="light"
								>Gérer le roster</Button
							>
							{#if t.status === "ready" || t.status === "check-in"}
								<Button
									href="/admin/events/{data.event.id}/tournaments/{t.id}/launch"
									size="xs"
									color="primary"
									>Lancer le tournoi</Button
								>
							{/if}
						</div>
					</TableBodyCell>
				</TableBodyRow>
			{/each}
		</TableBody>
	</Table>
{/if}
