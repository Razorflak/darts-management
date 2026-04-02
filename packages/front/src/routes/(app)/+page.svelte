<script lang="ts">
import { Badge, Button } from "flowbite-svelte"
import {
	ArrowRightOutline,
	AwardSolid,
	CalendarMonthOutline,
	ChartMixedOutline,
	ClockSolid,
	LockSolid,
	UserSolid,
	UsersGroupOutline,
} from "flowbite-svelte-icons"
import type { Category } from "$lib/server/schemas/event-schemas"
import { CATEGORY_LABELS } from "$lib/tournament/labels"
import type { PageData } from "./$types"

let { data }: { data: PageData } = $props()

let openEvents = $state(data.openEvents)

const registeredCount = $derived(
	openEvents.reduce(
		(acc, { tournaments }) =>
			acc + tournaments.filter((t) => t.is_registered).length,
		0,
	),
)

const totalTournaments = $derived(
	openEvents.reduce((acc, { tournaments }) => acc + tournaments.length, 0),
)

function formatDateRange(start: Date, end: Date): string {
	const s = new Date(start)
	const e = new Date(end)
	if (s.toDateString() === e.toDateString()) {
		return s.toLocaleDateString("fr-FR", {
			day: "numeric",
			month: "long",
			year: "numeric",
		})
	}
	const sStr = s.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })
	const eStr = e.toLocaleDateString("fr-FR", {
		day: "numeric",
		month: "short",
		year: "numeric",
	})
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
      <UserSolid class="h-5 w-5 text-orange-500" />
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
			<AwardSolid class="h-3.5 w-3.5" />
		</span>
		Tournois disponibles
	</h2>

	{#if openEvents.length === 0}
		<div class="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-6 py-10 text-center">
			<CalendarMonthOutline class="mx-auto mb-3 h-8 w-8 text-gray-300" />
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
						<ArrowRightOutline class="h-4 w-4" />
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
			<LockSolid class="h-3.5 w-3.5" />
		</span>
		Bientôt disponible
	</h2>
	<div class="grid gap-4 sm:grid-cols-3">
		<div class="rounded-xl border border-dashed border-gray-200 bg-gray-50/40 p-5">
			<div class="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-white shadow-sm ring-1 ring-gray-100">
				<UsersGroupOutline class="h-4.5 w-4.5 text-primary-400" />
			</div>
			<h3 class="font-medium text-gray-500">Mon comité</h3>
			<p class="mt-1 text-xs text-gray-400 leading-relaxed">Actualités, résultats et classements de votre comité régional.</p>
		</div>

		<div class="rounded-xl border border-dashed border-gray-200 bg-gray-50/40 p-5">
			<div class="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-white shadow-sm ring-1 ring-gray-100">
				<ChartMixedOutline class="h-4.5 w-4.5 text-primary-400" />
			</div>
			<h3 class="font-medium text-gray-500">Mon championnat</h3>
			<p class="mt-1 text-xs text-gray-400 leading-relaxed">Suivi de votre progression, calendrier et classement en temps réel.</p>
		</div>

		<div class="rounded-xl border border-dashed border-gray-200 bg-gray-50/40 p-5">
			<div class="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-white shadow-sm ring-1 ring-gray-100">
				<ClockSolid class="h-4.5 w-4.5 text-primary-400" />
			</div>
			<h3 class="font-medium text-gray-500">Historique de matchs</h3>
			<p class="mt-1 text-xs text-gray-400 leading-relaxed">Vos résultats, statistiques et performances sur tous vos tournois.</p>
		</div>
	</div>
</section>
