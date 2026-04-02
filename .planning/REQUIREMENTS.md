# Requirements: Darts Management

**Defined:** 2026-02-28
**Core Value:** Permettre à un organisateur de créer un tournoi complexe, de le lancer, et que le système gère automatiquement la génération des matchs et le suivi des résultats jusqu'aux classements finaux.

## v1 Requirements

### AUTH — Authentification & Rôles

- [x] **AUTH-01**: L'utilisateur peut s'inscrire avec email/mot de passe
- [x] **AUTH-02**: L'utilisateur peut se connecter et sa session persiste entre les rechargements
- [x] **AUTH-03**: L'utilisateur peut réinitialiser son mot de passe via email
- [x] **AUTH-04**: Le système distingue 4 rôles : joueur, admin tournoi, organisateur (entité), admin fédéral

### ORG — Hiérarchie fédérale

- [x] **ORG-01**: Un admin fédéral peut créer et gérer les entités (Fédération, Ligues, Comités, Clubs)
- [x] **ORG-02**: Les entités sont hiérarchisées (Ligue → Fédération, Comité → Ligue, Club → Comité)
- [x] **ORG-03**: Un organisateur peut créer des événements au nom de son entité

### EVENT — Création & Configuration

- [x] **EVENT-01**: L'organisateur peut créer un événement (nom, dates, lieu, entité organisatrice) et le persister
- [x] **EVENT-02**: L'organisateur peut configurer plusieurs tournois dans un même événement (un par catégorie)
- [x] **EVENT-03**: L'organisateur peut configurer les phases d'un tournoi — 4 types : poules round-robin, poules double KO (arbre double élimination par groupe, N qualifiés configurables), élimination directe, double élimination — avec groupes nommés (Poule A, B...) pour les phases de poules
- [x] **EVENT-04**: L'organisateur peut utiliser un template de création rapide
- [x] **EVENT-05**: L'organisateur peut prévisualiser et publier l'événement (statut "ouvert aux inscriptions")
- [x] **EVENT-06**: L'organisateur peut activer ou désactiver l'assignation automatique des arbitres pour un tournoi (utile pour les tournois juniors où les arbitres viennent d'un autre tournoi)

### PLAYER — Inscription & Check-in

- [x] **PLAYER-01**: Un joueur peut s'inscrire à un tournoi
- [x] **PLAYER-02**: L'admin tournoi peut inscrire manuellement un joueur
- [x] **PLAYER-03**: L'admin tournoi peut effectuer le check-in des joueurs présents le jour J
- [x] **PLAYER-04**: Le check-in est configurable par tournoi (optionnel ou obligatoire avant lancement)

### LAUNCH — Lancement & Génération

- [ ] **LAUNCH-01**: L'admin tournoi peut lancer un tournoi (verrouille la configuration)
- [x] **LAUNCH-02**: Au lancement, le système génère tous les matchs de toutes les phases (round-robin, poules double KO, brackets d'élimination à vide)
- [x] **LAUNCH-03**: La génération est atomique — tout réussit ou tout échoue (transaction PostgreSQL)
- [x] **LAUNCH-04**: Le format set/manche est configurable par phase avant le lancement
- [x] **LAUNCH-05**: Si l'assignation d'arbitres est activée, le système assigne automatiquement un arbitre à chaque match (joueur inscrit au même tournoi, ne jouant pas ce match)

### RESULT — Saisie & Avancement

- [ ] **RESULT-01**: L'admin tournoi peut saisir le résultat d'un match (score sets/manches)
- [ ] **RESULT-02**: L'admin tournoi peut enregistrer un forfait ou walkover
- [ ] **RESULT-03**: Après saisie d'un résultat, le système avance automatiquement les joueurs vers les cases suivantes
- [ ] **RESULT-04**: Quand tous les matchs d'une phase sont terminés, la phase suivante est déclenchée automatiquement

### VIEW — Classements & Dashboard

- [ ] **VIEW-01**: Un visiteur peut consulter les classements d'un tournoi (rafraîchissement manuel)
- [ ] **VIEW-02**: Les classements round-robin affichent points, victoires, défaites, différence de manches
- [ ] **VIEW-03**: Les tableaux d'élimination affichent la progression bracket (simple et double)
- [ ] **VIEW-04**: L'admin tournoi accède au dashboard de la journée (tous les matchs de tous les tournois, statuts en temps non-réel)

## v2 Requirements

### Temps réel

- **SSE-01**: Les classements se mettent à jour automatiquement sans rechargement (SSE)
- **SSE-02**: Le dashboard de la journée se met à jour automatiquement (SSE)

### Classements fédéraux

- **RANK-01**: Les résultats d'un tournoi génèrent des points selon le classement final des joueurs
- **RANK-02**: Un classement par entité (Comité, Ligue, Fédération) agrège les points des joueurs
- **RANK-03**: L'admin fédéral peut configurer le barème de points par type/niveau de tournoi

## Out of Scope

| Feature | Reason |
|---------|--------|
| Saisie live des scores (tablette terrain) | Complexité tablette, hors scope v1 — les joueurs remettent des feuilles papier |
| Gestion des licenciés et des clubs | Phase ultérieure |
| Championnats inter-clubs | Phase ultérieure |
| Application mobile native | Web-first |
| Optimisation automatique des plannings horaires | Post-v1 (le modèle de données l'anticipe via `advances_to_match_id`) |
| Arbitres certifiés / qualifications arbitrage | Non spécifié par la FFD — l'arbitre = tout joueur inscrit au tournoi |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 1 — Foundation | Complete |
| AUTH-02 | Phase 1 — Foundation | Complete |
| AUTH-03 | Phase 1 — Foundation | Complete |
| AUTH-04 | Phase 1 — Foundation | Complete |
| ORG-01 | Phase 1 — Foundation | Complete |
| ORG-02 | Phase 1 — Foundation | Complete |
| ORG-03 | Phase 1 — Foundation | Complete |
| EVENT-01 | Phase 2 — Wizard Persistence | Complete |
| EVENT-02 | Phase 2 — Wizard Persistence | Complete |
| EVENT-03 | Phase 2 — Wizard Persistence | Complete |
| EVENT-04 | Phase 2 — Wizard Persistence | Complete |
| EVENT-05 | Phase 2 — Wizard Persistence | Complete |
| EVENT-06 | Phase 2 — Wizard Persistence | Complete |
| PLAYER-01 | Phase 3 — Player Registration | Complete |
| PLAYER-02 | Phase 3 — Player Registration | Complete |
| PLAYER-03 | Phase 3 — Player Registration | Complete |
| PLAYER-04 | Phase 3 — Player Registration | Complete |
| LAUNCH-01 | Phase 4 — Launch and Match Generation | Pending |
| LAUNCH-02 | Phase 4 — Launch and Match Generation | Complete |
| LAUNCH-03 | Phase 4 — Launch and Match Generation | Complete |
| LAUNCH-04 | Phase 4 — Launch and Match Generation | Complete |
| LAUNCH-05 | Phase 4 — Launch and Match Generation | Complete |
| RESULT-01 | Phase 5 — Results and Advancement | Pending |
| RESULT-02 | Phase 5 — Results and Advancement | Pending |
| RESULT-03 | Phase 5 — Results and Advancement | Pending |
| RESULT-04 | Phase 5 — Results and Advancement | Pending |
| VIEW-01 | Phase 6 — Views and Dashboard | Pending |
| VIEW-02 | Phase 6 — Views and Dashboard | Pending |
| VIEW-03 | Phase 6 — Views and Dashboard | Pending |
| VIEW-04 | Phase 6 — Views and Dashboard | Pending |

**Coverage:**
- v1 requirements: 30 total
- Mapped to phases: 30
- Unmapped: 0 ✓

---
*Requirements defined: 2026-02-28*
*Last updated: 2026-02-28 — roadmap created, phase names added to traceability*
