<script lang="ts">
import { Breadcrumb, BreadcrumbItem } from "flowbite-svelte"
import EventWizard from "$lib/tournament/components/EventWizard.svelte"

let { data } = $props()
</script>

<svelte:head><title>Créer un événement — FFD</title></svelte:head>

<Breadcrumb class="mb-6">
	<BreadcrumbItem href="/admin/events" home>Événements</BreadcrumbItem>
	<BreadcrumbItem>Nouvel événement</BreadcrumbItem>
</Breadcrumb>

<EventWizard
	entities={data.entities}
	mode="create"
	pageTitle="Nouvel événement"
	cancelHref="/admin/events"
/>
