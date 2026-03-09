<script lang="ts">
	import DepartmentSelect from "$lib/tournament/components/DepartmentSelect.svelte"

	type Props = {
		first_name: string
		last_name: string
		department: string
	}
	let {
		first_name = $bindable(""),
		last_name = $bindable(""),
		department = $bindable(""),
	}: Props = $props()

	const inputClass =
		"block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-primary-500 dark:focus:ring-primary-500"
</script>

<div class="mt-3 grid grid-cols-2 gap-3">
	<input class={inputClass} placeholder="Prénom *" bind:value={first_name} />
	<input class={inputClass} placeholder="Nom *" bind:value={last_name} />
	<div class="col-span-2">
		<DepartmentSelect bind:value={department} placeholder="Département" />
	</div>
</div>
