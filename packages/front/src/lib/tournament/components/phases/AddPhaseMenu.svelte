<script lang="ts">
	import type { PhaseType } from '../../types.js'
	import { PHASE_TYPE_LABELS } from '../../labels.js'
	import { Button, Dropdown, DropdownItem } from 'flowbite-svelte'

	interface Props {
		onAdd: (type: PhaseType) => void
	}

	let { onAdd }: Props = $props()

	const phaseTypes: PhaseType[] = ['round_robin', 'double_loss_groups', 'single_elim', 'double_elim']
</script>

<Button color="blue" outline pill size="sm">
	<svg class="me-1.5 h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
		<path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
	</svg>
	Ajouter une phase
	<svg class="ms-1.5 h-3 w-3" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
		<path fill-rule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" />
	</svg>
</Button>
<Dropdown simple>
	{#each phaseTypes as type}
		<DropdownItem onclick={() => onAdd(type)}>
			{PHASE_TYPE_LABELS[type]}
		</DropdownItem>
	{/each}
</Dropdown>
