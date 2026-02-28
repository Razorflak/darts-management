<script lang="ts">
	import { enhance } from "$app/forms"
	import { Card, Label, Input, Button, Alert } from "flowbite-svelte"
	import { InfoCircleSolid } from "flowbite-svelte-icons"

	let { form } = $props()
</script>

<svelte:head>
	<title>Connexion — FFD Darts</title>
</svelte:head>

<Card class="w-full">
	<h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-6">
		Connexion
	</h2>

	{#if form?.error}
		<Alert color="red" class="mb-4">
			{#snippet icon()}<InfoCircleSolid class="w-5 h-5" />{/snippet}
			{form.error}
		</Alert>
	{/if}

	<form method="POST" use:enhance class="flex flex-col gap-4">
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
				placeholder="••••••••"
				required
				autocomplete="current-password"
			/>
		</div>

		<Button type="submit" class="w-full">Se connecter</Button>

		<p class="text-sm text-center text-gray-600">
			Pas encore de compte ?
			<a href="/register" class="text-blue-600 hover:underline">S'inscrire</a>
		</p>
		<p class="text-sm text-center text-gray-600">
			<a href="/reset-password" class="text-blue-600 hover:underline">
				Mot de passe oublié ?
			</a>
		</p>
	</form>
</Card>
