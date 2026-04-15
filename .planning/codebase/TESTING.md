# Testing

## Framework

- **Vitest** — config partagée depuis `packages/config/vitest-config/`
- **Browser tests**: `vitest-browser-svelte` + Playwright (package `front`)
- **Commande**: `pnpm test`

## Structure par package

### packages/domain — Tests unitaires purs

- Tests des schemas Zod et fonctions pures
- Pas de dépendances externes
- Rapides, exécutés en CI

```
packages/domain/src/
  tournoi/services/__tests__/
  joueur/__tests__/
```

### packages/scripts — Scripts d'intégration DB

- Scripts impératifs one-shot (pas d'assertions)
- **Hors CI** — exécutés manuellement
- Testent la connexion DB et les migrations

### packages/front — Tests navigateur

- `vitest-browser-svelte` + Playwright
- Tests de composants Svelte en contexte navigateur
- `it.skipIf` pour les tests conditionnels à l'environnement

## Patterns

### Tests conditionnels
```typescript
it.skipIf(condition)("test name", async () => { ... })
```

### Pas de mocks DB
- Les tests d'intégration utilisent une vraie DB (pas de mocks)
- Convention établie pour éviter les divergences mock/prod

## Couverture actuelle

| Zone | Couverture |
|------|------------|
| Domain schemas | Bonne |
| Services purs (phase-utils) | Partielle |
| Repositories DB | Manquante |
| Use-cases application | Manquante |
| advance-phase / transitions | Absente |
| Referee assignment | Skippée (`describe.skip`) |
| Composants Svelte | Minimale |

## Lacunes connues

- `advance-phase` n'a aucun test — zone critique non couverte
- Referee assignment : tous les tests sont en `describe.skip`
- Logique de grouping/dedup page checkin : non testée
- Scripts d'intégration sans assertions → ne détectent pas les régressions
