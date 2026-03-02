<script lang="ts">
	import type { EventData } from '../types.js'
	import { toLocalDateISO } from '../utils.js'
	import { Button, Datepicker, Label, Select } from 'flowbite-svelte'
	import TimeInput from './TimeInput.svelte'

	interface Props {
		event: EventData
		entities: { id: string; name: string; type: string }[]
		onNext: () => void
		onCancel: () => void
		readonly?: boolean
	}

	let { event = $bindable(), entities, onNext, onCancel, readonly = false }: Props = $props()

	// Datepicker works with Date objects; convert from/to ISO strings
	let startDateObj = $state<Date | undefined>(
		event.startDate ? new Date(event.startDate + 'T00:00') : undefined,
	)
	let endDateObj = $state<Date | undefined>(
		event.endDate ? new Date(event.endDate + 'T00:00') : undefined,
	)
	let registrationDateObj = $state<Date | undefined>(
		event.registrationOpensAt ? new Date(event.registrationOpensAt + 'T00:00') : undefined,
	)

	// Inbound sync: event prop → local Date (handles external reassignment e.g. applyTemplate)
	$effect(() => {
		const propIso = event.startDate || ''
		const localIso = startDateObj ? toLocalDateISO(startDateObj) : ''
		if (propIso !== localIso) {
			startDateObj = propIso ? new Date(propIso + 'T00:00') : undefined
		}
	})
	$effect(() => {
		const propIso = event.endDate || ''
		const localIso = endDateObj ? toLocalDateISO(endDateObj) : ''
		if (propIso !== localIso) {
			endDateObj = propIso ? new Date(propIso + 'T00:00') : undefined
		}
	})
	$effect(() => {
		const propIso = event.registrationOpensAt || ''
		const localIso = registrationDateObj ? toLocalDateISO(registrationDateObj) : ''
		if (propIso !== localIso) {
			registrationDateObj = propIso ? new Date(propIso + 'T00:00') : undefined
		}
	})

	// Outbound sync: local Date → event prop (handles user picking a date in the Datepicker)
	$effect(() => {
		event.startDate = startDateObj ? toLocalDateISO(startDateObj) : ''
	})
	$effect(() => {
		event.endDate = endDateObj ? toLocalDateISO(endDateObj) : ''
	})
	$effect(() => {
		event.registrationOpensAt = registrationDateObj ? toLocalDateISO(registrationDateObj) : undefined
	})

	function handleSubmit(e: SubmitEvent) {
		e.preventDefault()
		onNext()
	}
</script>

{#if readonly}
	<div class="mb-4 rounded-lg bg-yellow-50 border border-yellow-200 px-4 py-2 text-sm text-yellow-800">
		Événement démarré — les informations de l'événement sont en lecture seule.
	</div>
{/if}

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
			disabled={readonly}
			placeholder="ex : Comité Berry Mai 2026"
			class="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-gray-900 focus:border-blue-500 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
		/>
	</div>

	<!-- Entité -->
	<div>
		<Label for="event-entity" class="mb-2">
			Entité organisatrice <span class="text-red-500">*</span>
		</Label>
		<Select id="event-entity" bind:value={event.entity} placeholder="Choisissez une option..." required disabled={readonly}>
			<option value="" disabled>Sélectionner une entité</option>
			{#each entities as entity}
				<option value={entity.id}>{entity.name}</option>
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
						disabled={readonly}
					/>
				</div>
				<TimeInput
					bind:value={event.startTime}
					id="event-start-time"
					aria-label="Heure de début"
					disabled={readonly}
				/>
			</div>
		</div>
		<div>
			<Label class="mb-2">
				Date de fin <span class="text-red-500">*</span>
			</Label>
			<Datepicker
				bind:value={endDateObj}
				locale="fr-FR"
				firstDayOfWeek={1}
				placeholder="jj/mm/aaaa"
				required
				disabled={readonly}
			/>
		</div>
	</div>

	<!-- Ouverture des inscriptions -->
	<div>
		<Label class="mb-2">Ouverture des inscriptions</Label>
		<p class="mb-2 text-xs text-gray-400">Optionnel — si vide, ouvertes dès la publication</p>
		<Datepicker
			value={registrationDateObj}
			onselect={(d) => { registrationDateObj = d instanceof Date ? d : undefined }}
			locale="fr-FR"
			firstDayOfWeek={1}
			placeholder="jj/mm/aaaa"
			disabled={readonly}
		/>
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
			disabled={readonly}
			placeholder="ex : Bourges"
			class="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-gray-900 focus:border-blue-500 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
		/>
	</div>

	<!-- Actions -->
	<div class="flex justify-between pt-2">
		<Button type="button" color="alternative" pill onclick={onCancel}>Annuler</Button>
		<Button type="submit" color="blue" pill>Suivant →</Button>
	</div>
</form>
