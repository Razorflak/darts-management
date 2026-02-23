<script lang="ts">
	import type { Tournament } from '../types.js'
	import { Button } from 'flowbite-svelte'
	import TournamentTabs from './TournamentTabs.svelte'
	import TournamentForm from './TournamentForm.svelte'

	interface Props {
		tournaments: Tournament[]
		onPrev: () => void
		onNext: () => void
	}

	let { tournaments = $bindable(), onPrev, onNext }: Props = $props()

	let activeId = $state(tournaments[0]?.id ?? '')

	const activeTournament = $derived(tournaments.find((t) => t.id === activeId))
	const activeIndex = $derived(tournaments.findIndex((t) => t.id === activeId))
</script>

<div class="space-y-5">
	<!-- Tabs -->
	<TournamentTabs
		bind:tournaments
		{activeId}
		onSelect={(id) => (activeId = id)}
	/>

	<!-- Active tournament form -->
	{#if activeTournament !== undefined && activeIndex !== -1}
		<div class="rounded-card border border-gray-200 bg-white p-5 shadow-card">
			<TournamentForm bind:tournament={tournaments[activeIndex]} />
		</div>
	{:else}
		<div class="rounded-card border-2 border-dashed border-gray-200 p-8 text-center">
			<p class="text-sm text-gray-400">Ajoutez au moins un tournoi pour continuer.</p>
		</div>
	{/if}

	<!-- Actions -->
	<div class="flex justify-between pt-2">
		<Button color="alternative" pill onclick={onPrev}>← Précédent</Button>
		<Button color="blue" pill onclick={onNext} disabled={tournaments.length === 0}>Suivant →</Button>
	</div>
</div>
