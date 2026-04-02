<script lang="ts">
import { Badge, Button, Input, Label } from "flowbite-svelte"
import { ChevronDownOutline, TrashBinOutline } from "flowbite-svelte-icons"
import { isGroupPhase } from "@darts-management/domain"
import type {
	EliminationPhase,
	GroupPhase,
	Phase,
} from "@darts-management/domain"
import { PHASE_TYPE_LABELS } from "../../labels.js"
import BracketTiers from "./BracketTiers.svelte"

interface Props {
	phase: Phase
	isLast: boolean
	onDelete: () => void
	disabled?: boolean
}

let {
	phase = $bindable(),
	isLast,
	onDelete,
	disabled = false,
}: Props = $props()

let expanded = $state(true)

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
			class={[
				"text-xl text-gray-300 select-none",
				disabled
					? "pointer-events-none opacity-50"
					: "cursor-grab hover:text-gray-500 active:cursor-grabbing",
			].join(" ")}
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
					<ChevronDownOutline class={["h-4 w-4 transition-transform", expanded ? "rotate-180" : ""].join(" ")} />
				</Button>
			{/if}
			<Button
				size="xs"
				color="red"
				outline
				pill
				onclick={onDelete}
				disabled={disabled}
				aria-label="Supprimer la phase"
			>
				<TrashBinOutline class="h-4 w-4" />
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
						disabled={disabled}
						class="text-center"
					/>
				</div>
				<div>
					<Label for="phase-qualifiers-{phase.id}" class="mb-2">Qualifiés par poule</Label
					>
					<Input
						id="phase-qualifiers-{phase.id}"
						type="number"
						bind:value={phase.qualifiers_per_group}
						min="1"
						disabled={disabled}
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
						disabled={disabled}
						class="w-24 text-center"
					/>
				</div>
			{/if}
			<BracketTiers bind:tiers={phase.tiers} {disabled} />
		</div>
	{/if}
</div>
