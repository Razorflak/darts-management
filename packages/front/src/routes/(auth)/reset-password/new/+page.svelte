<script lang="ts">
import { Alert, Button, Input, Label } from "flowbite-svelte"
import { InfoCircleSolid } from "flowbite-svelte-icons"
import { enhance } from "$app/forms"

let { data, form } = $props()
</script>

<svelte:head> <title>Nouveau mot de passe — FFD Darts</title> </svelte:head>

<div class="app-card w-full p-8">
	<h1
		class="mb-1 text-2xl font-bold"
		style="font-family: var(--font-display); color: oklch(18% 0.02 264);"
	>
		Nouveau mot de passe
	</h1>
	<p class="mb-6 text-sm" style="color: oklch(55% 0.01 264);">
		Choisissez un mot de passe sécurisé.
	</p>

	{#if form?.error}
		<Alert color="red" class="mb-4">
			{#snippet icon()}
				<InfoCircleSolid class="h-5 w-5" />
			{/snippet}
			{form.error}
		</Alert>
	{/if}

	<form method="POST" use:enhance class="flex flex-col gap-4">
		<input type="hidden" name="token" value={form?.token ?? data.token}>

		<div>
			<Label for="newPassword" class="mb-1.5">Nouveau mot de passe</Label>
			<Input
				id="newPassword"
				name="newPassword"
				type="password"
				placeholder="Minimum 8 caractères"
				required
				autocomplete="new-password"
			/>
		</div>

		<Button type="submit" class="mt-2 w-full"
			>Enregistrer le mot de passe</Button
		>
	</form>
</div>
