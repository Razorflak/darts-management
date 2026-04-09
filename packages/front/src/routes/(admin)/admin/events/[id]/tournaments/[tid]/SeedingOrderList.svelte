<script lang="ts">
import { apiRoutes } from "$lib/fetch/api"
import type { RosterEntry } from "$lib/server/schemas/event-schemas.js"

let {
	roster,
	tournamentId,
}: {
	roster: RosterEntry[]
	tournamentId: string
} = $props()

// svelte-ignore state_referenced_locally
let seededRosterOrder = $state<RosterEntry[]>(
	[...roster].sort((a, b) => {
		if (a.seed === null) return 1
		if (b.seed === null) return -1
		return a.seed - b.seed
	}),
)

let draggingIndex = $state<number | null>(null)

function onDragStart(index: number) {
	draggingIndex = index
}

function onDragOver(e: DragEvent, index: number) {
	e.preventDefault()
	if (draggingIndex === null || draggingIndex === index) return
	const newOrder = [...seededRosterOrder]
	const [moved] = newOrder.splice(draggingIndex, 1)
	newOrder.splice(index, 0, moved)
	seededRosterOrder = newOrder
	draggingIndex = index
}

async function onDragEnd() {
	draggingIndex = null
	const seeds = seededRosterOrder.map((e, i) => ({
		registration_id: e.registration_id,
		seed: i + 1,
	}))
	await fetch(apiRoutes.TOURNAMENT_SEED_ORDER.path, {
		method: "PATCH",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ tournament_id: tournamentId, seeds }),
	})
}
</script>

<section class="mb-6">
	<h2 class="mb-2 text-base font-semibold text-gray-800">Ordre de seeding</h2>
	<p class="mb-3 text-sm text-gray-500">Glissez les équipes pour définir l'ordre de seeding avant le lancement.</p>
	<ol class="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white">
		{#each seededRosterOrder as entry, i (entry.registration_id)}
			<li
				class="flex cursor-grab items-center gap-3 px-3 py-2 text-sm {draggingIndex === i ? 'bg-primary-50 opacity-70' : 'hover:bg-gray-50'}"
				draggable="true"
				ondragstart={() => onDragStart(i)}
				ondragover={(e) => onDragOver(e, i)}
				ondragend={onDragEnd}
				role="option"
				aria-selected={false}
			>
				<span class="w-6 shrink-0 text-center text-xs font-medium text-gray-400">{i + 1}</span>
				<span class="text-gray-400">☰</span>
				<span class="text-gray-800">
					{#each entry.members as member, j}
						{member.last_name} {member.first_name}{j < entry.members.length - 1 ? " / " : ""}
					{/each}
				</span>
			</li>
		{/each}
	</ol>
</section>
