<script lang="ts">
	import { Badge, Button } from "flowbite-svelte"
	import { CATEGORY_LABELS } from "$lib/tournament/labels"
	import type { Category } from "$lib/server/schemas/event-schemas"
	import type { PageData } from "./$types"

	let { data }: { data: PageData } = $props()

	let openEvents = $state(data.openEvents)

	const registeredCount = $derived(
		openEvents.reduce((acc, { tournaments }) => acc + tournaments.filter((t) => t.is_registered).length, 0)
	)

	const totalTournaments = $derived(
		openEvents.reduce((acc, { tournaments }) => acc + tournaments.length, 0)
	)

	function formatDateRange(start: Date, end: Date): string {
		const s = new Date(start)
		const e = new Date(end)
		if (s.toDateString() === e.toDateString()) {
			return s.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
		}
		const sStr = s.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })
		const eStr = e.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })
		return `${sStr} – ${eStr}`
	}

	const CATEGORY_COLORS = {
		male: "blue",
		female: "pink",
		junior: "yellow",
		veteran: "purple",
		open: "green",
		mix: "indigo",
		double: "blue",
		double_female: "pink",
		double_mix: "indigo",
	} as const satisfies Record<Category, string>
</script>

<svelte:head>
	<title>Tableau de bord — FFD Darts</title>
</svelte:head>

<!-- Header -->
<div class="mb-8">
	<p class="mb-1 text-xs font-semibold uppercase tracking-widest text-primary-500">Tableau de bord</p>
	<h1 class="text-3xl font-bold text-gray-900">Bonjour, {data.user?.name}&nbsp;!</h1>
	<p class="mt-1.5 text-sm text-gray-500">
		{#if totalTournaments === 0}
			Aucun tournoi ouvert aux inscriptions pour le moment.
		{:else if registeredCount === 0}
			{totalTournaments} tournoi{totalTournaments > 1 ? "s" : ""} ouvert{totalTournaments > 1 ? "s" : ""} aux inscriptions.
		{:else}
			Vous êtes inscrit à <strong class="text-gray-700">{registeredCount} tournoi{registeredCount > 1 ? "s" : ""}</strong> sur {totalTournaments} disponible{totalTournaments > 1 ? "s" : ""}.
		{/if}
	</p>
</div>

{#if data.user && !data.player}
  <div class="mb-6 rounded-xl border border-dashed border-orange-200 bg-orange-50/40 p-5">
    <div class="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-white shadow-sm ring-1 ring-orange-100">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="h-5 w-5 text-orange-500">
        <path fill-rule="evenodd" d="M7.5 6a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0ZM3.751 20.105a8.25 8.25 0 0 1 16.498 0 .75.75 0 0 1-.437.695A18.683 18.683 0 0 1 12 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 0 1-.437-.695Z" clip-rule="evenodd" />
      </svg>
    </div>
    <h3 class="font-medium text-orange-700">Compléter mon profil joueur</h3>
    <p class="mt-1 text-xs text-orange-600 leading-relaxed">
      Pour participer aux évènements de la FFD, créez vous un profil de joueur.
    </p>
    <a href="/profile/create" class="mt-3 inline-block text-xs font-medium text-orange-700 underline">
      Créer mon profil →
    </a>
  </div>
{/if}

<!-- Tournois disponibles -->
<section class="mb-10">
	<h2 class="mb-4 flex items-center gap-2 text-base font-semibold text-gray-800">
		<span class="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary-100 text-primary-600">
			<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="h-3.5 w-3.5">
				<path fill-rule="evenodd" d="M10 2a.75.75 0 0 1 .75.75v.258a33.186 33.186 0 0 1 6.668.83.75.75 0 0 1-.336 1.461 31.28 31.28 0 0 0-1.103-.232l1.702 7.545a.75.75 0 0 1-.387.832A4.981 4.981 0 0 1 15 14c-.825 0-1.606-.2-2.294-.556a.75.75 0 0 1-.387-.832l1.77-7.849a31.743 31.743 0 0 0-3.339-.254v11.505l1.102.504a.75.75 0 0 1-.5 1.415l-.602-.274V19a.75.75 0 0 1-1.5 0v-.761l-.602.274a.75.75 0 0 1-.5-1.415l1.102-.504V5.509a31.743 31.743 0 0 0-3.339.254l1.77 7.849a.75.75 0 0 1-.387.832A4.981 4.981 0 0 1 5 14a4.981 4.981 0 0 1-2.294-.556.75.75 0 0 1-.387-.832l1.702-7.545c-.37.07-.738.146-1.103.232a.75.75 0 0 1-.336-1.46 33.187 33.187 0 0 1 6.668-.83V2.75A.75.75 0 0 1 10 2ZM5 7.543 3.92 12.33a3.499 3.499 0 0 0 2.16 0L5 7.543Zm10 0-1.08 4.787a3.498 3.498 0 0 0 2.16 0L15 7.543Z" clip-rule="evenodd" />
			</svg>
		</span>
		Tournois disponibles
	</h2>

	{#if openEvents.length === 0}
		<div class="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-6 py-10 text-center">
			<svg xmlns="http://www.w3.org/2000/svg" class="mx-auto mb-3 h-8 w-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
				<path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
			</svg>
			<p class="font-medium text-gray-500">Aucun événement ouvert</p>
			<p class="mt-1 text-sm text-gray-400">Les prochains tournois apparaîtront ici dès l'ouverture des inscriptions.</p>
		</div>
	{:else}
		<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
			{#each openEvents as { event, tournaments } (event.id)}
				{@const registeredTournaments = tournaments.filter((t) => t.is_registered)}
				<a href={`/events/${event.id}`} class="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-[0_1px_3px_0_rgb(0_0_0/0.06)] transition-shadow hover:shadow-[0_4px_6px_-1px_rgb(0_0_0/0.08)]">
					<div class="min-w-0 flex-1">
						<h3 class="font-semibold leading-tight text-gray-900">{event.name}</h3>
						<p class="mt-1 text-xs text-gray-400">{event.entity_name} · {event.location}</p>
						<p class="mt-0.5 text-xs text-gray-500">{formatDateRange(event.starts_at, event.ends_at)}</p>
						{#if registeredTournaments.length > 0}
							<div class="mt-2.5 flex flex-wrap items-center gap-1.5">
								<span class="text-xs text-gray-400">Inscrit en</span>
								{#each registeredTournaments as t (t.id)}
									<Badge color={CATEGORY_COLORS[t.category]} class="text-xs">
										{CATEGORY_LABELS[t.category]}
									</Badge>
								{/each}
							</div>
						{/if}
					</div>
					<div class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-50 text-primary-600">
						<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="h-4 w-4">
							<path fill-rule="evenodd" d="M2 8a.75.75 0 0 1 .75-.75h8.69L8.22 4.03a.75.75 0 0 1 1.06-1.06l4.5 4.5a.75.75 0 0 1 0 1.06l-4.5 4.5a.75.75 0 0 1-1.06-1.06l3.22-3.22H2.75A.75.75 0 0 1 2 8Z" clip-rule="evenodd" />
						</svg>
					</div>
				</a>
			{/each}
		</div>
	{/if}
</section>

<!-- À venir -->
<section>
	<h2 class="mb-4 flex items-center gap-2 text-base font-semibold text-gray-400">
		<span class="inline-flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-gray-400">
			<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="h-3.5 w-3.5">
				<path fill-rule="evenodd" d="M10 1a4.5 4.5 0 0 0-4.5 4.5V9H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-.5V5.5A4.5 4.5 0 0 0 10 1Zm3 8V5.5a3 3 0 1 0-6 0V9h6Z" clip-rule="evenodd" />
			</svg>
		</span>
		Bientôt disponible
	</h2>
	<div class="grid gap-4 sm:grid-cols-3">
		<div class="rounded-xl border border-dashed border-gray-200 bg-gray-50/40 p-5">
			<div class="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-white shadow-sm ring-1 ring-gray-100">
				<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="h-4.5 w-4.5 text-primary-400">
					<path d="M10 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM6 8a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM1.49 15.326a.78.78 0 0 1-.358-.442 3 3 0 0 1 4.308-3.516 6.484 6.484 0 0 0-1.905 3.959c-.023.222-.014.442.025.654a4.97 4.97 0 0 1-2.07-.655ZM16.44 15.98a4.97 4.97 0 0 0 2.07-.654.78.78 0 0 0 .357-.442 3 3 0 0 0-4.308-3.517 6.484 6.484 0 0 1 1.907 3.96 2.32 2.32 0 0 1-.026.654ZM18 8a2 2 0 1 1-4 0 2 2 0 0 1 4 0ZM5.304 16.19a.844.844 0 0 1-.277-.71 5 5 0 0 1 9.947 0 .843.843 0 0 1-.277.71A6.975 6.975 0 0 1 10 18a6.974 6.974 0 0 1-4.696-1.81Z" />
				</svg>
			</div>
			<h3 class="font-medium text-gray-500">Mon comité</h3>
			<p class="mt-1 text-xs text-gray-400 leading-relaxed">Actualités, résultats et classements de votre comité régional.</p>
		</div>

		<div class="rounded-xl border border-dashed border-gray-200 bg-gray-50/40 p-5">
			<div class="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-white shadow-sm ring-1 ring-gray-100">
				<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="h-4.5 w-4.5 text-primary-400">
					<path d="M2 11a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-5ZM8 7a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V7ZM14 4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1V4Z" />
				</svg>
			</div>
			<h3 class="font-medium text-gray-500">Mon championnat</h3>
			<p class="mt-1 text-xs text-gray-400 leading-relaxed">Suivi de votre progression, calendrier et classement en temps réel.</p>
		</div>

		<div class="rounded-xl border border-dashed border-gray-200 bg-gray-50/40 p-5">
			<div class="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-white shadow-sm ring-1 ring-gray-100">
				<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="h-4.5 w-4.5 text-primary-400">
					<path fill-rule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm.75-13a.75.75 0 0 0-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 0 0 0-1.5h-3.25V5Z" clip-rule="evenodd" />
				</svg>
			</div>
			<h3 class="font-medium text-gray-500">Historique de matchs</h3>
			<p class="mt-1 text-xs text-gray-400 leading-relaxed">Vos résultats, statistiques et performances sur tous vos tournois.</p>
		</div>
	</div>
</section>
