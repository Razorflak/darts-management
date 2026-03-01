<script lang="ts">
	import type { WizardStep, EventData, Tournament } from '$lib/tournament/types.js'
	import Breadcrumb from '$lib/tournament/components/Breadcrumb.svelte'
	import EventStep from '$lib/tournament/components/EventStep.svelte'
	import TournamentStep from '$lib/tournament/components/TournamentStep.svelte'
	import PublishStep from '$lib/tournament/components/PublishStep.svelte'
	import TemplateModal from '$lib/tournament/components/TemplateModal.svelte'
	import { Button } from 'flowbite-svelte'
	import { goto } from '$app/navigation'

	let { data } = $props()

	let step = $state<WizardStep>(1)
	let eventId = $state<string | null>(data.eventId) // Pre-set → all saves use UPDATE path
	let saving = $state(false)
	let saveError = $state<string | null>(null)
	let publishError = $state<string | null>(null)

	let event = $state<EventData>(data.event) // Pre-populated from DB
	let tournaments = $state<Tournament[]>(data.tournaments) // Pre-populated from DB

	let templateModalOpen = $state(false)

	function applyTemplate(newEvent: EventData, newTournaments: Tournament[]) {
		event = newEvent
		tournaments = newTournaments
	}

	async function save() {
		if (!event.name?.trim()) {
			saveError = "Le nom de l'événement est requis pour enregistrer."
			return
		}
		saving = true
		saveError = null
		try {
			const res = await fetch('/events/new/save', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ eventId, event, tournaments }),
			})
			const json = await res.json()
			if (res.ok) {
				eventId = json.eventId
			} else {
				saveError = json.error ?? 'Erreur lors de la sauvegarde.'
			}
		} catch {
			saveError = 'Erreur réseau lors de la sauvegarde.'
		} finally {
			saving = false
		}
	}

	async function publish() {
		publishError = null
		saving = true
		try {
			const res = await fetch('/events/new/publish', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ eventId, event, tournaments }),
			})
			const json = await res.json()
			if (res.ok) {
				await goto('/events')
			} else {
				publishError = json.error ?? 'Erreur lors de la publication.'
			}
		} catch {
			publishError = 'Erreur réseau lors de la publication.'
		} finally {
			saving = false
		}
	}
</script>

<svelte:head>
	<title>Modifier l'événement — FFD</title>
</svelte:head>

<div class="min-h-screen bg-surface px-4 py-8 sm:px-6">
	<div class="mx-auto max-w-3xl">
		<div class="mb-8">
			<a
				href="/events"
				class="mb-4 inline-flex items-center gap-1 text-sm text-gray-400 transition-colors hover:text-gray-600"
			>
				<svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
					<path
						fill-rule="evenodd"
						d="M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 0 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z"
						clip-rule="evenodd"
					/>
				</svg>
				Mes événements
			</a>

			<div class="flex items-center justify-between">
				<h1 class="mb-6 text-2xl font-bold text-gray-900">Modifier l'événement</h1>
				<Button color="alternative" size="sm" pill onclick={save} disabled={saving}>
					{saving ? 'Enregistrement...' : 'Enregistrer'}
				</Button>
			</div>

			{#if saveError}
				<p class="mb-3 text-sm text-red-600">{saveError}</p>
			{/if}

			<Breadcrumb {step} onStepClick={(s) => (step = s)} />
		</div>

		<div class="rounded-card border border-border bg-white p-6 shadow-card">
			{#if step === 1}
				<div class="mb-5 flex items-center justify-between border-b border-gray-100 pb-4">
					<p class="text-sm text-gray-500">Remplissez les informations de l'événement</p>
					<Button color="alternative" size="sm" pill onclick={() => (templateModalOpen = true)}>
						Créer depuis un template
					</Button>
				</div>
				<EventStep
					bind:event
					entities={data.entities}
					onNext={() => (step = 2)}
					onCancel={() => goto('/events')}
					readonly={data.eventStatus === 'started'}
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
					eventStatus={data.eventStatus}
					onPrev={() => (step = 2)}
					onPublish={publish}
					publishError={publishError ?? undefined}
				/>
			{/if}
		</div>
	</div>
</div>

<TemplateModal bind:open={templateModalOpen} onApply={applyTemplate} />
