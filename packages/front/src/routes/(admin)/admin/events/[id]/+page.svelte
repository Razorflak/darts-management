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
import { AwardSolid } from "flowbite-svelte-icons"
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
<nav class="breadcrumb">
	<a href="/admin/events">Événements</a>
	<span class="breadcrumb-sep">/</span>
	<span class="breadcrumb-current">{data.event.name}</span>
</nav>

<!-- En-tête de l'événement -->
<div class="mb-6 flex flex-wrap items-start justify-between gap-3">
	<div>
		<h1 class="page-title">{data.event.name}</h1>
		<p class="page-subtitle">{data.event.entity_name}· {data.event.location}</p>
		<div class="mt-2">
			<Badge color={EVENT_DETAIL_STATUS_COLORS[data.event.status]}>
				{data.event.status}
			</Badge>
		</div>
	</div>
	<div class="flex flex-wrap gap-2">
		<Button
			onclick={() => (registrationModalOpen = true)}
			color="primary"
			size="sm"
		>
			Inscrire un joueur
		</Button>
		<Button href="/admin/events/{data.event.id}/edit" color="light" size="sm">
			Modifier
		</Button>
	</div>
</div>

{#if registrationModalOpen}
	<RegistrationModal
		bind:open={registrationModalOpen}
		eventTournaments={data.tournaments}
	/>
{/if}

<!-- Check-in par journée -->
{#if data.checkinDays.length > 0}
	<div class="mb-6">
		<h2 class="section-title mb-3">Check-in par journée</h2>
		<div class="flex flex-wrap gap-2">
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

<!-- Tableau des tournois -->
<h2 class="section-title mb-3">
	<span
		class="inline-flex h-6 w-6 items-center justify-center rounded-full"
		style="background: var(--color-primary-100); color: var(--color-primary-600);"
	>
		<AwardSolid class="h-3.5 w-3.5" />
	</span>
	Tournois ({data.tournaments.length})
</h2>

{#if data.tournaments.length === 0}
	<div class="empty-state">
		<p class="text-sm" style="color: oklch(55% 0.01 264);">
			Aucun tournoi configuré pour cet événement.
		</p>
	</div>
{:else}
	<div class="table-wrapper">
		<Table>
			<TableHead>
				<TableHeadCell>Tournoi</TableHeadCell>
				<TableHeadCell>Catégorie</TableHeadCell>
				<TableHeadCell>Statut</TableHeadCell>
				<TableHeadCell>Inscrits</TableHeadCell>
				<TableHeadCell class="hidden sm:table-cell">Check-in</TableHeadCell>
				<TableHeadCell></TableHeadCell>
			</TableHead>
			<TableBody>
				{#each data.tournaments as t (t.id)}
					<TableBodyRow>
						<TableBodyCell class="font-medium">{t.name}</TableBodyCell>
						<TableBodyCell class="whitespace-nowrap">
							{CATEGORY_LABELS[t.category]}
						</TableBodyCell>
						<TableBodyCell>
							<Badge color={TOURNAMENT_STATUS_COLORS[t.status] ?? "gray"}>
								{TOURNAMENT_STATUS_LABELS[t.status] ?? t.status}
							</Badge>
						</TableBodyCell>
						<TableBodyCell>{t.registration_count}</TableBodyCell>
						<TableBodyCell class="hidden sm:table-cell">
							{t.check_in_required ? "Oui" : "Non"}
						</TableBodyCell>
						<TableBodyCell>
							<div class="flex flex-wrap gap-1.5">
								<Button
									href="/admin/events/{data.event.id}/tournaments/{t.id}"
									size="xs"
									color="light"
								>
									Roster
								</Button>
								{#if t.status === "ready" || t.status === "check-in"}
									<Button
										href="/admin/events/{data.event.id}/tournaments/{t.id}/launch"
										size="xs"
										color="primary"
									>
										Lancer
									</Button>
								{/if}
							</div>
						</TableBodyCell>
					</TableBodyRow>
				{/each}
			</TableBody>
		</Table>
	</div>
{/if}
