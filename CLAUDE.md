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

## Conventions

- Les configs TypeScript sont étendues depuis `packages/config/typescript-config`
- Les configs Vitest sont étendues depuis `packages/config/vitest-config`
- Utilisation des types pour typescript plutot que les interfaces

## Notes spécifiques aux paquets

- **packages/front** : application SvelteKit — voir `packages/front/CLAUDE.md` pour les instructions d'outillage MCP Svelte 5 / SvelteKit
