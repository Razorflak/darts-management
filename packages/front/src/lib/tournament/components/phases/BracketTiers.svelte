<script lang="ts">
	import { BRACKET_ROUNDS } from '../../types.js'
	import type { BracketTier, BracketRound } from '../../types.js'
	import { BRACKET_ROUND_LABELS } from '../../labels.js'
	import { sortable } from '../../sortable.js'
	import { createBracketTier } from '../../utils.js'
	import { Input } from 'flowbite-svelte'

	interface Props {
		tiers: BracketTier[]
	}

	let { tiers = $bindable() }: Props = $props()

	const availableRounds = $derived(
		BRACKET_ROUNDS.filter((r) => !tiers.some((t) => t.round === r)),
	)

	let addOpen = $state(false)

	function addTier(round: BracketRound) {
		tiers = [...tiers, createBracketTier(round)]
		// stay open so multiple tiers can be added in one session
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
					class="cursor-grab select-none text-gray-300 hover:text-gray-500 active:cursor-grabbing"
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
					class="text-gray-300 transition-colors hover:text-red-400"
					aria-label="Supprimer ce palier"
				>
					<svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
						<path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 1 1 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
					</svg>
				</button>
			</li>
		{/each}
	</ul>

	<!-- Add tier dropdown -->
	{#if availableRounds.length > 0}
		<div class="relative inline-block">
			<!-- Backdrop -->
			{#if addOpen}
				<div
					class="fixed inset-0 z-10"
					aria-hidden="true"
					onclick={() => (addOpen = false)}
				></div>
			{/if}

			<!-- Trigger button -->
			<button
				type="button"
				onclick={() => (addOpen = !addOpen)}
				class="inline-flex items-center gap-1 rounded-full border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-600 transition-colors hover:border-blue-400 hover:text-blue-600"
			>
				<svg class="h-3 w-3" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
					<path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
				</svg>
				Ajouter un palier
				<svg class="h-2.5 w-2.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
					<path fill-rule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clip-rule="evenodd" />
				</svg>
			</button>

			<!-- Dropdown menu — stays open so multiple tiers can be added -->
			{#if addOpen}
				<div class="absolute left-0 top-full z-20 mt-1 min-w-44 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
					{#each availableRounds as round}
						<button
							type="button"
							onclick={() => addTier(round)}
							class="block w-full px-3 py-2 text-left text-sm text-gray-700 transition-colors hover:bg-gray-50"
						>
							{BRACKET_ROUND_LABELS[round]}
						</button>
					{/each}
				</div>
			{/if}
		</div>
	{/if}
</div>
