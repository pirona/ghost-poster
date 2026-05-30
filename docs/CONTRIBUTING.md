# ghost-poster — Guide de contribution

## Ajouter un écran

Les écrans se créent dans le dossier `app/` en suivant les conventions d'Expo Router.

**Convention de nommage :**
- Un fichier = un écran. Le nom du fichier détermine la route.
- Les groupes (tabs, modals) utilisent la notation `(groupe)/` — les parenthèses sont exclues de l'URL.
- Les layouts s'appellent `_layout.tsx`.

**Exemple : ajouter un écran de détail de post**

Créer `app/post/[id].tsx`. Expo Router génère automatiquement la route `/post/:id`. Lire le paramètre avec `useLocalSearchParams()`.

```typescript
// app/post/[id].tsx
import { useLocalSearchParams } from 'expo-router';

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  // ...
}
```

**Règles :**
- Aucun appel à `ghostClient` depuis un écran — passer par le store ou un hook.
- Aucune logique métier dans les layouts `_layout.tsx`.
- Les Alerts natives (confirmation irréversible) s'écrivent dans les hooks ou les callbacks de l'écran, jamais dans les stores.

## Ajouter une action au store

Toutes les actions suivent le même pattern dans les stores Zustand.

**Pattern de base :**

```typescript
// Dans postStore.ts ou instanceStore.ts
async maNewAction(param: string): Promise<void> {
  set({ isLoading: true, error: null });
  try {
    const result = await someApiFunction(param);
    set({ maData: result, isLoading: false });
  } catch (error) {
    console.error('Erreur maNewAction:', error instanceof Error ? error.message : error);
    set({
      isLoading: false,
      error: error instanceof Error ? error.message : 'Erreur inattendue.',
    });
    throw error;  // Re-lève si l'appelant doit réagir
  }
}
```

**Règles :**
- Toujours passer `isLoading: true` en début d'action async.
- Toujours logger les erreurs avec `console.error` — sans données sensibles (jamais de clé API).
- Toujours stocker le message d'erreur dans `state.error` pour que les composants puissent l'afficher.
- Ne jamais muter `state` directement — produire un nouvel objet dans `set()`.
- Les actions de `instanceStore` qui modifient des données persistées doivent appeler `persistState()` ou les setters SecureStore.

## Ajouter un endpoint API

Tous les endpoints se définissent dans `src/api/ghostClient.ts`.

**Étapes :**

1. Ajouter le type de réponse dans `src/api/ghostTypes.ts` si nécessaire.

```typescript
// Dans ghostTypes.ts
export interface GhostNewResourceResponse {
  resource: {
    id: string;
    // ...
  };
}
```

2. Ajouter la fonction dans `ghostClient.ts` :

```typescript
// Dans ghostClient.ts
/**
 * Description de ce que fait l'endpoint.
 * @param id - Description du paramètre
 * @returns Description de la valeur retournée
 * @throws GhostApiError si l'API retourne une erreur
 */
export async function getNewResource(id: string): Promise<GhostNewResourceType> {
  const response = await client.get<GhostNewResourceResponse>(
    `/ghost/api/admin/new-resource/${id}/`,
  );
  return response.data.resource;
}
```

3. Appeler la fonction depuis le store (jamais directement depuis un écran).

**Règles :**
- Chaque fonction exportée doit avoir un JSDoc complet (description, `@param`, `@returns`, `@throws`).
- Les erreurs HTTP sont déjà normalisées par l'intercepteur de réponse — ne pas gérer 401/409/422/429 dans les fonctions individuelles.
- Pour un endpoint qui bypass les intercepteurs (comme `testGhostConnection`), gérer explicitement les erreurs dans la fonction.

## Conventions de commit

Les commits suivent le format **Conventional Commits** en anglais :

```
type(scope): description concise à l'impératif présent
```

**Types :**

| Type | Usage |
|---|---|
| `feat` | Nouvelle fonctionnalité |
| `fix` | Correction de bug |
| `refactor` | Refactoring sans changement de comportement |
| `docs` | Documentation uniquement |
| `chore` | Maintenance (dépendances, config, scripts) |
| `style` | Formatage, styles CSS/StyleSheet |
| `test` | Ajout ou modification de tests |

**Exemples :**

```
feat(compose): add keyboard-aware scroll on editor screen
fix(ghostClient): handle 503 upstream Ghost errors
docs(GHOST_API): add rate limiting section
chore(deps): upgrade jose to 5.9.6
```

**Règles :**
- Pas de commit direct sur `main` — toujours via une PR/MR sur Gitea.
- La description ne dépasse pas 72 caractères.
- Le corps du commit (optionnel, après une ligne vide) peut contenir le contexte et les raisons du changement.
- Aucun secret ou fragment de clé API dans les messages de commit.
