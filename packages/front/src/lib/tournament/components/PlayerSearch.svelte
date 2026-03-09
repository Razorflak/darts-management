<script lang="ts">
	import type { PlayerSearchResult } from "$lib/server/schemas/event-schemas.js"

	type Props = {
		tournamentId: string
		searchUrl?: string
		onSelect: (player: PlayerSearchResult) => void
	}
	let { tournamentId, searchUrl, onSelect }: Props = $props()

	let query = $state("")
	let results = $state<PlayerSearchResult[]>([])
	let open = $state(false)
	let timer: ReturnType<typeof setTimeout> | undefined
	let inputEl: HTMLInputElement | undefined = $state()
	let dropdownStyle = $state("")

	function updatePosition() {
		if (!inputEl) return
		const r = inputEl.getBoundingClientRect()
		dropdownStyle = `top:${r.bottom + window.scrollY + 4}px;left:${r.left + window.scrollX}px;width:${r.width}px`
	}

	$effect(() => {
		clearTimeout(timer)
		if (query.length < 2) {
			results = []
			open = false
			return
		}
		timer = setTimeout(async () => {
			const url = searchUrl ?? `/tournaments/${tournamentId}/admin/players/search`
			const res = await fetch(`${url}?q=${encodeURIComponent(query)}`)
			results = await res.json()
			updatePosition()
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

<svelte:window onscroll={updatePosition} onresize={updatePosition} />

<div class="relative">
	<input
		bind:this={inputEl}
		type="text"
		placeholder="Rechercher un joueur (nom, prénom, licence)..."
		bind:value={query}
		class="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-primary-500 dark:focus:ring-primary-500"
	/>
	{#if open}
		<ul
			style="position:fixed;{dropdownStyle};z-index:9999"
			class="max-h-60 overflow-auto rounded-md border border-gray-200 bg-white shadow-lg dark:border-gray-600 dark:bg-gray-700"
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
							<span class="text-xs text-gray-400 dark:text-gray-500"
								>({player.department})</span
							>
						{/if}
					</button>
				</li>
			{/each}
		</ul>
	{/if}
</div>
