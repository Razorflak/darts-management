<script lang="ts">
import { Alert, Button, Card, Input, Label } from "flowbite-svelte"
import { CheckCircleSolid, InfoCircleSolid } from "flowbite-svelte-icons"
import { enhance } from "$app/forms"

let { form } = $props()
</script>

<svelte:head> <title>Mot de passe oublié — FFD Darts</title> </svelte:head>

<Card class="w-full">
	<h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-6">
		Réinitialiser le mot de passe
	</h2>

	{#if form?.sent}
		<Alert color="green">
			{#snippet icon()}
				<CheckCircleSolid class="w-5 h-5" />
			{/snippet}
			Si un compte existe pour <strong>{form.email}</strong>, vous recevrez un
			email avec les instructions de réinitialisation.
		</Alert>
		<p class="mt-4 text-sm text-center text-gray-600">
			<a href="/login" class="text-blue-600 hover:underline"
				>Retour à la connexion</a
			>
		</p>
	{:else}
		{#if form?.error}
			<Alert color="red" class="mb-4">
				{#snippet icon()}
					<InfoCircleSolid class="w-5 h-5" />
				{/snippet}
				{form.error}
			</Alert>
		{/if}

		<form method="POST" use:enhance class="flex flex-col gap-4">
			<div>
				<Label for="email" class="mb-2">Votre adresse email</Label>
				<Input
					id="email"
					name="email"
					type="email"
					placeholder="vous@exemple.fr"
					required
					autocomplete="email"
				/>
			</div>

			<Button type="submit" class="w-full"
				>Envoyer le lien de réinitialisation</Button
			>

			<p class="text-sm text-center text-gray-600">
				<a href="/login" class="text-blue-600 hover:underline"
					>Retour à la connexion</a
				>
			</p>
		</form>
	{/if}
</Card>
