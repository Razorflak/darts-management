---
status: complete
phase: 02-wizard-persistence
source: [02-01-SUMMARY.md, 02-02-SUMMARY.md, 02-03-SUMMARY.md, 02-04-SUMMARY.md]
started: 2026-03-01T15:00:00Z
updated: 2026-03-01T15:30:00Z
---

## Current Test
<!-- OVERWRITE each test - shows where we are -->

[testing complete]

## Tests

### 1. Lien "Événements" dans la navbar
expected: La navbar affiche un lien "Événements". En cliquant dessus, on arrive sur `/events`.
result: pass

### 2. Page liste des événements — état vide
expected: Visiter `/events` sans événements créés affiche un message d'état vide et un bouton "Créer un événement".
result: pass

### 3. Bouton "Créer un événement" → `/events/new`
expected: Cliquer "Créer un événement" depuis `/events` navigue vers `/events/new` (le wizard).
result: pass

### 4. Sélecteur d'entité avec données réelles
expected: Dans le wizard (EventStep), le sélecteur d'entité affiche les entités réelles de la DB (pas les mocks "Mon Comité", "Ma Ligue"). Si l'utilisateur n'a aucun rôle d'organisateur, la liste est vide.
result: pass

### 5. Champ "Ouverture des inscriptions" dans EventStep
expected: EventStep affiche un champ date "Ouverture des inscriptions" (optionnel) en plus des dates de l'événement.
result: pass

### 6. Toggle "Arbitre auto" dans TournamentForm
expected: Chaque formulaire de tournoi dans TournamentForm affiche un toggle "Arbitre automatique" (ou libellé similaire).
result: pass

### 7. Chargement d'un template
expected: Ouvrir le modal templates et sélectionner un template pré-remplit la structure de phases du tournoi actif.
result: issue
reported: "La date saisie dans la modal n'est pas reporté dans la date de début de tounois, ainsi que la date de fin qui est calculer avec la durée de l'évènement défini dans le template"
severity: major

### 8. Enregistrer un brouillon
expected: Remplir le nom de l'événement et cliquer "Enregistrer" — aucune erreur, on reste sur le wizard (pas de redirect). L'événement est sauvegardé en DB (statut draft).
result: pass

### 9. Deuxième sauvegarde = UPDATE (pas doublon)
expected: Modifier le nom et cliquer "Enregistrer" une seconde fois — l'événement existant est mis à jour, pas un nouveau créé. La liste `/events` n'affiche pas de doublon.
result: issue
reported: "Une fois sauvegardé, je retour sur l'écran de la liste des évent, j'ai bien la card de l'évènement, mais je n'ai rien pour cliquer dessus et reprendre l'édition"
severity: major

### 10. Publier un événement → redirect `/events`
expected: Depuis le PublishStep, cliquer "Publier" avec un événement valide — redirection vers `/events`, l'événement apparaît avec le statut "Ouvert" (ou similaire, pas "Brouillon").
result: pass

### 11. Erreur de publication inline
expected: Tenter de publier sans entité sélectionnée (ou champ obligatoire manquant) — un message d'erreur apparaît directement dans le PublishStep, sans alert navigateur ni redirect.
result: issue
reported: "pass mais le message d'erreur n'est pas clair. 'Accès refusé' n'est pas clean. 'Entité manquante' serrait plus clair"
severity: minor

### 12. Événements dans la liste après création
expected: Après avoir publié, retourner sur `/events` — l'événement apparaît en card avec : nom, dates, lieu, nom de l'entité, badge statut, nombre de tournois.
result: issue
reported: "les dates de début et fin s'affiche mal 'Invalid date' quelles soient rempli ou non. Laisser vide si pas de date saisie ou DD/MM/YYYY si rempli. De si ce n'est pas le cas, vérifier la cohérence en les dates d'incription, début et fin, idem dans les tournois"
severity: major

### 13. Ancienne route `/tournaments/new` supprimée
expected: Naviguer vers `/tournaments/new` renvoie une page 404 (route n'existe plus).
result: pass

## Summary

total: 13
passed: 9
issues: 4
pending: 0
skipped: 0

## Gaps

- truth: "La date saisie dans le modal template est reportée sur la date de début du tournoi, et la date de fin est calculée en ajoutant la durée définie dans le template"
  status: failed
  reason: "User reported: La date saisie dans la modal n'est pas reporté dans la date de début de tounois, ainsi que la date de fin qui est calculer avec la durée de l'évènement défini dans le template"
  severity: major
  test: 7
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""

- truth: "Le message d'erreur de publication indique précisément le champ manquant (ex: 'L'entité organisatrice est requise.' plutôt que 'Accès refusé')"
  status: failed
  reason: "User reported: pass mais le message d'erreur n'est pas clair. 'Accès refusé' n'est pas clean. 'Entité manquante' serrait plus clair"
  severity: minor
  test: 11
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""

- truth: "Les dates dans la liste /events s'affichent en DD/MM/YYYY si renseignées, ou vide si non renseignées — jamais 'Invalid date'. Cohérence entre dates d'inscription, début, fin dans l'événement et les tournois."
  status: failed
  reason: "User reported: les dates de début et fin s'affiche mal 'Invalid date' quelles soient rempli ou non. Laisser vide si pas de date saisie ou DD/MM/YYYY si rempli. De si ce n'est pas le cas, vérifier la cohérence en les dates d'incription, début et fin, idem dans les tournois"
  severity: major
  test: 12
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""

- truth: "La card d'un événement brouillon dans la liste /events est cliquable et permet de reprendre l'édition dans le wizard"
  status: failed
  reason: "User reported: Une fois sauvegardé, je retour sur l'écran de la liste des évent, j'ai bien la card de l'évènement, mais je n'ai rien pour cliquer dessus et reprendre l'édition"
  severity: major
  test: 9
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""
