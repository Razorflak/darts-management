# Darts Management — Mémoire de session

## Convention Zod-first (règle absolue)

`event-schemas.ts` = source de vérité unique pour tous les types domaine.
- Tout type dérivé via `z.infer<typeof MySchema>` — jamais de `type MyRow = {...}` inline
- `request-schemas.ts` dérive des schemas domaine, avec `z.coerce.date()` pour les dates en transit JSON
- Cette règle est documentée dans CLAUDE.md

## Structure des schemas

- `packages/front/src/lib/server/schemas/event-schemas.ts` — types domaine (Entity, Phase, Tournament, Event, Draft*)
- `packages/front/src/lib/server/schemas/request-schemas.ts` — validation des payloads HTTP entrants
- `packages/db/src/schemas.ts` — authz

## DB — état des migrations

| Migration | Contenu |
|-----------|---------|
| 001–005   | Auth, entités, rôles |
| 006       | Table `event` |
| 007       | Table `tournament` |
| 008       | Table `phase` (normalisée) |
| 009       | Alignement schemas Zod : event nullable dates, tournament drop club/quota/start_time/rename start_at, phase drop entrants/rename qualifiers→qualifiers_count |

## Types clés

- `entity` = objet `{id, name}` dans l'app ET en DB (JOIN sur SELECT, entity_id FK en INSERT)
- `Tournament.start_at` = TIMESTAMPTZ nullable (NULL = même heure que l'event)
- `Phase` discriminée sur `type` : group (round_robin, double_loss_groups) vs elimination (single_elimination, double_elimination)
- `BracketTier.round` = string enum ("4096", "2048", ...) — Zod enum ne supporte pas les numbers

## Patterns SQL serveur

- Tous les SELECT validés : `z.array(MySchema).parse(await tx\`SELECT...\`)`
- `insertPhases()` et `insertTournaments()` factorisés, partagés entre save/ et publish/
- entity_id en DB ← `body.event.entity.id` (objet côté client)
- postgres.js template literals = protection injection SQL native (pas de string concat)
