<script lang="ts">
import { Alert, Button, Card, Input, Label } from "flowbite-svelte"
import { InfoCircleSolid } from "flowbite-svelte-icons"
import { enhance } from "$app/forms"

let { data, form } = $props()
</script>

<svelte:head>
	<title>Nouveau mot de passe — FFD Darts</title>
</svelte:head>

<Card class="w-full">
	<h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-6">
		Choisir un nouveau mot de passe
	</h2>

	{#if form?.error}
		<Alert color="red" class="mb-4">
			{#snippet icon()}<InfoCircleSolid class="w-5 h-5" />{/snippet}
			{form.error}
		</Alert>
	{/if}

	<form method="POST" use:enhance class="flex flex-col gap-4">
		<input type="hidden" name="token" value={form?.token ?? data.token} />

		<div>
			<Label for="newPassword" class="mb-2">Nouveau mot de passe</Label>
			<Input
				id="newPassword"
				name="newPassword"
				type="password"
				placeholder="Minimum 8 caractères"
				required
				autocomplete="new-password"
			/>
		</div>

		<Button type="submit" class="w-full">Enregistrer le mot de passe</Button>
	</form>
</Card>
