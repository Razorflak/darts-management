<script lang="ts">
import { ChevronDownOutline, PlusOutline } from "flowbite-svelte-icons"
import type { PhaseType } from "$lib/server/schemas/event-schemas.js"
import { PHASE_TYPE_LABELS } from "../../labels.js"

interface Props {
	onAdd: (type: PhaseType) => void
}

let { onAdd }: Props = $props()

const phaseTypes: PhaseType[] = [
	"round_robin",
	"double_loss_groups",
	"single_elimination",
	"double_elimination",
]

let open = $state(false)

function handleAdd(type: PhaseType) {
	onAdd(type)
	open = false
}
</script>

<div class="relative inline-block">
	<!-- Backdrop -->
	{#if open}
		<div class="fixed inset-0 z-10" aria-hidden="true" onclick={() => (open = false)}></div>
	{/if}

	<!-- Trigger button -->
	<button
		type="button"
		onclick={() => (open = !open)}
		class="inline-flex items-center gap-1.5 rounded-full border border-blue-500 px-3 py-1.5 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-50"
	>
		<PlusOutline class="h-3.5 w-3.5" />
		Ajouter une phase
		<ChevronDownOutline class="h-3 w-3" />
	</button>

	<!-- Dropdown menu -->
	{#if open}
		<div class="absolute left-0 top-full z-20 mt-1 min-w-48 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
			{#each phaseTypes as type}
				<button
					type="button"
					onclick={() => handleAdd(type)}
					class="block w-full px-4 py-2.5 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50"
				>
					{PHASE_TYPE_LABELS[type]}
				</button>
			{/each}
		</div>
	{/if}
</div>
