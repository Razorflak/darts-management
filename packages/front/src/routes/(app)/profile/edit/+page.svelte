<script lang="ts">
import { Card } from "flowbite-svelte"
import { goto } from "$app/navigation"
import { apiRoutes } from "$lib/fetch/api"
import PlayerCreationForm from "$lib/tournament/components/PlayerCreationForm.svelte"
import type { PageData } from "./$types"

let { data }: { data: PageData } = $props()

let formError = $state<string | null>(null)
let submitting = $state(false)

async function handleSubmit(event: SubmitEvent) {
	event.preventDefault()
	formError = null
	submitting = true

	const fd = new FormData(event.currentTarget as HTMLFormElement)
	const body = {
		first_name: ((fd.get("first_name") as string) ?? "").trim(),
		last_name: ((fd.get("last_name") as string) ?? "").trim(),
		department: ((fd.get("department") as string) ?? "").trim(),
		birth_date: ((fd.get("birth_date") as string) ?? "").trim() || null,
	}

	try {
		const res = await fetch(apiRoutes.PLAYERS_UPDATE_PROFILE.path, {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(body),
		})

		if (res.ok) {
			goto("/profile")
		} else {
			try {
				const json = await res.json()
				formError = json.error?.message ?? "Une erreur est survenue."
			} catch {
				formError = "Une erreur est survenue."
			}
		}
	} catch {
		formError = "Impossible de contacter le serveur."
	} finally {
		submitting = false
	}
}
</script>

<svelte:head>
	<title>Modifier mon profil — FFD Darts</title>
</svelte:head>

<div class="mx-auto max-w-lg">
	<p class="mb-1 text-xs font-semibold uppercase tracking-widest text-primary-500">Profil</p>
	<h1 class="mb-6 text-3xl font-bold text-gray-900">Modifier mon profil</h1>

	<Card class="w-full">
		<form onsubmit={handleSubmit} class="flex flex-col gap-0">
			<PlayerCreationForm
				showLicence={false}
				submitLabel={submitting ? "Enregistrement…" : "Enregistrer"}
				form={formError ? { error: formError } : null}
				values={{
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
