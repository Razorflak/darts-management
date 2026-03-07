<script lang="ts">
	import { Card, Button, Badge } from 'flowbite-svelte'
	import { CATEGORY_LABELS } from '$lib/tournament/labels'
	import type { PageData } from './$types'

	let { data }: { data: PageData } = $props()

	let openEvents = $state(data.openEvents)

	async function register(eventId: string, tournamentId: string) {
		const res = await fetch('/events/' + eventId + '/register', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ tournament_id: tournamentId })
		})
		if (res.ok) {
			const ev = openEvents.find((e) => e.event.id === eventId)
			if (ev) {
				const t = ev.tournaments.find((t) => t.id === tournamentId)
				if (t) {
					t.is_registered = true
					t.registration_count++
				}
			}
		}
	}

	function formatDate(d: Date): string {
		return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
	}
</script>

<svelte:head>
	<title>Tableau de bord — FFD Darts</title>
</svelte:head>

<h1 class="mb-4 text-2xl font-bold text-gray-900">
	Bonjour, {data.user?.name} !
</h1>

<p class="mb-8 text-gray-600">Bienvenue sur la plateforme de gestion des tournois FFD.</p>

<section>
	<h2 class="mb-4 text-xl font-semibold text-gray-800">Tournois disponibles</h2>

	{#if openEvents.length === 0}
		<p class="text-gray-500">Aucun tournoi ouvert aux inscriptions pour le moment.</p>
	{:else}
		<div class="flex flex-col gap-4">
			{#each openEvents as { event, tournaments } (event.id)}
				<Card>
					<div class="mb-3">
						<h3 class="text-lg font-bold text-gray-900">{event.name}</h3>
						<p class="text-sm text-gray-500">{event.entity_name}</p>
						<p class="mt-1 text-sm text-gray-600">
							{formatDate(event.starts_at)} – {formatDate(event.ends_at)}
						</p>
						{#if event.location}
							<p class="text-sm text-gray-600">{event.location}</p>
						{/if}
					</div>

					<div class="flex flex-col gap-2">
						{#each tournaments as t (t.id)}
							<div class="flex items-center justify-between rounded border border-gray-100 bg-gray-50 p-3">
								<div>
									<span class="font-medium text-gray-900">{t.name}</span>
									<Badge color="blue" class="ml-2">{CATEGORY_LABELS[t.category]}</Badge>
									<span class="ml-2 text-sm text-gray-500">{t.registration_count} inscrits</span>
								</div>
								<div>
									{#if t.is_registered}
										<Badge color="green">Inscrit ✓</Badge>
									{:else}
										<Button
											size="xs"
											color="primary"
											onclick={() => register(event.id, t.id)}
										>
											S'inscrire
										</Button>
									{/if}
								</div>
							</div>
						{/each}
					</div>
				</Card>
			{/each}
		</div>
	{/if}
</section>
