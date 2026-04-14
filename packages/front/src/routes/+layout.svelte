<script lang="ts">
import "./layout.css"
import { Button, Modal } from "flowbite-svelte"
import favicon from "$lib/assets/favicon.svg"
import { confirmState, settle } from "$lib/confirm.svelte.js"

let { children } = $props()
</script>

<svelte:head><link rel="icon" href={favicon}></svelte:head>
{@render children()}

<Modal bind:open={confirmState.open} size="xs" outsideclose>
	<p class="text-gray-700 dark:text-gray-300">{confirmState.message}</p>
	{#snippet footer()}
		<Button color="red" onclick={() => settle(true)}>Confirmer</Button>
		<Button color="alternative" onclick={() => settle(false)}>Annuler</Button>
	{/snippet}
</Modal>
