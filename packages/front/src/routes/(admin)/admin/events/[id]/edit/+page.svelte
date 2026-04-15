<script lang="ts">
import EventWizard from "$lib/tournament/components/EventWizard.svelte"

let { data } = $props()
</script>

<svelte:head><title>Modifier l'événement — FFD</title></svelte:head>

<!-- Breadcrumb de navigation -->
<nav class="breadcrumb mb-6">
	<a href="/admin/events">Événements</a>
	<span class="breadcrumb-sep">/</span>
	<a href="/admin/events/{data.event.id}">{data.event.name}</a>
	<span class="breadcrumb-sep">/</span>
	<span class="breadcrumb-current">Modifier</span>
</nav>

<EventWizard
	entities={data.entities}
	event={data.event}
	eventStatus={data.eventStatus}
	mode="edit"
	pageTitle="Modifier l'événement"
	cancelHref="/admin/events"
/>
