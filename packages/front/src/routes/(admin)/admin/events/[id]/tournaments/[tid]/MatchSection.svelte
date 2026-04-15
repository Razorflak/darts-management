<script lang="ts">
import type { StandingEntry } from "@darts-management/domain"
import { Alert } from "flowbite-svelte"
import { ChevronDownOutline, ChevronRightOutline } from "flowbite-svelte-icons"
import { tick, untrack } from "svelte"
import { apiRoutes } from "$lib/fetch/api"
import type { MatchDisplay } from "$lib/server/schemas/event-schemas.js"
import {
	DONE_STATUSES,
	isMatchHighlighted,
} from "$lib/tournament/components/bracket/bracket-utils.js"
import { BracketView } from "$lib/tournament/components/bracket/index.js"
import { PHASE_TYPE_LABELS } from "$lib/tournament/labels"
import RoundRobinGroupView from "./RoundRobinGroupView.svelte"
import ScoreModal from "./ScoreModal.svelte"

let {
	matches,
	standingsByPhase,
	teamNames,
	eventId,
}: {
	matches: MatchDisplay[]
	standingsByPhase: Record<string, StandingEntry[]> | null
	teamNames: Record<string, string>
	eventId: string
} = $props()

let scoreModalOpen = $state(false)
let selectedMatch = $state<MatchDisplay | null>(null)

const BRACKET_TYPES = new Set([
	"single_elimination",
	"double_elimination",
	"double_loss_groups",
])

function groupLabel(n: number): string {
	return String.fromCharCode(65 + n)
}

// ─── État par phase ───────────────────────────────────────────────────────────

let phaseOpen = $state<Record<string, boolean>>({})
let phaseSelectedGroup = $state<Record<string, number | null>>({})
let phaseSearchQuery = $state<Record<string, string>>({})
let phaseSearchIndex = $state<Record<string, number>>({})
let bracketScrollTrigger = $state<
	Record<string, { matchId: number; nonce: number } | null>
>({})
let phaseContainerEls: Record<string, HTMLElement> = {}
let scrollNonce = 0

// ─── Groupage des matchs par phase puis par groupe ────────────────────────────

const phaseGroups = $derived.by(() => {
	const phaseMap = new Map<
		string,
		{
			phaseType: string
			phasePosition: number
			groups: Map<number | null, MatchDisplay[]>
		}
	>()
	for (const m of matches) {
		if (!phaseMap.has(m.phase_id)) {
			phaseMap.set(m.phase_id, {
				phaseType: m.phase_type,
				phasePosition: m.phase_position,
				groups: new Map(),
			})
		}
		const phase = phaseMap.get(m.phase_id)
		if (!phase) continue
		if (!phase.groups.has(m.group_number)) phase.groups.set(m.group_number, [])
		phase.groups.get(m.group_number)?.push(m)
	}
	return [...phaseMap.entries()]
		.sort(([, a], [, b]) => a.phasePosition - b.phasePosition)
		.map(([phaseId, { phaseType, phasePosition, groups }]) => ({
			phaseId,
			phaseType,
			phasePosition,
			groups: [...groups.entries()].sort(([a], [b]) => (a ?? -1) - (b ?? -1)),
		}))
})

// Initialisation de l'état pour chaque phase découverte
$effect(() => {
	for (const { phaseId, groups } of phaseGroups) {
		const isFirst = phaseId === phaseGroups[0]?.phaseId
		if (!untrack(() => phaseId in phaseOpen)) {
			phaseOpen[phaseId] = isFirst
		}
		if (!untrack(() => phaseId in phaseSelectedGroup)) {
			phaseSelectedGroup[phaseId] = groups[0]?.[0] ?? null
		}
	}
})

// ─── Helpers ─────────────────────────────────────────────────────────────────

// Comptage done/total par phaseId (évite les faux positifs Biome sur usage template)
const phaseMatchCounts = $derived(
	Object.fromEntries(
		phaseGroups.map(({ phaseId, groups }) => {
			const all = groups.flatMap(([, ms]) => ms)
			const playable = all.filter((m) => m.status !== "bye")
			const done = playable.filter((m) => DONE_STATUSES.has(m.status)).length
			return [phaseId, { done, total: playable.length }]
		}),
	),
)

// Comptage des résultats de recherche par phaseId
const phaseSearchResultCounts = $derived(
	Object.fromEntries(
		phaseGroups.map(({ phaseId, groups }) => {
			const query = phaseSearchQuery[phaseId] ?? ""
			if (!query.trim()) return [phaseId, 0]
			const count = groups.reduce(
				(acc, [, ms]) =>
					acc + ms.filter((m) => isMatchHighlighted(m, query)).length,
				0,
			)
			return [phaseId, count]
		}),
	),
)

// ─── Navigation de recherche cross-groupe ────────────────────────────────────

async function navigateSearch(phaseId: string, direction: 1 | -1) {
	const phase = phaseGroups.find((p) => p.phaseId === phaseId)
	if (!phase) return

	const query = phaseSearchQuery[phaseId] ?? ""
	if (!query.trim()) return

	const allHighlighted = phase.groups.flatMap(([groupNumber, groupMatches]) =>
		groupMatches
			.filter((m) => isMatchHighlighted(m, query))
			.map((m) => ({ groupNumber, matchId: m.event_match_id })),
	)
	if (!allHighlighted.length) return

	const currentIdx = phaseSearchIndex[phaseId] ?? -1
	const len = allHighlighted.length
	const newIdx = (((currentIdx + direction) % len) + len) % len
	phaseSearchIndex[phaseId] = newIdx

	const { groupNumber, matchId } = allHighlighted[newIdx]

	// Changer de groupe si nécessaire puis attendre le rendu
	if (phaseSelectedGroup[phaseId] !== groupNumber) {
		phaseSelectedGroup[phaseId] = groupNumber
		await tick()
	}

	if (BRACKET_TYPES.has(phase.phaseType)) {
		bracketScrollTrigger[phaseId] = { matchId, nonce: scrollNonce++ }
	} else {
		const container = phaseContainerEls[phaseId]
		const el = container?.querySelector(`[data-match-id="${matchId}"]`)
		el?.scrollIntoView({ behavior: "smooth", block: "nearest" })
	}
}

// ─── ScoreModal ───────────────────────────────────────────────────────────────

function openScoreModal(m: MatchDisplay) {
	selectedMatch = m
	scoreModalOpen = true
}
</script>

{#if matches.length === 0}
	<p class="mb-6 text-sm text-gray-500">
		Les matchs seront affichés après le lancement du tournoi.
	</p>
	<Alert color="yellow" class="mt-4">
		Aucun match généré. Le lancement semble avoir échoué. Essayez d'annuler et
		relancer.
	</Alert>
{:else}
	<section class="mb-6">
		<h2 class="mb-4 text-base font-semibold text-gray-800">Matchs générés</h2>

		{#each phaseGroups as { phaseId, phaseType, phasePosition, groups }, phaseIdx}
			{@const open = phaseOpen[phaseId] ?? phaseIdx === 0}
			{@const selectedGroup = phaseSelectedGroup[phaseId] ?? groups[0]?.[0] ?? null}
			{@const typeLabel =
				PHASE_TYPE_LABELS[phaseType as keyof typeof PHASE_TYPE_LABELS] ??
				phaseType}
			{@const counts = phaseMatchCounts[phaseId] ?? { done: 0, total: 0 }}
			{@const searchQuery = phaseSearchQuery[phaseId] ?? ""}
			{@const resultCount = phaseSearchResultCounts[phaseId] ?? 0}
			{@const searchIdx = phaseSearchIndex[phaseId] ?? -1}
			{@const currentGroupMatches =
				groups.find(([n]) => n === selectedGroup)?.[1] ?? groups[0]?.[1] ?? []}

			<div
				class="mb-3 overflow-hidden rounded-lg border border-gray-200 bg-white"
			>
				<!-- Header accordéon -->
				<button
					type="button"
					onclick={() => {
						phaseOpen[phaseId] = !open
					}}
					class="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-gray-50"
				>
					<span class="font-semibold text-gray-800">
						Phase {phasePosition + 1} : {typeLabel}
					</span>
					<span class="flex items-center gap-2 text-sm text-gray-500">
						{counts.done}/{counts.total}
						matchs terminés
						{#if open}
							<ChevronDownOutline class="h-4 w-4" />
						{:else}
							<ChevronRightOutline class="h-4 w-4" />
						{/if}
					</span>
				</button>

				<!-- Contenu de l'accordéon -->
				{#if open}
					<div
						class="overflow-y-auto border-t border-gray-100"
						bind:this={phaseContainerEls[phaseId]}
					>
						<!-- Toolbar sticky (recherche + boutons groupes) -->
						<div
							class="sticky top-0 z-10 flex flex-wrap items-center gap-2 border-b border-gray-100 bg-white px-4 py-2"
						>
							<!-- Recherche -->
							<form
								onsubmit={(e) => {
									e.preventDefault()
									navigateSearch(phaseId, 1)
								}}
								class="flex items-center gap-1"
							>
								<input
									type="search"
									placeholder="Rechercher une équipe…"
									value={searchQuery}
									oninput={(e) => {
										phaseSearchQuery[phaseId] = e.currentTarget.value
										phaseSearchIndex[phaseId] = -1
									}}
									class="w-44 rounded border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
								>
								{#if searchQuery.trim() && resultCount > 0}
									{#if searchIdx >= 0}
										<span class="text-xs text-gray-500 tabular-nums">
											{searchIdx + 1}/{resultCount}
										</span>
									{/if}
									<button
										type="button"
										onclick={() => navigateSearch(phaseId, -1)}
										class="rounded px-1 py-0.5 text-gray-500 hover:bg-gray-100"
										title="Résultat précédent"
									>
										‹
									</button>
									<button
										type="submit"
										class="rounded px-1 py-0.5 text-gray-500 hover:bg-gray-100"
										title="Résultat suivant"
									>
										›
									</button>
								{/if}
							</form>

							<!-- Navigation groupes -->
							{#if groups.length > 1}
								{@const selectedGroupIdx = groups.findIndex(([n]) => n === selectedGroup)}
								<div class="flex items-center gap-1">
									<button
										type="button"
										disabled={selectedGroupIdx <= 0}
										onclick={() => {
											const prev = groups[selectedGroupIdx - 1]
											if (prev) phaseSelectedGroup[phaseId] = prev[0]
										}}
										class="rounded border border-gray-300 px-2 py-1 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
									>
										‹
									</button>

									<select
										value={String(selectedGroup)}
										onchange={(e) => {
											const val = e.currentTarget.value
											phaseSelectedGroup[phaseId] = val === "null" ? null : Number(val)
										}}
										class="rounded border border-gray-300 px-2 py-1 text-sm text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-400"
									>
										{#each groups as [ groupNumber ]}
											<option value={String(groupNumber)}>
												Groupe {groupLabel(groupNumber ?? 0)}
											</option>
										{/each}
									</select>

									<button
										type="button"
										disabled={selectedGroupIdx >= groups.length - 1}
										onclick={() => {
											const next = groups[selectedGroupIdx + 1]
											if (next) phaseSelectedGroup[phaseId] = next[0]
										}}
										class="rounded border border-gray-300 px-2 py-1 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
									>
										›
									</button>
								</div>
							{/if}
						</div>

						<!-- Matchs du groupe sélectionné -->
						<div class="p-4">
							{#if BRACKET_TYPES.has(phaseType)}
								<BracketView
									matches={currentGroupMatches}
									phaseName={`Phase ${phasePosition + 1}`}
									{eventId}
									onMatchClick={openScoreModal}
									{searchQuery}
									scrollTrigger={bracketScrollTrigger[phaseId] ?? null}
								/>
							{:else}
								<RoundRobinGroupView
									matches={currentGroupMatches}
									standings={standingsByPhase?.[`${phaseId}-${selectedGroup}`]}
									teamNames={new Map(Object.entries(teamNames))}
									{searchQuery}
									onMatchClick={openScoreModal}
								/>
							{/if}

							<!-- Passer à la phase suivante -->
							<div class="mt-4 border-t border-gray-100 pt-3">
								<button
									type="button"
									class="text-sm text-blue-600 hover:underline"
									onclick={() =>
										fetch(apiRoutes.TOURNAMENT_ADVANCE_PHASE.path, {
											body: JSON.stringify({
												phase_id: phaseId,
												event_id: eventId,
											}),
											method: "POST",
											headers: { "Content-Type": "application/json" },
										}).then((res) => {
											if (!res.ok)
												alert("Erreur lors du passage à la phase suivante")
										})}
								>
									Passer à la phase suivante
								</button>
							</div>
						</div>
					</div>
				{/if}
			</div>
		{/each}
	</section>
{/if}

<ScoreModal bind:open={scoreModalOpen} match={selectedMatch} {eventId} />
