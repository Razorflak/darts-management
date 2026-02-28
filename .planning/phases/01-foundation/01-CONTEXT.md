# Phase 1: Foundation - Context

**Gathered:** 2026-02-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Auth (register/login/password reset), DB schema, role system, and entity hierarchy (Fédération → Ligues → Comités → Clubs) — the stable base every subsequent phase builds on. No tournament logic, no wizard persistence, no player management.

</domain>

<decisions>
## Implementation Decisions

### Auth flow
- Pas de confirmation d'email obligatoire — connexion immédiate après inscription
- Après connexion réussie : redirect vers le dashboard (page d'accueil)
- Reset mot de passe : flow standard 3 étapes (saisie email → lien par email → nouveau mot de passe)
- Shell complet avec navbar dès Phase 1 (layout global partagé entre toutes les pages auth et app)

### Role assignment
- À l'inscription, tout le monde est "joueur" par défaut — aucun choix de rôle à l'inscription
- Multi-rôles possible : un utilisateur peut être joueur ET organisateur simultanément
- Attribution des rôles supérieurs : chaque niveau hiérarchique assigne pour son périmètre (admin ligue assigne dans sa ligue, admin comité dans son comité, admin fédéral partout)
- L'admin fédéral est un rôle normal assigné manuellement en DB lors du bootstrap initial

### Entity management UI
- Section dédiée "Administration" dans la navbar (accessible aux admins)
- Navigation via liste plate filtrée par type d'entité + parent sélectionnable (pas de tree view, pas de drill-down)
- Formulaire de création d'entité minimal : nom + parent uniquement (Phase 1)
- Chaque niveau peut créer et gérer ses entités enfants directes (admin ligue → Comités, admin comité → Clubs)

### Bootstrap / premier lancement
- Premier admin fédéral : seed SQL à exécuter manuellement (script de bootstrap)
- DB vide : l'app affiche la page d'accueil normalement (pas de mode "en configuration")
- Migrations DB : `pnpm db:migrate` à lancer manuellement avant le premier démarrage (pas d'auto-migration)
- Seed de dev complet : données fictives (fédération, ligues, comités, clubs, users de test) pour le développement

### Claude's Discretion
- Design exact de la navbar et du layout shell
- Gestion des erreurs de formulaire (messages, positions)
- Détail du schéma SQL (noms de colonnes, index, contraintes exactes)
- Comportement exact du filtre de liste des entités (UI du sélecteur parent)

</decisions>

<specifics>
## Specific Ideas

- Le shell (navbar + layout) doit être suffisamment générique pour accueillir les pages des phases suivantes sans refonte
- La liste plate des entités filtrée par type doit permettre de sélectionner rapidement le parent lors de la création d'une entité enfant

</specifics>

<deferred>
## Deferred Ideas

Aucune — la discussion est restée dans le périmètre de Phase 1.

</deferred>

---

*Phase: 01-foundation*
*Context gathered: 2026-02-28*
