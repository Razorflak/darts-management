---
status: complete
phase: 03-player-registration
source: [03-01-SUMMARY.md, 03-02-SUMMARY.md, 03-03-SUMMARY.md, 03-04-SUMMARY.md, 03-05-SUMMARY.md]
started: 2026-03-30T00:00:00Z
updated: 2026-03-30T10:00:00Z
---

## Current Test
<!-- OVERWRITE each test - shows where we are -->

[testing complete]

## Tests

### 1. Redirection non-connecté vers /events/[id]
expected: En visitant la page d'un événement (/events/[id]) sans être connecté, l'utilisateur est redirigé vers /login?redirectTo=/events/[id]. Après connexion, il est renvoyé automatiquement sur la page de l'événement.
result: pass

### 2. Page détail événement — liste des tournois
expected: Un joueur connecté accédant à /events/[id] voit la liste des tournois de l'événement avec, pour chaque tournoi, un bouton "S'inscrire".
result: pass

### 3. Auto-création du profil joueur
expected: Lors de la première connexion d'un utilisateur, un profil joueur est automatiquement créé (visible dans la base ou via un formulaire de profil). Aucune action manuelle n'est nécessaire.
result: issue
reported: "Non, il doit créer son profil de joueur manuellement. et c'est le comportement voulu"
severity: major

### 4. Inscription à un tournoi (joueur)
expected: Cliquer sur "S'inscrire" pour un tournoi inscrit le joueur immédiatement (mise à jour optimiste). Le bouton se transforme en "Inscrit · Se désinscrire" sans rechargement de page.
result: pass

### 5. Désinscription d'un tournoi (joueur)
expected: Cliquer sur "Se désinscrire" retire l'inscription du joueur. Le bouton repasse à "S'inscrire" sans rechargement de page.
result: pass

### 6. Champ "check_in_required" dans le wizard
expected: Dans le formulaire de création/édition d'un tournoi (wizard admin), une case à cocher ou un toggle "Check-in requis" est présent et son état est sauvegardé.
result: pass

### 7. Page admin événement (/admin/events/[id])
expected: En accédant à /admin/events/[id], l'admin voit la liste des tournois de l'événement avec, pour chaque tournoi, un lien vers la feuille de match (roster).
result: pass

### 8. Page admin roster — liste et statut
expected: En accédant à /admin/events/[id]/tournaments/[tid], l'admin voit la liste des joueurs inscrits et le statut actuel du tournoi (ex. "ready"). Des boutons permettent de faire avancer le statut (ready → check-in → started → finished).
result: pass

### 9. Check-in individuel et en masse
expected: Sur la page admin roster, chaque ligne joueur a un bouton de toggle check-in. Un bouton "Check-in tous" coche tous les joueurs d'un coup.
result: skipped
reason: Le toggle check-in individuel fonctionne. Le bouton "Check-in tous" a été retiré intentionnellement.

### 10. Admin — ajouter un joueur au tournoi
expected: Sur la page admin roster, une recherche autocomplete permet de trouver un joueur existant et de l'inscrire. Il est aussi possible de créer un nouveau joueur directement depuis cette page.
result: pass

### 11. Admin — retirer un joueur du tournoi
expected: Sur la page admin roster, un bouton "Retirer" (ou équivalent) permet de désinscrire un joueur. La page se recharge et le joueur n'apparaît plus dans la liste.
result: pass
note: Une modal de confirmation s'affiche avant de retirer l'équipe — comportement intentionnel.

## Summary

total: 11
passed: 9
issues: 1
pending: 0
skipped: 1

## Gaps

- truth: "Le joueur doit créer son profil manuellement via un formulaire dédié"
  status: failed
  reason: "User reported: Non, il doit créer son profil de joueur manuellement. et c'est le comportement voulu"
  severity: major
  test: 3
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""
