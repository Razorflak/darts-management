<script lang="ts">
import { Button, Datepicker, Modal } from "flowbite-svelte"
import type { DraftEvent } from "$lib/server/schemas/event-schemas.js"
import { gendUuidv7 } from "$lib/utils/uuid.js"
import { EVENT_TEMPLATES } from "../templates.js"

interface Props {
	open: boolean
	onApply: (event: DraftEvent) => void
}

let { open = $bindable(false), onApply }: Props = $props()

let selectedId = $state<string | null>(null)
let startDateObj = $state<Date | undefined>(undefined)

let selectedTemplate = $derived(
	EVENT_TEMPLATES.find((t) => t.id === selectedId) ?? null,
)

function addDays(date: Date, days: number): Date {
	const d = new Date(date)
	d.setDate(d.getDate() + days)
	return d
}

function setTimeToDate(templateDate: Date, eventDate: Date): Date {
	const result = new Date(eventDate)
	// Ajouter le décalage de jours (templateDate day - 1)
	const dayOffset = templateDate.getDate() - 1
	result.setDate(result.getDate() + dayOffset)

	// Appliquer l'heure du template
	result.setHours(
		templateDate.getHours(),
		templateDate.getMinutes(),
		templateDate.getSeconds(),
		templateDate.getMilliseconds(),
	)
	return result
}

function apply() {
	if (!selectedTemplate || !startDateObj) return

	const startDate = startDateObj
	const endDate = new Date(startDateObj)
	endDate.setDate(startDateObj.getDate() + selectedTemplate.durationDays - 1)
	const draftEvent = selectedTemplate.event

	// Création de tous les id
	draftEvent.id = gendUuidv7()
	draftEvent.tournaments?.forEach((t) => {
		const tournamentId = gendUuidv7()
		t.id = tournamentId
		t.start_at = t.start_at ? setTimeToDate(t.start_at, startDate) : startDate
		t.phases?.forEach((p) => {
			p.id = gendUuidv7()
			p.tournament_id = tournamentId
		})
	})

	// Reglages des dates
	draftEvent.starts_at = startDate
	draftEvent.ends_at = endDate
	draftEvent.registration_opens_at = addDays(startDate, -7) // Ouvre les inscriptions 7 jours avant le début de l'événement

	onApply(draftEvent)
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
						{template.title} · {template.durationDays} jour{template.durationDays > 1
							? "s"
							: ""}
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
