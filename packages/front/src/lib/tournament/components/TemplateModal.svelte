<script lang="ts">
	import type { EventData, Tournament, Phase, GroupPhase, EliminationPhase } from '../types.js'
	import type { EventTemplate, PhaseTemplate } from '../templates.js'
	import { EVENT_TEMPLATES } from '../templates.js'
	import { genId, toLocalDateISO } from '../utils.js'
	import { Button, Datepicker, Modal } from 'flowbite-svelte'

	interface Props {
		open: boolean
		onApply: (event: EventData, tournaments: Tournament[]) => void
	}

	let { open = $bindable(false), onApply }: Props = $props()

	let selectedId = $state<string | null>(null)
	let startDateObj = $state<Date | undefined>(undefined)

	let selectedTemplate = $derived(EVENT_TEMPLATES.find((t) => t.id === selectedId) ?? null)

	function addDays(date: Date, days: number): Date {
		const d = new Date(date)
		d.setDate(d.getDate() + days)
		return d
	}

	function buildPhase(p: PhaseTemplate): Phase {
		if (p.type === 'round_robin' || p.type === 'double_loss_groups') {
			const gp: GroupPhase = {
				id: genId(),
				type: p.type,
				entrants: p.entrants,
				qualifiers: p.qualifiers,
				playersPerGroup: p.playersPerGroup,
			}
			return gp
		}
		if (p.type === 'single_elim' || p.type === 'double_elim') {
			const ep: EliminationPhase = {
				id: genId(),
				type: p.type,
				entrants: p.entrants,
				tiers: p.tiers.map((t) => ({ id: genId(), round: t.round, legs: t.legs })),
			}
			return ep
		}
		throw new Error(`Unknown phase type: ${(p as PhaseTemplate).type}`)
	}

	function apply() {
		if (!selectedTemplate || !startDateObj) return

		const startDate = toLocalDateISO(startDateObj)
		const endDate = toLocalDateISO(addDays(startDateObj, selectedTemplate.durationDays - 1))

		const newEvent: EventData = {
			name: selectedTemplate.title,
			entity: selectedTemplate.entity,
			startDate,
			startTime: '',
			endDate,
			location: selectedTemplate.location,
		}

		const newTournaments: Tournament[] = selectedTemplate.tournaments.map((t) => ({
			id: genId(),
			name: t.name,
			club: '',
			quota: t.quota,
			category: t.category,
			startTime: t.startTime,
			startDate: toLocalDateISO(addDays(startDateObj!, t.dayOffset ?? 0)),
			phases: t.phases.map(buildPhase),
			autoReferee: false,
		}))

		onApply(newEvent, newTournaments)
		open = false
	}

	// Reset selection when modal closes
	$effect(() => {
		if (!open) {
			selectedId = null
			startDateObj = undefined
		}
	})
</script>

<Modal bind:open title="Créer à partir d'un template" size="lg" outsideclose>
	<div class="space-y-4">
		<!-- Template list -->
		<div class="space-y-3">
			{#each EVENT_TEMPLATES as template}
				<button
					type="button"
					onclick={() => (selectedId = template.id)}
					class="w-full rounded-lg border p-4 text-left transition-colors {selectedId ===
					template.id
						? 'border-blue-500 bg-blue-50'
						: 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}"
				>
					<p class="font-medium text-gray-900">{template.title}</p>
					<p class="mt-0.5 text-sm text-gray-500">
						{template.entity} · {template.durationDays} jour{template.durationDays > 1
							? 's'
							: ''}
					</p>
					<p class="mt-1 text-sm text-gray-400">{template.summary}</p>
				</button>
			{/each}
		</div>

		<!-- Date picker — shown once a template is selected -->
			<div class="flex flex-row border-t border-gray-100 pt-4">
				<p class="mb-2 text-sm font-medium text-gray-700">
					Date de début de la compétition <span class="text-red-500">*</span>
				</p>
				<Datepicker
					bind:value={startDateObj}
					inline={true}
					locale="fr-FR"
					firstDayOfWeek={1}
					placeholder="jj/mm/aaaa"
				/>
			</div>
	</div>

	{#snippet footer()}
		<Button color="blue" pill onclick={apply} disabled={!selectedTemplate || !startDateObj}>
			Appliquer le template
		</Button>
		<Button color="alternative" pill onclick={() => (open = false)}>Annuler</Button>
	{/snippet}
</Modal>
