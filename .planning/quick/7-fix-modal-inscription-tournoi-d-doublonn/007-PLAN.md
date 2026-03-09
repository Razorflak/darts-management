---
phase: quick-7
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - packages/front/src/routes/(admin)/admin/events/[id]/tournaments/[tid]/RegistrationModal.svelte
  - packages/front/src/routes/(admin)/admin/events/[id]/tournaments/[tid]/+page.svelte
  - packages/front/src/routes/(admin)/admin/events/[id]/tournaments/[tid]/register/+server.ts
autonomous: true
requirements: []

must_haves:
  truths:
    - "Le même joueur ne peut pas apparaître dans deux équipes différentes du même tournoi"
    - "En doubles, on ne peut pas sélectionner le même joueur pour player1 et player2"
    - "La modale solo affiche un seul champ de recherche, le joueur sélectionné apparaît en haut, puis 'Confirmer l'inscription'"
    - "La modale doubles est séquentielle : joueur 1 d'abord, puis joueur 2 apparaît après sélection du premier"
    - "Le bouton 'Confirmer l'inscription' n'apparaît que quand le nombre requis de joueurs est atteint"
    - "Fermer la modale remet tous les champs à zéro"
    - "La modale est dans un composant séparé RegistrationModal.svelte"
  artifacts:
    - path: "packages/front/src/routes/(admin)/admin/events/[id]/tournaments/[tid]/RegistrationModal.svelte"
      provides: "Composant modal d'inscription isolé, réutilisable"
    - path: "packages/front/src/routes/(admin)/admin/events/[id]/tournaments/[tid]/register/+server.ts"
      provides: "Validation serveur anti-doublon au niveau joueur"
  key_links:
    - from: "RegistrationModal.svelte"
      to: "register/+server.ts"
      via: "fetch POST /register"
      pattern: "fetch.*register"
    - from: "+page.svelte"
      to: "RegistrationModal.svelte"
      via: "import + props"
      pattern: "import RegistrationModal"
---

<objective>
Corriger la modale d'inscription aux tournois : dédoublonnage des joueurs (serveur + UI), UX séquentielle, composant modal séparé, reset à la fermeture.

Purpose: Éviter les inscriptions incohérentes (même joueur dans deux équipes), simplifier l'UX de la modale.
Output: RegistrationModal.svelte extrait + register/+server.ts protégé + +page.svelte allégé.
</objective>

<execution_context>
@/home/jta/.claude/get-shit-done/workflows/execute-plan.md
@/home/jta/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md

Interfaces clés déjà en place :

```typescript
// event-schemas.ts
export type PlayerSearchResult = z.infer<typeof PlayerSearchResultSchema>
// { id, first_name, last_name, birth_date, licence_no, department }

export type RosterEntry = z.infer<typeof RosterEntrySchema>
// { registration_id, team_id, members: { player_id, ... }[], checked_in, registered_at }

export type AdminTournament = z.infer<typeof AdminTournamentSchema>
// { id, name, category, check_in_required, event_id, event_name, status, entity_id }
```

Patterns codebase :
- Svelte 5 runes : $state, $derived, $props
- Flowbite-Svelte v1.x : Modal, Button, Input (sans slot legacy)
- Zod-first : types dérivés de schemas dans event-schemas.ts
- Raw SQL via postgres.js, $lib/server/db
- Pas de types inline — pas de `type Foo = { ... }` hors event-schemas.ts
</context>

<tasks>

<task type="auto">
  <name>Task 1: Dédoublonnage serveur dans register/+server.ts</name>
  <files>packages/front/src/routes/(admin)/admin/events/[id]/tournaments/[tid]/register/+server.ts</files>
  <action>
Après avoir résolu les IDs joueurs (player1Id, player2Id pour doubles, playerId pour solo/new),
ajouter une vérification SQL **avant** l'INSERT dans tournament_registration :

Pour le mode "doubles" : vérifier que player1Id !== player2Id (sinon json error 400 "Un joueur ne peut pas être inscrit deux fois dans la même équipe").

Pour tous les modes : vérifier qu'aucun des player IDs résolus n'est déjà membre d'une équipe inscrite à ce tournoi :

```sql
SELECT p.id FROM player p
JOIN team_member tm ON tm.player_id = p.id
JOIN tournament_registration r ON r.team_id = tm.team_id
WHERE r.tournament_id = ${params.tid}
AND p.id = ANY(${playerIds})
```

Si un joueur est trouvé : retourner json error 409 avec message "Ce joueur est déjà inscrit à ce tournoi : [Prénom Nom]".

Récupérer le prénom/nom pour le message d'erreur via une JOIN supplémentaire ou une requête séparée sur la table player.

La vérification se fait APRÈS resolvePlayerId (les nouveaux joueurs viennent d'être créés en DB), mais AVANT findOrCreateSoloTeam/findOrCreateDoublesTeam.

Note : le schema AdminRegisterSchema et PlayerSlotSchema restent inchangés. Ne pas modifier la logique d'auth existante.
  </action>
  <verify>
Tester manuellement : inscrire un joueur dans un tournoi, puis tenter de l'inscrire dans une autre équipe du même tournoi via l'UI — le serveur doit retourner 409. Vérifier aussi qu'en doubles, sélectionner le même joueur pour player1 et player2 retourne 400.

```bash
cd /home/jta/Projects/darts-management/master && pnpm typecheck 2>&1 | tail -20
```
  </verify>
  <done>Le serveur rejette (409/400) toute tentative d'inscrire un joueur déjà présent dans ce tournoi, avec un message explicite. pnpm typecheck passe.</done>
</task>

<task type="auto">
  <name>Task 2: Créer RegistrationModal.svelte (UX séquentielle + reset)</name>
  <files>packages/front/src/routes/(admin)/admin/events/[id]/tournaments/[tid]/RegistrationModal.svelte</files>
  <action>
Créer le composant extrait. Props :

```typescript
let {
  open = $bindable(false),
  isDoubles,
  baseUrl,
  onRegistered  // callback () => void appelé après inscription réussie (le parent recharge)
}: {
  open: boolean,
  isDoubles: boolean,
  baseUrl: string,
  onRegistered: () => void
} = $props()
```

**UX solo (isDoubles = false) :**
- Un seul PlayerSearch (searchUrl="{baseUrl}/players/search")
- Quand un joueur est sélectionné : afficher son nom + département en haut de la modale dans un bloc `rounded bg-gray-50 p-2`, bouton "Changer" qui efface la sélection
- Le bouton "Confirmer l'inscription" n'apparaît que si `selectedPlayer !== null`
- Pas de formulaire "nouveau joueur" pour simplifier (il reste accessible si nécessaire, mais ne pas l'exposer par défaut dans cette version)

**UX doubles (isDoubles = true) — séquentielle :**
- Étape 1 : PlayerSearch pour joueur 1 visible dès l'ouverture
- Quand joueur 1 sélectionné : afficher son bloc résumé + afficher le PlayerSearch pour joueur 2 (deuxième zone apparaît via `$derived` ou `$state` conditionnel)
- Quand joueur 2 sélectionné : afficher son bloc résumé
- "Confirmer l'inscription" n'apparaît que si les deux joueurs sont sélectionnés

**Boutons footer de la modale :**
- "Confirmer l'inscription" (color="primary") — visible uniquement si slots requis remplis
- "Annuler" (color="light") — toujours visible, appelle `closeAndReset()`

**Reset à la fermeture :**
Utiliser `$effect` sur `open` pour détecter la fermeture (open passe de true à false) et appeler la fonction reset :
```typescript
function reset() {
  selectedPlayer = null
  selectedPlayer1 = null
  selectedPlayer2 = null
  errorMsg = null
}
$effect(() => {
  if (!open) reset()
})
```

**Gestion erreurs :**
- Variable `errorMsg = $state<string | null>(null)`
- Si fetch retourne un code erreur, lire `res.json()` et afficher le message dans un `<p class="text-sm text-red-600 mt-2">`
- Sur succès : `open = false` puis `onRegistered()`

**Imports Flowbite-Svelte :** Modal, Button — pas de slot legacy, utiliser snippets si footer customisé est nécessaire.

**Note footer z-index :** Le layout admin a `z-40` sur la sidebar. Flowbite Modal utilise z-50 par défaut — aucun fix nécessaire.

Ne pas inclure la gestion du statut tournoi (STATUS_TRANSITIONS etc.) — c'est dans +page.svelte.
  </action>
  <verify>
```bash
cd /home/jta/Projects/darts-management/master && pnpm typecheck 2>&1 | tail -20
```
Vérifier visuellement : ouvrir la modale solo → sélectionner un joueur → bouton confirmer apparaît → inscription → modale se ferme. Rouvrir : champs vides.
  </verify>
  <done>RegistrationModal.svelte existe, typecheck passe, la modale se reset à la fermeture, le bouton confirmer est conditionnel.</done>
</task>

<task type="auto">
  <name>Task 3: Refactor +page.svelte — utiliser RegistrationModal</name>
  <files>packages/front/src/routes/(admin)/admin/events/[id]/tournaments/[tid]/+page.svelte</files>
  <action>
Supprimer de +page.svelte tout le code lié à la modale d'inscription :
- Les variables $state : selectedPlayer, showNewPlayerForm, newFirst, newLast, newBirth, newLicence, newDepartment, selectedPlayer1, showNewPlayer1Form, newPlayer1, selectedPlayer2, showNewPlayer2Form, newPlayer2
- Les fonctions : registerExisting, registerNew, buildSlot, registerDoubles, handlePlayerSelected
- Le bloc HTML `<Modal ...>...</Modal>` entier

Ajouter l'import :
```typescript
import RegistrationModal from "./RegistrationModal.svelte"
```

Remplacer le bloc Modal supprimé par :
```svelte
<RegistrationModal
  bind:open={showAddModal}
  {isDoubles}
  {baseUrl}
  onRegistered={() => window.location.reload()}
/>
```

La variable `showAddModal = $state(false)` reste dans +page.svelte (elle contrôle l'ouverture depuis le bouton "Ajouter").

Supprimer les imports Flowbite inutilisés après nettoyage (Input si plus utilisé dans le fichier, etc.). Vérifier que les imports DepartmentSelect et PlayerSearch sont supprimés de +page.svelte si plus utilisés directement.
  </action>
  <verify>
```bash
cd /home/jta/Projects/darts-management/master && pnpm typecheck 2>&1 | tail -20
```
```bash
cd /home/jta/Projects/darts-management/master && pnpm lint 2>&1 | tail -20
```
La page roster charge, le bouton "Ajouter" ouvre la modale, l'inscription fonctionne.
  </verify>
  <done>+page.svelte ne contient plus de logique modale inline. typecheck et lint passent. La fonctionnalité d'inscription est intacte via RegistrationModal.</done>
</task>

</tasks>

<verification>
```bash
cd /home/jta/Projects/darts-management/master && pnpm typecheck && pnpm lint
```

Test fonctionnel manuel :
1. Ouvrir la modale solo → sélectionner un joueur → "Confirmer l'inscription" visible → confirmer → roster rechargé
2. Rouvrir la modale → champs vides (reset OK)
3. Modale doubles → sélectionner joueur 1 → zone joueur 2 apparaît → sélectionner → confirmer
4. Tenter d'inscrire un joueur déjà présent → message d'erreur 409 affiché dans la modale
5. En doubles, tenter joueur1 = joueur2 → erreur 400 affichée
</verification>

<success_criteria>
- RegistrationModal.svelte extrait et fonctionnel
- +page.svelte sans logique modale inline
- Serveur rejette les doublons joueur avec message explicite
- UX séquentielle en doubles (joueur 2 apparaît après joueur 1)
- Bouton "Confirmer" conditionnel (slots requis remplis)
- Reset à la fermeture de la modale
- pnpm typecheck et pnpm lint passent
</success_criteria>

<output>
Après completion, créer `.planning/quick/7-fix-modal-inscription-tournoi-d-doublonn/007-SUMMARY.md`
</output>
