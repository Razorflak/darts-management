Ce projet utilise plusieurs serveurs MCP pour accéder à la documentation de manière complète.

## Serveurs MCP disponibles

### Serveur MCP Svelte

Vous avez accès à une documentation complète sur Svelte 5 et SvelteKit. Voici comment utiliser efficacement les outils disponibles :

#### Outils disponibles :

**1. list-sections**
- Utilisez cet outil EN PREMIER pour découvrir toutes les sections de documentation disponibles
- Retourne une liste structurée avec les titres, use_cases et chemins
- Lorsqu'on vous pose une question sur Svelte ou SvelteKit, utilisez TOUJOURS cet outil au début pour trouver les sections pertinentes

**2. get-documentation**
- Récupère le contenu complet de la documentation pour des sections spécifiques
- Accepte une ou plusieurs sections
- Après avoir appelé list-sections, vous DEVEZ analyser les sections retournées (en particulier le champ use_cases) puis utiliser get-documentation pour récupérer TOUTES les sections pertinentes pour la tâche

**3. svelte-autofixer**
- Analyse le code Svelte et retourne les problèmes et suggestions
- Vous DEVEZ utiliser cet outil chaque fois que vous écrivez du code Svelte avant de l'envoyer à l'utilisateur
- Continuez à l'appeler jusqu'à ce qu'aucun problème ni suggestion ne soit retourné

**4. playground-link**
- Génère un lien vers le Svelte Playground avec le code fourni
- Après avoir terminé le code, demandez à l'utilisateur s'il souhaite un lien playground
- N'appelez JAMAIS cet outil si du code a été écrit dans les fichiers du projet

---

### Serveur MCP Flowbite-Svelte

Vous avez accès à une documentation complète sur les composants Flowbite-Svelte. Voici comment utiliser efficacement les outils disponibles :

#### Outils disponibles :

**1. findComponent**
- Utilisez cet outil EN PREMIER pour trouver des composants par nom ou catégorie
- Retourne les informations du composant, dont le chemin vers sa documentation
- Lorsqu'on demande un composant Flowbite-Svelte, utilisez TOUJOURS cet outil avant de récupérer la documentation
- Exemples de requêtes : 'Button', 'CardPlaceholder', 'form checkbox'

**2. getComponentList**
- Liste tous les composants Flowbite-Svelte disponibles avec leurs catégories
- Utilisez cet outil pour découvrir les composants disponibles ou pour aider l'utilisateur à explorer ses options

**3. getComponentDoc**
- Récupère le contenu complet de la documentation pour un composant spécifique
- Accepte le chemin du composant trouvé via findComponent
- Après findComponent, utilisez cet outil pour obtenir la documentation complète : exemples d'utilisation, props, bonnes pratiques

**4. searchDocs**
- Effectue une recherche en texte intégral dans toute la documentation Flowbite-Svelte
- Utilisez cet outil lorsque vous cherchez des informations qui couvrent plusieurs composants ou des patterns spécifiques

---

## Guide de travail

### Lors de la construction de composants Svelte avec Flowbite-Svelte :

1. **Commencer par la documentation Svelte** : utilisez `list-sections` pour identifier les concepts Svelte nécessaires
2. **Récupérer la doc Svelte** : utilisez `get-documentation` pour toutes les sections pertinentes
3. **Trouver les composants Flowbite-Svelte** : utilisez `findComponent` pour localiser les composants UI nécessaires
4. **Obtenir les détails des composants** : utilisez `getComponentDoc` pour les exemples et les props
5. **Écrire le code** : combinez les patterns Svelte avec les composants Flowbite-Svelte
6. **Valider le code** : utilisez `svelte-autofixer` pour vérifier les problèmes
7. **Proposer un playground** : demandez à l'utilisateur s'il souhaite un lien playground (uniquement si aucun fichier n'a été modifié)

### Bonnes pratiques :

- Toujours privilégier les runes Svelte 5 et les patterns modernes
- Utiliser les composants Flowbite-Svelte pour un design UI cohérent
- Valider tout le code avec svelte-autofixer avant de le livrer
- Optimiser les appels de documentation en récupérant plusieurs sections simultanément
