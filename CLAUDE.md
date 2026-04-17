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

<!-- GSD:project-start source:PROJECT.md -->
## Project

**Darts Management — Refactoring Back-end**

Application de gestion de tournois de darts (monorepo pnpm/Turborepo, architecture DDD). Ce milestone est un nettoyage structurel du back-end : consolider les schemas Zod éparpillés, supprimer les doublons dans les repositories, simplifier la couche application, et poser des règles strictes qui serviront de référence pour toute la suite du projet.

**Core Value:** Un back-end lisible et sans doublons, avec des règles claires sur où mettre chaque type de code — pour que le prochain ajout de feature ne réintroduise pas de duplication.

### Constraints

- **Tech stack** : TypeScript strict, Biome (lint/format), Vitest — aucun changement de stack
- **Compatibilité** : les APIs existantes (routes front) ne doivent pas changer de signature
- **Tests** : aucun test existant ne doit régresser
- **Déploiement** : pas de migration DB impliquée
<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->
## Technology Stack

## Languages
- TypeScript 5.9.x - All packages (domain, db, application, front, logger)
- SQL - Database migrations in `packages/db/src/schema/` (raw `.sql` files via node-pg-migrate)
- Svelte (5.x) - Frontend components in `packages/front/src/`
## Runtime
- Node.js (LTS) - Server-side execution for SvelteKit adapter-node and DB layer
- Browser (Chromium) - Client-side Svelte 5 components
- pnpm 10.16.1
- Lockfile: `pnpm-lock.yaml` (present)
## Frameworks
- SvelteKit 2.53.x (`@sveltejs/kit`) - Full-stack web framework, adapter-node for Node.js production (`packages/front/`)
- Svelte 5.51.x - UI component framework with runes
- Turborepo 2.8.x (`turbo`) - Monorepo task orchestration, config in `turbo.json`
- Vite 7.3.x - Frontend bundler/dev server, config in `packages/front/vite.config.ts`
- `@sveltejs/adapter-node` 5.5.x - Production adapter: outputs `packages/front/build/index.js`
- Vitest 4.x - Unit and integration test runner
- `@vitest/browser-playwright` + `vitest-browser-svelte` - Browser component testing
- Biome 2.4.9 (`@biomejs/biome`) - Single tool for lint + format across all packages
## Key Dependencies
- `zod` 4.3.6 - Schema validation and TypeScript type derivation; used in `domain`, `db`, `front` as single source of truth for all types
- `postgres` 3.4.x (`postgres.js`) - PostgreSQL driver used in `packages/db/src/client.ts`; connection pool max=5, idle_timeout=20s
- `better-auth` 1.4.x - Authentication library with email+password and SvelteKit cookies plugin; configured in `packages/db/src/auth.ts`
- `kysely-postgres-js` 3.0.x - Kysely dialect adapter for postgres.js, used by Better Auth for its own tables
- `@opentelemetry/api` 1.9.x - OpenTelemetry API for tracing, used in `packages/db/src/client.ts` and `packages/logger/`
- `pino` 10.x - Structured logging, configured in `packages/logger/src/`
- `nodemailer` 8.x - Email sending for password reset in `packages/db/src/auth.ts`
- `node-pg-migrate` 8.x - SQL migration runner; migrations in `packages/db/src/schema/`
- `flowbite-svelte` 1.31.x + `flowbite-svelte-icons` 3.1.x - UI component library based on Tailwind CSS
- `tailwindcss` 4.1.x + `@tailwindcss/vite` - Utility-first CSS, integrated via Vite plugin
- `sortablejs` 1.15.x - Drag-and-drop sorting for tournament seeding UI
- `dayjs` 1.11.x - Date formatting and manipulation
- `uuid` 13.0.x - UUID generation in domain and front packages
## Monorepo Workspace Packages
| Package | Name | Purpose |
|---------|------|---------|
| `packages/config/biome-config` | `@darts-management/biome-config` | Shared Biome config |
| `packages/config/typescript-config` | `@darts-management/typescript-config` | Shared tsconfig base |
| `packages/config/vitest-config` | `@darts-management/vitest-config` | Shared Vitest config |
| `packages/domain` | `@darts-management/domain` | Zod schemas + pure business logic |
| `packages/db` | `@darts-management/db` | Repositories, auth, authz, SQL client |
| `packages/application` | `@darts-management/application` | Application services (cross-repo orchestration) |
| `packages/logger` | `@darts-management/logger` | Pino logger + OpenTelemetry SDK setup |
| `packages/mail` | `@darts-management/mail` | MailDev local dev SMTP server |
| `packages/front` | `front` | SvelteKit frontend application |
## Configuration
- `.env` at monorepo root (loaded by Vite dev server into `process.env`)
- `packages/front/.env` for frontend-specific vars
- Loaded at build time via `vite.config.ts` custom plugin (`loadEnv`)
- Runtime access via SvelteKit `$env/dynamic/private`
- `DATABASE_URL` - PostgreSQL connection string (read by `packages/db/src/client.ts`)
- `BETTER_AUTH_SECRET` - Authentication signing secret
- `BETTER_AUTH_URL` - Base URL for auth callbacks
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS` - Email transport
- `EMAIL_FROM` - From address for outgoing emails
- `OTEL_EXPORTER_OTLP_ENDPOINT` - OpenTelemetry collector endpoint (default: `http://localhost:4318`)
- `OTEL_EXPORTER_OTLP_AUTH_TOKEN` - Optional auth token for OTLP exporter
- `DEBUG_SQL` - Set to `"true"` to log SQL statements as OpenTelemetry span attributes
- `turbo.json` - Defines task graph: `build` depends on `^build`; `dev` and `prod` are non-cached persistent tasks
- `packages/front/svelte.config.js` - SvelteKit config with `adapter-node`
- `packages/front/vite.config.ts` - Vite config with Tailwind, SvelteKit, Playwright test projects
## Platform Requirements
- Node.js + pnpm 10.16.1
- PostgreSQL database (connection via `DATABASE_URL`)
- Optional: MailDev SMTP server (`packages/mail` — `pnpm dev` runs `maildev --smtp 1025 --web 1080`)
- Optional: SigNoz observability stack via `docker-compose.observability.yml`
- Node.js server running `packages/front/build/index.js` (SvelteKit adapter-node output)
- Deployment target includes Railway (`sveltekit-production.up.railway.app` in Vite `allowedHosts`)
- PostgreSQL database required at runtime
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

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
## Pattern Repository
- `createRepository()` + `traced()` wrapping pour l'observabilité
- Factories `getXxxWithSql` pour pré-binder `sql`
## Validation SQL
## Svelte 5
- Runes (`$state`, `$derived`, `$effect`, `$props`)
- Composants extraits quand deux sections se ressemblent (pas de duplication)
- Composants placés à côté de la page concernée
## Règles routes
- **Mutations**: via `packages/application` use-cases, jamais SQL direct
- **Lectures**: `sql` direct dans `+page.server.ts` acceptable
- **Nouvelles routes API**: référencées dans `apiRoutes` de `api.ts`
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

## Pattern
```
```
## Key Design Principles
- **Zod-first typing**: All TypeScript types are derived from Zod schemas via `z.infer<>`. No inline type declarations.
- **Repository pattern**: `createRepository()` + `traced()` wrapping in `packages/db/src/repositories/`
- **No SQL in routes**: Mutations go through `packages/application` use-cases; reads use direct `sql` in `+page.server.ts`
## Data Flow
### Mutations
```
```
### Reads
```
```
## Auth Flow
```
```
- Better Auth handles session management
- `packages/db/src/authz.ts` → `createAuthz`, `getUserRoles`, `checkRole`
- Error convention: `Error("Forbidden")` / `Error("NotFound")` in application layer, mapped to HTTP status in routes
## Entry Points
- **SvelteKit app**: `packages/front/src/app.html` + `src/hooks.server.ts`
- **API routes**: `packages/front/src/routes/api/`
- **Admin UI**: `packages/front/src/routes/(admin)/`
- **App UI**: `packages/front/src/routes/(app)/`
- **Auth pages**: `packages/front/src/routes/(auth)/`
## Abstractions
- `$lib/server/repos.ts` — barrel that pre-binds `sql` instance to all repository functions
- `$lib/fetch/api.ts` — `apiRoutes` registry for all API endpoint paths
- `$lib/server/schemas/request-schemas.ts` — Zod validation for incoming JSON payloads
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, or `.github/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
