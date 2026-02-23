<script lang="ts">
	import type { EventData } from '../types.js'
	import { Button, Datepicker, Label, Select } from 'flowbite-svelte'
	import TimeInput from './TimeInput.svelte'

	interface Props {
		event: EventData
		onNext: () => void
		onCancel: () => void
	}

	let { event = $bindable(), onNext, onCancel }: Props = $props()

	// Datepicker travaille avec des objets Date ; on convertit depuis/vers string ISO
	let startDateObj = $state<Date | undefined>(
		event.startDate ? new Date(event.startDate + 'T00:00') : undefined,
	)
	let endDateObj = $state<Date | undefined>(
		event.endDate ? new Date(event.endDate + 'T00:00') : undefined,
	)

	$effect(() => {
		event.startDate = startDateObj ? startDateObj.toISOString().slice(0, 10) : ''
	})
	$effect(() => {
		event.endDate = endDateObj ? endDateObj.toISOString().slice(0, 10) : ''
	})

	// Mock entities — will come from auth/API later
	const entities = ['Mon Comité', 'Ma Ligue', 'FFD']

	function handleSubmit(e: SubmitEvent) {
		e.preventDefault()
		onNext()
	}
</script>

<form onsubmit={handleSubmit} class="space-y-6" novalidate>
	<!-- Nom -->
	<div>
		<Label for="event-name" class="mb-2">
			Nom de l'événement <span class="text-red-500">*</span>
		</Label>
		<input
			id="event-name"
			type="text"
			bind:value={event.name}
			required
			placeholder="ex : Comité Berry Mai 2026"
			class="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-gray-900 focus:border-blue-500 focus:ring-blue-500"
		/>
	</div>

	<!-- Entité -->
	<div>
		<Label for="event-entity" class="mb-2">
			Entité organisatrice <span class="text-red-500">*</span>
		</Label>
		<Select id="event-entity" bind:value={event.entity} placeholder="Choisissez une option..." required>
			<option value="" disabled>Sélectionner une entité</option>
			{#each entities as entity}
				<option value={entity}>{entity}</option>
			{/each}
		</Select>
	</div>

	<!-- Dates -->
	<div class="grid grid-cols-1 gap-5 sm:grid-cols-2">
		<div>
			<Label class="mb-2">
				Date de début <span class="text-red-500">*</span>
			</Label>
			<div class="flex gap-2">
				<div class="min-w-0 flex-1">
					<Datepicker
						bind:value={startDateObj}
						locale="fr-FR"
						firstDayOfWeek={1}
						placeholder="jj/mm/aaaa"
						required
					/>
				</div>
				<TimeInput
					bind:value={event.startTime}
					id="event-start-time"
					aria-label="Heure de début"
				/>
			</div>
		</div>
		<div>
			<Label class="mb-2">
				Date de fin <span class="text-red-500">*</span>
			</Label>
			<div class="flex gap-2">
				<div class="min-w-0 flex-1">
					<Datepicker
						bind:value={endDateObj}
						locale="fr-FR"
						firstDayOfWeek={1}
						placeholder="jj/mm/aaaa"
						required
					/>
				</div>
				<TimeInput
					bind:value={event.endTime}
					id="event-end-time"
					aria-label="Heure de fin"
				/>
			</div>
		</div>
	</div>

	<!-- Lieu -->
	<div>
		<Label for="event-location" class="mb-2">
			Lieu <span class="text-red-500">*</span>
		</Label>
		<input
			id="event-location"
			type="text"
			bind:value={event.location}
			required
			placeholder="ex : Bourges"
			class="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-gray-900 focus:border-blue-500 focus:ring-blue-500"
		/>
	</div>

	<!-- Actions -->
	<div class="flex justify-between pt-2">
		<Button type="button" color="alternative" pill onclick={onCancel}>Annuler</Button>
		<Button type="submit" color="blue" pill>Suivant →</Button>
	</div>
</form>
