<script lang="ts">
	import { Button } from "flowbite-svelte"
	import TournamentTabs from "./TournamentTabs.svelte"
	import TournamentForm from "./TournamentForm.svelte"
	import type { DraftTournament, Tournament } from "$lib/server/schemas/event-schemas"

	interface Props {
		tournaments: (Tournament | DraftTournament)[]
		onPrev: () => void
		onNext: () => void
	}

	let { tournaments: tournamentProps = $bindable(), onPrev, onNext }: Props = $props()

	let tournaments = $state(tournamentProps)

	let activeId = $derived(tournaments[0]?.id ?? "")

	let activeTournament = $derived(tournaments.find((t) => t.id === activeId))
	const activeIndex = $derived(tournaments.findIndex((t) => t.id === activeId))

	function updateTournament(updated: Tournament | DraftTournament) {
		tournaments = tournaments.map((t) => (t.id === updated.id ? updated : t))
	}
</script>

<div class="space-y-5">
	<!-- Tabs -->
	<TournamentTabs bind:tournaments {activeId} onSelect={(id) => (activeId = id)} />

	<!-- Active tournament form -->
	{#if activeTournament !== undefined && activeIndex !== -1}
		<div class="rounded-card shadow-card border border-gray-200 bg-white p-5">
			<TournamentForm bind:tournament={activeTournament} onUpdate={updateTournament} />
		</div>
	{:else}
		<div class="rounded-card border-2 border-dashed border-gray-200 p-8 text-center">
			<p class="text-sm text-gray-400">Ajoutez au moins un tournoi pour continuer.</p>
		</div>
	{/if}

	<!-- Actions -->
	<div class="flex justify-between pt-2">
		<Button color="alternative" pill onclick={onPrev}>← Précédent</Button>
		<Button color="blue" pill onclick={onNext} disabled={tournaments.length === 0}
			>Suivant →</Button
		>
	</div>
</div>
