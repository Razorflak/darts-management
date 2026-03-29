<script lang="ts">
import { Button, Modal } from "flowbite-svelte"
import type { PlayerSearchResult } from "$lib/server/schemas/event-schemas.js"
import PlayerSearch from "$lib/tournament/components/PlayerSearch.svelte"
import MinimumPlayerCreationForm from "$lib/tournament/components/MinimumPlayerCreationForm.svelte"

let {
	open = $bindable(false),
	isDoubles,
	baseUrl,
	onRegistered,
}: {
	open: boolean
	isDoubles: boolean
	baseUrl: string
	onRegistered: () => void
} = $props()

const emptyNew = () => ({ first_name: "", last_name: "", department: "" })

let selectedPlayer = $state<PlayerSearchResult | null>(null)
let selectedPlayer1 = $state<PlayerSearchResult | null>(null)
let selectedPlayer2 = $state<PlayerSearchResult | null>(null)
let errorMsg = $state<string | null>(null)

// Formulaire création — solo
let showCreateSolo = $state(false)
let newSolo = $state(emptyNew())

// Formulaire création — doubles (un par slot)
let showCreateP1 = $state(false)
let newP1 = $state(emptyNew())
let showCreateP2 = $state(false)
let newP2 = $state(emptyNew())

function reset() {
	selectedPlayer = null
	selectedPlayer1 = null
	selectedPlayer2 = null
	errorMsg = null
	showCreateSolo = false
	newSolo = emptyNew()
	showCreateP1 = false
	newP1 = emptyNew()
	showCreateP2 = false
	newP2 = emptyNew()
}

$effect(() => {
	if (!open) reset()
})

function closeAndReset() {
	open = false
}

async function confirm() {
	errorMsg = null
	let body: Record<string, unknown>

	if (isDoubles) {
		if (showCreateP1 && (!newP1.first_name || !newP1.last_name)) {
			errorMsg = "Joueur 1 : Prénom et nom obligatoires"
			return
		}
		if (showCreateP2 && (!newP2.first_name || !newP2.last_name)) {
			errorMsg = "Joueur 2 : Prénom et nom obligatoires"
			return
		}
		if (!showCreateP1 && !selectedPlayer1) return
		if (!showCreateP2 && !selectedPlayer2) return

		const player1 = showCreateP1
			? { type: "new", ...newP1, department: newP1.department || undefined }
			: { type: "existing", id: selectedPlayer1!.id }
		const player2 = showCreateP2
			? { type: "new", ...newP2, department: newP2.department || undefined }
			: { type: "existing", id: selectedPlayer2!.id }

		body = { mode: "doubles", player1, player2 }
	} else {
		if (showCreateSolo) {
			if (!newSolo.first_name || !newSolo.last_name) {
				errorMsg = "Prénom et nom obligatoires"
				return
			}
			body = {
				mode: "new",
				...newSolo,
				department: newSolo.department || undefined,
			}
		} else {
			if (!selectedPlayer) return
			body = { mode: "existing", player_id: selectedPlayer.id }
		}
	}

	const res = await fetch(`${baseUrl}/register`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	})

	if (res.ok) {
		open = false
		onRegistered()
	} else {
		const data = await res.json().catch(() => ({}))
		errorMsg =
			(data as { message?: string }).message ?? "Erreur lors de l'inscription"
	}
}

const canConfirm = $derived(
	isDoubles
		? (selectedPlayer1 !== null || showCreateP1) &&
				(selectedPlayer2 !== null || showCreateP2)
		: selectedPlayer !== null || showCreateSolo,
)
</script>

<Modal
	bind:open
	title={isDoubles ? "Ajouter une équipe" : "Ajouter un joueur"}
	size="lg"
	outsideclose
>
	{#if isDoubles}
		<div class="space-y-6">
			<!-- Player 1 -->
			<div>
				<h3 class="mb-2 font-semibold text-gray-700">Joueur 1</h3>
				{#if selectedPlayer1}
					<div class="flex items-center gap-2 rounded bg-gray-50 p-2">
						<span class="font-medium"
							>{selectedPlayer1.last_name} {selectedPlayer1.first_name}</span
						>
						{#if selectedPlayer1.department}
							<span class="text-sm text-gray-500">({selectedPlayer1.department})</span>
						{/if}
						<Button size="xs" color="light" onclick={() => (selectedPlayer1 = null)}>
							Changer
						</Button>
					</div>
				{:else if !showCreateP1}
					<PlayerSearch
						tournamentId=""
						searchUrl="{baseUrl}/players/search"
						onSelect={(p) => { selectedPlayer1 = p }}
					/>
				{/if}

				<!-- Bouton toggle création — slot 1 -->
				{#if !selectedPlayer1}
					<div class="mt-3">
						<button
							type="button"
							class="text-sm text-blue-600 hover:underline"
							onclick={() => { showCreateP1 = !showCreateP1; selectedPlayer1 = null }}
						>
							{showCreateP1 ? "▲ Annuler la création" : "▼ Joueur non trouvé ? Créer un joueur"}
						</button>
						{#if showCreateP1}
							<MinimumPlayerCreationForm
								bind:first_name={newP1.first_name}
								bind:last_name={newP1.last_name}
								bind:department={newP1.department}
							/>
						{/if}
					</div>
				{/if}
			</div>

			<!-- Player 2 — appears only after player 1 is selected or create form shown -->
			{#if selectedPlayer1 || showCreateP1}
				<div>
					<h3 class="mb-2 font-semibold text-gray-700">Joueur 2</h3>
					{#if selectedPlayer2}
						<div class="flex items-center gap-2 rounded bg-gray-50 p-2">
							<span class="font-medium"
								>{selectedPlayer2.last_name} {selectedPlayer2.first_name}</span
							>
							{#if selectedPlayer2.department}
								<span class="text-sm text-gray-500">({selectedPlayer2.department})</span>
							{/if}
							<Button size="xs" color="light" onclick={() => (selectedPlayer2 = null)}>
								Changer
							</Button>
						</div>
					{:else if !showCreateP2}
						<PlayerSearch
							tournamentId=""
							searchUrl="{baseUrl}/players/search"
							onSelect={(p) => { selectedPlayer2 = p }}
						/>
					{/if}

					<!-- Bouton toggle création — slot 2 -->
					{#if !selectedPlayer2}
						<div class="mt-3">
							<button
								type="button"
								class="text-sm text-blue-600 hover:underline"
								onclick={() => { showCreateP2 = !showCreateP2; selectedPlayer2 = null }}
							>
								{showCreateP2 ? "▲ Annuler la création" : "▼ Joueur non trouvé ? Créer un joueur"}
							</button>
							{#if showCreateP2}
								<MinimumPlayerCreationForm
									bind:first_name={newP2.first_name}
									bind:last_name={newP2.last_name}
									bind:department={newP2.department}
								/>
							{/if}
						</div>
					{/if}
				</div>
			{/if}
		</div>
	{:else}
		<!-- Solo mode -->
		{#if !showCreateSolo}
			<PlayerSearch
				tournamentId=""
				searchUrl="{baseUrl}/players/search"
				onSelect={(p) => { selectedPlayer = p }}
			/>
		{/if}

		{#if selectedPlayer}
			<div class="mt-3 flex items-center gap-3 rounded bg-gray-50 p-2">
				<span class="font-medium"
					>{selectedPlayer.last_name} {selectedPlayer.first_name}</span
				>
				{#if selectedPlayer.department}
					<span class="text-sm text-gray-500">({selectedPlayer.department})</span>
				{/if}
				<Button size="xs" color="light" onclick={() => (selectedPlayer = null)}>Changer</Button>
			</div>
		{/if}

		<!-- Bouton toggle création — solo -->
		<div class="mt-3">
			<button
				type="button"
				class="text-sm text-blue-600 hover:underline"
				onclick={() => { showCreateSolo = !showCreateSolo; selectedPlayer = null }}
			>
				{showCreateSolo ? "▲ Annuler la création" : "▼ Joueur non trouvé ? Créer un joueur"}
			</button>
			{#if showCreateSolo}
				<MinimumPlayerCreationForm
					bind:first_name={newSolo.first_name}
					bind:last_name={newSolo.last_name}
					bind:department={newSolo.department}
				/>
			{/if}
		</div>
	{/if}

	{#if errorMsg}
		<p class="mt-2 text-sm text-red-600">{errorMsg}</p>
	{/if}

	{#snippet footer()}
		{#if canConfirm}
			<Button color="primary" onclick={confirm}>Confirmer l'inscription</Button>
		{/if}
		<Button color="light" onclick={closeAndReset}>Annuler</Button>
	{/snippet}
</Modal>
