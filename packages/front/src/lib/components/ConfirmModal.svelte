<script lang="ts">
import { Button, Modal } from "flowbite-svelte"

let {
	open = $bindable(false),
	message,
	onConfirm,
}: {
	open: boolean
	message: string
	onConfirm: () => void
} = $props()
</script>

<Modal bind:open size="xs" outsideclose>
	<p class="text-gray-700 dark:text-gray-300">{message}</p>
	{#snippet footer()}
		<Button color="red" onclick={() => { onConfirm(); open = false }}>Confirmer</Button>
		<Button color="alternative" onclick={() => (open = false)}>Annuler</Button>
	{/snippet}
</Modal>
