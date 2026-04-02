<script lang="ts">
import { Button, Datepicker, Label, Select } from "flowbite-svelte"
import type {
	DraftEvent,
	Entity,
	Event,
} from "$lib/server/schemas/event-schemas.js"

interface Props {
	event: DraftEvent | Event
	entities: Entity[]
	onNext: () => void
	onCancel: () => void
	readonly?: boolean
}

let {
	event: eventProp = $bindable(),
	entities,
	onNext,
	onCancel,
	readonly = false,
}: Props = $props()

let event = $state(eventProp)
$effect(() => {
	event = eventProp
})
$effect(() => {
	eventProp = event
})

function handleSubmit(e: SubmitEvent) {
	e.preventDefault()
	onNext()
}
</script>

{#if readonly}
	<div
		class="mb-4 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-2 text-sm text-yellow-800"
	>
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
		<Select
			id="event-entity"
			value={event.entity?.id ?? ""}
			onchange={(e) => {
				const found = entities.find((ent) => ent.id === e.currentTarget.value)
				if (found) event.entity = found
			}}
			placeholder="Choisissez une option..."
			required
			disabled={readonly}
		>
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
						bind:value={event.starts_at}
						locale="fr-FR"
						firstDayOfWeek={1}
						placeholder="jj/mm/aaaa"
						required
						disabled={readonly}
					/>
				</div>
			</div>
		</div>
		<div>
			<Label class="mb-2">
				Date de fin <span class="text-red-500">*</span>
			</Label>
			<Datepicker
				bind:value={event.ends_at}
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
			bind:value={event.registration_opens_at}
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
