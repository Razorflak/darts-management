<script lang="ts">
  import { Badge, Button, Table, TableBody, TableBodyCell, TableBodyRow, TableHead, TableHeadCell } from "flowbite-svelte"

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

<div class="flex items-center justify-between mb-6">
  <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Entités</h1>
  <Button href="/admin/entities/new" size="sm">Créer une entité</Button>
</div>

{#if data.entities.length === 0}
  <p class="text-gray-500 dark:text-gray-400">Aucune entité.</p>
{:else}
  <Table>
    <TableHead>
      <TableHeadCell>Nom</TableHeadCell>
      <TableHeadCell>Type</TableHeadCell>
    </TableHead>
    <TableBody>
      {#each data.entities as entity (entity.id)}
        <TableBodyRow>
          <TableBodyCell>{entity.name}</TableBodyCell>
          <TableBodyCell>
            <Badge color={TYPE_COLORS[entity.type] ?? "gray"}>
              {TYPE_LABELS[entity.type] ?? entity.type}
            </Badge>
          </TableBodyCell>
        </TableBodyRow>
      {/each}
    </TableBody>
  </Table>
{/if}
