<script lang="ts">
	import type { Tournament, Category } from '../types.js'
	import { CATEGORY_LABELS } from '../labels.js'
	import { Input, Label, Select, Toggle } from 'flowbite-svelte'
	import PhasesBuilder from './phases/PhasesBuilder.svelte'
	import TimeInput from './TimeInput.svelte'

	interface Props {
		tournament: Tournament
	}

	let { tournament = $bindable() }: Props = $props()

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

	<!-- Start time -->
	<div class="max-w-xs">
		<Label for="tournament-start-{tournament.id}" class="mb-2">Heure de début</Label>
		<TimeInput id="tournament-start-{tournament.id}" bind:value={tournament.startTime} />
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
