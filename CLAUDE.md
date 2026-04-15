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
  domain/           # Logique métier pure — schemas Zod + services sans dépendance DB
  db/               # Accès données — repositories SQL + auth + authz
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

## Architecture DDD

Le projet suit une architecture DDD en couches avec un graphe de dépendances strict :

```
domain  (zod seulement)
  ↓
db      (repositories + auth + authz)
  ↓
front   (SvelteKit — présentation uniquement)
```

### `packages/domain` — logique métier pure

Contient uniquement les schemas Zod et les fonctions pures (sans accès DB).

```
src/
  organisation/schemas.ts   # Entity (fédération, ligue, comité, club)
  tournoi/schemas.ts         # Event, Tournament, Phase, BracketTier
  joueur/schemas.ts          # Player, Team, TeamMember, profils
  joueur/format.ts           # formatPlayerInfo (normalisation noms)
  inscription/schemas.ts     # Registration, Roster, CheckIn
  tournoi/services/          # Algorithmes purs (ex: phase-utils)
  index.ts                   # Barrel — tout est ré-exporté ici
```

**Règle** : aucune dépendance vers `db` ou `front`. Pas d'import `postgres`, pas d'accès réseau.

### `packages/db` — accès données

Contient les repositories SQL, l'authentification (Better Auth) et l'autorisation.

```
src/
  repositories/
    player-repository.ts      # searchPlayers, searchPartners, playerExists,
                              #   createPlayer, linkOrCreatePlayerProfile
    team-repository.ts        # findOrCreateTeam
    tournament-repository.ts  # upsertTournaments, insertPhases, registerTeam,
                              #   updateCheckin, checkinAll, unregister,
                              #   updateTournamentStatus
    event-repository.ts       # saveEvent, publishEvent, deleteEvent
  auth.ts                     # createAuth (Better Auth)
  authz.ts                    # createAuthz, getUserRoles, checkRole
  client.ts                   # createSql (postgres.js)
  index.ts                    # Barrel — exports publics du package
```

**Règles** :
- Chaque fonction repository prend `sql: postgres.Sql` en premier paramètre
- Les opérations transactionnelles (save/publish event) gèrent leur `sql.begin()` en interne
- Lever `Error("Forbidden")` / `Error("NotFound")` pour les erreurs métier — la couche front mappe en HTTP

### `packages/front` — présentation SvelteKit

**Règle principale** : pas de SQL dans les routes. La couche front orchestre mais ne fait pas d'accès DB directement dans les handlers de mutation.

#### Routes mutations (`api/`)

Importer depuis `$lib/server/repos` — jamais `sql` directement dans une route mutation.

```typescript
// ✅
import { eventRepo, playerRepo, tournamentRepo } from "$lib/server/repos"
await eventRepo.save(event, userId)

// ❌
import { sql } from "$lib/server/db"
await sql`UPDATE ...`
```

`$lib/server/repos.ts` est un barrel qui pré-bind l'instance `sql` à toutes les fonctions des repositories. Structure :

```typescript
eventRepo      → saveEvent, publishEvent, deleteEvent
playerRepo     → search, searchPartners, exists, create, linkOrCreate
tournamentRepo → register, updateCheckin, checkinAll, unregister, updateStatus
```

#### Routes lecture (`+page.server.ts`)

Les fonctions `load` peuvent utiliser `sql` directement pour les `SELECT` — c'est acceptable dans SvelteKit.

```typescript
// ✅ dans un +page.server.ts
import { sql } from "$lib/server/db"
const rows = z.array(MySchema).parse(await sql`SELECT ...`)
```

#### Barrel de ré-export

Ces fichiers ne contiennent que des ré-exports — ne pas y ajouter de logique :
- `$lib/server/schemas/event-schemas.ts` → ré-exporte tout depuis `@darts-management/domain`
- `$lib/server/event-operations.ts` → ré-exporte depuis `@darts-management/db`

## Conventions

- Les configs TypeScript sont étendues depuis `packages/config/typescript-config`
- Les configs Vitest sont étendues depuis `packages/config/vitest-config`
- Utilisation des `type` pour TypeScript plutôt que les `interface`

### Typage Zod-first — règle absolue

**`packages/domain` est la source de vérité unique pour les types domaine.**
Tous les types TypeScript sont dérivés de schemas Zod via `z.infer<>`. Il est **interdit** d'écrire des types inline.

```
❌ type MyRow = { id: string; name: string }
✅ export const MyRowSchema = z.object({ id: z.string(), name: z.string() })
   export type MyRow = z.infer<typeof MyRowSchema>
```

- **Schemas domaine** : `packages/domain/src/{bounded-context}/schemas.ts`
- **Schemas requête** : `packages/front/src/lib/server/schemas/request-schemas.ts` — valide les payloads JSON entrants
- **Authz** : `packages/db/src/authz.ts`
- Ne jamais redéfinir un type déjà présent dans `domain` dans un autre fichier

### Validation des résultats SQL

Toutes les requêtes SQL `SELECT` doivent être validées par un schema Zod au retour du pilote.

- **Types dérivés** : utiliser `z.infer<typeof MySchema>` — pas de `type MyRow = { ... }` inline
- **JSONB** : utiliser `z.preprocess((val) => typeof val === 'string' ? JSON.parse(val) : val, ...)` pour les colonnes JSONB
- **Pattern** :
  ```typescript
  import { z } from 'zod'
  import { MyRowSchema } from '@darts-management/domain'

  const rows = z.array(MyRowSchema).parse(
    await sql`SELECT ...`
  )
  ```

### Composants réutilisables

Lorsque deux sections de code se ressemblent (ex : formulaires de saisie similaires, blocs d'UI répétés), extraire la partie commune dans un composant `.svelte` placé à côté de la page concernée, et le réutiliser plutôt que de dupliquer le code.

### Qualité du code — règle absolue

Tout code généré doit respecter les règles Biome (linting et formatage). Après chaque modification, vérifier avec :

```bash
pnpm lint
```

Corriger toutes les erreurs avant de livrer le code.

### Routes API

Toute nouvelle route API doit respecter ces règles :

1. **Emplacement** : créer le fichier dans `packages/front/src/routes/api/` (jamais dans les routes admin ou app)
2. **Référence** : ajouter une entrée dans `packages/front/src/lib/fetch/api.ts` dans la variable `apiRoutes`, puis utiliser `apiRoutes.MA_ROUTE.path` dans le code client
3. **Logique** : la logique métier et SQL va dans `packages/db/src/repositories/`, la route ne fait qu'orchestrer

## Notes spécifiques aux paquets

- **packages/front** : application SvelteKit — voir `packages/front/CLAUDE.md` pour les instructions d'outillage MCP Svelte 5 / SvelteKit

## graphify

This project has a graphify knowledge graph at graphify-out/.

Rules:
- Before answering architecture or codebase questions, read graphify-out/GRAPH_REPORT.md for god nodes and community structure
- If graphify-out/wiki/index.md exists, navigate it instead of reading raw files
- After modifying code files in this session, run `graphify update .` to keep the graph current (AST-only, no API cost)
