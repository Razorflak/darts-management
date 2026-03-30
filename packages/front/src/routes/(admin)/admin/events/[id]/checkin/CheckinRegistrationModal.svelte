<script lang="ts">
let {
	eventId,
	date,
	tournaments,
	onClose,
}: {
	eventId: string
	date: string
	tournaments: { id: string; name: string; category: string }[]
	onClose: () => void
} = $props()
</script>

<!-- Placeholder — will be replaced in Task 3 -->
