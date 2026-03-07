# Darts Management — Monorepo

## Stack

- **Gestionnaire de paquets** : pnpm (workspaces)
- **Système de build** : Turborepo
- **Langage** : TypeScript
- **Linter/Formateur** : Biome
- **Tests** : Vitest

## Structure

```
packages/
  config/           # Configurations partagées (Biome, TypeScript, Vitest)
  front/            # Frontend SvelteKit (voir packages/front/CLAUDE.md)
```

## Commandes courantes

```bash
pnpm build        # Build tous les paquets (turbo)
pnpm dev          # Mode développement (turbo, persistant)
pnpm lint         # Lint tous les paquets
pnpm typecheck    # Vérification des types sur tous les paquets
pnpm test         # Lancer tous les tests
```

## Conventions

- Les configs TypeScript sont étendues depuis `packages/config/typescript-config`
- Les configs Vitest sont étendues depuis `packages/config/vitest-config`
- Utilisation des `type` pour TypeScript plutôt que les `interface`

### Typage Zod-first — règle absolue

**`event-schemas.ts` est la source de vérité unique pour les types domaine.**
Tous les types TypeScript sont dérivés de schemas Zod via `z.infer<>`. Il est **interdit** d'écrire des types inline.

```
❌ type MyRow = { id: string; name: string }
✅ export const MyRowSchema = z.object({ id: z.string(), name: z.string() })
   export type MyRow = z.infer<typeof MyRowSchema>
```

- **Schemas domaine** : `packages/front/src/lib/server/schemas/event-schemas.ts` — types lus depuis la DB ou utilisés dans l'UI
- **Schemas requête** : `packages/front/src/lib/server/schemas/request-schemas.ts` — valide les payloads JSON entrants (dates via `z.coerce.date()`, dérive des schemas domaine)
- **Authz** : `packages/db/src/schemas.ts`
- Ne jamais redéfinir un type déjà présent dans `event-schemas.ts` dans un autre fichier

### Validation des résultats SQL

Toutes les requêtes SQL `SELECT` doivent être validées par un schema Zod au retour du pilote.

- **Types dérivés** : utiliser `z.infer<typeof MySchema>` — pas de `type MyRow = { ... }` inline
- **JSONB** : utiliser `z.preprocess((val) => typeof val === 'string' ? JSON.parse(val) : val, ...)` pour les colonnes JSONB
- **Pattern** :
  ```typescript
  import { z } from 'zod'
  import { MyRowSchema } from '$lib/server/schemas/event-schemas.js'

  const rows = z.array(MyRowSchema).parse(
    await sql`SELECT ...`
  )
  ```

## Notes spécifiques aux paquets

- **packages/front** : application SvelteKit — voir `packages/front/CLAUDE.md` pour les instructions d'outillage MCP Svelte 5 / SvelteKit
