# Concerns

## Tech Debt

### referee-assignment.ts — Fonctionnalité non implémentée
- `packages/application/src/tournoi/referee-assignment.ts` est un stub vide
- Les tests associés sont tous en `describe.skip`
- Ne pas toucher sans spécifier le comportement attendu

### tournament-repository.ts — 3 fonctions upsert qui se chevauchent
- `upsertTournaments` est probablement mort (non utilisé)
- Besoin de nettoyer avant d'ajouter des fonctionnalités liées aux tournois

### setsToWin hardcodé à 1
- Toutes les tranches d'élimination directe ignorent la config DB
- Impacte le calcul des scores si jamais `sets_to_win > 1`

### advancePhase — catch silencieux sur bulkUpdateTeams
- Les erreurs de mise à jour des équipes sont avalées silencieusement
- Risque de données incohérentes sans erreur visible

### cast `as unknown as Row[]` dans checkin/+page.server.ts
- Contourne la validation Zod — type non garanti au runtime

### `as unknown as Sql` dans 8 callbacks de transaction
- Type mismatch entre `TransactionSql` et `Sql` résolu par cast brut
- À corriger proprement si on touche à la couche transaction

## Bugs connus

### console.log en production — OTLP token exposé
- **Critique** : `packages/logger/src/tracing.ts` affiche le token OTLP à chaque démarrage
- Fichiers concernés : 4 fichiers contiennent des `console.log` de debug non supprimés
- **Action** : supprimer avant tout déploiement sensible

### advancePhase lit depuis le singleton global sql dans une transaction
- `advancePhase` utilise `sql` global au lieu de `tx` (la transaction active)
- Risque de lecture hors transaction → données potentiellement incohérentes

## Sécurité

### Email verification désactivée
- `requireEmailVerification: false` dans Better Auth
- Tout email peut s'inscrire sans vérification

### OTLP auth token loggé au démarrage
- Voir section Bugs — token exposé dans les logs stdout

### tournament_id non validé comme UUID avant usage SQL
- Dans l'endpoint launch, `tournament_id` n'est pas validé comme UUID
- Risque d'injection si l'input n'est pas filtré en amont

## Performance

### getUserRoles — requête SQL à chaque mutation
- Pas de cache — chaque appel authentifié refait la requête
- À optimiser si le volume de requêtes augmente

### Profil joueur rechargé à chaque requête authentifiée
- `hooks.server.ts` fait une requête SQL profil à chaque request authentifiée

## Zones fragiles

### Grand Final reset — création dynamique de match
- `match-repository.ts` crée le match de finale dynamiquement lors du reset
- Logique complexe, peu testée

### Seed lookup dans advancePhase — fallback `""` au lieu de throw
- Si le seed n'est pas trouvé, retourne `""` silencieusement
- Peut causer des comportements inattendus sans erreur explicite

### CLAUDE.md référence `$lib/server/repos.ts` qui n'existe pas
- Documentation désynchronisée avec le code réel

## Couverture de tests manquante

| Zone | Statut |
|------|--------|
| `advance-phase` / transitions de phase | Aucun test |
| Referee assignment | Tous skippés (`describe.skip`) |
| Scripts d'intégration | Pas d'assertions, hors CI |
| Logique grouping/dedup page checkin | Non testée |
