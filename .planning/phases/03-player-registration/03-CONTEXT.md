# Phase 3: Player Registration - Context

**Gathered:** 2026-03-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Les joueurs peuvent s'inscrire à un tournoi ouvert (self-service ou via un admin), et l'admin tournoi gère le roster et effectue le check-in avant le lancement. La génération de matchs et les classements sont hors scope (phases 4 et 6).

</domain>

<decisions>
## Implementation Decisions

### Modèle joueur (entité Player)

- Un profil joueur est créé automatiquement à la création d'un compte utilisateur (lié 1-1 au compte)
- Un profil joueur peut exister sans compte (créé par un admin ou gestionnaire)
- Champs minimaux : prénom, nom, date de naissance, numéro de licence (optionnel)
- Un profil joueur créé sans compte est réutilisable pour les tournois suivants (persiste en DB)

### Statut tournoi

- Champ `status` sur le tournoi avec valeurs : `ready`, `check-in`, `started`, `finished`
- Changé manuellement par l'admin tournoi via bouton explicite sur la page admin du tournoi
- La page de création du tournoi inclut une checkbox "Check-in requis pour ce tournoi"
- Comportement par statut :
  - `ready` : inscriptions self-service et admin ouvertes
  - `check-in` : inscriptions self-service encore possibles ; admin peut toujours ajouter des joueurs
  - `started` / `finished` : toutes les inscriptions fermées

### Accès et routes

- `(app)` est accessible aux utilisateurs connectés uniquement (pas de pages publiques)
- `(admin)` est la section administration avec sidebar — accès réservé aux admins
- Homepage `(app)` : liste les événements ouverts (statut = open for registration) — point d'entrée joueur
- `/events/[id]` dans `(app)` : page de l'événement avec ses tournois et bouton S'inscrire / Se désinscrire
- **Pas de page roster publique** `/tournaments/[id]` — le roster n'est visible que via l'interface admin
- Interface admin roster : migre sous `(admin)`, navigation hiérarchique :
  - `/admin/events` → liste des événements
  - `/admin/events/[id]` → détail événement + liste des tournois
  - `/admin/events/[id]/tournaments/[tid]` → roster + check-in + gestion joueurs

### UX auto-inscription (joueur)

- Homepage `(app)` : cards d'événements ouverts — le joueur sélectionne un événement
- `/events/[id]` : liste des tournois de l'événement avec bouton contextuel "S'inscrire" ou "Se désinscrire"
- Bouton "S'inscrire" visible jusqu'au statut `check-in` inclus
- Confirmation immédiate (pas d'email), bouton devient "Inscrit" / "Se désinscrire"
- Désinscription possible jusqu'au statut `check-in` inclus (fermée à `started`)

### Interface admin roster

- Page roster accessible via `/admin/events/[id]/tournaments/[tid]`
- Actions par joueur : **Check-in** (ou Annuler check-in) + **Retirer** (supprimer l'inscription)
- Bulk check-in : bouton "Tout checker" pour marquer tous les inscrits comme présents
- Si check-in désactivé pour le tournoi : colonne Présent cachée (tous les inscrits = présents)
- **Ajout de joueur** : champ de recherche inline en haut du roster
  - Autocomplétion sur tous les profils en DB
  - Si introuvable : option "Créer un nouveau profil joueur" directement depuis la recherche
- **Inscription admin** valide immédiatement, sans workflow d'approbation

### Qui peut inscrire

- Joueur connecté : self-service via `/events/[id]`
- Admin tournoi : via le roster admin — recherche globale ou création nouveau profil

### Inscription multiple

- Un joueur peut être inscrit à plusieurs tournois du même événement (simples + doubles)

### Claude's Discretion

- Design des cards événements sur la homepage
- UX de l'autocomplétion recherche joueur (debounce, nombre de résultats affichés)
- Comportement du bulk check-in (confirmation avant action ?)
- Gestion des erreurs (doublon, inscription échouée)
- Design de la page `/admin/events/[id]` (détail événement avec liste tournois)

</decisions>

<specifics>
## Specific Ideas

- Les boutons par joueur dans le roster sont contextuels : "Check-in" si non checké, "Annuler check-in" si checké, + toujours "Retirer"
- Le profil joueur créé sans compte = même entité que le profil lié à un compte (même table, `user_id` nullable)
- Les joueurs se présentent généralement le matin pour s'inscrire à la fois au tournoi simples et doubles — le check-in est par tournoi, pas par événement

</specifics>

<deferred>
## Deferred Ideas

- **Check-in rapide cross-tournois** : feature pour checker d'un coup un joueur sur tous les tournois d'un événement (pratique le matin quand les gens arrivent). Phase 4 ou quick task.
- **Fusion profil joueur / compte utilisateur** : réclamer un profil créé sans compte via numéro de licence + identité — validation auto. Hors scope phase 3.
- **Recherche + filtre par entité** dans la liste des événements homepage — différé
- **Capacité max de joueurs par tournoi** (liste d'attente) — différé

</deferred>

---

*Phase: 03-player-registration*
*Context gathered: 2026-03-08*
