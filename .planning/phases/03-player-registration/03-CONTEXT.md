# Phase 3: Player Registration - Context

**Gathered:** 2026-03-07
**Status:** Ready for planning

<domain>
## Phase Boundary

Les joueurs peuvent s'inscrire à un tournoi ouvert (self-service ou via un gestionnaire/admin), et l'admin tournoi gère le roster et effectue le check-in avant le lancement. La génération de matchs et les classements sont hors scope (phases 4 et 6).

</domain>

<decisions>
## Implementation Decisions

### Modèle joueur (entité Player)

- Un profil joueur est créé automatiquement à la création d'un compte utilisateur (lié 1-1 au compte)
- Un profil joueur peut exister sans compte (créé par un admin ou gestionnaire pour un joueur non-inscrit sur la plateforme)
- Champs minimaux du profil joueur : prénom, nom, date de naissance, numéro de licence (optionnel) — pas d'affiliation obligatoire (joueur peut être non-licencié)
- Un profil joueur créé sans compte est réutilisable pour les tournois suivants (il persiste en DB)

### Qui peut inscrire un joueur

- Un joueur connecté peut s'auto-inscrire (son profil lié à son compte)
- Un admin tournoi peut inscrire n'importe quel joueur (recherche dans tous les profils existants, ou création d'un nouveau profil)
- Un gestionnaire d'entité sous l'entité organisatrice (ex : club appartenant au comité organisateur) peut inscrire ses joueurs — même mécanique que l'admin
- La recherche de joueurs existants est globale (tous les profils en DB, pas de restriction par entité)
- Si un joueur n'existe pas en DB, la saisie crée un nouveau profil joueur réutilisable

### Inscription multiple

- Un joueur peut être inscrit à plusieurs tournois du même événement sans restriction (phase 3 — les règles métier viendront plus tard)

### Validation des inscriptions

- Toutes les inscriptions (self-service et admin/gestionnaire) sont validées immédiatement, sans workflow d'approbation

### UX auto-inscription (joueur)

- Les tournois ouverts sont accessibles depuis deux endroits :
  1. La page publique de l'événement : `/events/[id]` — liste les tournois de l'événement avec bouton "S'inscrire"
  2. Le dashboard joueur — section "Tournois disponibles" : cards d'événements avec leurs tournois et boutons d'inscription
- Tous les événements ouverts sont visibles dans le dashboard (pas de restriction par entité)
- Confirmation d'inscription : immédiate, pas d'email — le bouton "S'inscrire" devient "Inscrit"
- Un joueur peut se désinscrire lui-même jusqu'au lancement du tournoi
- Un visiteur non connecté qui clique "S'inscrire" est redirigé vers le login avec retour URL préservé

### Routes

- `/events/[id]` — page publique : infos événement + liste des tournois + bouton S'inscrire par tournoi
- `/tournaments/[id]` — page publique : liste des joueurs inscrits (classements et brackets ajoutés en phase 6)
- `/tournaments/[id]/admin` — gestion admin : roster, check-in, actions

### Interface roster & check-in (admin)

- Roster accessible depuis `/tournaments/[id]/admin`
- Chaque ligne de joueur expose deux boutons contextuels : **"Check-in"** (si non checké) ou **"Retirer"** (supprimer l'inscription) + lien vers le profil joueur
- Bulk check-in : bouton "Tout checker" pour marquer tous les inscrits comme présents d'un coup
- Le check-in est intégré dans la vue roster (pas de vue séparée)
- Si le check-in est **désactivé** pour un tournoi : la colonne Présent est cachée (tous les inscrits comptent comme présents pour le lancement)

### Contraintes & clôture

- Pas de limite de joueurs par tournoi en phase 3
- L'inscription se ferme automatiquement au lancement du tournoi (phase 4)
- La configuration du tournoi (phases, format) reste éditable jusqu'au lancement

### Claude's Discretion

- Design de la page publique `/events/[id]` et des cards événements dans le dashboard
- UX de la recherche de joueurs (autocomplétion, debounce, affichage des résultats)
- Comportement exact du bulk check-in (confirmation avant action ?)
- Gestion des erreurs (inscription échouée, doublon, etc.)

</decisions>

<specifics>
## Specific Ideas

- Les boutons par joueur dans le roster sont contextuels : "Check-in" si le joueur n'est pas encore checké, sinon probablement "Annuler check-in" + toujours "Retirer"
- Le profil joueur créé sans compte est la même entité que le profil lié à un compte — même table, champ `user_id` nullable
- La section "Tournois disponibles" dans le dashboard = cards d'événements, pas une liste plate de tournois

</specifics>

<deferred>
## Deferred Ideas

- **Fusion profil joueur / compte utilisateur** : un joueur créé sans compte pourra plus tard réclamer son profil en créant un compte et en saisissant son numéro de licence + nom + prénom + date de naissance — validation automatique si correspondance. Hors scope phase 3.
- **Recherche rapide + filtre par entité** dans la section "Tournois disponibles" du dashboard — évoqué mais différé
- **Tri des événements par proximité géographique** — évoqué mais différé
- **Capacité max de joueurs par tournoi** (liste d'attente) — différé

</deferred>

---

*Phase: 03-player-registration*
*Context gathered: 2026-03-07*
