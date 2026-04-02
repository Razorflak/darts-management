<script lang="ts">
import { Badge, Button, Card } from "flowbite-svelte"
import { invalidateAll } from "$app/navigation"
import { confirm } from "$lib/confirm.svelte.js"
import { formatDate } from "$lib/date/utils.js"
import { apiRoutes } from "$lib/fetch/api"
import { EVENT_STATUS_COLORS, EVENT_STATUS_LABELS } from "$lib/tournament/labels"

let { data } = $props()

async function deleteEvent(id: string, name: string) {
	const ok = await confirm(
		`Supprimer l'événement « ${name} » ? Cette action est irréversible.`,
	)
	if (!ok) return

	const res = await fetch(apiRoutes.EVENT_DELETE.path, {
		method: "DELETE",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ event_id: id }),
	})
	if (res.ok) {
		await invalidateAll()
	}
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
					<Badge color={EVENT_STATUS_COLORS[event.status] ?? "gray"} class="shrink-0">
						{EVENT_STATUS_LABELS[event.status] ?? event.status}
					</Badge>
				</div>
				<p class="mb-1 text-sm text-gray-500 dark:text-gray-400">{event.entity_name}</p>
				<p class="mb-1 text-sm text-gray-600 dark:text-gray-300">
					{formatDate(event.starts_at)} – {formatDate(event.ends_at)}
				</p>
				<p class="mb-4 text-sm text-gray-500 dark:text-gray-400">
					{event.tournament_count} tournoi{event.tournament_count !== 1 ? "s" : ""}
				</p>
				<div class="flex flex-wrap gap-2">
					<Button href="/admin/events/{event.id}" size="xs" color="light">Voir</Button>
					{#if event.status !== "finished"}
						<Button href="/admin/events/{event.id}/edit" size="xs" color="alternative">
							{event.status === "draft" ? "Reprendre" : "Modifier"}
						</Button>
					{/if}
					<Button
						size="xs"
						color="red"
						onclick={() => deleteEvent(event.id, event.name)}
					>
						Supprimer
					</Button>
				</div>
			</Card>
		{/each}
	</div>
{/if}
