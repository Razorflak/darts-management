<script lang="ts">
import {
	Badge,
	Button,
	Input,
	Table,
	TableBody,
	TableBodyCell,
	TableBodyRow,
	TableHead,
	TableHeadCell,
} from "flowbite-svelte";
import type { RosterEntry } from "$lib/server/schemas/event-schemas.js";
import type { PageData } from "./$types";
import RegistrationModal from "./RegistrationModal.svelte";

let { data }: { data: PageData } = $props();

const eventId = data.tournament.event_id;
const tournamentId = data.tournament.id;
const baseUrl = `/admin/events/${eventId}/tournaments/${tournamentId}`;

const DOUBLE_CATEGORIES = ["double", "double_female", "double_mix"];
const isDoubles = DOUBLE_CATEGORIES.includes(data.tournament.category);

let roster = $state<RosterEntry[]>(data.roster);
let tournamentStatus = $state(data.tournament.status);

// Filter
let filterQuery = $state("");
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
);

// Modal state
let showAddModal = $state(false);

// Status management
const STATUS_TRANSITIONS: Record<string, string | null> = {
	ready: "check-in",
	"check-in": "started",
	started: "finished",
	finished: null,
};
const STATUS_PREV: Record<string, string | null> = {
	ready: null,
	"check-in": "ready",
	started: "check-in",
	finished: "started",
};
const STATUS_LABELS: Record<string, string> = {
	ready: "Ouvert",
	"check-in": "Check-in",
	started: "Lancé",
	finished: "Terminé",
};
const STATUS_COLORS: Record<string, "green" | "yellow" | "blue" | "gray"> = {
	ready: "green",
	"check-in": "yellow",
	started: "blue",
	finished: "gray",
};

async function changeStatus(newStatus: string) {
	const res = await fetch(`${baseUrl}/status`, {
		method: "PATCH",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ status: newStatus }),
	});
	if (res.ok) {
		tournamentStatus = newStatus;
	}
}

async function checkIn(registrationId: string, value: boolean) {
	await fetch(`${baseUrl}/checkin`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			registration_id: registrationId,
			checked_in: value,
		}),
	});
	const entry = roster.find((e) => e.registration_id === registrationId);
	if (entry) entry.checked_in = value;
}

async function unregister(teamId: string) {
	await fetch(`${baseUrl}/unregister`, {
		method: "DELETE",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ team_id: teamId }),
	});
	roster = roster.filter((e) => e.team_id !== teamId);
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
	<h1 class="text-2xl font-bold text-gray-900">{data.tournament.name}</h1>
	<p class="mt-1 text-sm text-gray-500">{data.tournament.event_name}</p>
	<p class="mt-1 text-sm text-gray-600">
		{roster.length} équipe{roster.length !== 1 ? "s" : ""} inscrite{roster.length !== 1
			? "s"
			: ""}
	</p>

	<!-- Status badge + transition buttons -->
	<div class="mt-3 flex items-center gap-3">
		<Badge color={STATUS_COLORS[tournamentStatus] ?? "gray"}>
			{STATUS_LABELS[tournamentStatus] ?? tournamentStatus}
		</Badge>
		{#if STATUS_PREV[tournamentStatus]}
			<Button
				size="xs"
				color="light"
				onclick={() => changeStatus(STATUS_PREV[tournamentStatus]!)}
			>
				&larr; {STATUS_LABELS[STATUS_PREV[tournamentStatus]!]}
			</Button>
		{/if}
		{#if STATUS_TRANSITIONS[tournamentStatus]}
			<Button
				size="xs"
				color="primary"
				onclick={() => changeStatus(STATUS_TRANSITIONS[tournamentStatus]!)}
			>
				Passer en {STATUS_LABELS[STATUS_TRANSITIONS[tournamentStatus]!]} &rarr;
			</Button>
		{/if}
	</div>
</div>

<!-- Add button + filter -->
<div class="mb-4 flex items-center gap-3">
	<Button color="primary" size="sm" onclick={() => (showAddModal = true)}>
		{isDoubles ? "Ajouter une équipe" : "Ajouter un joueur"}
	</Button>
	{#if roster.length > 0}
		<Input placeholder="Filtrer les inscrits..." bind:value={filterQuery} class="max-w-xs" />
	{/if}
</div>

<!-- Roster table -->
{#if roster.length === 0}
	<p class="mb-6 text-sm text-gray-500">Aucune équipe inscrite pour le moment.</p>
{:else}
	<div class="mb-6">
		<Table>
			<TableHead>
				<TableHeadCell>Équipe</TableHeadCell>
				{#if data.tournament.check_in_required}
					<TableHeadCell>Présent</TableHeadCell>
				{/if}
				<TableHeadCell>Actions</TableHeadCell>
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
						{#if data.tournament.check_in_required}
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
						<TableBodyCell>
							<Button color="red" size="xs" onclick={() => unregister(entry.team_id)}>
								Retirer
							</Button>
						</TableBodyCell>
					</TableBodyRow>
				{/each}
			</TableBody>
		</Table>
	</div>
{/if}

<RegistrationModal
	bind:open={showAddModal}
	{isDoubles}
	{baseUrl}
	onRegistered={() => window.location.reload()}
/>
