<script lang="ts">
import { Alert, Button, Input, Label, Select } from "flowbite-svelte"
import { InfoCircleSolid } from "flowbite-svelte-icons"
import { enhance } from "$app/forms"

let { data, form } = $props()

const PARENT_TYPE: Record<string, string | null> = {
	federation: null,
	ligue: "federation",
	comite: "ligue",
	club: "comite",
}

let selectedType = $state("")
$effect.pre(() => {
	if (form?.type) selectedType = form.type
})

const requiredParentType = $derived(
	selectedType ? PARENT_TYPE[selectedType] : null,
)

const parentOptions = $derived(
	requiredParentType
		? data.allEntities
				.filter((e: { type: string }) => e.type === requiredParentType)
				.map((e: { id: string; name: string }) => ({
					value: e.id,
					name: e.name,
				}))
		: [],
)

const typeOptions = [
	{ value: "federation", name: "Fédération" },
	{ value: "ligue", name: "Ligue" },
	{ value: "comite", name: "Comité" },
	{ value: "club", name: "Club" },
]
</script>

<svelte:head> <title>Nouvelle entité — FFD Darts</title> </svelte:head>

<!-- Breadcrumb -->
<nav class="breadcrumb">
	<a href="/admin/entities">Entités</a>
	<span class="breadcrumb-sep">/</span>
	<span class="breadcrumb-current">Nouvelle entité</span>
</nav>

<div class="mx-auto max-w-lg">
	<h1 class="page-title mb-6">Créer une entité</h1>

	<div class="app-card p-6">
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
				<Label for="name" class="mb-1.5">Nom</Label>
				<Input
					id="name"
					name="name"
					type="text"
					placeholder="Ex: Ligue Île-de-France"
					value={form?.name ?? ""}
					required
				/>
			</div>

			<div>
				<Label for="type" class="mb-1.5">Type</Label>
				<Select
					id="type"
					name="type"
					items={typeOptions}
					bind:value={selectedType}
					placeholder="Sélectionner un type..."
				/>
			</div>

			{#if requiredParentType !== null && selectedType}
				<div>
					<Label for="parent_id" class="mb-1.5">
						Parent ({requiredParentType})
					</Label>
					{#if parentOptions.length === 0}
						<Alert color="yellow" class="text-sm">
							Aucun·e {requiredParentType} disponible. Créez d'abord une entité
							de ce type.
						</Alert>
						<input type="hidden" name="parent_id" value="">
					{:else}
						<Select
							id="parent_id"
							name="parent_id"
							items={parentOptions}
							value={form?.parent_id ?? ""}
							placeholder="Sélectionner un parent..."
						/>
					{/if}
				</div>
			{:else if selectedType === "federation"}
				<input type="hidden" name="parent_id" value="">
			{/if}

			<div class="flex gap-3 pt-2">
				<Button type="submit" class="flex-1">Créer l'entité</Button>
				<Button href="/admin/entities" color="alternative" class="flex-1"
					>Annuler</Button
				>
			</div>
		</form>
	</div>
</div>
