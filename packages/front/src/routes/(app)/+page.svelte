<script lang="ts">
	let { data } = $props()
</script>

<svelte:head>
	<title>Tableau de bord — FFD Darts</title>
</svelte:head>

<h1 class="mb-4 text-2xl font-bold text-gray-900">
	Bonjour, {data.user?.name} !
</h1>

<p class="text-gray-600">Bienvenue sur la plateforme de gestion des tournois FFD.</p>
