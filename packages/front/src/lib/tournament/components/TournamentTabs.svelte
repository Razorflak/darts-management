<script lang="ts">
import type { DraftTournament } from "$lib/server/schemas/event-schemas.js"
import { CATEGORY_LABELS } from "../labels.js"
import { createBlankTournament } from "../utils.js"
import { Button } from "flowbite-svelte"

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
						<svg
							class="h-3.5 w-3.5"
							viewBox="0 0 20 20"
							fill="currentColor"
							aria-hidden="true"
						>
							<path
								d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z"
							/>
						</svg>
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
		<svg class="me-1.5 h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
			<path
				d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z"
			/>
		</svg>
		Ajouter un tournoi
	</Button>
</div>
