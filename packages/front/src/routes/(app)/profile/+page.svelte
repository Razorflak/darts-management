<script lang="ts">
import { Button } from "flowbite-svelte"
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
	<p class="page-eyebrow">Compte</p>
	<h1 class="page-title mb-6">Mon profil</h1>

	<div class="app-card overflow-hidden">
		<dl class="divide-y" style="border-color: var(--color-border);">
			{#each [
				{ label: "Prénom",             value: data.player.first_name                   },
				{ label: "Nom",                value: data.player.last_name                    },
				{ label: "Département",        value: data.player.department ?? "Non renseigné" },
				{ label: "Date de naissance",  value: formatBirthDate(data.player.birth_date)  },
				{ label: "Numéro de licence",  value: data.player.licence_no ?? "Non renseigné" },
			] as { label, value }}
				<div class="flex items-baseline justify-between gap-4 px-5 py-3.5">
					<dt
						class="text-xs font-semibold uppercase tracking-wide shrink-0"
						style="color: oklch(60% 0.01 264);"
					>
						{label}
					</dt>
					<dd
						class="text-right text-sm font-medium"
						style="color: oklch(18% 0.02 264);"
					>
						{value}
					</dd>
				</div>
			{/each}
		</dl>

		{#if data.player.licence_no === null}
			<div
				class="border-t px-5 py-4"
				style="border-color: var(--color-border);"
			>
				<Button href="/profile/edit" color="light" size="sm">
					Modifier mon profil
				</Button>
			</div>
		{/if}
	</div>
</div>
