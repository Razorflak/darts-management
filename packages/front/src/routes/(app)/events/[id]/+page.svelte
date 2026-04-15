<script lang="ts">
import { Badge, Button } from "flowbite-svelte"
import { CheckOutline } from "flowbite-svelte-icons"
import { invalidateAll } from "$app/navigation"
import { page } from "$app/state"
import { apiRoutes } from "$lib/fetch/api"
import DoublesModal from "$lib/tournament/components/DoublesModal.svelte"
import { CATEGORY_LABELS } from "$lib/tournament/labels"
import { isDoublesTournament } from "$lib/tournament/utils"
import type { PageData } from "./$types"

let { data }: { data: PageData } = $props()

let tournaments = $derived(data.tournaments)

let doublesModal = $state<{ open: boolean; tournamentId: string }>({
	open: false,
	tournamentId: "",
})

function openDoublesModal(tournamentId: string) {
	doublesModal = { open: true, tournamentId }
}

async function registerSolo(tournamentId: string) {
	if (!data.player?.id) return
	const res = await fetch(apiRoutes.TOURNAMENT_REGISTER.path, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			tournament_id: tournamentId,
			team: [{ id: data.player.id }],
		}),
	})
	if (res.ok) {
		await invalidateAll()
	}
}

async function unregister(registrationId: string | null) {
	if (!registrationId) return
	const res = await fetch(apiRoutes.TOURNAMENT_UNEREGISER.path, {
		method: "DELETE",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ registration_id: registrationId }),
	})
	if (res.ok) {
		await invalidateAll()
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

<!-- En-tête de l'événement -->
<div class="mb-6">
	<div class="mb-1 flex flex-wrap items-center gap-2">
		<h1 class="page-title">{data.event.name}</h1>
		<Badge color={statusColor(data.event.status)}>
			{statusLabel(data.event.status)}
		</Badge>
	</div>
	<p class="page-subtitle">{data.event.entity.name}</p>
	<div
		class="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm"
		style="color: oklch(55% 0.01 264);"
	>
		<span>
			Du {data.event.starts_at.toLocaleDateString("fr-FR")} au
			{data.event.ends_at.toLocaleDateString("fr-FR")}
		</span>
		<span>{data.event.location}</span>
	</div>
	{#if data.event.registration_opens_at}
		<p class="mt-1 text-sm" style="color: oklch(55% 0.01 264);">
			Inscriptions ouvertes à partir du
			{data.event.registration_opens_at.toLocaleDateString("fr-FR")}
		</p>
	{/if}
</div>

{#if data.user && !data.player}
	<div
		class="mb-6 rounded-xl border border-red-200 p-4"
		style="background: oklch(98% 0.03 25);"
	>
		<p class="text-sm" style="color: oklch(40% 0.18 25);">
			Vous devez compléter votre profil joueur pour vous inscrire à un tournoi.
			<a
				href="/profile/create?redirectTo={encodeURIComponent(page.url.pathname)}"
				class="font-semibold underline"
				>Créer mon profil</a
			>
		</p>
	</div>
{/if}

<!-- Liste des tournois -->
<h2 class="section-title mb-4">Tournois</h2>

{#if tournaments.length === 0}
	<div class="empty-state">
		<p class="text-sm" style="color: oklch(55% 0.01 264);">
			Aucun tournoi disponible pour cet événement.
		</p>
	</div>
{:else}
	<div class="grid gap-3 sm:grid-cols-2">
		{#each tournaments as tournament (tournament.id)}
			<div class="app-card flex items-center gap-4 px-4 py-3.5">
				<div class="min-w-0 flex-1">
					<h3
						class="font-semibold leading-tight"
						style="color: oklch(18% 0.02 264);"
					>
						{CATEGORY_LABELS[tournament.category]}
					</h3>
					<p class="mt-0.5 text-xs" style="color: oklch(60% 0.01 264);">
						{tournament.start_at.toLocaleDateString("fr-FR")}
						à
						{tournament.start_at.toLocaleTimeString("fr-FR", {
							hour: "2-digit",
							minute: "2-digit",
						})}
					</p>
					{#if tournament.is_registered}
						<div
							class="mt-1.5 flex items-center gap-1 text-xs font-medium"
							style="color: var(--color-success-600);"
						>
							<CheckOutline class="h-3.5 w-3.5" />
							Inscrit{tournament.partner?.trim() !== "" ? ` (avec ${tournament.partner})` : ""}
						</div>
					{/if}
				</div>
				<div class="shrink-0">
					{#if data.canRegister}
						{#if tournament.is_registered}
							<Button
								color="red"
								size="xs"
								onclick={() => unregister(tournament.registration_id)}
							>
								Se désinscrire
							</Button>
						{:else if isDoublesTournament(tournament.category)}
							<Button
								color="primary"
								size="xs"
								disabled={!data.player}
								onclick={() => openDoublesModal(tournament.id)}
							>
								S'inscrire (doubles)
							</Button>
						{:else}
							<Button
								color="primary"
								size="xs"
								disabled={!data.player}
								onclick={() => registerSolo(tournament.id)}
							>
								S'inscrire
							</Button>
						{/if}
					{:else}
						<span class="text-xs" style="color: oklch(65% 0.01 264);">
							Inscriptions fermées
						</span>
					{/if}
				</div>
			</div>
		{/each}
	</div>
{/if}

<DoublesModal
	bind:open={doublesModal.open}
	tournamentId={doublesModal.tournamentId}
	eventId={data.event.id}
	onClose={() => (doublesModal.open = false)}
	onRegistered={async () => {
		await invalidateAll()
		doublesModal.open = false
	}}
/>
