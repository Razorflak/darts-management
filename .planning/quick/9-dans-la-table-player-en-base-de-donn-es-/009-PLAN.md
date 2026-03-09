---
phase: quick-9
plan: 009
type: execute
wave: 1
depends_on: []
files_modified:
  - packages/db/src/schema/015_player_birth_date_nullable.sql
  - packages/front/src/lib/server/schemas/event-schemas.ts
  - packages/front/src/hooks.server.ts
  - packages/front/src/routes/players/+server.ts
  - packages/front/src/routes/(app)/events/[id]/register/+server.ts
  - packages/front/src/routes/tournaments/[id]/admin/register/+server.ts
autonomous: true
requirements: []

must_haves:
  truths:
    - "La colonne birth_date en base de données accepte NULL"
    - "Les schemas Zod reflètent la nullabilité (birth_date: string | null)"
    - "Les INSERTs n'utilisent plus '1900-01-01' comme valeur fictive"
    - "Le typecheck passe sans erreur"
  artifacts:
    - path: "packages/db/src/schema/015_player_birth_date_nullable.sql"
      provides: "Migration ALTER COLUMN birth_date DROP NOT NULL"
    - path: "packages/front/src/lib/server/schemas/event-schemas.ts"
      provides: "PlayerSchema et PlayerSearchResultSchema avec birth_date nullable"
  key_links:
    - from: "PlayerSchema"
      to: "hooks.server.ts"
      via: "PlayerSchema.parse(rows[0])"
      pattern: "birth_date.*nullable"
---

<objective>
Rendre birth_date optionnel (nullable) dans la table player.

Purpose: Supprimer la contrainte NOT NULL sur birth_date et éliminer le placeholder '1900-01-01' utilisé comme valeur fictive partout dans le code. Les joueurs créés sans date de naissance connue auront NULL en base.
Output: Migration SQL, schemas Zod mis à jour, INSERTs nettoyés.
</objective>

<execution_context>
@/home/jta/.claude/get-shit-done/workflows/execute-plan.md
@/home/jta/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@packages/front/src/lib/server/schemas/event-schemas.ts
@packages/front/src/hooks.server.ts
@packages/front/src/routes/players/+server.ts
@packages/front/src/routes/(app)/events/[id]/register/+server.ts
@packages/front/src/routes/tournaments/[id]/admin/register/+server.ts
@packages/db/src/schema/011_player.sql
</context>

<tasks>

<task type="auto">
  <name>Task 1: Migration SQL — rendre birth_date nullable</name>
  <files>packages/db/src/schema/015_player_birth_date_nullable.sql</files>
  <action>
Créer le fichier de migration `015_player_birth_date_nullable.sql` avec :

```sql
-- Migration 015: make player.birth_date nullable
-- birth_date was NOT NULL with '1900-01-01' as placeholder for unknown dates.
-- Making it nullable allows proper representation of missing data.

ALTER TABLE player ALTER COLUMN birth_date DROP NOT NULL;
```

Appliquer la migration en base de développement :
```bash
psql $DATABASE_URL -f packages/db/src/schema/015_player_birth_date_nullable.sql
```

(Si DATABASE_URL n'est pas disponible, utiliser la commande de migration du projet — vérifier package.json scripts dans packages/db.)
  </action>
  <verify>psql $DATABASE_URL -c "\d player" | grep birth_date</verify>
  <done>La colonne birth_date affiche sans "not null" dans le schéma de la table</done>
</task>

<task type="auto">
  <name>Task 2: Schemas Zod et code serveur — birth_date nullable</name>
  <files>
    packages/front/src/lib/server/schemas/event-schemas.ts
    packages/front/src/hooks.server.ts
    packages/front/src/routes/players/+server.ts
    packages/front/src/routes/(app)/events/[id]/register/+server.ts
    packages/front/src/routes/tournaments/[id]/admin/register/+server.ts
  </files>
  <action>
**1. event-schemas.ts** — Mettre à jour les deux schemas qui référencent birth_date :

`PlayerSchema` ligne ~148 :
```typescript
birth_date: z.string().nullable(), // DATE returned as text from postgres, nullable
```

`PlayerSearchResultSchema` ligne ~211 :
```typescript
birth_date: z.string().nullable(), // DATE as text, nullable
```

**2. hooks.server.ts** — Supprimer birth_date du INSERT auto-create (la colonne est maintenant nullable) :

Remplacer :
```typescript
INSERT INTO player (user_id, first_name, last_name, birth_date)
VALUES (${userId}, ${firstName}, ${lastName}, '1900-01-01')
```
Par :
```typescript
INSERT INTO player (user_id, first_name, last_name)
VALUES (${userId}, ${firstName}, ${lastName})
```

**3. routes/players/+server.ts** — Supprimer le fallback `?? "1900-01-01"` et passer NULL si absent :

Remplacer :
```typescript
const birthDate = raw.birth_date ?? "1900-01-01"
```
Par :
```typescript
const birthDate = raw.birth_date ?? null
```

Et dans le INSERT, remplacer la valeur (déjà `${birthDate}`, aucun changement de structure nécessaire — la variable vaudra null).

**4. routes/(app)/events/[id]/register/+server.ts** — Supprimer le placeholder '1900-01-01' pour les partenaires doubles créés à la volée :

Remplacer :
```typescript
INSERT INTO player (first_name, last_name, birth_date, department)
VALUES (${body.new_partner.first_name}, ${body.new_partner.last_name}, '1900-01-01', ${body.new_partner.department})
```
Par :
```typescript
INSERT INTO player (first_name, last_name, department)
VALUES (${body.new_partner.first_name}, ${body.new_partner.last_name}, ${body.new_partner.department})
```

**5. routes/tournaments/[id]/admin/register/+server.ts** — Rendre birth_date optionnel dans le schema de requête admin (mode "new") :

Remplacer :
```typescript
birth_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
```
Par :
```typescript
birth_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
```

Et dans le INSERT, utiliser `${body.birth_date ?? null}` à la place de `${body.birth_date}`.
  </action>
  <verify>pnpm typecheck</verify>
  <done>typecheck passe sans erreur ; aucune occurrence de '1900-01-01' ne subsiste dans le code serveur</done>
</task>

</tasks>

<verification>
```bash
# Aucun placeholder fictif restant
grep -r "1900-01-01" packages/front/src/

# Typecheck global
pnpm typecheck
```
</verification>

<success_criteria>
- `grep -r "1900-01-01" packages/front/src/` retourne zéro résultat
- `pnpm typecheck` passe sans erreur
- La colonne birth_date en base accepte NULL (vérifiable via psql \d player)
</success_criteria>

<output>
After completion, create `.planning/quick/9-dans-la-table-player-en-base-de-donn-es-/009-SUMMARY.md`
</output>
