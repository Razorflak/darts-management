<script lang="ts">
import type { StandingEntry } from "@darts-management/domain"
import {
	Table,
	TableBody,
	TableBodyCell,
	TableBodyRow,
	TableHead,
	TableHeadCell,
} from "flowbite-svelte"

type Props = {
	standings: StandingEntry[]
	teamNames: Map<string, string>
}
let { standings, teamNames }: Props = $props()
</script>

<Table class="mt-2 text-sm">
	<TableHead>
		<TableHeadCell class="w-8">#</TableHeadCell>
		<TableHeadCell>Équipe</TableHeadCell>
		<TableHeadCell class="text-center">J</TableHeadCell>
		<TableHeadCell class="text-center">V</TableHeadCell>
		<TableHeadCell class="text-center">D</TableHeadCell>
		<TableHeadCell class="text-center">Pts</TableHeadCell>
		<TableHeadCell class="text-center">Diff</TableHeadCell>
		<TableHeadCell class="text-center">+Legs</TableHeadCell>
		<TableHeadCell class="text-center">-Legs</TableHeadCell>
	</TableHead>
	<TableBody>
		{#each standings as entry, i}
			<TableBodyRow>
				<TableBodyCell class="font-medium text-gray-500">{i + 1}</TableBodyCell>
				<TableBodyCell>{teamNames.get(entry.team_id) ?? entry.team_id}</TableBodyCell>
				<TableBodyCell class="text-center">{entry.played}</TableBodyCell>
				<TableBodyCell class="text-center">{entry.wins}</TableBodyCell>
				<TableBodyCell class="text-center">{entry.losses}</TableBodyCell>
				<TableBodyCell class="text-center font-semibold">{entry.points}</TableBodyCell>
				<TableBodyCell class="text-center">{entry.leg_diff > 0 ? `+${entry.leg_diff}` : entry.leg_diff}</TableBodyCell>
				<TableBodyCell class="text-center">{entry.legs_won}</TableBodyCell>
				<TableBodyCell class="text-center">{entry.legs_lost}</TableBodyCell>
			</TableBodyRow>
		{/each}
	</TableBody>
</Table>
