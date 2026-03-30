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
import { CATEGORY_LABELS } from "$lib/tournament/labels"
import type { CheckinDay } from "$lib/server/schemas/event-schemas.js"
import type { PageData } from "./$types"

let { data }: { data: PageData } = $props()

async function startDayCheckin(day: CheckinDay) {
	if (day.any_ready) {
		const ok = await confirm(
			"Cette action passera tous les tournois de cette journée en statut check-in",
		)
		if (!ok) return
	}
	const res = await fetch(`/admin/events/${data.event.id}/day-checkin`, {
		method: "PATCH",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ date: day.date }),
	})
	if (res.ok) {
		const { redirect } = await res.json()
		goto(redirect)
	}
}

const STATUS_LABELS: Record<string, string> = {
	ready: "Ouvert",
	"check-in": "Check-in",
	started: "Lancé",
	finished: "Terminé",
}
const STATUS_COLORS: Record<string, "green" | "yellow" | "blue" | "gray"> = {
	ready: "green",
	"check-in": "yellow",
	started: "blue",
	finished: "gray",
}
const EVENT_STATUS_COLORS: Record<string, "gray" | "green" | "yellow" | "red"> =
	{
		draft: "gray",
		ready: "green",
		started: "yellow",
		finished: "red",
	}
</script>

<svelte:head>
	<title>{data.event.name} — Administration</title>
</svelte:head>

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
		<p class="mt-1 text-sm text-gray-500">{data.event.entity_name} · {data.event.location}</p>
		<div class="mt-2">
			<Badge color={EVENT_STATUS_COLORS[data.event.status]}>{data.event.status}</Badge>
		</div>
	</div>
	<Button href="/admin/events/{data.event.id}/edit" color="light" size="sm"
		>Modifier l'événement</Button
	>
</div>

<!-- Day check-in buttons -->
{#if data.checkinDays.length > 0}
	<div class="mb-6">
		<h2 class="mb-3 text-base font-semibold text-gray-800">Check-in par journée</h2>
		<div class="flex flex-wrap gap-3">
			{#each data.checkinDays as day (day.date)}
				{#if day.any_ready || day.any_checkin}
					<Button
						onclick={() => startDayCheckin(day)}
						color={day.any_checkin ? "yellow" : "primary"}
						size="sm"
					>
						Check-in {new Date(day.date).toLocaleDateString("fr-FR", {
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
<h2 class="mb-3 text-base font-semibold text-gray-800">Tournois ({data.tournaments.length})</h2>

{#if data.tournaments.length === 0}
	<p class="text-sm text-gray-500">Aucun tournoi configuré pour cet événement.</p>
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
						<Badge color={STATUS_COLORS[t.status] ?? "gray"}
							>{STATUS_LABELS[t.status] ?? t.status}</Badge
						>
					</TableBodyCell>
					<TableBodyCell>{t.registration_count}</TableBodyCell>
					<TableBodyCell>{t.check_in_required ? "Oui" : "Non"}</TableBodyCell>
					<TableBodyCell>
						<Button
							href="/admin/events/{data.event.id}/tournaments/{t.id}"
							size="xs"
							color="primary">Gérer le roster</Button
						>
					</TableBodyCell>
				</TableBodyRow>
			{/each}
		</TableBody>
	</Table>
{/if}
