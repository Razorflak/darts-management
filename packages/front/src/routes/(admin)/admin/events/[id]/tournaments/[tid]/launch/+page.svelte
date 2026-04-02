<script lang="ts">
import { Alert, Badge, Button } from "flowbite-svelte"
import { goto } from "$app/navigation"
import { apiRoutes } from "$lib/fetch/api"
import type { LaunchPhasePreview } from "$lib/server/schemas/event-schemas.js"
import { PHASE_TYPE_LABELS } from "$lib/tournament/labels"
import type { PageData } from "./$types"

let { data }: { data: PageData } = $props()

const eventId = $derived(data.tournament.event_id)
const tournamentId = $derived(data.tournament.id)
const backUrl = $derived(`/admin/events/${eventId}/tournaments/${tournamentId}`)

type LaunchState = "idle" | "submitting" | "error"
let launchState = $state<LaunchState>("idle")
let errorMessage = $state("")

function estimateGroupCount(
	phase: LaunchPhasePreview,
	totalTeams: number,
): number {
	if (phase.players_per_group && phase.players_per_group > 0) {
		return Math.ceil(totalTeams / phase.players_per_group)
	}
	return 1
}

function estimateMatchCount(
	phase: LaunchPhasePreview,
	totalTeams: number,
): number {
	if (phase.type === "round_robin" || phase.type === "double_loss_groups") {
		const groups = estimateGroupCount(phase, totalTeams)
		const perGroup = phase.players_per_group ?? totalTeams
		const matchesPerGroup =
			phase.type === "round_robin"
				? (perGroup * (perGroup - 1)) / 2
				: perGroup * (perGroup - 1)
		return groups * matchesPerGroup
	}
	if (phase.type === "single_elimination") {
		const entrants = phase.qualifiers_count ?? totalTeams
		return entrants - 1
	}
	if (phase.type === "double_elimination") {
		const entrants = phase.qualifiers_count ?? totalTeams
		return entrants * 2 - 1
	}
	return 0
}

async function confirmLaunch() {
	launchState = "submitting"
	errorMessage = ""
	try {
		const res = await fetch(apiRoutes.TOURNAMENT_LAUNCH.path, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ tournament_id: tournamentId }),
		})
		if (!res.ok) {
			const body = await res.json().catch(() => ({}))
			errorMessage =
				(body as { message?: string }).message ??
				"Le lancement a échoué. Veuillez réessayer. Si le problème persiste, contactez l'administrateur."
			launchState = "error"
			return
		}
		launchState = "idle"
		await goto(backUrl)
	} catch {
		errorMessage =
			"Le lancement a échoué. Veuillez réessayer. Si le problème persiste, contactez l'administrateur."
		launchState = "error"
	}
}

const phaseTypeLabel = (type: string): string =>
	PHASE_TYPE_LABELS[type as keyof typeof PHASE_TYPE_LABELS] ?? type
</script>

<svelte:head>
	<title>Lancer {data.tournament.name}</title>
</svelte:head>

<!-- Breadcrumb -->
<nav class="mb-4 text-sm text-gray-500">
	<a href="/admin/events" class="hover:underline">Événements</a>
	<span class="mx-2">/</span>
	<a href="/admin/events/{eventId}" class="hover:underline"
		>{data.tournament.event_name}</a
	>
	<span class="mx-2">/</span>
	<a href={backUrl} class="hover:underline">{data.tournament.name}</a>
	<span class="mx-2">/</span>
	<span class="text-gray-800">Lancement</span>
</nav>

<h1 class="mb-6 text-2xl font-semibold text-gray-900">
	Lancer {data.tournament.name}
</h1>

{#if data.tournament.status === "started"}
	<Alert color="green" class="mb-6">
		Ce tournoi est déjà lancé. Consultez les matchs générés ci-dessous.
	</Alert>
	<Button href={backUrl} color="light">Retour au roster</Button>
{:else}
	<!-- Section 1: Récapitulatif des inscrits -->
	<section class="mb-6">
		<h2 class="mb-3 text-base font-semibold text-gray-800">Récapitulatif des inscrits</h2>
		<div class="flex items-center gap-3">
			<Badge color="blue" class="text-base">
				{data.totalCount} équipe{data.totalCount !== 1 ? "s" : ""} inscrite{data.totalCount !==
				1
					? "s"
					: ""}
			</Badge>
			{#if data.tournament.check_in_required}
				<span class="text-sm text-gray-600">
					{data.checkedInCount} / {data.totalCount} présents
				</span>
			{/if}
		</div>
		{#if data.totalCount === 0}
			<p class="mt-3 text-sm text-gray-500">
				Aucune équipe inscrite. Inscrivez des joueurs avant de lancer.
			</p>
		{/if}
	</section>

	<!-- Section 2: Avertissements (omit if none) -->
	{#if data.warnings.length > 0}
		<section class="mb-6">
			<h2 class="mb-3 text-base font-semibold text-gray-800">Avertissements</h2>
			<div class="flex flex-col gap-2">
				{#each data.warnings as warning}
					<Alert color="yellow">{warning}</Alert>
				{/each}
			</div>
		</section>
	{/if}

	<!-- Section 3: Structure générée -->
	{#if data.phases.length > 0}
		<section class="mb-6">
			<h2 class="mb-3 text-base font-semibold text-gray-800">Structure générée</h2>
			<div class="flex flex-col gap-3">
				{#each data.phases as phase, i}
					{@const groupCount = estimateGroupCount(phase, data.totalCount)}
					{@const matchCount = estimateMatchCount(phase, data.totalCount)}
					<div class="rounded border border-gray-200 bg-white p-4">
						<p class="font-semibold text-gray-800">
							Phase {i + 1} — {phaseTypeLabel(phase.type)}
						</p>
						<div class="mt-1 flex flex-wrap gap-4 text-sm text-gray-600">
							{#if phase.type === "round_robin" || phase.type === "double_loss_groups"}
								<span>{groupCount} poule{groupCount !== 1 ? "s" : ""}</span>
								<span>{phase.players_per_group ?? "?"} équipes / poule</span>
							{/if}
							<span>~{matchCount} match{matchCount !== 1 ? "s" : ""}</span>
							<span>{phase.sets_to_win} set{phase.sets_to_win !== 1 ? "s" : ""} pour gagner</span>
							<span>{phase.legs_per_set} jambe{phase.legs_per_set !== 1 ? "s" : ""} / set</span>
						</div>
					</div>
				{/each}
			</div>
		</section>
	{/if}

	<!-- Error alert -->
	{#if launchState === "error"}
		<Alert color="red" class="mb-4">{errorMessage}</Alert>
	{/if}

	<!-- Sticky action bar -->
	<div
		class="sticky bottom-0 flex items-center gap-4 border-t border-gray-200 bg-white py-4"
	>
		{#if launchState === "error"}
			<Button
				color="primary"
				class="min-h-[44px]"
				onclick={confirmLaunch}
			>
				Réessayer
			</Button>
		{:else}
			<Button
				color="primary"
				class="min-h-[44px]"
				disabled={launchState === "submitting"}
				onclick={confirmLaunch}
			>
				{launchState === "submitting" ? "Lancement en cours…" : "Confirmer le lancement"}
			</Button>
		{/if}
		<a href={backUrl} class="text-sm text-gray-600 hover:underline">Annuler</a>
	</div>
{/if}
