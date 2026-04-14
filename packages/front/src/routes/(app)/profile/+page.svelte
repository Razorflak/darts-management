<script lang="ts">
import { Button, Card } from "flowbite-svelte"
import type { PageData } from "./$types"

let { data }: { data: PageData } = $props()

function formatBirthDate(date: Date | null): string {
	if (!date) return "Non renseignée"
	return date.toLocaleDateString("fr-FR", {
		day: "numeric",
		month: "long",
		year: "numeric",
		timeZone: "UTC",
	})
}
</script>

<svelte:head> <title>Mon profil — FFD Darts</title> </svelte:head>

<div class="mx-auto max-w-lg">
	<p
		class="mb-1 text-xs font-semibold uppercase tracking-widest text-primary-500"
	>
		Compte
	</p>
	<h1 class="mb-6 text-3xl font-bold text-gray-900">Mon profil</h1>

	<Card class="w-full">
		<dl class="flex flex-col gap-4">
			<div class="flex flex-col gap-1">
				<dt class="text-xs font-semibold uppercase tracking-wide text-gray-400">
					Prénom
				</dt>
				<dd class="font-medium text-gray-900">{data.player.first_name}</dd>
			</div>

			<div class="flex flex-col gap-1">
				<dt class="text-xs font-semibold uppercase tracking-wide text-gray-400">
					Nom
				</dt>
				<dd class="font-medium text-gray-900">{data.player.last_name}</dd>
			</div>

			<div class="flex flex-col gap-1">
				<dt class="text-xs font-semibold uppercase tracking-wide text-gray-400">
					Département
				</dt>
				<dd class="font-medium text-gray-900">
					{data.player.department ?? "Non renseigné"}
				</dd>
			</div>

			<div class="flex flex-col gap-1">
				<dt class="text-xs font-semibold uppercase tracking-wide text-gray-400">
					Date de naissance
				</dt>
				<dd class="font-medium text-gray-900">
					{formatBirthDate(data.player.birth_date)}
				</dd>
			</div>

			<div class="flex flex-col gap-1">
				<dt class="text-xs font-semibold uppercase tracking-wide text-gray-400">
					Numéro de licence
				</dt>
				<dd class="font-medium text-gray-900">
					{data.player.licence_no ?? "Non renseigné"}
				</dd>
			</div>
		</dl>

		{#if data.player.licence_no === null}
			<div class="mt-6 border-t border-gray-100 pt-4">
				<Button href="/profile/edit" color="light">Modifier mon profil</Button>
			</div>
		{/if}
	</Card>
</div>
