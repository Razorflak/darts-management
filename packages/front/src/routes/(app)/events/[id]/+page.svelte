<script lang="ts">
	import { Badge, Button, Card } from "flowbite-svelte"
	import { CATEGORY_LABELS } from "$lib/tournament/labels"
	import type { PageData } from "./$types"

	let { data }: { data: PageData } = $props()

	let tournaments = $state(data.tournaments)

	async function register(tournamentId: string) {
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

<div class="container mx-auto max-w-3xl p-4">
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
		<div class="flex flex-col gap-4">
			{#each tournaments as tournament (tournament.id)}
				<Card class="p-4">
					<div class="flex items-start justify-between gap-4">
						<div>
							<h3 class="text-lg font-semibold text-gray-900 dark:text-white">
								{tournament.name}
							</h3>
							<p class="text-sm text-gray-500 dark:text-gray-400">
								{CATEGORY_LABELS[tournament.category]}
							</p>
							<p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
								{tournament.registration_count} inscrit{tournament.registration_count !==
								1
									? "s"
									: ""}
							</p>
						</div>
						<div class="flex shrink-0 items-center gap-2">
							{#if data.canRegister}
								{#if tournament.is_registered}
									<Button color="green" disabled>Inscrit ✓</Button>
									<Button
										color="red"
										size="xs"
										onclick={() => unregister(tournament.id)}
										>Se désinscrire</Button
									>
								{:else}
									<Button color="primary" onclick={() => register(tournament.id)}>
										S'inscrire
									</Button>
								{/if}
							{:else}
								<span class="text-sm text-gray-400 dark:text-gray-500"
									>Inscriptions fermées</span
								>
							{/if}
						</div>
					</div>
				</Card>
			{/each}
		</div>
	{/if}
</div>
