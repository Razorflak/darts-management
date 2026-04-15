<script lang="ts">
import { Badge } from "flowbite-svelte"
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

<svelte:head> <title>Tableau de bord — FFD Darts</title> </svelte:head>

<!-- En-tête -->
<div class="mb-8">
	<p class="page-eyebrow">Tableau de bord</p>
	<h1 class="page-title">Bonjour, {data.user?.name}&nbsp;!</h1>
	<p class="page-subtitle">
		{#if totalTournaments === 0}
			Aucun tournoi ouvert aux inscriptions pour le moment.
		{:else if registeredCount === 0}
			{totalTournaments}
			tournoi{totalTournaments > 1 ? "s" : ""}
			ouvert{totalTournaments > 1 ? "s" : ""}
			aux inscriptions.
		{:else}
			Vous êtes inscrit à
			<strong style="color: oklch(30% 0.02 264);"
				>{registeredCount}
				tournoi{registeredCount > 1 ? "s" : ""}</strong
			>
			sur {totalTournaments} disponible{totalTournaments > 1 ? "s" : ""}.
		{/if}
	</p>
</div>

<!-- Bannière profil manquant -->
{#if data.user && !data.player}
	<div
		class="mb-6 rounded-xl border p-5"
		style="border-color: oklch(80% 0.12 85); background: oklch(98% 0.03 85 / 0.5);"
	>
		<div
			class="mb-3 flex h-9 w-9 items-center justify-center rounded-lg shadow-sm"
			style="background: white; border: 1px solid oklch(88% 0.1 85);"
		>
			<UserSolid class="h-5 w-5" style="color: oklch(60% 0.18 85);" />
		</div>
		<h3 class="font-semibold" style="color: oklch(42% 0.16 85);">
			Compléter mon profil joueur
		</h3>
		<p class="mt-1 text-xs leading-relaxed" style="color: oklch(52% 0.14 85);">
			Pour participer aux évènements de la FFD, créez vous un profil de joueur.
		</p>
		<a
			href="/profile/create"
			class="mt-3 inline-flex items-center gap-1 text-xs font-semibold underline"
			style="color: oklch(42% 0.16 85);"
		>
			Créer mon profil
			<ArrowRightOutline class="h-3 w-3" />
		</a>
	</div>
{/if}

<!-- Tournois disponibles -->
<section class="mb-10">
	<h2 class="section-title mb-4">
		<span
			class="inline-flex h-6 w-6 items-center justify-center rounded-full"
			style="background: var(--color-primary-100); color: var(--color-primary-600);"
		>
			<AwardSolid class="h-3.5 w-3.5" />
		</span>
		Tournois disponibles
	</h2>

	{#if openEvents.length === 0}
		<div class="empty-state">
			<CalendarMonthOutline
				class="mx-auto mb-3 h-8 w-8"
				style="color: var(--color-border-strong);"
			/>
			<p class="font-medium" style="color: oklch(50% 0.01 264);">
				Aucun événement ouvert
			</p>
			<p class="mt-1 text-sm" style="color: oklch(65% 0.01 264);">
				Les prochains tournois apparaîtront ici dès l'ouverture des
				inscriptions.
			</p>
		</div>
	{:else}
		<div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
			{#each openEvents as { event, tournaments } (event.id)}
				{@const registeredTournaments = tournaments.filter((t) => t.is_registered)}
				<a
					href="/events/{event.id}"
					class="app-card flex items-center gap-3 p-4 transition-shadow hover:shadow-[var(--shadow-card-hover)]"
				>
					<div class="min-w-0 flex-1">
						<h3
							class="font-semibold leading-tight"
							style="color: oklch(18% 0.02 264);"
						>
							{event.name}
						</h3>
						<p class="mt-1 text-xs" style="color: oklch(60% 0.01 264);">
							{event.entity_name}
							· {event.location}
						</p>
						<p class="mt-0.5 text-xs" style="color: oklch(55% 0.01 264);">
							{formatDateRange(event.starts_at, event.ends_at)}
						</p>
						{#if registeredTournaments.length > 0}
							<div class="mt-2.5 flex flex-wrap items-center gap-1.5">
								<span class="text-xs" style="color: oklch(60% 0.01 264);"
									>Inscrit en</span
								>
								{#each registeredTournaments as t (t.id)}
									<Badge color={CATEGORY_COLORS[t.category]} class="text-xs">
										{CATEGORY_LABELS[t.category]}
									</Badge>
								{/each}
							</div>
						{/if}
					</div>
					<div
						class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
						style="background: var(--color-primary-50); color: var(--color-primary-600);"
					>
						<ArrowRightOutline class="h-4 w-4" />
					</div>
				</a>
			{/each}
		</div>
	{/if}
</section>

<!-- À venir -->
<section>
	<h2 class="section-title mb-4" style="color: oklch(65% 0.01 264);">
		<span
			class="inline-flex h-6 w-6 items-center justify-center rounded-full"
			style="background: oklch(94% 0.005 264); color: oklch(65% 0.01 264);"
		>
			<LockSolid class="h-3.5 w-3.5" />
		</span>
		Bientôt disponible
	</h2>
	<div class="grid gap-4 sm:grid-cols-3">
		{#each [
			{
				Icon: UsersGroupOutline,
				title: "Mon comité",
				desc: "Actualités, résultats et classements de votre comité régional.",
			},
			{
				Icon: ChartMixedOutline,
				title: "Mon championnat",
				desc: "Suivi de votre progression, calendrier et classement en temps réel.",
			},
			{
				Icon: ClockSolid,
				title: "Historique de matchs",
				desc: "Vos résultats, statistiques et performances sur tous vos tournois.",
			},
		] as { Icon, title, desc }}
			<div
				class="rounded-xl border border-dashed p-5"
				style="border-color: var(--color-border); background: var(--color-surface-muted);"
			>
				<div
					class="mb-3 flex h-9 w-9 items-center justify-center rounded-lg shadow-sm"
					style="background: white; border: 1px solid var(--color-border);"
				>
					<Icon class="h-4.5 w-4.5" style="color: var(--color-primary-400);" />
				</div>
				<h3 class="font-medium" style="color: oklch(55% 0.01 264);">{title}</h3>
				<p
					class="mt-1 text-xs leading-relaxed"
					style="color: oklch(65% 0.01 264);"
				>
					{desc}
				</p>
			</div>
		{/each}
	</div>
</section>
