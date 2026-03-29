<script lang="ts">
import { Button, Modal } from "flowbite-svelte"
import { apiRoutes } from "$lib/fetch/api"
import type { PlayerSearchResult } from "$lib/server/schemas/event-schemas.js"
import MinimumPlayerCreationForm from "$lib/tournament/components/MinimumPlayerCreationForm.svelte"
import PlayerSearch from "$lib/tournament/components/PlayerSearch.svelte"

let {
	open = $bindable(false),
	isDoubles,
	tournamentId,
	onRegistered,
}: {
	open: boolean
	isDoubles: boolean
	tournamentId: string
	onRegistered: () => void
} = $props()

const emptyNew = () => ({ first_name: "", last_name: "", department: "" })

let selected1 = $state<PlayerSearchResult | null>(null)
let showCreate1 = $state(false)
let new1 = $state(emptyNew())

let selected2 = $state<PlayerSearchResult | null>(null)
let showCreate2 = $state(false)
let new2 = $state(emptyNew())

let errorMsg = $state<string | null>(null)

function reset() {
	selected1 = null
	showCreate1 = false
	new1 = emptyNew()
	selected2 = null
	showCreate2 = false
	new2 = emptyNew()
	errorMsg = null
}

$effect(() => {
	if (!open) reset()
})

const slot1Ready = $derived(selected1 !== null || showCreate1)
const slot2Ready = $derived(selected2 !== null || showCreate2)
const canConfirm = $derived(isDoubles ? slot1Ready && slot2Ready : slot1Ready)

async function confirm() {
	errorMsg = null

	const p1 = selected1
		? { id: selected1.id }
		: { first_name: new1.first_name, last_name: new1.last_name, department: new1.department }
	const p2 = selected2
		? { id: selected2.id }
		: { first_name: new2.first_name, last_name: new2.last_name, department: new2.department }

	const team = isDoubles ? [p1, p2] : [p1]

	const res = await fetch(apiRoutes.TOURNAMENT_REGISTER.path, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ tournament_id: tournamentId, team }),
	})

	if (res.ok) {
		open = false
		onRegistered()
	} else {
		const data = await res.json().catch(() => ({}))
		errorMsg = (data as { message?: string }).message ?? "Erreur lors de l'inscription"
	}
}
</script>

<Modal
	bind:open
	title={isDoubles ? "Ajouter une équipe" : "Ajouter un joueur"}
	size="lg"
	outsideclose
>
	<div class="space-y-6">
		<!-- Joueur 1 (ou seul joueur en solo) -->
		<div>
			{#if isDoubles}<h3 class="mb-2 font-semibold text-gray-700">Joueur 1</h3>{/if}
			{#if selected1}
				<div class="flex items-center gap-2 rounded bg-gray-50 p-2">
					<span class="font-medium">{selected1.last_name} {selected1.first_name}</span>
					{#if selected1.department}
						<span class="text-sm text-gray-500">({selected1.department})</span>
					{/if}
					<Button size="xs" color="light" onclick={() => (selected1 = null)}>Changer</Button>
				</div>
			{:else if !showCreate1}
				<PlayerSearch mode="all" onSelect={(p) => { selected1 = p }} />
			{/if}
			{#if !selected1}
				<div class="mt-3">
					<button
						type="button"
						class="text-sm text-blue-600 hover:underline"
						onclick={() => { showCreate1 = !showCreate1; selected1 = null }}
					>
						{showCreate1 ? "▲ Annuler la création" : "▼ Joueur non trouvé ? Créer un joueur"}
					</button>
					{#if showCreate1}
						<MinimumPlayerCreationForm
							bind:first_name={new1.first_name}
							bind:last_name={new1.last_name}
							bind:department={new1.department}
						/>
					{/if}
				</div>
			{/if}
		</div>

		<!-- Joueur 2 — doubles uniquement, visible après que le joueur 1 soit prêt -->
		{#if isDoubles && slot1Ready}
			<div>
				<h3 class="mb-2 font-semibold text-gray-700">Joueur 2</h3>
				{#if selected2}
					<div class="flex items-center gap-2 rounded bg-gray-50 p-2">
						<span class="font-medium">{selected2.last_name} {selected2.first_name}</span>
						{#if selected2.department}
							<span class="text-sm text-gray-500">({selected2.department})</span>
						{/if}
						<Button size="xs" color="light" onclick={() => (selected2 = null)}>Changer</Button>
					</div>
				{:else if !showCreate2}
					<PlayerSearch mode="all" onSelect={(p) => { selected2 = p }} />
				{/if}
				{#if !selected2}
					<div class="mt-3">
						<button
							type="button"
							class="text-sm text-blue-600 hover:underline"
							onclick={() => { showCreate2 = !showCreate2; selected2 = null }}
						>
							{showCreate2 ? "▲ Annuler la création" : "▼ Joueur non trouvé ? Créer un joueur"}
						</button>
						{#if showCreate2}
							<MinimumPlayerCreationForm
								bind:first_name={new2.first_name}
								bind:last_name={new2.last_name}
								bind:department={new2.department}
							/>
						{/if}
					</div>
				{/if}
			</div>
		{/if}
	</div>

	{#if errorMsg}
		<p class="mt-2 text-sm text-red-600">{errorMsg}</p>
	{/if}

	{#snippet footer()}
		{#if canConfirm}
			<Button color="primary" onclick={confirm}>Confirmer l'inscription</Button>
		{/if}
		<Button color="light" onclick={() => (open = false)}>Annuler</Button>
	{/snippet}
</Modal>
