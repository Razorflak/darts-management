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
		user_id: data.user.id,
		first_name: ((fd.get("first_name") as string) ?? "").trim(),
		last_name: ((fd.get("last_name") as string) ?? "").trim(),
		department: ((fd.get("department") as string) ?? "").trim(),
		birth_date: ((fd.get("birth_date") as string) ?? "").trim() || null,
		licence_no: ((fd.get("licence_no") as string) ?? "").trim() || null,
	}

	try {
		const res = await fetch(apiRoutes.PLAYERS_CREATE_PROFILE.path, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(body),
		})

		if (res.ok) {
			goto(data.redirectTo)
		} else {
			try {
				const text = await res.json()
				formError = text.message
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
	<title>Compléter mon profil — FFD Darts</title>
</svelte:head>

<div class="mx-auto max-w-lg">
	<p class="text-primary-500 mb-1 text-xs font-semibold tracking-widest uppercase">Profil</p>
	<h1 class="mb-6 text-3xl font-bold text-gray-900">Compléter mon profil</h1>

	<Card class="w-full">
		<p class="mb-4 text-sm text-gray-500">
			Un profil joueur est requis avant de vous inscrire à un tournoi.
		</p>

		<form onsubmit={handleSubmit} class="flex flex-col gap-0">
			<PlayerCreationForm
				showLicence={true}
				submitLabel={submitting ? "Création…" : "Créer mon profil"}
				form={formError ? { error: formError } : null}
			/>
		</form>
	</Card>
</div>
