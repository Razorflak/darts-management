# Conventions

## Formatage — Biome

- **Config**: `packages/config/biome-config/`
- **Indentation**: tabs
- **Quotes**: double quotes
- **Semicolons**: aucun (no semicolons)
- **Imports**: auto-organisés par Biome
- **Commande**: `pnpm lint` pour vérifier + corriger

## TypeScript

- **Config base**: `packages/config/typescript-config/`
- **Mode**: strict
- **Flags clés**: `verbatimModuleSyntax`, `NodeNext` resolution
- **Types**: toujours `type` plutôt que `interface`

## Typage — Zod-first (règle absolue)

```typescript
// ❌ Interdit
type MyRow = { id: string; name: string }

// ✅ Obligatoire
export const MyRowSchema = z.object({ id: z.string(), name: z.string() })
export type MyRow = z.infer<typeof MyRowSchema>
```

- Schemas domaine : `packages/domain/src/{context}/schemas.ts`
- Schemas requête : `packages/front/src/lib/server/schemas/request-schemas.ts`
- Ne jamais redéfinir un type déjà dans `domain`

## Nommage

- **Fichiers**: kebab-case (`player-repository.ts`, `score-modal.svelte`)
- **Variables/fonctions**: camelCase
- **Schemas Zod**: PascalCase + suffixe `Schema` (`PlayerSchema`, `TeamSchema`)
- **Types inférés**: PascalCase sans suffixe (`Player`, `Team`)
- **Routes API**: `packages/front/src/routes/api/{context}/+server.ts`

## Gestion d'erreurs

- **Couche application/db**: lever `Error("Forbidden")` ou `Error("NotFound")`
- **Couche front (API routes)**: mapper ces erreurs en codes HTTP
  ```typescript
  catch (e) {
    if (e instanceof Error && e.message === "Forbidden") return new Response(null, { status: 403 })
    if (e instanceof Error && e.message === "NotFound") return new Response(null, { status: 404 })
    throw e
  }
  ```

## Pattern Repository

```typescript
// packages/db/src/repositories/
// Chaque fonction prend sql en premier paramètre
export const findPlayer = async (sql: postgres.Sql, id: string): Promise<Player> => {
  const rows = PlayerSchema.array().parse(await sql`SELECT ... WHERE id = ${id}`)
  if (!rows[0]) throw new Error("NotFound")
  return rows[0]
}
```

- `createRepository()` + `traced()` wrapping pour l'observabilité
- Factories `getXxxWithSql` pour pré-binder `sql`

## Validation SQL

Toutes les requêtes `SELECT` validées par Zod au retour :

```typescript
const rows = z.array(MyRowSchema).parse(await sql`SELECT ...`)
```

Pour les colonnes JSONB :
```typescript
z.preprocess((val) => typeof val === 'string' ? JSON.parse(val) : val, MySchema)
```

## Svelte 5

- Runes (`$state`, `$derived`, `$effect`, `$props`)
- Composants extraits quand deux sections se ressemblent (pas de duplication)
- Composants placés à côté de la page concernée

## Règles routes

- **Mutations**: via `packages/application` use-cases, jamais SQL direct
- **Lectures**: `sql` direct dans `+page.server.ts` acceptable
- **Nouvelles routes API**: référencées dans `apiRoutes` de `api.ts`
