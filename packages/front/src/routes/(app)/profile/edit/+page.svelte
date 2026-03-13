<script lang="ts">
	import { enhance } from "$app/forms"
	import { Card } from "flowbite-svelte"
	import PlayerCreationForm from "$lib/tournament/components/PlayerCreationForm.svelte"
	import type { PageData, ActionData } from "./$types"

	let { data, form }: { data: PageData; form: ActionData } = $props()
</script>

<svelte:head>
	<title>Modifier mon profil — FFD Darts</title>
</svelte:head>

<div class="mx-auto max-w-lg">
	<p class="mb-1 text-xs font-semibold uppercase tracking-widest text-primary-500">Profil</p>
	<h1 class="mb-6 text-3xl font-bold text-gray-900">Modifier mon profil</h1>

	<Card class="w-full">
		<form method="POST" use:enhance class="flex flex-col gap-0">
			<PlayerCreationForm
				showLicence={false}
				submitLabel="Enregistrer"
				{form}
				values={form?.values ?? {
					first_name: data.player.first_name,
					last_name: data.player.last_name,
					department: data.player.department ?? "",
					birth_date: data.player.birth_date,
				}}
			/>
		</form>

		<div class="mt-4 border-t border-gray-100 pt-4">
			<a href="/profile" class="text-sm text-gray-500 hover:underline">Retour au profil</a>
		</div>
	</Card>
</div>
