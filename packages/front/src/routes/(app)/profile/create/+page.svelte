<script lang="ts">
	import { enhance } from "$app/forms"
	import { Card } from "flowbite-svelte"
	import PlayerCreationForm from "$lib/tournament/components/PlayerCreationForm.svelte"
	import type { PageData, ActionData } from "./$types"

	let { data, form }: { data: PageData; form: ActionData } = $props()
</script>

<svelte:head>
	<title>Compléter mon profil — FFD Darts</title>
</svelte:head>

<div class="mx-auto max-w-lg">
	<p class="mb-1 text-xs font-semibold uppercase tracking-widest text-primary-500">Profil</p>
	<h1 class="mb-6 text-3xl font-bold text-gray-900">Compléter mon profil</h1>

	<Card class="w-full">
		<p class="mb-4 text-sm text-gray-500">
			Un profil joueur est requis avant de vous inscrire à un tournoi.
		</p>

		<form method="POST" use:enhance class="flex flex-col gap-0">
			<input type="hidden" name="redirectTo" value={data.redirectTo} />
			<PlayerCreationForm showLicence={true} submitLabel="Créer mon profil" {form} values={form?.values} />
		</form>
	</Card>
</div>
