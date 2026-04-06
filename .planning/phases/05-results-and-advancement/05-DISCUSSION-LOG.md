# Phase 5: Results and Advancement — Discussion Log

**Date:** 2026-04-06
**Phase:** 05-results-and-advancement
**Status:** Complete

---

## Area: Interface de saisie

**Q: Comment l'admin accède-t-il à la saisie d'un score ?**
- Options présentées : Modal depuis la table / Hub événement + event_match_id / Les deux
- **Réponse :** Les deux

**Q: Le champ rapide sur le hub événement : l'admin tape l'event_match_id et ensuite ?**
- Options présentées : Modal en overlay / Redirection vers la page tournoi
- **Réponse (libre) :** Pas de modal, une tuile directement dans la page. Visible seulement si au moins un tournoi est lancé. État initial : titre + champ event_match_id. Saisie + Enter → infos du match apparaissent + focus sur score A → Enter → score B → Enter → Valider → Enter → soumission. Bouton Annuler pour revenir à l'état initial. Pour le moment on ne saisit que des legs, tous les matchs sont en 1 set.

**Q: Pour la saisie depuis PhaseMatchTable — comment déclenche-t-on la saisie ?**
- Options présentées : Clic sur la ligne ouvre un modal / Bouton Éditer par ligne / Inline dans la table
- **Réponse :** Clic sur la ligne ouvre un modal

---

## Area: Granularité du score

**Q: Que saisit-on exactement comme score pour un match ?**
- Options présentées : Legs seulement — 1 set fixe / Sets + legs par set
- **Réponse (libre) :** Set + legs mais si sets_to_win = 1 que legs

**Q: Validation du score saisi : comment détecter un gagnant ?**
- Options présentées : Validation stricte / Validation souple
- **Réponse :** Validation stricte

---

## Area: Classements round-robin

**Q: Les classements de poule — où sont-ils affichés ?**
- Options présentées : Dans la page tournoi existante / Page dédiée /standings / Onglets sur la page tournoi
- **Réponse :** Dans la page tournoi existante

**Q: Calcul des points round-robin : quelle formule de points ?**
- Options présentées : Victoire = 2 pts, Défaite = 1 pt / Victoire = 1 pt, Défaite = 0 pt
- **Réponse (libre) :** Victoire 3 points, défaite 0. Mettre ce paramétrage dans un objet avec des constantes, possible que ça change à l'avenir.

**Q: Départage en cas d'égalité de points ?**
- Options présentées : Diff legs + confrontation directe / Diff legs uniquement / Tu décides
- **Réponse (libre) :** Option 1 (diff legs + confrontation directe), mais mettre cette règle dans une fonction à part, possible que ça change.

---

## Area: double_elimination

**Q: Le type de phase double_elimination — que fait-on en Phase 5 ?**
- Options présentées : Reporter à Phase 6+ / Implémenter en Phase 5
- **Réponse :** Implémenter en Phase 5

**Q: Structure du bracket double_elimination ?**
- Options présentées : Upper/Lower + Grande Finale / Upper/Lower sans GF
- **Réponse :** Upper/Lower + Grande Finale

**Q: Grande Finale — bracket reset si Lower gagne ?**
- Options présentées : Oui, bracket reset si Lower gagne / Non, un seul match de GF
- **Réponse :** Oui, bracket reset si Lower gagne

**Q: Le match de reset — comment le gérer ?**
- Options présentées : Match de reset généré à vide au lancement / Match de reset créé dynamiquement
- **Réponse :** Match de reset créé dynamiquement

---

## Area: Statut 'ongoing'

**Q: Le statut 'ongoing' — quand est-il activé ?**
- Options présentées : Pas de 'ongoing' en Phase 5 / Automatique au premier score partiel / Bouton manuel
- **Réponse :** Pas de 'ongoing' en Phase 5

---

## Area: Affichage post-lancement

**Q: La table des matchs en Phase 5 : qu'est-ce qui change ?**
- Options présentées : Scores affichés / Statuts colorés / Filtre par statut
- **Réponse (libre) :** Rien pour le moment, les composants d'affichage pour les brackets et poules seront faits dans une autre phase.

---

## Area: Forfait / walkover

**Q: Comment l'admin enregistre-t-il un forfait ou walkover ?**
- Options présentées : Option dans le modal de saisie / Action séparée par ligne
- **Réponse :** Option dans le modal de saisie

---

*Discussion complète — 2026-04-06*
