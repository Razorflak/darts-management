<script lang="ts">
	import { Card, Badge, Button } from 'flowbite-svelte'

	const STATUS_LABELS = {
		draft: 'Brouillon',
		ready: 'Ouvert',
		started: 'En cours',
		finished: 'Terminé',
	} as const

	const STATUS_COLORS = {
		draft: 'gray',
		ready: 'green',
		started: 'blue',
		finished: 'indigo',
	} as const

	function formatDate(dateStr: string): string {
		if (!dateStr) return '—'
		const d = new Date(dateStr + 'T00:00')
		return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
	}

	let { data } = $props()
</script>

<svelte:head>
	<title>Mes événements — FFD</title>
</svelte:head>

<div class="flex items-center justify-between mb-6">
	<h1 class="text-2xl font-bold text-gray-900">Mes événements</h1>
	<Button href="/events/new" color="blue" pill>+ Créer un événement</Button>
</div>

{#if data.events.length === 0}
	<p class="text-gray-400 italic">Aucun événement pour le moment.</p>
{:else}
	<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
		{#each data.events as event}
			<Card class="hover:shadow-md transition-shadow">
				<div class="flex items-start justify-between mb-2">
					<h2 class="font-semibold text-gray-900">{event.name}</h2>
					<Badge color={STATUS_COLORS[event.status]}>{STATUS_LABELS[event.status]}</Badge>
				</div>
				<p class="text-sm text-gray-500">
					{formatDate(event.starts_at)} → {formatDate(event.ends_at)}
				</p>
				{#if event.location}
					<p class="text-sm text-gray-500">{event.location}</p>
				{/if}
				<p class="text-sm text-gray-400 mt-1">{event.entity_name}</p>
				<p class="text-xs text-gray-400 mt-2">
					{event.tournament_count} tournoi{event.tournament_count !== 1 ? 's' : ''}
				</p>
			</Card>
		{/each}
	</div>
{/if}
