<script lang="ts">
	import { CATEGORY_LABELS } from "../labels.js"
	import { Label, Select, Toggle, Datepicker } from "flowbite-svelte"
	import PhasesBuilder from "./phases/PhasesBuilder.svelte"
	import TimeInput from "./TimeInput.svelte"
	import type {
		DraftTournament,
		Tournament,
		Category
	} from "$lib/server/schemas/event-schemas.js"
	import { untrack } from "svelte"
	import { extractTimeFromDate } from "../utils.js"

	interface Props {
		tournament: Tournament | DraftTournament
		onUpdate?: (updatedTournament: Tournament | DraftTournament) => void
	}

	let { tournament = $bindable(), onUpdate }: Props = $props()

	let startDateObj = $derived<Date | undefined>(tournament.start_at ?? undefined)

	let startTime = $state<string>(extractTimeFromDate(tournament.start_at ?? undefined))

	function updateCategory(newCategory: Category) {
		tournament.category = newCategory
		if (onUpdate) {
			onUpdate(tournament)
		}
	}

	$effect(() => {
		startTime
		untrack(() => {
			if (startTime) {
				const [hours, minutes] = startTime.split(":").map(Number)
				if (startDateObj) {
					startDateObj.setHours(hours, minutes)
					tournament.start_at = startDateObj
				}
			}
		})
	})

	const categories: Category[] = [
		"male",
		"female",
		"junior",
		"veteran",
		"open",
		"mix",
		"double",
		"double_female",
		"double_mix"
	]
</script>

<div class="space-y-6">
	<!-- Category -->
	<div>
		<Label for="tournament-category-{tournament.id}" class="mb-2">
			Catégorie <span class="text-red-500">*</span>
		</Label>
		<Select
			bind:value={tournament.category}
			onchange={(e) => {
				updateCategory((e.target as HTMLSelectElement).value as Category)
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
		<p class="mb-2 text-xs text-gray-400">
			Date optionnelle — si vide, même jour que l'événement
		</p>
		<div class="flex items-start gap-2">
			<div class="flex-1">
				<Datepicker
					bind:value={startDateObj}
					locale="fr-FR"
					firstDayOfWeek={1}
					placeholder="jj/mm/aaaa"
				/>
			</div>
			<TimeInput
				id="tournament-start-{tournament.id}"
				bind:value={startTime}
				bind:tournament
			/>
		</div>
	</div>

	<!-- Arbitrage automatique -->
	<div class="flex items-center gap-3">
		<Toggle id="auto-referee-{tournament.id}" bind:checked={tournament.auto_referee} />
		<Label for="auto-referee-{tournament.id}">Assignation automatique des arbitres</Label>
	</div>

	<!-- Check-in requis -->
	<div class="flex items-center gap-3">
		<Toggle id="check-in-{tournament.id}" bind:checked={tournament.check_in_required} />
		<Label for="check-in-{tournament.id}">Check-in requis avant le lancement</Label>
	</div>

	<!-- Phases -->
	<div>
		<h3 class="mb-3 font-semibold text-gray-700">Phases</h3>
		<PhasesBuilder bind:phases={tournament.phases} tournament_id={tournament.id} />
	</div>
</div>
