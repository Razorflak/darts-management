<script lang="ts">
	import type { PhaseType } from '../../types.js'
	import { PHASE_TYPE_LABELS } from '../../labels.js'

	interface Props {
		onAdd: (type: PhaseType) => void
	}

	let { onAdd }: Props = $props()

	const phaseTypes: PhaseType[] = ['round_robin', 'double_loss_groups', 'single_elim', 'double_elim']

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
		<svg class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
			<path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
		</svg>
		Ajouter une phase
		<svg class="h-3 w-3" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
			<path fill-rule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 1 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" />
		</svg>
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
