<script lang="ts">
import { Alert, Button, Input, Label } from "flowbite-svelte"
import { CheckCircleSolid, InfoCircleSolid } from "flowbite-svelte-icons"
import { enhance } from "$app/forms"

let { form } = $props()
</script>

<svelte:head> <title>Mot de passe oublié — FFD Darts</title> </svelte:head>

<div class="app-card w-full p-8">
	<h1
		class="mb-1 text-2xl font-bold"
		style="font-family: var(--font-display); color: oklch(18% 0.02 264);"
	>
		Mot de passe oublié
	</h1>

	{#if form?.sent}
		<p class="mb-6 text-sm" style="color: oklch(55% 0.01 264);">
			Vérifiez votre boîte email.
		</p>
		<Alert color="green">
			{#snippet icon()}
				<CheckCircleSolid class="h-5 w-5" />
			{/snippet}
			Si un compte existe pour <strong>{form.email}</strong>, vous recevrez un
			email avec les instructions de réinitialisation.
		</Alert>
		<p class="mt-4 text-center text-sm" style="color: oklch(55% 0.01 264);">
			<a
				href="/login"
				class="font-medium"
				style="color: var(--color-primary-600);"
			>
				Retour à la connexion
			</a>
		</p>
	{:else}
		<p class="mb-6 text-sm" style="color: oklch(55% 0.01 264);">
			Saisissez votre email pour recevoir un lien de réinitialisation.
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
				<Label for="email" class="mb-1.5">Votre adresse email</Label>
				<Input
					id="email"
					name="email"
					type="email"
					placeholder="vous@exemple.fr"
					required
					autocomplete="email"
				/>
			</div>

			<Button type="submit" class="mt-2 w-full">
				Envoyer le lien de réinitialisation
			</Button>

			<p class="text-center text-sm" style="color: oklch(55% 0.01 264);">
				<a
					href="/login"
					class="font-medium"
					style="color: var(--color-primary-600);"
				>
					Retour à la connexion
				</a>
			</p>
		</form>
	{/if}
</div>
