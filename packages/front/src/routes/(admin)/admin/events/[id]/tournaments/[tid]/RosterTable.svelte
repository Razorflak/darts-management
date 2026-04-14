<script lang="ts">
import {
	Button,
	Input,
	Table,
	TableBody,
	TableBodyCell,
	TableBodyRow,
	TableHead,
	TableHeadCell,
} from "flowbite-svelte"
import { confirm } from "$lib/confirm.svelte.js"
import { apiRoutes } from "$lib/fetch/api"
import type { RosterEntry } from "$lib/server/schemas/event-schemas.js"
import RegistrationModal from "./RegistrationModal.svelte"

let {
	roster = $bindable(),
	tournamentId,
	isDoubles,
	checkInRequired,
	onRegistered,
}: {
	roster: RosterEntry[]
	tournamentId: string
	isDoubles: boolean
	checkInRequired: boolean
	onRegistered: () => Promise<void>
} = $props()

let filterQuery = $state("")
let filteredRoster = $derived(
	filterQuery.trim().length === 0
		? roster
		: roster.filter((e) =>
				e.members.some(
					(m) =>
						`${m.last_name} ${m.first_name}`
							.toLowerCase()
							.includes(filterQuery.toLowerCase()) ||
						`${m.first_name} ${m.last_name}`
							.toLowerCase()
							.includes(filterQuery.toLowerCase()),
				),
			),
)

let showAddModal = $state(false)

async function checkIn(registrationId: string, value: boolean) {
	await fetch(apiRoutes.TOURNAMENT_CHECKIN.path, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			registration_ids: [registrationId],
			checked_in: value,
		}),
	})
	const entry = roster.find((e) => e.registration_id === registrationId)
	if (entry) entry.checked_in = value
}

async function unregister(registrationId: string) {
	if (!(await confirm("Confirmer le retrait de cette équipe ?"))) return
	await fetch(apiRoutes.TOURNAMENT_UNEREGISER.path, {
		method: "DELETE",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ registration_id: registrationId }),
	})
	roster = roster.filter((e) => e.registration_id !== registrationId)
}
</script>

<div class="mb-4 flex items-center gap-3">
	<Button color="primary" size="sm" onclick={() => (showAddModal = true)}>
		{isDoubles ? "Ajouter une équipe" : "Ajouter un joueur"}
	</Button>
	{#if roster.length > 0}
		<Input
			placeholder="Filtrer les inscrits..."
			bind:value={filterQuery}
			class="max-w-xs"
		/>
	{/if}
</div>

{#if roster.length === 0}
	<p class="mb-6 text-sm text-gray-500">
		Aucune équipe inscrite pour le moment.
	</p>
{:else}
	<div class="mb-6">
		<Table>
			<TableHead>
				<TableHeadCell>Équipe</TableHeadCell>
				{#if checkInRequired}
					<TableHeadCell>Présent</TableHeadCell>
				{/if}
				<TableHeadCell>Actions</TableHeadCell>
			</TableHead>
			<TableBody>
				{#each filteredRoster as entry (entry.registration_id)}
					<TableBodyRow class="border-b border-gray-100">
						<TableBodyCell>
							{#each entry.members as member, i}
								{member.last_name}
								{member.first_name}{i < entry.members.length - 1 ? " / " : ""}
								{#if member.department}
									<span class="ml-1 text-xs text-gray-400"
										>({member.department})</span
									>
								{/if}
							{/each}
						</TableBodyCell>
						{#if checkInRequired}
							<TableBodyCell>
								{#if entry.checked_in}
									<Button
										size="xs"
										color="green"
										onclick={() => checkIn(entry.registration_id, false)}
									>
										Présent ✓
									</Button>
								{:else}
									<Button
										size="xs"
										color="light"
										onclick={() => checkIn(entry.registration_id, true)}
									>
										Absent
									</Button>
								{/if}
							</TableBodyCell>
						{/if}
						<TableBodyCell>
							<Button
								color="red"
								size="xs"
								onclick={() => unregister(entry.registration_id)}
							>
								Retirer
							</Button>
						</TableBodyCell>
					</TableBodyRow>
				{/each}
			</TableBody>
		</Table>
	</div>
{/if}

<RegistrationModal
	bind:open={showAddModal}
	{isDoubles}
	{tournamentId}
	{onRegistered}
/>
