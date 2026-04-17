<script lang="ts">
import { BreadcrumbStepper } from "flowbite-svelte"
import type { WizardStep } from "../types.js"

type Props = {
	step: WizardStep
	onStepClick?: (step: WizardStep) => void
}

let { step, onStepClick }: Props = $props()

const steps = [
	{ label: "Événement", id: 1 },
	{ label: "Tournois & Phases", id: 2 },
	{ label: "Publication", id: 3 },
]

let current = $state<number>(step)
$effect(() => {
	current = step
})
</script>

<!-- Mobile: texte seul -->
<p class="mb-4 text-sm text-gray-500 sm:hidden">
	Étape {step} sur 3 —
	<span class="font-medium text-gray-800">{steps[step - 1].label}</span>
</p>

<!-- Desktop: Stepper Flowbite -->
<div class="hidden sm:block">
	<BreadcrumbStepper
		{steps}
		bind:current
		clickable={!!onStepClick}
		onStepClick={onStepClick ? (e) => onStepClick(e.current as WizardStep) : undefined}
	/>
</div>
