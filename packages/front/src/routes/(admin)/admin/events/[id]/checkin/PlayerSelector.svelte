<script lang="ts">
import { Button } from "flowbite-svelte"
import type { PlayerSearchResult } from "$lib/server/schemas/event-schemas.js"
import MinimumPlayerCreationForm from "$lib/tournament/components/MinimumPlayerCreationForm.svelte"
import PlayerSearch from "$lib/tournament/components/PlayerSearch.svelte"

let {
	label,
	player = $bindable<PlayerSearchResult | null>(null),
	newPlayer = $bindable({ first_name: "", last_name: "", department: "" }),
	tournaments,
	selectedTournamentIds = $bindable(new Set<string>()),
}: {
	label: string
	player: PlayerSearchResult | null
	newPlayer: { first_name: string; last_name: string; department: string }
	tournaments: { id: string; name: string }[]
	selectedTournamentIds: Set<string>
} = $props()

let showCreate = $state(false)

function toggle(tid: string) {
	const next = new Set(selectedTournamentIds)
	if (next.has(tid)) next.delete(tid)
	else next.add(tid)
	selectedTournamentIds = next
}
</script>

<div>
	<h3 class="mb-2 font-semibold text-gray-700">{label}</h3>
	{#if player}
		<div class="flex items-center gap-2 rounded bg-gray-50 p-2">
			<span class="font-medium">{player.last_name} {player.first_name}</span>
			{#if player.department}
				<span class="text-sm text-gray-500">({player.department})</span>
			{/if}
			<Button size="xs" color="light" onclick={() => { player = null }}>Changer</Button>
		</div>
	{:else if !showCreate}
		<PlayerSearch mode="all" onSelect={(p) => { player = p; showCreate = false }} />
	{/if}
	{#if !player}
		<div class="mt-3">
			<button
				type="button"
				class="text-sm text-blue-600 hover:underline"
				onclick={() => { showCreate = !showCreate; player = null }}
			>
				{showCreate ? "▲ Annuler la création" : "▼ Joueur non trouvé ? Créer un joueur"}
			</button>
			{#if showCreate}
				<MinimumPlayerCreationForm
					bind:first_name={newPlayer.first_name}
					bind:last_name={newPlayer.last_name}
					bind:department={newPlayer.department}
				/>
			{/if}
		</div>
	{/if}
	{#if tournaments.length > 0}
		<div class="mt-3 space-y-1">
			{#each tournaments as t (t.id)}
				<label class="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
					<input
						type="checkbox"
						class="rounded"
						checked={selectedTournamentIds.has(t.id)}
						onchange={() => toggle(t.id)}
					/>
					{t.name}
				</label>
			{/each}
		</div>
	{/if}
</div>
