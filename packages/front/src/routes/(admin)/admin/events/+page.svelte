<script lang="ts">
import { Badge, Button, Card } from "flowbite-svelte"
import { formatDate } from "$lib/date/utils.js"

let { data } = $props()

const STATUS_LABELS: Record<string, string> = {
	draft: "Brouillon",
	ready: "Publié",
	started: "En cours",
	finished: "Terminé",
}

const STATUS_COLORS: Record<string, "gray" | "green" | "blue" | "indigo"> = {
	draft: "gray",
	ready: "green",
	started: "blue",
	finished: "indigo",
}
</script>

<div class="mb-6 flex items-center justify-between">
	<h1 class="text-2xl font-bold text-gray-900 dark:text-white">Mes événements</h1>
	<Button href="/admin/events/new" size="sm">Créer un événement</Button>
</div>

{#if data.events.length === 0}
	<p class="text-gray-500 dark:text-gray-400">Aucun événement pour l'instant.</p>
{:else}
	<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
		{#each data.events as event (event.id)}
			<Card>
				<div class="mb-2 flex items-start justify-between gap-2">
					<h2 class="text-lg leading-tight font-semibold text-gray-900 dark:text-white">
						{event.name}
					</h2>
					<Badge color={STATUS_COLORS[event.status] ?? "gray"} class="shrink-0">
						{STATUS_LABELS[event.status] ?? event.status}
					</Badge>
				</div>
				<p class="mb-1 text-sm text-gray-500 dark:text-gray-400">{event.entity_name}</p>
				<p class="mb-1 text-sm text-gray-600 dark:text-gray-300">
					{formatDate(event.starts_at)} – {formatDate(event.ends_at)}
				</p>
				<p class="mb-4 text-sm text-gray-500 dark:text-gray-400">
					{event.tournament_count} tournoi{event.tournament_count !== 1 ? "s" : ""}
				</p>
				{#if event.status !== "finished"}
					<a
						href="/admin/events/{event.id}/edit"
						class="text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
					>
						{event.status === "draft" ? "Reprendre l'édition →" : "Modifier →"}
					</a>
				{/if}
			</Card>
		{/each}
	</div>
{/if}
