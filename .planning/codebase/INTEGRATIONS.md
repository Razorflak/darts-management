# Integrations

## Database — PostgreSQL via postgres.js

- **Driver**: `postgres.js` (no ORM)
- **Config**: connection pool, Supabase pooler compatible
- **Migrations**: `node-pg-migrate`
- **Client**: `packages/db/src/client.ts` → `createSql()`
- **Usage**: raw SQL tagged templates — `sql\`SELECT ...\``

## Auth — Better Auth 1.4.x

- **Mode**: self-hosted, email + password
- **Adapter**: `kysely-postgres-js` (Better Auth's own tables)
- **SvelteKit plugin**: cookies integration in `packages/front/src/hooks.server.ts`
- **Config**: `packages/db/src/auth.ts` → `createAuth()`
- **Email verification**: currently disabled (`requireEmailVerification: false`)

## Authorization — Custom RBAC

- **File**: `packages/db/src/authz.ts`
- **Functions**: `createAuthz`, `getUserRoles`, `checkRole`
- **Roles**: 6 roles scoped to entity hierarchy (fédération, ligue, comité, club, event, tournament)

## Email — Nodemailer SMTP

- **Package**: `packages/mail/`
- **Use**: password reset emails
- **Local dev**: MailDev (`docker-compose.observability.yml`)

## Observability — OpenTelemetry

- **Traces + logs**: exported via OTLP HTTP
- **Local stack**: SigNoz CE via `docker-compose.observability.yml`
- **Structured logging**: Pino (`packages/logger/`)
- **⚠ Known issue**: OTLP auth token logged to stdout on every cold start (`packages/logger/src/tracing.ts`)

## Deployment

- **Host**: Railway

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `BETTER_AUTH_SECRET` | Yes | Auth signing secret |
| `BETTER_AUTH_URL` | Yes | App base URL |
| `SMTP_HOST` | Yes | Mail server host |
| `SMTP_PORT` | Yes | Mail server port |
| `SMTP_USER` | Yes | Mail server user |
| `SMTP_PASS` | Yes | Mail server password |
| `OTLP_ENDPOINT` | No | OpenTelemetry collector URL |
| `OTLP_AUTH_TOKEN` | No | OTLP auth token |
