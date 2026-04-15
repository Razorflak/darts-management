# Architecture

## Pattern

5-layer DDD (Domain-Driven Design) with strict dependency graph:

```
domain (Zod schemas + pure functions)
  ↓
db (repositories + auth + authz)
  ↓
application (use-cases orchestrating domain + db)
  ↓
front (SvelteKit — presentation only)

logger (cross-cutting, no business logic)
```

## Key Design Principles

- **Zod-first typing**: All TypeScript types are derived from Zod schemas via `z.infer<>`. No inline type declarations.
- **Repository pattern**: `createRepository()` + `traced()` wrapping in `packages/db/src/repositories/`
- **No SQL in routes**: Mutations go through `packages/application` use-cases; reads use direct `sql` in `+page.server.ts`

## Data Flow

### Mutations
```
SvelteKit route (api/) 
  → use-case in packages/application/src/{context}/
  → repository in packages/db/src/repositories/
  → postgres.js SQL
```

### Reads
```
+page.server.ts load()
  → direct sql`` query
  → Zod schema validation
  → page data
```

## Auth Flow

```
Request
  → hooks.server.ts (Better Auth session check)
  → layout +layout.server.ts (role guards)
  → page/route handler
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
