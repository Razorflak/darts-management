---
phase: 04-launch-and-match-generation
plan: 04
status: completed
completed_at: 2026-04-06
---

# Summary — 04-04 : Page de lancement + affichage post-lancement

## Ce qui a été livré

### Schémas Zod (`packages/domain/src/tournoi/admin-schemas.ts`)
- `MatchDisplaySchema` — ligne de match jointe avec noms d'équipes et arbitre pour les tables post-lancement
- `LaunchPhasePreviewSchema` — aperçu d'une phase pour la page /launch (type, taille groupes, sets/manches)

### Page `/launch` (`launch/+page.server.ts` + `launch/+page.svelte`)
- Server load : charge roster count, check-in status, phases, calcule les warnings contextuels
- UI : récapitulatif inscrits (badge), avertissements (Alert yellow), aperçu structure générée (nombre de poules, matchs estimés, sets/manches)
- Bouton "Confirmer le lancement" avec états idle / submitting / error / success
- Redirection vers la page roster après lancement réussi
- Alert "Ce tournoi est déjà lancé" si statut = started

### Page roster post-lancement (`[tid]/+page.server.ts` + `[tid]/+page.svelte`)
- Server load charge les matchs conditionnellement quand statut = started ou finished (requête avec JOIN sur round_robin_match_info et bracket_match_info)
- Section "Matchs générés" via composant `PhaseMatchTable.svelte`
- Contrôles check-in masqués après lancement
- Bouton "Lancer le tournoi" → /launch (visible pre-launch)
- Bouton "Annuler le lancement" (visible post-launch, POST TOURNAMENT_CANCEL)

### Composant `PhaseMatchTable.svelte`
- Affichage par phase (groupes round-robin avec lettres A/B/C, phases KO avec labels de rounds)
- Colonnes : `#` (event_match_id) | Équipe A | vs | Équipe B | Arbitre
- "BYE" pour les matchs bye, "À déterminer" pour les slots KO futurs

### Page événement (`[id]/+page.svelte`)
- Lien "Lancer le tournoi" par tournoi, visible uniquement si statut = ready ou check-in

## Vérification
- `svelte-check` : 0 erreur, 5 warnings préexistants
- `pnpm lint` : 0 erreur, 312 warnings préexistants
- Workflow end-to-end validé manuellement par l'utilisateur (approved)
