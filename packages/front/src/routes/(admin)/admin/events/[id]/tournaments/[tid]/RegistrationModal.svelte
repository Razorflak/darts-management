<script lang="ts">
import { Button, Modal } from "flowbite-svelte";
import type { PlayerSearchResult } from "$lib/server/schemas/event-schemas.js";
import PlayerSearch from "$lib/tournament/components/PlayerSearch.svelte";

let {
	open = $bindable(false),
	isDoubles,
	baseUrl,
	onRegistered,
}: {
	open: boolean;
	isDoubles: boolean;
	baseUrl: string;
	onRegistered: () => void;
} = $props();

let selectedPlayer = $state<PlayerSearchResult | null>(null);
let selectedPlayer1 = $state<PlayerSearchResult | null>(null);
let selectedPlayer2 = $state<PlayerSearchResult | null>(null);
let errorMsg = $state<string | null>(null);

function reset() {
	selectedPlayer = null;
	selectedPlayer1 = null;
	selectedPlayer2 = null;
	errorMsg = null;
}

$effect(() => {
	if (!open) reset();
});

function closeAndReset() {
	open = false;
}

async function confirm() {
	errorMsg = null;
	let body: Record<string, unknown>;

	if (isDoubles) {
		if (!selectedPlayer1 || !selectedPlayer2) return;
		body = {
			mode: "doubles",
			player1: { type: "existing", id: selectedPlayer1.id },
			player2: { type: "existing", id: selectedPlayer2.id },
		};
	} else {
		if (!selectedPlayer) return;
		body = { mode: "existing", player_id: selectedPlayer.id };
	}

	const res = await fetch(`${baseUrl}/register`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(body),
	});

	if (res.ok) {
		open = false;
		onRegistered();
	} else {
		const data = await res.json().catch(() => ({}));
		errorMsg =
			(data as { message?: string }).message ?? "Erreur lors de l'inscription";
	}
}

const canConfirm = $derived(
	isDoubles
		? selectedPlayer1 !== null && selectedPlayer2 !== null
		: selectedPlayer !== null,
);
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
				{:else}
					<PlayerSearch
						tournamentId=""
						searchUrl="{baseUrl}/players/search"
						onSelect={(p) => {
							selectedPlayer1 = p
						}}
					/>
				{/if}
			</div>

			<!-- Player 2 — appears only after player 1 is selected -->
			{#if selectedPlayer1}
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
					{:else}
						<PlayerSearch
							tournamentId=""
							searchUrl="{baseUrl}/players/search"
							onSelect={(p) => {
								selectedPlayer2 = p
							}}
						/>
					{/if}
				</div>
			{/if}
		</div>
	{:else}
		<!-- Solo mode -->
		<PlayerSearch
			tournamentId=""
			searchUrl="{baseUrl}/players/search"
			onSelect={(p) => {
				selectedPlayer = p
			}}
		/>

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
