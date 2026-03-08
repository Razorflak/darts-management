<script lang="ts">
	import { Button, Input, Modal } from "flowbite-svelte"
	import type { PartnerSearchResult } from "$lib/server/schemas/event-schemas.js"
	import DepartmentSelect from "$lib/tournament/components/DepartmentSelect.svelte"

	type Props = {
		open: boolean
		tournamentId: string
		eventId: string
		onClose: () => void
		onRegistered: () => void
	}
	let { open = $bindable(), tournamentId, eventId, onClose, onRegistered }: Props = $props()

	let query = $state("")
	let results = $state<PartnerSearchResult[]>([])
	let selected = $state<PartnerSearchResult | null>(null)
	let showCreateForm = $state(false)
	let newPartner = $state({ first_name: "", last_name: "", department: "" })
	let submitting = $state(false)
	let error = $state<string | null>(null)
	let timer: ReturnType<typeof setTimeout>

	$effect(() => {
		clearTimeout(timer)
		if (query.length < 3) {
			results = []
			return
		}
		timer = setTimeout(async () => {
			const res = await fetch(
				`/tournaments/${tournamentId}/partner/search?q=${encodeURIComponent(query)}`
			)
			if (res.ok) {
				results = await res.json()
			}
		}, 300)
	})

	function selectPartner(p: PartnerSearchResult) {
		selected = p
		query = ""
		results = []
		showCreateForm = false
	}

	async function confirm() {
		submitting = true
		error = null
		try {
			let partnerId: string

			if (selected) {
				partnerId = selected.id
			} else if (showCreateForm) {
				// Étape 1 : créer le joueur
				const createRes = await fetch("/players", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						first_name: newPartner.first_name,
						last_name: newPartner.last_name,
						department: newPartner.department || undefined
					})
				})
				if (!createRes.ok) {
					const data = await createRes.json().catch(() => ({}))
					error = data.message ?? "Erreur lors de la création du joueur."
					return
				}
				const { id } = await createRes.json()
				partnerId = id
			} else {
				error = "Sélectionnez un partenaire ou créez un nouveau joueur."
				return
			}

			// Étape 2 : inscrire avec le partenaire
			const regRes = await fetch(`/events/${eventId}/register`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ tournament_id: tournamentId, partner_player_id: partnerId })
			})
			if (regRes.ok) {
				onRegistered()
				open = false
				reset()
			} else {
				const data = await regRes.json().catch(() => ({}))
				error = data.message ?? "Erreur lors de l'inscription."
			}
		} finally {
			submitting = false
		}
	}

	function reset() {
		query = ""
		results = []
		selected = null
		showCreateForm = false
		newPartner = { first_name: "", last_name: "", department: "" }
		error = null
		submitting = false
	}

	$effect(() => {
		if (!open) reset()
	})
</script>

<Modal bind:open title="Inscription doubles — choisir un partenaire" size="md" outsideclose>
	<div class="space-y-4">
		<!-- Partner search -->
		{#if !selected}
			<div>
				<label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
					Rechercher un partenaire
				</label>
				<Input
					type="text"
					placeholder="Tapez au moins 3 caractères..."
					bind:value={query}
					disabled={showCreateForm}
				/>
				{#if results.length > 0}
					<ul
						class="mt-1 max-h-48 overflow-auto rounded-md border border-gray-200 bg-white shadow dark:border-gray-600 dark:bg-gray-700"
					>
						{#each results as player}
							<li>
								<button
									type="button"
									class="flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-600"
									onclick={() => selectPartner(player)}
								>
									<span class="font-medium"
										>{player.last_name} {player.first_name}</span
									>
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
		{:else}
			<!-- Selected partner display -->
			<div class="flex items-center gap-3 rounded-md bg-green-50 p-3 dark:bg-green-900/20">
				<span class="font-medium text-green-800 dark:text-green-200">
					Partenaire sélectionné : {selected.last_name}
					{selected.first_name}
					{#if selected.department}
						<span class="text-sm font-normal text-green-600 dark:text-green-400"
							>({selected.department})</span
						>
					{/if}
				</span>
				<Button
					size="xs"
					color="alternative"
					onclick={() => {
						selected = null
					}}>Changer</Button
				>
			</div>
		{/if}

		<!-- Create new player toggle -->
		<div>
			<button
				type="button"
				class="text-sm text-blue-600 hover:underline dark:text-blue-400"
				onclick={() => {
					showCreateForm = !showCreateForm
					selected = null
				}}
			>
				{showCreateForm
					? "▲ Annuler la création"
					: "▼ Joueur non trouvé ? Créer un nouveau joueur"}
			</button>

			{#if showCreateForm}
				<span class="mt-1 block text-sm text-red-500">
					Merci de bien vérifier que le joueur n'existe pas déjà avant de le créer. En cas
					de doute, contactez les organisateurs.</span
				>
				<div class="mt-3 grid grid-cols-2 gap-3">
					<Input placeholder="Prénom" bind:value={newPartner.first_name} />
					<Input placeholder="Nom" bind:value={newPartner.last_name} />
					<div class="col-span-2">
						<DepartmentSelect bind:value={newPartner.department} placeholder="Département" />
					</div>
				</div>
			{/if}
		</div>

		<!-- Error message -->
		{#if error}
			<p
				class="rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300"
			>
				{error}
			</p>
		{/if}
	</div>

	{#snippet footer()}
		<Button
			color="primary"
			onclick={confirm}
			disabled={(!selected && !showCreateForm) || submitting}
		>
			{submitting ? "Inscription en cours..." : "Confirmer"}
		</Button>
		<Button
			color="alternative"
			onclick={() => {
				onClose()
				open = false
				reset()
			}}
		>
			Annuler
		</Button>
	{/snippet}
</Modal>
