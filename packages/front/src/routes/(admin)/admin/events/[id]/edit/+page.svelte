<script lang="ts">
import { Breadcrumb, BreadcrumbItem } from "flowbite-svelte"
import EventWizard from "$lib/tournament/components/EventWizard.svelte"

let { data } = $props()
</script>

<svelte:head><title>Modifier l'événement — FFD</title></svelte:head>

<Breadcrumb class="mb-6">
	<BreadcrumbItem href="/admin/events" home>Événements</BreadcrumbItem>
	<BreadcrumbItem href="/admin/events/{data.event.id}"
		>{data.event.name}</BreadcrumbItem
	>
	<BreadcrumbItem>Modifier</BreadcrumbItem>
</Breadcrumb>

<EventWizard
	entities={data.entities}
	event={data.event}
	eventStatus={data.eventStatus}
	mode="edit"
	pageTitle="Modifier l'événement"
	cancelHref="/admin/events"
/>
