---
created: 2026-03-13T21:33:00.322Z
title: Convention routes API — dossier api/ + body only (pas de path params)
area: api
files: []
---

## Problem

Une réorganisation des routes API est en cours. Les futurs plans GSD doivent respecter la nouvelle convention :

- Tout endpoint qui n'est **pas chargé via `page.server.ts`** doit aller dans un dossier `api/`
- **Pas de paramètres dans les chemins** (pas de `[id]` dans l'URL des API)
- **Tout dans le body** de la requête (POST/PUT/DELETE passent les identifiants dans le JSON body)

## Solution

Lors de la planification de toute nouvelle route ou refactoring :
1. Créer les endpoints dans `src/routes/api/` (ou sous-dossiers thématiques)
2. Remplacer les path params (`/api/players/[id]`) par des routes fixes (`/api/players/get`) avec `{ id }` dans le body
3. Mettre à jour les appels côté client en conséquence
