<script lang="ts">
import { CheckOutline } from "flowbite-svelte-icons"
import type { WizardStep } from "../types.js"

interface Props {
	step: WizardStep
	onStepClick?: (step: WizardStep) => void
}

let { step, onStepClick }: Props = $props()

const steps: { label: string; step: WizardStep }[] = [
	{ label: "Événement", step: 1 },
	{ label: "Tournois & Phases", step: 2 },
	{ label: "Publication", step: 3 },
]
</script>

<nav class="w-full" aria-label="Étapes de création">
	<!-- Mobile: texte seul -->
	<p class="mb-4 text-sm text-gray-500 sm:hidden">
		Étape {step} sur 3 — <span class="font-medium text-gray-800">{steps[step - 1].label}</span>
	</p>

	<!-- Desktop: stepper visuel -->
	<ol class="hidden items-center gap-0 sm:flex">
		{#each steps as s, i}
			<li class="flex items-center">
				{#if onStepClick}
					<button
						type="button"
						onclick={() => onStepClick(s.step)}
						class="flex items-center appearance-none bg-transparent border-0 p-0 cursor-pointer hover:opacity-80 transition-opacity"
						aria-current={step === s.step ? 'step' : undefined}
					>
						<!-- Pastille -->
						<div
							class={[
								'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-colors',
								step > s.step
									? 'bg-primary-600 text-white'
									: step === s.step
										? 'bg-primary-600 text-white ring-4 ring-primary-100'
										: 'bg-gray-100 text-gray-400',
							].join(' ')}
						>
							{#if step > s.step}
								<CheckOutline class="h-4 w-4" />
							{:else}
								{s.step}
							{/if}
						</div>

						<!-- Label -->
						<span
							class={[
								'ml-2 text-sm font-medium',
								step === s.step ? 'text-primary-700' : step > s.step ? 'text-gray-600' : 'text-gray-400',
							].join(' ')}
						>
							{s.label}
						</span>
					</button>
				{:else}
					<!-- Pastille -->
					<div
						class={[
							'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-colors',
							step > s.step
								? 'bg-primary-600 text-white'
								: step === s.step
									? 'bg-primary-600 text-white ring-4 ring-primary-100'
									: 'bg-gray-100 text-gray-400',
						].join(' ')}
						aria-current={step === s.step ? 'step' : undefined}
					>
						{#if step > s.step}
							<svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
								<path
									fill-rule="evenodd"
									d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
									clip-rule="evenodd"
								/>
							</svg>
						{:else}
							{s.step}
						{/if}
					</div>

					<!-- Label -->
					<span
						class={[
							'ml-2 text-sm font-medium',
							step === s.step ? 'text-primary-700' : step > s.step ? 'text-gray-600' : 'text-gray-400',
						].join(' ')}
					>
						{s.label}
					</span>
				{/if}

				<!-- Ligne de séparation -->
				{#if i < steps.length - 1}
					<div
						class={[
							'mx-4 h-px w-12 transition-colors',
							step > s.step ? 'bg-primary-300' : 'bg-gray-200',
						].join(' ')}
					></div>
				{/if}
			</li>
		{/each}
	</ol>
</nav>
