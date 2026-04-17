<script lang="ts">
import { Modal } from "flowbite-svelte"
import type { MatchDisplay } from "$lib/server/schemas/event-schemas.js"
import ScoreForm from "$lib/tournament/components/ScoreForm.svelte"

type Props = {
	open: boolean
	match: MatchDisplay | null
	eventId: string
}
let { open = $bindable(), match, eventId }: Props = $props()

const modalTitle = $derived(
	match
		? `Match #${match.event_match_id} — Phase ${match.phase_position} — Round ${match.round_number}`
		: "Match",
)

function closeModal() {
	open = false
}
</script>

<Modal title={modalTitle} bind:open size="md">
	<ScoreForm {match} {eventId} onclose={closeModal} />
</Modal>
