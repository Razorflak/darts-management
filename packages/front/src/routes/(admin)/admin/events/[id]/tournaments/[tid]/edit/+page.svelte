<script lang="ts">
import { Alert, Breadcrumb, BreadcrumbItem, Button } from "flowbite-svelte"
import { goto } from "$app/navigation"
import { apiRoutes } from "$lib/fetch/api"
import TournamentForm from "$lib/tournament/components/TournamentForm.svelte"
import type { PageData } from "./$types"

let { data }: { data: PageData } = $props()

let tournament = $state(data.tournament)

type SaveState = "idle" | "submitting" | "error"
let saveState = $state<SaveState>("idle")
let errorMessage = $state("")

async function save() {
	saveState = "submitting"
	errorMessage = ""
	try {
		const res = await fetch(apiRoutes.TOURNAMENT_SAVE.path, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ event_id: data.eventId, tournament }),
		})
		if (!res.ok) {
			const text = await res.text()
			errorMessage = text || "Une erreur est survenue."
			saveState = "error"
			return
		}
		goto(`/admin/events/${data.eventId}`)
	} catch {
		errorMessage = "Une erreur réseau est survenue."
		saveState = "error"
	}
}
</script>

<svelte:head
	><title>Modifier {data.tournament.name} — Administration</title></svelte:head
>

<Breadcrumb class="mb-6">
	<BreadcrumbItem href="/admin/events" home>Événements</BreadcrumbItem>
	<BreadcrumbItem href="/admin/events/{data.eventId}"
		>{data.eventName}</BreadcrumbItem
	>
	<BreadcrumbItem>Modifier {data.tournament.name}</BreadcrumbItem>
</Breadcrumb>

<h1 class="page-title mb-6">Modifier {data.tournament.name}</h1>

{#if saveState === "error"}
	<Alert color="red" class="mb-4">{errorMessage}</Alert>
{/if}

<div class="card mb-6 p-6"><TournamentForm bind:tournament /></div>

<div class="flex gap-3">
	<Button onclick={save} color="primary" disabled={saveState === "submitting"}>
		{saveState === "submitting" ? "Enregistrement…" : "Enregistrer"}
	</Button>
	<Button href="/admin/events/{data.eventId}" color="light">Annuler</Button>
</div>
