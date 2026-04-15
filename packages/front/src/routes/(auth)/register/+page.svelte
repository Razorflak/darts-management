<script lang="ts">
import { Alert, Button, Input, Label } from "flowbite-svelte"
import { InfoCircleSolid } from "flowbite-svelte-icons"
import { enhance } from "$app/forms"

let { form } = $props()
</script>

<svelte:head> <title>Inscription — FFD Darts</title> </svelte:head>

<div class="app-card w-full p-8">
	<h1
		class="mb-1 text-2xl font-bold"
		style="font-family: var(--font-display); color: oklch(18% 0.02 264);"
	>
		Créer un compte
	</h1>
	<p class="mb-6 text-sm" style="color: oklch(55% 0.01 264);">
		Rejoignez la plateforme de gestion FFD Darts.
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
		<div>
			<Label for="name" class="mb-1.5">Nom complet</Label>
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
			<Label for="email" class="mb-1.5">Adresse email</Label>
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
			<Label for="password" class="mb-1.5">Mot de passe</Label>
			<Input
				id="password"
				name="password"
				type="password"
				placeholder="Minimum 8 caractères"
				required
				autocomplete="new-password"
			/>
		</div>

		<Button type="submit" class="mt-2 w-full">Créer mon compte</Button>

		<p class="mt-1 text-center text-sm" style="color: oklch(55% 0.01 264);">
			Déjà inscrit ?
			<a
				href="/login"
				class="font-medium"
				style="color: var(--color-primary-600);"
				>Se connecter</a
			>
		</p>
	</form>
</div>
