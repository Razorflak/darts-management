<script lang="ts">
import { Alert, Button, Input, Label } from "flowbite-svelte"
import { InfoCircleSolid } from "flowbite-svelte-icons"
import DepartmentSelect from "./DepartmentSelect.svelte"

type Values = {
	first_name?: string | null
	last_name?: string | null
	department?: string | null
	birth_date?: string | null
	licence_no?: string | null
}

type Props = {
	values?: Values
	submitLabel: string
	showLicence?: boolean
	form?: { error?: string; values?: Values } | null
}

let { values = {}, submitLabel, showLicence = true, form }: Props = $props()

let department = $state(values?.department ?? "")
</script>

{#if form?.error}
	<Alert color="red" class="mb-4">
		{#snippet icon()}<InfoCircleSolid class="h-5 w-5" />{/snippet}
		{form.error}
	</Alert>
{/if}

<div class="flex flex-col gap-4">
	<div>
		<Label for="first_name" class="mb-2">Prénom <span class="text-red-500">*</span></Label>
		<Input
			id="first_name"
			name="first_name"
			type="text"
			placeholder="Prénom"
			value={form?.values?.first_name ?? values?.first_name ?? ""}
			required
		/>
	</div>

	<div>
		<Label for="last_name" class="mb-2">Nom <span class="text-red-500">*</span></Label>
		<Input
			id="last_name"
			name="last_name"
			type="text"
			placeholder="Nom"
			value={form?.values?.last_name ?? values?.last_name ?? ""}
			required
		/>
	</div>

	<div>
		<Label for="department" class="mb-2">Département <span class="text-red-500">*</span></Label>
		<input type="hidden" name="department" value={department} />
		<DepartmentSelect bind:value={department} id="department" />
	</div>

	<div>
		<Label for="birth_date" class="mb-2">Date de naissance</Label>
		<Input
			id="birth_date"
			name="birth_date"
			type="date"
			value={form?.values?.birth_date ?? values?.birth_date ?? ""}
		/>
	</div>

	{#if showLicence}
		<div>
			<Label for="licence_no" class="mb-2">Numéro de licence FFD</Label>
			<Input
				id="licence_no"
				name="licence_no"
				type="text"
				placeholder="Numéro de licence (optionnel)"
				value={form?.values?.licence_no ?? values?.licence_no ?? ""}
			/>
		</div>
	{/if}

	<Button type="submit" color="primary">{submitLabel}</Button>
</div>
