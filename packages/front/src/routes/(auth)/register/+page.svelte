<script lang="ts">
import { Alert, Button, Card, Input, Label } from "flowbite-svelte"
import { InfoCircleSolid } from "flowbite-svelte-icons"
import { enhance } from "$app/forms"

let { form } = $props()
</script>

<svelte:head>
	<title>Inscription — FFD Darts</title>
</svelte:head>

<Card class="w-full">
	<h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-6">
		Créer un compte
	</h2>

	{#if form?.error}
		<Alert color="red" class="mb-4">
			{#snippet icon()}<InfoCircleSolid class="w-5 h-5" />{/snippet}
			{form.error}
		</Alert>
	{/if}

	<form method="POST" use:enhance class="flex flex-col gap-4">
		<div>
			<Label for="name" class="mb-2">Nom complet</Label>
			<Input
				id="name"
				name="name"
				type="text"
				placeholder="Jean Dupont"
				value={form?.name ?? ""}
				required
				autocomplete="name"
			/>
		</div>

		<div>
			<Label for="email" class="mb-2">Email</Label>
			<Input
				id="email"
				name="email"
				type="email"
				placeholder="vous@exemple.fr"
				value={form?.email ?? ""}
				required
				autocomplete="email"
			/>
		</div>

		<div>
			<Label for="password" class="mb-2">Mot de passe</Label>
			<Input
				id="password"
				name="password"
				type="password"
				placeholder="Minimum 8 caractères"
				required
				autocomplete="new-password"
			/>
		</div>

		<Button type="submit" class="w-full">Créer mon compte</Button>

		<p class="text-sm text-center text-gray-600">
			Déjà inscrit ?
			<a href="/login" class="text-blue-600 hover:underline">Se connecter</a>
		</p>
	</form>
</Card>
