<script lang="ts">
	import { PHASE_TYPE_LABELS } from "../../labels.js"
	import { Badge, Button, Input, Label } from "flowbite-svelte"
	import BracketTiers from "./BracketTiers.svelte"
	import type { EliminationPhase, GroupPhase, Phase } from "$lib/server/schemas/event-schemas.js"

	interface Props {
		phase: Phase
		isLast: boolean
		onDelete: () => void
	}

	let { phase = $bindable(), isLast, onDelete }: Props = $props()

	let expanded = $state(true)

	function isGroupPhase(p: Phase): p is GroupPhase {
		return p.type === "round_robin" || p.type === "double_loss_groups"
	}
	function isEliminationPhase(p: Phase): p is EliminationPhase {
		return p.type === "single_elimination" || p.type === "double_elimination"
	}
</script>

<div class="rounded-lg border border-gray-200 bg-white shadow-sm">
	<!-- Header -->
	<div class="flex items-center gap-3 p-4">
		<!-- Drag handle -->
		<span
			data-drag
			class="cursor-grab text-xl text-gray-300 select-none hover:text-gray-500 active:cursor-grabbing"
			aria-hidden="true"
		>
			⠿
		</span>

		<!-- Phase type badge -->
		<Badge color="blue" rounded>{PHASE_TYPE_LABELS[phase.type]}</Badge>

		<!-- Actions -->
		<div class="ml-auto flex shrink-0 items-center gap-1">
			{#if isEliminationPhase(phase)}
				<Button
					size="xs"
					color="alternative"
					pill
					onclick={() => (expanded = !expanded)}
					aria-label={expanded ? "Réduire" : "Développer"}
				>
					<svg
						class={["h-4 w-4 transition-transform", expanded ? "rotate-180" : ""].join(
							" "
						)}
						viewBox="0 0 20 20"
						fill="currentColor"
						aria-hidden="true"
					>
						<path
							fill-rule="evenodd"
							d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
							clip-rule="evenodd"
						/>
					</svg>
				</Button>
			{/if}
			<Button
				size="xs"
				color="red"
				outline
				pill
				onclick={onDelete}
				aria-label="Supprimer la phase"
			>
				<svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
					<path
						fill-rule="evenodd"
						d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 3.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z"
						clip-rule="evenodd"
					/>
				</svg>
			</Button>
		</div>
	</div>

	<!-- Group phase fields -->
	{#if isGroupPhase(phase)}
		<div class="border-t border-gray-200 px-4 pt-3 pb-4">
			<div class="grid grid-cols-2 gap-4">
				<div>
					<Label for="phase-ppg-{phase.id}" class="mb-2">Joueurs par poule</Label>
					<Input
						id="phase-ppg-{phase.id}"
						type="number"
						bind:value={phase.players_per_group}
						min="2"
						class="text-center"
					/>
				</div>
				<div>
					<Label for="phase-qualifiers-{phase.id}" class="mb-2">Qualifiés par poule</Label
					>
					<Input
						id="phase-qualifiers-{phase.id}"
						type="number"
						bind:value={phase.players_per_group}
						min="1"
						class="text-center"
					/>
				</div>
			</div>
		</div>
	{/if}

	<!-- Elimination phase fields -->
	{#if isEliminationPhase(phase) && expanded}
		<div class="space-y-3 border-t border-gray-200 px-4 pt-3 pb-4">
			{#if !isLast}
				<div class="flex items-center gap-3">
					<Label for="phase-elim-qual-{phase.id}">Qualifiés pour la suite</Label>
					<Input
						id="phase-elim-qual-{phase.id}"
						type="number"
						bind:value={phase.qualifiers_count}
						min="1"
						size="sm"
						class="w-24 text-center"
					/>
				</div>
			{/if}
			<BracketTiers bind:tiers={phase.tiers} />
		</div>
	{/if}
</div>
