<script lang="ts">
import { Badge, Button } from "flowbite-svelte"
import { apiRoutes } from "$lib/fetch/api"
import {
	TOURNAMENT_STATUS_COLORS,
	TOURNAMENT_STATUS_LABELS,
	TOURNAMENT_STATUS_NEXT,
	TOURNAMENT_STATUS_PREV,
} from "$lib/tournament/labels"

type TournamentStatus = "ready" | "check-in" | "started" | "finished"

let {
	tournamentName,
	eventName,
	eventId,
	tournamentId,
	rosterCount,
	status = $bindable(),
	onCancelLaunch,
}: {
	tournamentName: string
	eventName: string
	eventId: string
	tournamentId: string
	rosterCount: number
	status: TournamentStatus
	onCancelLaunch: () => Promise<void>
} = $props()

const isLaunched = $derived(status === "started" || status === "finished")
const baseUrl = $derived(`/admin/events/${eventId}/tournaments/${tournamentId}`)

async function changeStatus(newStatus: string) {
	const res = await fetch(apiRoutes.TOURNAMENT_STATUS.path, {
		method: "PATCH",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ status: newStatus, tournament_id: tournamentId }),
	})
	if (res.ok) {
		status = newStatus as TournamentStatus
	}
}
</script>

<div class="mb-6">
	<h1 class="text-2xl font-semibold text-gray-900">{tournamentName}</h1>
	<p class="mt-1 text-sm text-gray-500">{eventName}</p>
	<p class="mt-1 text-sm text-gray-600">
		{rosterCount} équipe{rosterCount !== 1 ? "s" : ""} inscrite{rosterCount !== 1 ? "s" : ""}
	</p>

	<div class="mt-3 flex flex-wrap items-center gap-3">
		<Badge color={TOURNAMENT_STATUS_COLORS[status] ?? "gray"}>
			{TOURNAMENT_STATUS_LABELS[status] ?? status}
		</Badge>
		{#if !isLaunched}
			{#if TOURNAMENT_STATUS_PREV[status]}
				<Button
					size="xs"
					color="light"
					onclick={() => changeStatus(TOURNAMENT_STATUS_PREV[status]!)}
				>
					&larr; {TOURNAMENT_STATUS_LABELS[TOURNAMENT_STATUS_PREV[status]!]}
				</Button>
			{/if}
			{#if TOURNAMENT_STATUS_NEXT[status] && TOURNAMENT_STATUS_NEXT[status] !== "started"}
				<Button
					size="xs"
					color="primary"
					onclick={() => changeStatus(TOURNAMENT_STATUS_NEXT[status]!)}
				>
					Passer en {TOURNAMENT_STATUS_LABELS[TOURNAMENT_STATUS_NEXT[status]!]} &rarr;
				</Button>
			{/if}
			<Button size="sm" color="primary" href="{baseUrl}/launch">
				Lancer le tournoi
			</Button>
		{/if}
		{#if status === "started"}
			<Button size="xs" color="red" onclick={onCancelLaunch}>
				Annuler le lancement
			</Button>
		{/if}
	</div>
</div>
