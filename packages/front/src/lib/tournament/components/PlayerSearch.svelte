<script lang="ts">
	import { Input } from "flowbite-svelte"
	import type { PlayerSearchResult } from "$lib/server/schemas/event-schemas.js"

	type Props = {
		tournamentId: string
		onSelect: (player: PlayerSearchResult) => void
	}
	let { tournamentId, onSelect }: Props = $props()

	let query = $state("")
	let results = $state<PlayerSearchResult[]>([])
	let open = $state(false)
	let timer: ReturnType<typeof setTimeout> | undefined

	$effect(() => {
		clearTimeout(timer)
		if (query.length < 2) {
			results = []
			open = false
			return
		}
		timer = setTimeout(async () => {
			const res = await fetch(
				`/tournaments/${tournamentId}/admin/players/search?q=${encodeURIComponent(query)}`
			)
			results = await res.json()
			open = results.length > 0
		}, 300)
	})

	function selectPlayer(player: PlayerSearchResult) {
		onSelect(player)
		query = ""
		results = []
		open = false
	}
</script>

<div class="relative">
	<Input
		type="text"
		placeholder="Rechercher un joueur (nom, prénom, licence)..."
		bind:value={query}
	/>
	{#if open}
		<ul
			class="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md border border-gray-200 bg-white shadow-lg dark:border-gray-600 dark:bg-gray-700"
		>
			{#each results as player}
				<li>
					<button
						type="button"
						class="flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-600"
						onclick={() => selectPlayer(player)}
					>
						<span class="font-medium">{player.last_name} {player.first_name}</span>
						{#if player.licence_no}
							<span class="text-gray-500 dark:text-gray-400"
								>#{player.licence_no}</span
							>
						{/if}
						{#if player.department}
							<span class="text-gray-400 dark:text-gray-500 text-xs">({player.department})</span>
						{/if}
					</button>
				</li>
			{/each}
		</ul>
	{/if}
</div>
