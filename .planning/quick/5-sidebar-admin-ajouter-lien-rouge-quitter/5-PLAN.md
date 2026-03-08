---
task: 5
slug: sidebar-admin-ajouter-lien-rouge-quitter
description: "Sidebar admin: ajouter lien rouge 'Quitter l'administration' en bas vers la page d'accueil"
date: 2026-03-08
---

# Plan quick-5

## Task 1 — Ajouter lien rouge en bas de la sidebar

**File:** `packages/front/src/routes/(admin)/+layout.svelte`

**Action:** Ajouter après la nav principale (desktop et mobile) un lien séparé par une bordure :
- Texte : "Quitter l'administration"
- Icône : flèche sortie (SVG inline)
- Couleur : `text-red-400`, hover `bg-red-900/40`
- Desktop : suit le comportement collapsed (icône seule si collapsed)
- Mobile : affiché dans le dropdown avec séparateur

**Verify:** `pnpm typecheck` passe, lien visible en rouge en bas de la sidebar.
