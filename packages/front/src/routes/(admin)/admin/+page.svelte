<script lang="ts">
  import { Button, Table, TableBody, TableBodyCell, TableBodyRow, TableHead, TableHeadCell, Badge } from "flowbite-svelte"

  let { data } = $props()

  const typeLabels: Record<string, string> = {
    federation: "Fédération",
    ligue: "Ligues",
    comite: "Comités",
    club: "Clubs",
  }

  const typeBadgeColor: Record<string, "purple" | "blue" | "green" | "yellow"> = {
    federation: "purple",
    ligue: "blue",
    comite: "green",
    club: "yellow",
  }
</script>

<svelte:head>
  <title>Administration — FFD Darts</title>
</svelte:head>

<div class="flex items-center justify-between mb-6">
  <h1 class="text-2xl font-bold text-gray-900">Administration des entités</h1>
  <Button href="/admin/entities/new" size="sm">+ Nouvelle entité</Button>
</div>

{#each Object.entries(data.grouped) as [type, entities]}
  {#if entities.length > 0 || type === "federation"}
    <section class="mb-8">
      <h2 class="text-lg font-semibold text-gray-700 mb-3">
        <Badge color={typeBadgeColor[type]} large>{typeLabels[type]}</Badge>
        <span class="ml-2 text-gray-500 text-sm font-normal">({entities.length})</span>
      </h2>

      {#if entities.length === 0}
        <p class="text-sm text-gray-400 italic">Aucune entité de ce type.</p>
      {:else}
        <Table striped>
          <TableHead>
            <TableHeadCell>Nom</TableHeadCell>
            <TableHeadCell>Parent</TableHeadCell>
          </TableHead>
          <TableBody>
            {#each entities as entity}
              <TableBodyRow>
                <TableBodyCell>{entity.name}</TableBodyCell>
                <TableBodyCell>{entity.parent_name ?? "—"}</TableBodyCell>
              </TableBodyRow>
            {/each}
          </TableBody>
        </Table>
      {/if}
    </section>
  {/if}
{/each}
