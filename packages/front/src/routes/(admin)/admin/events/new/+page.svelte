<script lang="ts">
import EventWizard from "$lib/tournament/components/EventWizard.svelte"

let { data } = $props()
</script>

<svelte:head><title>Créer un événement — FFD</title></svelte:head>

<!-- Breadcrumb de navigation -->
<nav class="breadcrumb mb-6">
	<a href="/admin/events">Événements</a>
	<span class="breadcrumb-sep">/</span>
	<span class="breadcrumb-current">Nouvel événement</span>
</nav>

<EventWizard
	entities={data.entities}
	mode="create"
	pageTitle="Nouvel événement"
	cancelHref="/admin/events"
/>
