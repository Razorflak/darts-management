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

- **Fusion profil joueur / compte utilisateur** : réclamer un profil créé sans compte via numéro de licence + identité — validation auto. Hors scope phase 3.
- **Recherche + filtre par entité** dans la liste des événements homepage — différé
- **Capacité max de joueurs par tournoi** (liste d'attente) — différé

</deferred>

---

### Plan 06 — Check-in cross-tournois (ajouté 2026-03-30)

#### Bouton par jour sur `/admin/events/[id]`

- Un bouton "Check-in [date]" par journée de compétition — une journée = ensemble des tournois ayant le même `start_at::date`
- Seuls les tournois avec un `start_at` renseigné comptent — un tournoi sans date n'apparaît pas et ne génère pas de bouton
- La jauge et le filtre portent uniquement sur les joueurs inscrits aux tournois de la journée (`start_at::date` = date du jour filtré)
- Clic → `confirm()` de `$lib/confirm.svelte.js` : "Cette action passera tous les tournois de cette journée en statut check-in"
- Validation → update statut de tous les tournois du jour vers `check-in` + redirect vers `/admin/events/[id]/checkin?date=YYYY-MM-DD`
- Si certains tournois du jour sont déjà en `check-in` : on les ignore silencieusement, pas de message
- Annulation → reste sur `/admin/events/[id]`

#### Page `/admin/events/[id]/checkin?date=...`

- Seule la table `tournament_registration` est modifiée (`checked_in`) — le statut du tournoi n'est jamais touché depuis cet écran
- Affiche tous les joueurs inscrits à au moins un tournoi ce jour, triés par ordre alphabétique
- Champ de recherche en temps réel par nom au-dessus de la liste, avec bouton croix pour vider
- Par joueur :
  - Bouton **"Check-in tous"** à droite du nom — grand, vert — checke uniquement les inscriptions non-checkées du jour ; grisé/désactivé si le joueur est déjà 100% checké
  - Boutons **par tournoi** — petits, bleus — pour checker ou déchercker un tournoi individuel
  - Pas de checkboxes
- Cas doubles : checker OU déchercker un joueur (bouton tournoi ou "tous") affecte les deux membres de l'équipe
- Mise à jour en temps réel par `tournament_registration.id` — la ligne du partenaire se met à jour instantanément dans la liste
- Dé-checker un tournoi individuel : via le bouton tournoi + `confirm()`
- Après action : ligne mise à jour visuellement (état "Checké" si tous les tournois sont checkés)
- Pas de navigation de date sur cet écran — l'admin revient sur `/admin/events/[id]` pour choisir un autre jour
- Page non accessible si au moins un tournoi de la journée est en statut `started` ou `finished` — jauge et liste uniquement pertinentes en phase de check-in

#### Définition "joueur checké"

Un joueur est considéré **checké** si et seulement si `checked_in = true` pour **tous** ses tournois de la journée.
- Exemple : inscrit en simples + doubles → doubles checké mais simples non → joueur **non checké** dans la jauge et le filtre
- La logique s'applique au niveau du joueur individuel

#### Jauge de progression

- Barre horizontale en haut de la page : % de joueurs checkés (`nb_checkés / nb_total`)
- Se met à jour après chaque action

#### Filtre liste joueurs

- Checkbox "Afficher uniquement les joueurs non checkés", désactivée par défaut
- Quand activée : masque les joueurs dont tous les tournois du jour sont à `checked_in = true`
- Filtre et recherche par nom sont combinables simultanément
- Mise à jour en temps réel : si le filtre est actif et qu'un joueur devient 100% checké, sa ligne disparaît immédiatement
- Les joueurs sans compte (`user_id` null, créés par un admin) apparaissent normalement

#### Modal d'inscription à la volée

- Bouton fixe en haut de la page (pas lié à une ligne joueur) pour ouvrir la modal
- Extraite dans un composant dédié (logique importante) — s'inspire de `RegistrationModal.svelte` mais reçoit en props tous les tournois de l'événement
- Structure de la modal :
  ```
  [ Section 1 ]
    Recherche joueur 1  +  ▼ Joueur non trouvé ? Créer un joueur
    ☐ Simples A   ☐ Simples B   (tous les tournois simples de l'event)

    [+ Ajouter un joueur]  ← ouvre la section 2

  [ Section 2 ] (si ouverte)
    Recherche joueur 2  +  ▼ Joueur non trouvé ? Créer un joueur
    ☐ Simples A   ☐ Simples B

  ──────────────────────────────────
  ☐ Doubles X   ☐ Doubles Y   ← commun, visible uniquement si section 2 ouverte
  ──────────────────────────────────

  [ Valider ]
  ```
- Les tournois doubles ne sont accessibles que si la section 2 est ouverte (2 joueurs requis) ; si section 2 refermée → doubles masqués
- Recherche joueur : autocomplete sur tous les profils en DB (pas filtré sur les inscrits du jour), même comportement que le roster existant
- À la validation : pour chaque tournoi coché → appel API registration + appel API check-in immédiat ; les joueurs arrivent inscrits ET checkés
- Si l'API registration retourne une erreur : afficher l'erreur et attendre une action utilisateur (pas de continuation silencieuse)
- Après validation réussie : modal fermée + liste joueurs rafraîchie automatiquement

#### Patterns existants à réutiliser

- `confirm()` de `$lib/confirm.svelte.js` pour les confirmations (pas de modal custom)
- Authz entity-level identique aux autres endpoints `(admin)`
- `RegistrationModal.svelte` comme référence pour la logique d'inscription

---

*Phase: 03-player-registration*
*Context gathered: 2026-03-08 — mis à jour: 2026-03-30*
