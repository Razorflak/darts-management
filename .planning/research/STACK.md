# Stack Research — Tournament Management Platform

**Research Date:** 2026-02-27
**Type:** Brownfield — frontend prototype exists

---

## ⚠️ Découverte critique : Lucia v3 est déprécié (mars 2025)

Déprécié officiellement par l'auteur. Recommandation : **Better Auth v1.4.x**

---

## 1. Auth — Better Auth v1.4.19

- Intégration SvelteKit native (`svelteKitHandler` dans `hooks.server.ts`)
- PostgreSQL first-class : se connecte via le driver `postgres` existant, pas d'ORM
- CLI génère un fichier `.sql` de migration compatible avec la convention raw SQL du projet
- Sessions-based, multi-rôles, TypeScript strict
- v1.0 sorti 2024, activement maintenu

```typescript
// src/hooks.server.ts
import { auth } from '$lib/server/auth'
import { svelteKitHandler } from 'better-auth/svelte-kit'
export const handle = svelteKitHandler({ auth })
```

**Rejeté :** Auth.js (OAuth-centrique), Lucia v3 (déprécié)

---

## 2. Temps réel — SSE natif SvelteKit

- `ReadableStream` + `EventSource` natifs, zéro dépendance
- Optimisation post-v1 : PostgreSQL `LISTEN/NOTIFY` via `postgres` v3 (déjà dans le projet)
- **Rejeté :** `sveltekit-sse` (pre-1.0, pattern POST non-standard)

---

## 3. Génération de brackets — Fonctions TypeScript pures maison

- Round-robin : algorithme de Berger (~50 lignes)
- Élimination : bracket seedé avec BYEs (~100 lignes)
- Le pattern "generate-all-at-launch" avec `advances_to_match_id` est spécifique au projet
- **Rejeté comme dépendance :** `brackets-manager.js` (modèle conflictuel, utile comme référence)

---

## 4. Schéma DB — Pattern clé

```sql
CREATE TABLE match (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phase_id             UUID NOT NULL REFERENCES phase(id),
  round_number         INTEGER NOT NULL,
  match_number         INTEGER NOT NULL,
  group_number         INTEGER,
  -- Toujours des équipes, même en simples (équipe de 1 joueur)
  team_a_id            UUID REFERENCES team(id),  -- NULL = TBD
  team_b_id            UUID REFERENCES team(id),  -- NULL = TBD
  referee_id           UUID REFERENCES registration(id),
  sets_a               INTEGER,
  sets_b               INTEGER,
  legs_detail          JSONB,
  status               TEXT NOT NULL DEFAULT 'pending',
  advances_to_match_id UUID REFERENCES match(id),
  advances_to_slot     TEXT CHECK (advances_to_slot IN ('a','b')),
  completed_at         TIMESTAMPTZ
);
```

**Note architecture :** Toujours des équipes, même en simples. Une équipe de 1 joueur simplifie la gestion unifiée simples/doubles.

---

## Ce qu'il ne faut PAS utiliser

| Technologie | Raison |
|-------------|--------|
| Lucia v3 | Déprécié mars 2025 |
| Auth.js | OAuth-centrique, pas adapté aux rôles custom |
| WebSockets | SSE suffit (updates unidirectionnels) |
| `brackets-manager.js` | Modèle conflictuel |
| ORM runtime | Projet mandaté raw SQL |

---

*Recherche : 2026-02-27*
