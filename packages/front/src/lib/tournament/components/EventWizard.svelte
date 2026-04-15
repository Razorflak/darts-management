<script lang="ts">
import { Button } from "flowbite-svelte"
import { goto } from "$app/navigation"
import { apiRoutes } from "$lib/fetch/api"
import type {
	DraftEvent,
	DraftTournament,
	Entity,
	Event,
} from "$lib/server/schemas/event-schemas.js"
import { generateUuid } from "$lib/utils/uuid"
import type { WizardStep } from "../types.js"
import { createBlankTournament, toLocalDateISO } from "../utils.js"
import Breadcrumb from "./Breadcrumb.svelte"
import EventStep from "./EventStep.svelte"
import PublishStep from "./PublishStep.svelte"
import TemplateModal from "./TemplateModal.svelte"
import TournamentStep from "./TournamentStep.svelte"

type Props = {
	entities: Entity[]
	event?: Event | DraftEvent
	eventStatus?: "draft" | "ready" | "started" | "finished"
	mode: "create" | "edit"
	pageTitle: string
	cancelHref: string
}

let {
	entities,
	event: initialEvent,
	eventStatus,
	mode,
	pageTitle,
	cancelHref,
}: Props = $props()

let step = $state<WizardStep>(1)
let saving = $state(false)
let saveError = $state<string | null>(null)
let templateModalOpen = $state(false)

let event = $state<Event | DraftEvent>(
	initialEvent ?? {
		id: generateUuid(),
		status: "draft" as const,
		name: "",
		location: "",
		tournaments: [createBlankTournament()] as DraftTournament[],
	},
)

function applyTemplate(newEvent: DraftEvent) {
	event = newEvent
}

async function save() {
	if (!event.name?.trim()) {
		saveError = "Le nom de l'événement est requis pour enregistrer."
		return
	}
	if (mode === "create" && !("entity" in event && event.entity)) {
		saveError = "L'entité de l'événement est requise pour enregistrer."
		return
	}
	saving = true
	saveError = null
	try {
		const s = (d: Date | undefined) => (d ? toLocalDateISO(d) : undefined)
		const res = await fetch(apiRoutes.EVENT_SAVE.path, {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({
				...event,
				starts_at: s((event as DraftEvent).starts_at),
				ends_at: s((event as DraftEvent).ends_at),
				registration_opens_at: s((event as DraftEvent).registration_opens_at),
			}),
		})
		const json = await res.json()
		if (res.ok) {
			await goto("/admin/events")
		} else {
			saveError = json.error ?? "Erreur lors de la sauvegarde."
		}
	} catch {
		saveError = "Erreur réseau lors de la sauvegarde."
	} finally {
		saving = false
	}
}
</script>

<div class="mx-auto max-w-3xl">
	<div class="mb-6">
		<h1 class="page-title">{pageTitle}</h1>
	</div>

	{#if saveError}
		<p
			class="mb-4 text-sm"
			style="color: var(--color-error, oklch(55% 0.2 25));"
		>
			{saveError}
		</p>
	{/if}

	<!-- Stepper wizard -->
	<div class="mb-6"><Breadcrumb {step} onStepClick={(s) => (step = s)} /></div>

	<!-- Contenu de l'étape -->
	<div class="app-card p-6">
		{#if step === 1}
			<div
				class="mb-5 flex items-center justify-between border-b pb-4"
				style="border-color: var(--color-border);"
			>
				<p class="text-sm" style="color: oklch(55% 0.01 264);">
					Remplissez les informations de l'événement
				</p>
				<Button
					color="alternative"
					size="sm"
					pill
					onclick={() => (templateModalOpen = true)}
				>
					Créer depuis un template
				</Button>
			</div>
			<EventStep
				bind:event
				{entities}
				onNext={() => (step = 2)}
				onCancel={() => goto(cancelHref)}
				readonly={eventStatus === "started"}
			/>
		{:else if step === 2}
			<TournamentStep
				bind:tournaments={event.tournaments as DraftTournament[]}
				onPrev={() => (step = 1)}
				onNext={() => (step = 3)}
			/>
		{:else}
			<PublishStep
				{event}
				{eventStatus}
				onPrev={() => (step = 2)}
				onSave={save}
				saveError={saveError ?? undefined}
			/>
		{/if}
	</div>
</div>

<TemplateModal bind:open={templateModalOpen} onApply={applyTemplate} />
