<script lang="ts">
import {
	Alert,
	Badge,
	Button,
	Input,
	Table,
	TableBody,
	TableBodyCell,
	TableBodyRow,
	TableHead,
	TableHeadCell,
} from "flowbite-svelte"
import { invalidateAll } from "$app/navigation"
import { confirm } from "$lib/confirm.svelte.js"
import { apiRoutes } from "$lib/fetch/api"
import type { RosterEntry } from "$lib/server/schemas/event-schemas.js"
import {
	TOURNAMENT_STATUS_COLORS,
	TOURNAMENT_STATUS_LABELS,
	TOURNAMENT_STATUS_NEXT,
	TOURNAMENT_STATUS_PREV,
} from "$lib/tournament/labels"
import type { PageData } from "./$types"
import PhaseMatchTable from "./PhaseMatchTable.svelte"
import RegistrationModal from "./RegistrationModal.svelte"

let { data }: { data: PageData } = $props()

// Dériver les valeurs depuis data
const eventId = $derived(data.tournament.event_id)
const tournamentId = $derived(data.tournament.id)
const baseUrl = $derived(`/admin/events/${eventId}/tournaments/${tournamentId}`)

const DOUBLE_CATEGORIES = ["double", "double_female", "double_mix"]
const isDoubles = $derived(DOUBLE_CATEGORIES.includes(data.tournament.category))

// svelte-ignore state_referenced_locally
let roster = $state<RosterEntry[]>(data.roster)
let tournamentStatus = $state<"ready" | "check-in" | "started" | "finished">(
	// svelte-ignore state_referenced_locally
	data.tournament.status,
)

// Seeding drag-and-drop
// svelte-ignore state_referenced_locally
let seededRosterOrder = $state<typeof data.roster>(
	data.tournament.is_seeded
		? [...data.roster].sort((a, b) => {
				if (a.seed === null) return 1
				if (b.seed === null) return -1
				return a.seed - b.seed
			})
		: data.roster,
)

let draggingIndex = $state<number | null>(null)

function onDragStart(index: number) {
	draggingIndex = index
}

function onDragOver(e: DragEvent, index: number) {
	e.preventDefault()
	if (draggingIndex === null || draggingIndex === index) return
	const newOrder = [...seededRosterOrder]
	const [moved] = newOrder.splice(draggingIndex, 1)
	newOrder.splice(index, 0, moved)
	seededRosterOrder = newOrder
	draggingIndex = index
}

async function onDragEnd() {
	draggingIndex = null
	const seeds = seededRosterOrder.map((e, i) => ({
		registration_id: e.registration_id,
		seed: i + 1,
	}))
	await fetch(apiRoutes.TOURNAMENT_SEED_ORDER.path, {
		method: "PATCH",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ tournament_id: tournamentId, seeds }),
	})
}

const isLaunched = $derived(
	tournamentStatus === "started" || tournamentStatus === "finished",
)

// Filter
let filterQuery = $state("")
let filteredRoster = $derived(
	filterQuery.trim().length === 0
		? roster
		: roster.filter((e) =>
				e.members.some(
					(m) =>
						`${m.last_name} ${m.first_name}`
							.toLowerCase()
							.includes(filterQuery.toLowerCase()) ||
						`${m.first_name} ${m.last_name}`
							.toLowerCase()
							.includes(filterQuery.toLowerCase()),
				),
			),
)

// Modal state
let showAddModal = $state(false)

async function changeStatus(newStatus: string) {
	const res = await fetch(apiRoutes.TOURNAMENT_STATUS.path, {
		method: "PATCH",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ status: newStatus, tournament_id: tournamentId }),
	})
	if (res.ok) {
		tournamentStatus = newStatus as
			| "ready"
			| "check-in"
			| "started"
			| "finished"
	}
}

async function checkIn(registrationId: string, value: boolean) {
	await fetch(apiRoutes.TOURNAMENT_CHECKIN.path, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			registration_ids: [registrationId],
			checked_in: value,
		}),
	})
	const entry = roster.find((e) => e.registration_id === registrationId)
	if (entry) entry.checked_in = value
}

async function unregister(registrationId: string) {
	if (!(await confirm("Confirmer le retrait de cette équipe ?"))) return
	await fetch(apiRoutes.TOURNAMENT_UNEREGISER.path, {
		method: "DELETE",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ registration_id: registrationId }),
	})
	roster = roster.filter((e) => e.registration_id !== registrationId)
}

async function cancelLaunch() {
	if (
		!(await confirm(
			"Cette action supprimera tous les matchs générés. Les inscriptions seront conservées. Confirmer ?",
		))
	)
		return
	const res = await fetch(apiRoutes.TOURNAMENT_CANCEL.path, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ tournament_id: tournamentId }),
	})
	if (res.ok) {
		tournamentStatus = "check-in"
		await invalidateAll()
	}
}
</script>

<svelte:head>
	<title>{data.tournament.name} — Roster admin</title>
</svelte:head>

<!-- Breadcrumb -->
<nav class="mb-4 text-sm text-gray-500">
	<a href="/admin/events" class="hover:underline">Événements</a>
	<span class="mx-2">/</span>
	<a href="/admin/events/{eventId}" class="hover:underline">{data.tournament.event_name}</a>
	<span class="mx-2">/</span>
	<span class="text-gray-800">{data.tournament.name}</span>
</nav>

<!-- Tournament header + status management -->
<div class="mb-6">
	<h1 class="text-2xl font-semibold text-gray-900">{data.tournament.name}</h1>
	<p class="mt-1 text-sm text-gray-500">{data.tournament.event_name}</p>
	<p class="mt-1 text-sm text-gray-600">
		{roster.length} équipe{roster.length !== 1 ? "s" : ""} inscrite{roster.length !== 1
			? "s"
			: ""}
	</p>

	<!-- Status badge + transition buttons -->
	<div class="mt-3 flex flex-wrap items-center gap-3">
		<Badge color={TOURNAMENT_STATUS_COLORS[tournamentStatus] ?? "gray"}>
			{TOURNAMENT_STATUS_LABELS[tournamentStatus] ?? tournamentStatus}
		</Badge>
		{#if !isLaunched}
			{#if TOURNAMENT_STATUS_PREV[tournamentStatus]}
				<Button
					size="xs"
					color="light"
					onclick={() => changeStatus(TOURNAMENT_STATUS_PREV[tournamentStatus]!)}
				>
					&larr; {TOURNAMENT_STATUS_LABELS[TOURNAMENT_STATUS_PREV[tournamentStatus]!]}
				</Button>
			{/if}
			{#if TOURNAMENT_STATUS_NEXT[tournamentStatus] && TOURNAMENT_STATUS_NEXT[tournamentStatus] !== "started"}
				<Button
					size="xs"
					color="primary"
					onclick={() => changeStatus(TOURNAMENT_STATUS_NEXT[tournamentStatus]!)}
				>
					Passer en {TOURNAMENT_STATUS_LABELS[TOURNAMENT_STATUS_NEXT[tournamentStatus]!]} &rarr;
				</Button>
			{/if}
			<!-- Lancer le tournoi button -->
			<Button size="sm" color="primary" href="{baseUrl}/launch">
				Lancer le tournoi
			</Button>
		{/if}
		{#if tournamentStatus === "started"}
			<Button size="xs" color="red" onclick={cancelLaunch}>
				Annuler le lancement
			</Button>
		{/if}
	</div>
</div>

{#if data.tournament.is_seeded && !isLaunched && roster.length > 0}
	<!-- Seeding drag-and-drop -->
	<section class="mb-6">
		<h2 class="mb-2 text-base font-semibold text-gray-800">Ordre de seeding</h2>
		<p class="mb-3 text-sm text-gray-500">Glissez les équipes pour définir l'ordre de seeding avant le lancement.</p>
		<ol class="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white">
			{#each seededRosterOrder as entry, i (entry.registration_id)}
				<li
					class="flex cursor-grab items-center gap-3 px-3 py-2 text-sm {draggingIndex === i ? 'bg-primary-50 opacity-70' : 'hover:bg-gray-50'}"
					draggable="true"
					ondragstart={() => onDragStart(i)}
					ondragover={(e) => onDragOver(e, i)}
					ondragend={onDragEnd}
					role="option"
					aria-selected={false}
				>
					<span class="w-6 shrink-0 text-center text-xs font-medium text-gray-400">{i + 1}</span>
					<span class="text-gray-400">☰</span>
					<span class="text-gray-800">
						{#each entry.members as member, j}
							{member.last_name} {member.first_name}{j < entry.members.length - 1 ? " / " : ""}
						{/each}
					</span>
				</li>
			{/each}
		</ol>
	</section>
{/if}

{#if !isLaunched}
	<!-- Add button + filter -->
	<div class="mb-4 flex items-center gap-3">
		<Button color="primary" size="sm" onclick={() => (showAddModal = true)}>
			{isDoubles ? "Ajouter une équipe" : "Ajouter un joueur"}
		</Button>
		{#if roster.length > 0}
			<Input placeholder="Filtrer les inscrits..." bind:value={filterQuery} class="max-w-xs" />
		{/if}
	</div>
{/if}

<!-- Roster table -->
{#if roster.length === 0}
	<p class="mb-6 text-sm text-gray-500">Aucune équipe inscrite pour le moment.</p>
{:else}
	<div class="mb-6">
		<Table>
			<TableHead>
				<TableHeadCell>Équipe</TableHeadCell>
				{#if data.tournament.check_in_required && !isLaunched}
					<TableHeadCell>Présent</TableHeadCell>
				{/if}
				{#if !isLaunched}
					<TableHeadCell>Actions</TableHeadCell>
				{/if}
			</TableHead>
			<TableBody>
				{#each filteredRoster as entry (entry.registration_id)}
					<TableBodyRow class="border-b border-gray-100">
						<TableBodyCell>
							{#each entry.members as member, i}
								{member.last_name}
								{member.first_name}{i < entry.members.length - 1 ? " / " : ""}
								{#if member.department}
									<span class="ml-1 text-xs text-gray-400"
										>({member.department})</span
									>
								{/if}
							{/each}
						</TableBodyCell>
						{#if data.tournament.check_in_required && !isLaunched}
							<TableBodyCell>
								{#if entry.checked_in}
									<Button
										size="xs"
										color="green"
										onclick={() => checkIn(entry.registration_id, false)}
									>
										Présent ✓
									</Button>
								{:else}
									<Button
										size="xs"
										color="light"
										onclick={() => checkIn(entry.registration_id, true)}
									>
										Absent
									</Button>
								{/if}
							</TableBodyCell>
						{/if}
						{#if !isLaunched}
							<TableBodyCell>
								<Button color="red" size="xs" onclick={() => unregister(entry.registration_id)}>
									Retirer
								</Button>
							</TableBodyCell>
						{/if}
					</TableBodyRow>
				{/each}
			</TableBody>
		</Table>
	</div>
{/if}

<!-- Post-launch match display -->
{#if isLaunched}
	{#if data.matches.length === 0}
		<p class="mb-6 text-sm text-gray-500">
			Les matchs seront affichés après le lancement du tournoi.
		</p>
	{:else}
		<section class="mb-6">
			<h2 class="mb-4 text-base font-semibold text-gray-800">Matchs générés</h2>
			<PhaseMatchTable matches={data.matches} />
		</section>
	{/if}
{/if}

{#if !isLaunched}
	<RegistrationModal
		bind:open={showAddModal}
		{isDoubles}
		{tournamentId}
		onRegistered={async () => { await invalidateAll() }}
	/>
{/if}

{#if isLaunched && data.matches.length === 0}
	<Alert color="yellow" class="mt-4">
		Aucun match généré. Le lancement semble avoir échoué. Essayez d'annuler et relancer.
	</Alert>
{/if}
