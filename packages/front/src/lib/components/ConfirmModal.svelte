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

function handleConfirm() {
	onConfirm()
	open = false
}
function handleCancel() {
	open = false
}
</script>

<Modal bind:open size="xs" outsideclose>
	<p class="text-gray-700 dark:text-gray-300">{message}</p>
	{#snippet footer()}
		<Button color="red" onclick={handleConfirm}>Confirmer</Button>
		<Button color="alternative" onclick={handleCancel}>Annuler</Button>
	{/snippet}
</Modal>
