<script lang="ts">
import { Badge, Button } from "flowbite-svelte"
import { CalendarMonthOutline } from "flowbite-svelte-icons"
import { invalidateAll } from "$app/navigation"
import { confirm } from "$lib/confirm.svelte.js"
import { formatDate } from "$lib/date/utils.js"
import { apiRoutes } from "$lib/fetch/api"
import {
	EVENT_STATUS_COLORS,
	EVENT_STATUS_LABELS,
} from "$lib/tournament/labels"

let { data } = $props()

async function publishEvent(id: string) {
	const res = await fetch(apiRoutes.EVENT_STATUS.path, {
		method: "PATCH",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ event_id: id, status: "ready" }),
	})
	if (res.ok) await invalidateAll()
}

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

<svelte:head> <title>Événements — Administration FFD</title> </svelte:head>

<!-- En-tête de page -->
<div class="mb-6 flex flex-wrap items-start justify-between gap-3">
	<div>
		<p class="page-eyebrow">Administration</p>
		<h1 class="page-title">Mes événements</h1>
	</div>
	<Button href="/admin/events/new" size="sm">Créer un événement</Button>
</div>

{#if data.events.length === 0}
	<div class="empty-state">
		<CalendarMonthOutline
			class="mx-auto mb-3 h-8 w-8"
			style="color: var(--color-border-strong);"
		/>
		<p class="font-medium" style="color: oklch(50% 0.01 264);">
			Aucun événement
		</p>
		<p class="mt-1 text-sm" style="color: oklch(65% 0.01 264);">
			Créez votre premier événement pour commencer.
		</p>
	</div>
{:else}
	<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
		{#each data.events as event (event.id)}
			<div class="app-card flex flex-col p-5">
				<div class="mb-3 flex items-start justify-between gap-2">
					<h2
						class="text-base font-semibold leading-snug"
						style="color: oklch(18% 0.02 264);"
					>
						{event.name}
					</h2>
					<Badge
						color={EVENT_STATUS_COLORS[event.status] ?? "gray"}
						class="shrink-0"
					>
						{EVENT_STATUS_LABELS[event.status] ?? event.status}
					</Badge>
				</div>

				<p class="mb-0.5 text-sm" style="color: oklch(50% 0.01 264);">
					{event.entity_name}
				</p>
				<p class="mb-0.5 text-sm" style="color: oklch(40% 0.01 264);">
					{formatDate(event.starts_at)}
					– {formatDate(event.ends_at)}
				</p>
				<p class="mb-4 text-sm" style="color: oklch(55% 0.01 264);">
					{event.tournament_count}
					tournoi{event.tournament_count !== 1 ? "s" : ""}
				</p>

				<div class="mt-auto flex flex-wrap gap-2">
					<Button href="/admin/events/{event.id}" size="xs" color="light"
						>Voir</Button
					>
					{#if event.status === "draft"}
						<Button
							size="xs"
							color="green"
							onclick={() => publishEvent(event.id)}
						>
							Publier
						</Button>
					{/if}
					{#if event.status !== "finished"}
						<Button
							href="/admin/events/{event.id}/edit"
							size="xs"
							color="alternative"
						>
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
			</div>
		{/each}
	</div>
{/if}
