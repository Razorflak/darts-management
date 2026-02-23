<script lang="ts">
	import type { Tournament, Category } from '../types.js'
	import { CATEGORY_LABELS } from '../labels.js'
	import { Input, Label, Radio } from 'flowbite-svelte'
	import PhasesBuilder from './phases/PhasesBuilder.svelte'
	import TimeInput from './TimeInput.svelte'

	interface Props {
		tournament: Tournament
	}

	let { tournament = $bindable() }: Props = $props()

	const categories: Category[] = ['male', 'female', 'junior', 'veteran', 'open', 'mix']
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
		<p class="mb-3 font-medium text-gray-700">
			Catégorie <span class="text-red-500">*</span>
		</p>
		<div class="flex flex-wrap gap-3">
			{#each categories as cat}
				<Radio
					name="category-{tournament.id}"
					value={cat}
					bind:group={tournament.category}
					color="blue"
				>
					{CATEGORY_LABELS[cat]}
				</Radio>
			{/each}
		</div>
	</div>

	<!-- Time range -->
	<div class="grid grid-cols-2 gap-4">
		<div>
			<Label for="tournament-start-{tournament.id}" class="mb-2">Heure de début</Label>
			<TimeInput
				id="tournament-start-{tournament.id}"
				bind:value={tournament.startTime}
			/>
		</div>
		<div>
			<Label for="tournament-end-{tournament.id}" class="mb-2">Heure de fin</Label>
			<TimeInput
				id="tournament-end-{tournament.id}"
				bind:value={tournament.endTime}
			/>
		</div>
	</div>

	<!-- Phases -->
	<div>
		<h3 class="mb-3 font-semibold text-gray-700">Phases</h3>
		<PhasesBuilder bind:phases={tournament.phases} />
	</div>
</div>
