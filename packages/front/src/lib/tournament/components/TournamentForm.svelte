<script lang="ts">
	import type { Tournament, Category } from '../types.js'
	import { CATEGORY_LABELS } from '../labels.js'
	import { toLocalDateISO } from '../utils.js'
	import { Input, Label, Select, Toggle, Datepicker } from 'flowbite-svelte'
	import PhasesBuilder from './phases/PhasesBuilder.svelte'
	import TimeInput from './TimeInput.svelte'

	interface Props {
		tournament: Tournament
	}

	let { tournament = $bindable() }: Props = $props()

	// Datepicker works with Date objects; convert from/to ISO strings (local timezone safe)
	let startDateObj = $state<Date | undefined>(
		tournament.startDate ? new Date(tournament.startDate + 'T00:00') : undefined,
	)

	// Inbound sync: tournament.startDate prop → local Date (handles external reassignment)
	$effect(() => {
		const propIso = tournament.startDate || ''
		const localIso = startDateObj ? toLocalDateISO(startDateObj) : ''
		if (propIso !== localIso) {
			startDateObj = propIso ? new Date(propIso + 'T00:00') : undefined
		}
	})

	// Outbound sync: local Date → tournament.startDate (undefined when no date selected)
	$effect(() => {
		tournament.startDate = startDateObj ? toLocalDateISO(startDateObj) : undefined
	})

	const categories: Category[] = [
		'male',
		'female',
		'junior',
		'veteran',
		'open',
		'mix',
		'double',
		'double_female',
		'double_mix',
	]
</script>

<div class="space-y-6">
	<!-- Name + quota -->
	<div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
		<div class="sm:col-span-2">
			<Label for="tournament-name-{tournament.id}" class="mb-2">
				Nom du tournoi <span class="text-red-500">*</span>
			</Label>
			<Input
				id="tournament-name-{tournament.id}"
				type="text"
				bind:value={tournament.name}
				required
				placeholder="ex : Double Matin"
			/>
		</div>
		<div>
			<Label for="tournament-quota-{tournament.id}" class="mb-2">
				Nombre de places <span class="text-red-500">*</span>
			</Label>
			<Input
				id="tournament-quota-{tournament.id}"
				type="number"
				bind:value={tournament.quota}
				min="2"
				max="4096"
				required
			/>
		</div>
	</div>

	<!-- Category -->
	<div>
		<Label for="tournament-category-{tournament.id}" class="mb-2">
			Catégorie <span class="text-red-500">*</span>
		</Label>
		<Select
			id="tournament-category-{tournament.id}"
			required
			value={tournament.category ?? ''}
			onchange={(e) => {
				const v = (e.currentTarget as HTMLSelectElement).value
				tournament.category = (v || null) as Category | null
			}}
		>
			<option value="" disabled>Choisissez une catégorie</option>
			{#each categories as cat}
				<option value={cat}>{CATEGORY_LABELS[cat]}</option>
			{/each}
		</Select>
	</div>

	<!-- Date et heure de début -->
	<div>
		<Label class="mb-2">Date et heure de début</Label>
		<p class="mb-2 text-xs text-gray-400">Date optionnelle — si vide, même jour que l'événement</p>
		<div class="flex items-start gap-2">
			<div class="flex-1">
				<Datepicker
					bind:value={startDateObj}
					locale="fr-FR"
					firstDayOfWeek={1}
					placeholder="jj/mm/aaaa"
				/>
			</div>
			<TimeInput id="tournament-start-{tournament.id}" bind:value={tournament.startTime} />
		</div>
	</div>

	<!-- Arbitrage automatique -->
	<div class="flex items-center gap-3">
		<Toggle
			id="auto-referee-{tournament.id}"
			bind:checked={tournament.autoReferee}
		/>
		<Label for="auto-referee-{tournament.id}">
			Assignation automatique des arbitres
		</Label>
	</div>

	<!-- Phases -->
	<div>
		<h3 class="mb-3 font-semibold text-gray-700">Phases</h3>
		<PhasesBuilder bind:phases={tournament.phases} />
	</div>
</div>
