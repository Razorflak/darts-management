<script lang="ts">
import { Input } from "flowbite-svelte"
import {
	ChevronDownOutline,
	CloseOutline,
	PlusOutline,
} from "flowbite-svelte-icons"
import type { BracketTier } from "$lib/server/schemas/event-schemas.js"
import { BRACKET_ROUND_LABELS } from "../../labels.js"
import { sortable } from "../../sortable.js"
import { createBracketTier } from "../../utils.js"

interface Props {
	tiers: BracketTier[]
	disabled?: boolean
}

const BRACKET_ROUNDS: BracketTier["round"][] = [
	"4096",
	"2048",
	"1024",
	"512",
	"256",
	"128",
	"64",
	"32",
	"16",
	"8",
	"4",
	"2",
	"1",
]

let { tiers = $bindable(), disabled = false }: Props = $props()

const availableRounds = $derived(
	BRACKET_ROUNDS.filter((r) => !tiers.some((t) => t.round === r)),
)

let addOpen = $state(false)

function addTier(round: BracketTier["round"]) {
	tiers = [...tiers, createBracketTier(round)]
	// stay open so multiple tiers can be added in one session
}

function removeTier(round: BracketTier["round"]) {
	tiers = tiers.filter((t) => t.round !== round)
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
			handle: "[data-drag]",
			onEnd: onSortEnd,
			disabled,
		}}
		class="space-y-2"
	>
		{#each tiers as tier (tier.round)}
			<li
				class="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2"
			>
				<!-- Drag handle -->
				<span
					data-drag
					class="cursor-grab text-gray-300 select-none hover:text-gray-500 active:cursor-grabbing"
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
						disabled={disabled}
						class="w-16 text-center"
					/>
					<span class="text-sm text-gray-500">manches</span>
				</div>

				<!-- Remove -->
				<button
					type="button"
					onclick={() => removeTier(tier.round)}
					disabled={disabled}
					class="text-gray-300 transition-colors hover:text-red-400 disabled:pointer-events-none disabled:opacity-50"
					aria-label="Supprimer ce palier"
				>
					<CloseOutline class="h-5 w-5" />
				</button>
			</li>
		{/each}
	</ul>

	<!-- Add tier dropdown -->
	{#if availableRounds.length > 0 && !disabled}
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
				<PlusOutline class="h-3 w-3" />
				Ajouter un palier
				<ChevronDownOutline class="h-2.5 w-2.5" />
			</button>

			<!-- Dropdown menu — stays open so multiple tiers can be added -->
			{#if addOpen}
				<div
					class="absolute top-full left-0 z-20 mt-1 min-w-44 max-h-56 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg"
				>
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
