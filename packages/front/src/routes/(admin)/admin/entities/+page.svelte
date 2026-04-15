<script lang="ts">
import {
	Badge,
	Button,
	Table,
	TableBody,
	TableBodyCell,
	TableBodyRow,
	TableHead,
	TableHeadCell,
} from "flowbite-svelte"
import { BuildingOutline } from "flowbite-svelte-icons"

let { data } = $props()

const TYPE_LABELS: Record<string, string> = {
	federation: "Fédération",
	ligue: "Ligue",
	comite: "Comité",
	club: "Club",
}

const TYPE_COLORS: Record<string, "red" | "blue" | "green" | "yellow"> = {
	federation: "red",
	ligue: "blue",
	comite: "green",
	club: "yellow",
}
</script>

<svelte:head> <title>Entités — Administration FFD</title> </svelte:head>

<!-- En-tête de page -->
<div class="mb-6 flex flex-wrap items-start justify-between gap-3">
	<div>
		<p class="page-eyebrow">Administration</p>
		<h1 class="page-title">Entités</h1>
	</div>
	<Button href="/admin/entities/new" size="sm">Créer une entité</Button>
</div>

{#if data.entities.length === 0}
	<div class="empty-state">
		<BuildingOutline
			class="mx-auto mb-3 h-8 w-8"
			style="color: var(--color-border-strong);"
		/>
		<p class="font-medium" style="color: oklch(50% 0.01 264);">Aucune entité</p>
		<p class="mt-1 text-sm" style="color: oklch(65% 0.01 264);">
			Créez la première entité (fédération, ligue, comité ou club).
		</p>
	</div>
{:else}
	<div class="table-wrapper">
		<Table>
			<TableHead>
				<TableHeadCell>Nom</TableHeadCell>
				<TableHeadCell>Type</TableHeadCell>
			</TableHead>
			<TableBody>
				{#each data.entities as entity (entity.id)}
					<TableBodyRow>
						<TableBodyCell class="font-medium">{entity.name}</TableBodyCell>
						<TableBodyCell>
							<Badge color={TYPE_COLORS[entity.type] ?? "gray"}>
								{TYPE_LABELS[entity.type] ?? entity.type}
							</Badge>
						</TableBodyCell>
					</TableBodyRow>
				{/each}
			</TableBody>
		</Table>
	</div>
{/if}
