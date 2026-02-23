<script lang="ts">
	import { BRACKET_ROUNDS } from '../../types.js'
	import type { BracketTier, BracketRound } from '../../types.js'
	import { BRACKET_ROUND_LABELS } from '../../labels.js'
	import { sortable } from '../../sortable.js'
	import { createBracketTier } from '../../utils.js'
	import { Button, Dropdown, DropdownItem, Input, Label } from 'flowbite-svelte'

	interface Props {
		tiers: BracketTier[]
	}

	let { tiers = $bindable() }: Props = $props()

	const availableRounds = $derived(
		BRACKET_ROUNDS.filter((r) => !tiers.some((t) => t.round === r)),
	)

	function addTier(round: BracketRound) {
		tiers = [...tiers, createBracketTier(round)]
	}

	function removeTier(id: string) {
		tiers = tiers.filter((t) => t.id !== id)
	}

	function onSortEnd(evt: { oldIndex?: number; newIndex?: number }) {
		if (evt.oldIndex === undefined || evt.newIndex === undefined) return
		if (evt.oldIndex === evt.newIndex) return
		const next = [...tiers]
		const [moved] = next.splice(evt.oldIndex, 1)
		next.splice(evt.newIndex, 0, moved)
		tiers = next
	}
</script>

<div class="space-y-2">
	<ul
		use:sortable={{
			animation: 150,
			handle: '[data-drag]',
			onEnd: onSortEnd,
		}}
		class="space-y-2"
	>
		{#each tiers as tier (tier.id)}
			<li class="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2">
				<!-- Drag handle -->
				<span
					data-drag
					class="cursor-grab text-gray-300 hover:text-gray-500 active:cursor-grabbing select-none"
					aria-hidden="true"
				>
					⠿
				</span>

				<!-- Label -->
				<span class="min-w-0 flex-1 text-sm text-gray-700">
					{BRACKET_ROUND_LABELS[tier.round]}
				</span>

				<!-- Legs input -->
				<div class="flex items-center gap-2">
					<Input
						aria-label="Nombre de manches"
						type="number"
						bind:value={tier.legs}
						min="1"
						max="11"
						size="sm"
						class="w-16 text-center"
					/>
					<span class="text-sm text-gray-500">manches</span>
				</div>

				<!-- Remove -->
				<button
					type="button"
					onclick={() => removeTier(tier.id)}
					class="text-gray-300 hover:text-red-400 transition-colors"
					aria-label="Supprimer ce palier"
				>
					<svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
						<path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
					</svg>
				</button>
			</li>
		{/each}
	</ul>

	<!-- Add tier dropdown -->
	{#if availableRounds.length > 0}
		<div>
			<Button color="blue" outline size="xs" pill>
				<svg class="me-1 h-3 w-3" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
					<path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
				</svg>
				Ajouter un palier
				<svg class="ms-1 h-3 w-3" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
					<path fill-rule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" />
				</svg>
			</Button>
			<Dropdown simple>
				{#each availableRounds as round}
					<DropdownItem onclick={() => addTier(round)}>
						{BRACKET_ROUND_LABELS[round]}
					</DropdownItem>
				{/each}
			</Dropdown>
		</div>
	{/if}
</div>
