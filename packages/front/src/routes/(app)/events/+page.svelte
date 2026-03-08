<script lang="ts">
	import { formatDate } from "$lib/date/utils.js"
	import { Card, Badge, Button } from "flowbite-svelte"

	const STATUS_LABELS = {
		draft: "Brouillon",
		ready: "Ouvert",
		started: "En cours",
		finished: "Terminé"
	} as const

	const STATUS_COLORS = {
		draft: "gray",
		ready: "green",
		started: "blue",
		finished: "indigo"
	} as const

	let { data } = $props()
</script>

<svelte:head>
	<title>Mes événements — FFD</title>
</svelte:head>

<div class="mb-6 flex items-center justify-between">
	<h1 class="text-2xl font-bold text-gray-900">Mes événements</h1>
	<Button href="/admin/events/new" color="blue" pill>+ Créer un événement</Button>
</div>

{#if data.events.length === 0}
	<p class="text-gray-400 italic">Aucun événement pour le moment.</p>
{:else}
	<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
		{#each data.events as event}
			<Card class="transition-shadow hover:shadow-md">
				<div class="mb-2 flex items-start justify-between">
					<h2 class="font-semibold text-gray-900">{event.name}</h2>
					<Badge color={STATUS_COLORS[event.status]}>{STATUS_LABELS[event.status]}</Badge>
				</div>
				{#if event.starts_at || event.ends_at}
					<p class="text-sm text-gray-500">
						{formatDate(event.starts_at)}{#if event.starts_at && event.ends_at}
							→
						{/if}{formatDate(event.ends_at)}
					</p>
				{/if}
				{#if event.location}
					<p class="text-sm text-gray-500">{event.location}</p>
				{/if}
				<p class="mt-1 text-sm text-gray-400">{event.entity_name}</p>
				<p class="mt-2 text-xs text-gray-400">
					{event.tournament_count} tournoi{event.tournament_count !== 1 ? "s" : ""}
				</p>
				{#if event.status !== "finished"}
					<div class="mt-3 border-t border-gray-100 pt-3">
						<a
							href="/admin/events/{event.id}/edit"
							class="text-sm font-medium text-blue-600 hover:text-blue-800"
						>
							{event.status === "draft" ? "Reprendre l'édition →" : "Modifier →"}
						</a>
					</div>
				{/if}
			</Card>
		{/each}
	</div>
{/if}
