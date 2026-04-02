<script lang="ts">
import { Button } from "flowbite-svelte"
import { CloseOutline, PlusOutline } from "flowbite-svelte-icons"
import type { DraftTournament } from "$lib/server/schemas/event-schemas.js"
import { CATEGORY_LABELS } from "../labels.js"
import { createBlankTournament } from "../utils.js"

interface Props {
	tournaments: DraftTournament[]
	activeId: string
	onSelect: (id: string) => void
}

let { tournaments = $bindable(), activeId, onSelect }: Props = $props()

function addTournament() {
	const t = createBlankTournament()
	tournaments = [...tournaments, t]
	onSelect(t.id)
}

function removeTournament(id: string) {
	const idx = tournaments.findIndex((t) => t.id === id)
	tournaments = tournaments.filter((t) => t.id !== id)
	if (activeId === id && tournaments.length > 0) {
		const next = tournaments[Math.max(0, idx - 1)]
		if (next) onSelect(next.id)
	}
}
</script>

<div class="flex flex-wrap items-center gap-2 overflow-x-auto pb-1">
	{#each tournaments as t (`${t.id}-${t.category ?? "new"}`)}
		{@const label = t.category ? CATEGORY_LABELS[t.category] : "Nouveau tournoi"}
		<div class="group flex shrink-0 items-center gap-1">
			<Button
				size="sm"
				color={activeId === t.id ? "blue" : "alternative"}
				pill
				onclick={() => onSelect(t.id)}
				title={label}
			>
				{label}
				{#if tournaments.length > 1}
					<button
						type="button"
						onclick={(e) => {
							e.stopPropagation()
							removeTournament(t.id)
						}}
						class="ms-1.5 -me-1 rounded-full p-0.5 transition-colors hover:bg-black/10"
						aria-label="Supprimer ce tournoi"
					>
						<CloseOutline class="h-3.5 w-3.5" />
					</button>
				{/if}
			</Button>
		</div>
	{/each}

	<Button
		size="sm"
		color="alternative"
		pill
		outline
		onclick={addTournament}
		title="Ajouter un tournoi"
	>
		<PlusOutline class="me-1.5 h-4 w-4" />
		Ajouter un tournoi
	</Button>
</div>
