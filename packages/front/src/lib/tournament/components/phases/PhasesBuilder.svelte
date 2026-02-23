<script lang="ts">
	import type { Phase, PhaseType } from '../../types.js'
	import { sortable } from '../../sortable.js'
	import { createGroupPhase, createEliminationPhase } from '../../utils.js'
	import PhaseCard from './PhaseCard.svelte'
	import AddPhaseMenu from './AddPhaseMenu.svelte'

	interface Props {
		phases: Phase[]
	}

	let { phases = $bindable() }: Props = $props()

	const lastPhaseId = $derived(phases[phases.length - 1]?.id ?? null)

	function addPhase(type: PhaseType) {
		const phase =
			type === 'round_robin' || type === 'double_loss_groups'
				? createGroupPhase(type)
				: createEliminationPhase(type)
		phases = [...phases, phase]
	}

	function deletePhase(id: string) {
		phases = phases.filter((p) => p.id !== id)
	}

	function onSortEnd(evt: { oldIndex?: number; newIndex?: number }) {
		if (evt.oldIndex === undefined || evt.newIndex === undefined) return
		if (evt.oldIndex === evt.newIndex) return
		const next = [...phases]
		const [moved] = next.splice(evt.oldIndex, 1)
		next.splice(evt.newIndex, 0, moved)
		phases = next
	}
</script>

<div class="space-y-3">
	{#if phases.length > 0}
		<ul
			use:sortable={{
				animation: 150,
				handle: '[data-drag]',
				onEnd: onSortEnd,
			}}
			class="space-y-3"
		>
			{#each phases as phase, i (phase.id)}
				<li>
					<PhaseCard
						bind:phase={phases[i]}
						isLast={phase.id === lastPhaseId}
						onDelete={() => deletePhase(phase.id)}
					/>
				</li>
			{/each}
		</ul>
	{:else}
		<div class="rounded-card border-2 border-dashed border-gray-200 p-8 text-center">
			<p class="text-gray-400">Aucune phase configurée.</p>
		</div>
	{/if}

	<AddPhaseMenu onAdd={addPhase} />
</div>
