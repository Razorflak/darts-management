<script lang="ts">
	import { Badge, Button } from "flowbite-svelte"
	import { CATEGORY_LABELS } from "$lib/tournament/labels"
	import DoublesModal from "$lib/tournament/components/DoublesModal.svelte"
	import type { PageData } from "./$types"

	let { data }: { data: PageData } = $props()

	let tournaments = $state(data.tournaments)

	const DOUBLES_CATEGORIES = ["double", "double_female", "double_mix"] as const
	function isDoubles(category: string): boolean {
		return (DOUBLES_CATEGORIES as readonly string[]).includes(category)
	}

	let doublesModal = $state<{ open: boolean; tournamentId: string }>({
		open: false,
		tournamentId: ""
	})

	function openDoublesModal(tournamentId: string) {
		doublesModal = { open: true, tournamentId }
	}

	async function registerSolo(tournamentId: string) {
		const res = await fetch(`/events/${data.event.id}/register`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ tournament_id: tournamentId })
		})
		if (res.ok) {
			const t = tournaments.find((t) => t.id === tournamentId)
			if (t) {
				t.is_registered = true
				t.registration_count++
			}
		}
	}

	async function unregister(tournamentId: string) {
		const res = await fetch(`/events/${data.event.id}/register`, {
			method: "DELETE",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ tournament_id: tournamentId })
		})
		if (res.ok) {
			const t = tournaments.find((t) => t.id === tournamentId)
			if (t) {
				t.is_registered = false
				t.registration_count--
			}
		}
	}

	function statusColor(status: string) {
		if (status === "ready") return "green"
		if (status === "started") return "yellow"
		return "gray"
	}

	function statusLabel(status: string) {
		if (status === "ready") return "Ouvert"
		if (status === "started") return "En cours"
		return "Terminé"
	}
</script>

<div>
	<!-- Event header -->
	<div class="mb-6">
		<div class="mb-2 flex items-center gap-3">
			<h1 class="text-3xl font-bold text-gray-900 dark:text-white">{data.event.name}</h1>
			<Badge color={statusColor(data.event.status)}>{statusLabel(data.event.status)}</Badge>
		</div>
		<p class="text-gray-600 dark:text-gray-400">{data.event.entity.name}</p>
		<div class="mt-2 flex flex-wrap gap-4 text-sm text-gray-500 dark:text-gray-400">
			<span>
				Du {data.event.starts_at.toLocaleDateString("fr-FR")} au {data.event.ends_at.toLocaleDateString(
					"fr-FR"
				)}
			</span>
			<span>{data.event.location}</span>
		</div>
		{#if data.event.registration_opens_at}
			<p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
				Inscriptions ouvertes à partir du {data.event.registration_opens_at.toLocaleDateString(
					"fr-FR"
				)}
			</p>
		{/if}
	</div>

	<!-- Tournament list -->
	<h2 class="mb-4 text-xl font-semibold text-gray-800 dark:text-white">Tournois</h2>

	{#if tournaments.length === 0}
		<p class="text-gray-500 dark:text-gray-400">Aucun tournoi disponible pour cet événement.</p>
	{:else}
		<div class="flex flex-wrap gap-3 [&>*]:min-w-80">
			{#each tournaments as tournament (tournament.id)}
				<div class="flex items-center gap-4 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-[0_1px_3px_0_rgb(0_0_0/0.06)]">
					<div class="min-w-0 flex-1">
						<h3 class="font-semibold leading-tight text-gray-900">{tournament.name}</h3>
						<p class="mt-0.5 text-xs text-gray-400">{CATEGORY_LABELS[tournament.category]}</p>
						<div class="mt-1.5 flex items-center gap-1 text-xs font-medium text-green-600 {tournament.is_registered ? '' : 'invisible'}">
							<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="h-3.5 w-3.5">
								<path fill-rule="evenodd" d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z" clip-rule="evenodd" />
							</svg>
							Inscrit
						</div>
					</div>
					<div class="shrink-0">
						{#if data.canRegister}
							{#if tournament.is_registered}
								<Button color="red" size="xs" onclick={() => unregister(tournament.id)}>
									Se désinscrire
								</Button>
							{:else if isDoubles(tournament.category)}
								<Button color="primary" size="xs" onclick={() => openDoublesModal(tournament.id)}>
									S'inscrire (doubles)
								</Button>
							{:else}
								<Button color="primary" size="xs" onclick={() => registerSolo(tournament.id)}>
									S'inscrire
								</Button>
							{/if}
						{:else}
							<span class="text-xs text-gray-400">Inscriptions fermées</span>
						{/if}
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>

<DoublesModal
	bind:open={doublesModal.open}
	tournamentId={doublesModal.tournamentId}
	eventId={data.event.id}
	onClose={() => (doublesModal.open = false)}
	onRegistered={() => {
		const t = tournaments.find((t) => t.id === doublesModal.tournamentId)
		if (t) {
			t.is_registered = true
			t.registration_count++
		}
		doublesModal.open = false
	}}
/>
