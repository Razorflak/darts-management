<script lang="ts">
	import {
		Badge,
		Table,
		TableBody,
		TableBodyCell,
		TableBodyRow,
		TableHead,
		TableHeadCell
	} from "flowbite-svelte"
	import { CATEGORY_LABELS } from "$lib/tournament/labels"
	import type { PageData } from "./$types"

	let { data }: { data: PageData } = $props()

	const STATUS_COLORS: Record<string, "green" | "yellow" | "gray" | "blue"> = {
		ready: "green",
		started: "yellow",
		finished: "gray",
		draft: "blue"
	}
</script>

<svelte:head>
	<title>{data.tournament.name} — FFD Darts</title>
</svelte:head>

<div class="mb-6">
	<a href="/events/{data.tournament.event_id}" class="text-sm text-blue-600 hover:underline">
		← Retour à l'événement
	</a>
</div>

<div class="mb-4">
	<h1 class="text-2xl font-bold text-gray-900">{data.tournament.name}</h1>
	<p class="mt-1 text-gray-600">{data.tournament.event_name}</p>
	<div class="mt-2 flex items-center gap-2">
		<Badge color={STATUS_COLORS[data.tournament.status] ?? "gray"}>
			{data.tournament.status}
		</Badge>
		<Badge color="blue">{CATEGORY_LABELS[data.tournament.category]}</Badge>
	</div>
	<p class="mt-2 text-sm text-gray-500">
		{data.roster.length} joueur{data.roster.length !== 1 ? "s" : ""} inscrit{data.roster
			.length !== 1
			? "s"
			: ""}
	</p>
</div>

{#if data.roster.length === 0}
	<p class="text-gray-500">Aucun joueur inscrit pour le moment.</p>
{:else}
	<Table>
		<TableHead>
			<TableHeadCell>Nom</TableHeadCell>
			<TableHeadCell>Licence</TableHeadCell>
			{#if data.tournament.check_in_required}
				<TableHeadCell>Présent</TableHeadCell>
			{/if}
		</TableHead>
		<TableBody>
			{#each data.roster as entry (entry.registration_id)}
				<TableBodyRow>
					<TableBodyCell>{entry.last_name} {entry.first_name}</TableBodyCell>
					<TableBodyCell>{entry.licence_no ?? "—"}</TableBodyCell>
					{#if data.tournament.check_in_required}
						<TableBodyCell>{entry.checked_in ? "✓" : ""}</TableBodyCell>
					{/if}
				</TableBodyRow>
			{/each}
		</TableBody>
	</Table>
{/if}
