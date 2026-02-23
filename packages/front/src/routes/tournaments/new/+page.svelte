<script lang="ts">
	import type { WizardStep, EventData, Tournament, PublishOptions } from '$lib/tournament/types.js'
	import { createTournament } from '$lib/tournament/utils.js'
	import Breadcrumb from '$lib/tournament/components/Breadcrumb.svelte'
	import EventStep from '$lib/tournament/components/EventStep.svelte'
	import TournamentStep from '$lib/tournament/components/TournamentStep.svelte'
	import PublishStep from '$lib/tournament/components/PublishStep.svelte'
	import { goto } from '$app/navigation'

	let step = $state<WizardStep>(1)

	let event = $state<EventData>({
		name: '',
		entity: '',
		startDate: '',
		startTime: '',
		endDate: '',
		endTime: '',
		location: '',
	})

	let tournaments = $state<Tournament[]>([createTournament()])

	let publishOptions = $state<PublishOptions>({
		notifications: false,
		openRegistrations: false,
	})

	function publish() {
		// TODO: submit to API
		console.log('Publish', JSON.stringify({ event, tournaments, publishOptions }))
		goto('/')
	}
</script>

<svelte:head>
	<title>Créer un événement — FFD</title>
</svelte:head>

<div class="min-h-screen bg-surface px-4 py-8 sm:px-6">
	<div class="mx-auto max-w-3xl">
		<!-- Header -->
		<div class="mb-8">
			<a href="/" class="mb-4 inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 transition-colors">
				<svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
					<path
						fill-rule="evenodd"
						d="M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z"
						clip-rule="evenodd"
					/>
				</svg>
				Accueil
			</a>

			<h1 class="mb-6 text-2xl font-bold text-gray-900">Nouvel événement</h1>

			<Breadcrumb {step} />
		</div>

		<!-- Step content -->
		<div class="rounded-card border border-border bg-white p-6 shadow-card">
			{#if step === 1}
				<EventStep
					bind:event
					onNext={() => (step = 2)}
					onCancel={() => goto('/')}
				/>
			{:else if step === 2}
				<TournamentStep
					bind:tournaments
					onPrev={() => (step = 1)}
					onNext={() => (step = 3)}
				/>
			{:else}
				<PublishStep
					{event}
					{tournaments}
					bind:options={publishOptions}
					onPrev={() => (step = 2)}
					onPublish={publish}
				/>
			{/if}
		</div>
	</div>
</div>
