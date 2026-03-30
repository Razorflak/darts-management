# Phase 4: Launch and Match Generation - Context

**Gathered:** 2026-03-31
**Status:** Ready for planning

<domain>
## Phase Boundary

An admin tournoi can trigger the launch of a tournament, which locks its configuration and atomically generates every match for every tournament phase in a single database transaction. The launch has a dedicated confirmation page. After successful launch, the tournament page displays visual pools and brackets. Result entry and phase advancement belong to Phase 5.

</domain>

<decisions>
## Implementation Decisions

### Déclenchement du lancement

- Bouton "Lancer" présent à deux endroits : page roster du tournoi (`/tournaments/[tid]`) ET page détail de l'événement (`/events/[id]`)
- Le bouton navigue vers une page dédiée `/admin/events/[id]/tournaments/[tid]/launch`
- La page /launch affiche : récapitulatif des inscrits, avertissements contextuels (peu d'inscrits, check-in incomplet…), aperçu de la structure générée (groupes + nombre de matchs par phase)
- Pas de condition bloquante — le bouton est toujours actif, les avertissements sont informatifs
- Le lancement est confirmé sur la page /launch par un bouton "Confirmer"
- Statut du tournoi après lancement réussi : `started`
- Annulation possible par un admin supérieur : supprime les matchs générés, conserve les inscriptions
- En cas d'échec (rollback) : message d'erreur sur la page /launch, bouton réessayer

### Formation des groupes round-robin

- Ajouter une option "Seedé" au wizard de création de tournoi (nouvelle propriété sur le tournoi)
- Si seedé : l'admin ordonne les joueurs depuis la page roster avant de lancer
- Si non seedé : ordre aléatoire appliqué à la génération
- La génération traite toujours la liste comme seedée (même logique de distribution)
- Distribution : **snake seeding** — Seed 1 → Groupe A, Seed 2 → B, Seed 3 → C, Seed 4 → C, Seed 5 → B, Seed 6 → A…
- Taille des groupes : `player_per_group` déjà en base de données
- Si le nombre d'inscrits n'est pas divisible : remplir les groupes à `player_per_group`, le dernier groupe reçoit les joueurs restants (groupe plus petit)
- Round-robin : chaque équipe affronte toutes les autres exactement une fois

### Format poule double KO

- Utilisé pour des poules de typiquement 8 joueurs, 4 qualifiants
- Structure en 3 rounds (bracket fixe, aucune revanche par construction) :
  - **R1 (4 matchs simultanés par paires)** : tout le monde joue → 4 vainqueurs (upper), 4 perdants (lower)
  - **R2 Upper (2 matchs)** : vainqueurs R1 s'affrontent → 2 qualifiés seed 1-2, 2 perdants passent en last-chance
  - **R2 Lower (2 matchs)** : perdants R1 s'affrontent → 2 vainqueurs passent en last-chance, 2 perdants éliminés (2 défaites)
  - **R3 Last chance (2 matchs)** : 2 perdants R2 Upper vs 2 vainqueurs R2 Lower → 2 qualifiés seed 3-4, 2 éliminés
- Contrainte "pas de revanche" garantie par le bracket fixe (pas d'algo spécial nécessaire)

### Phase élimination KO

- Qualification : `player_per_group_advance` (déjà en base) détermine combien de joueurs par groupe passent en KO
- Seeding croisé dans le bracket : 1er groupe A vs 2e groupe B, 1er groupe B vs 2e groupe A, etc.

### Assignation des arbitres

- Option par tournoi (déjà configurable)
- Algo déterministe (pas d'aléatoire) :
  - Pour chaque match, identifier les équipes non-jouantes à ce même slot temporel
  - Parmi ces équipes disponibles, choisir celle qui a le moins de matchs arbitrés assignés jusqu'ici
- Fonctionne pour singles (joueur) et doubles (équipe)
- Les assignations sont visibles en lecture seule après génération — pas modifiables dans cette phase

### `event_match_id`

- Chaque match reçoit un `event_match_id` : entier séquentiel unique sur tous les matchs de l'événement (tous tournois confondus)
- Permet la saisie rapide de résultats par ID sur le hub événement (fonctionnalité de saisie = Phase 5)

### Feedback post-lancement

- Redirection après lancement réussi : `/admin/events/[id]/tournaments/[tid]`
- La page tournoi post-lancement affiche :
  - Poules : tableau par groupe listant les matchs (équipe A vs équipe B, arbitre)
  - Bracket KO : arbre visuel classique avec les slots nommés (noms des joueurs, slots vides en attente)
- L'affichage brackets sera perfectionné en Phase 6

### Claude's Discretion

- Algorithme exact de calcul du `event_match_id` (séquentiel par ordre de génération ou autre)
- Ordre des matchs au sein d'une poule round-robin (rotation standard ou autre)
- Design exact du bracket KO visuel (CSS/composants) — fonctionnel d'abord, esthétique en Phase 6

</decisions>

<specifics>
## Specific Ideas

- La page /launch est une vraie page de préparation (pas un modal) — comparable à un écran de confirmation pré-déploiement
- Le hub événement `/admin/events/[id]` contiendra une zone de saisie rapide de résultats par `event_match_id` — mais c'est Phase 5
- La page tournoi `/tournaments/[tid]` devient la page centrale pour tout ce qui est spécifique à un tournoi (roster, matchs, brackets, progression)

</specifics>

<deferred>
## Deferred Ideas

- Zone de saisie rapide de résultats par `event_match_id` sur le hub événement — Phase 5
- Modification manuelle des assignations d'arbitres — Phase 5 ou ultérieur
- Perfectionnement visuel des brackets — Phase 6
- Classements et standings dans les poules — Phase 5

</deferred>

---

*Phase: 04-launch-and-match-generation*
*Context gathered: 2026-03-31*
