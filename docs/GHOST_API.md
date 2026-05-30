# ghost-poster — Référence API Ghost utilisée

## Authentification

L'application utilise l'**Admin API** de Ghost, authentifiée par JWT signé avec la clé Admin API.

### Mécanisme

La clé Admin API est au format `id:secret` où les deux parties sont des chaînes hexadécimales. À chaque requête, l'application :

1. Extrait `id` et `secret` depuis la clé stockée dans SecureStore
2. Décode `secret` de hexadécimal vers `Uint8Array`
3. Signe un JWT HS256 avec `jose` :
   - En-tête : `{ alg: "HS256", kid: "<id>" }`
   - Payload : `{ iat: <maintenant>, exp: <maintenant + 300s>, aud: "/admin/" }`
4. Injecte le JWT dans le header HTTP : `Authorization: Ghost <token>`

Le JWT est généré à la volée à chaque requête et n'est jamais mis en cache. Sa durée de vie est de 5 minutes maximum, conformément aux recommandations Ghost.

### Format de la clé

```
6ba7b810:9dad11d1b0004b00b0000c3f7edcfbadba0efbad
│         │
│         └── secret (hexadécimal, 40+ caractères)
└────────── id (hexadécimal, 8+ caractères)
```

La clé est validée côté application avec le regex `/^[a-f0-9]+:[a-f0-9]+$/i` avant tout appel.

## Endpoints utilisés

| Méthode | Endpoint | Usage | Paramètres clés |
|---|---|---|---|
| GET | `/ghost/api/admin/site/` | Test de connexion + métadonnées | — |
| GET | `/ghost/api/admin/posts/` | Liste paginée des posts | `page`, `limit=15`, `filter`, `include=tags`, `order=updated_at desc` |
| GET | `/ghost/api/admin/posts/:id/` | Détail d'un post | `include=tags` |
| POST | `/ghost/api/admin/posts/` | Création d'un post | Body : `{ posts: [{ title, html, status, tags }] }` |
| PUT | `/ghost/api/admin/posts/:id/` | Mise à jour d'un post | Body : `{ posts: [{ title, html, status, tags, updated_at }] }` |
| DELETE | `/ghost/api/admin/posts/:id/` | Suppression d'un post | — |
| POST | `/ghost/api/admin/images/upload/` | Upload d'une image | `multipart/form-data` : champs `file` et `purpose=image` |

### Filtres de liste

Ghost utilise sa propre syntaxe de filtre via le paramètre `filter` :

```
status:draft                 # Brouillons uniquement
status:published             # Publiés uniquement
status:[draft,published]     # Tous (exclut les scheduled)
```

L'application utilise `status:[draft,published]` pour le filtre "Tous" — les posts programmés sont inclus dans `published` côté Ghost et affichés avec le badge "Programmé" dans l'app.

## Gestion des conflits (409)

Ghost implémente un mécanisme d'**optimistic locking** basé sur le champ `updated_at`. Toute requête PUT doit inclure la valeur `updated_at` du post telle qu'elle a été lue lors du dernier GET.

Si le post a été modifié entre le chargement et la sauvegarde (par un autre client ou via le panel Ghost), le serveur retourne une erreur **409 Conflict**. L'application affiche alors le message : *"Le post a été modifié depuis votre dernier chargement. Rechargez-le avant de sauvegarder."*

Pour se remettre en phase, l'utilisateur doit recharger la liste des posts et rouvrir le post en édition — ce qui récupère le `updated_at` le plus récent.

Le flow dans le code :

```typescript
// Dans postStore.saveCurrentPost()
await updatePost(current.ghostId, {
  posts: [{
    title: current.title,
    html,
    status,
    updated_at: current.originalUpdatedAt,  // OBLIGATOIRE
  }]
});
```

## Stratégie de contenu HTML / Lexical

Ghost 5+ stocke le contenu dans deux champs : `html` (rendu HTML) et `lexical` (format JSON natif de l'éditeur Ghost). L'application n'utilise que `html` pour les raisons suivantes :

- Le format Lexical est propriétaire et non documenté publiquement
- L'API Ghost Admin accepte le champ `html` en écriture et le re-convertit en Lexical côté serveur
- Cette approche est documentée et supportée par l'équipe Ghost

**Comportement à la lecture :** si `html` est null (post entièrement en Lexical sans rendu HTML), l'application considère le contenu comme vide et démarre avec un éditeur vierge. Le contenu Lexical original est préservé si l'utilisateur sauvegarde sans modifier.

**Comportement à l'écriture :** Ghost génère le champ `lexical` à partir du HTML fourni. Les cards Ghost avancées (galeries, embeds) ne sont pas reconstituées — le contenu est normalisé en HTML standard.

## Codes d'erreur gérés

| Code HTTP | Classe d'erreur | Comportement app |
|---|---|---|
| 401 | `AuthenticationError` | Snackbar d'erreur, navigation vers Settings pour reconfigurer la clé |
| 409 | `ConflictError` | Snackbar avec message spécifique (updated_at périmé) |
| 422 | `ValidationError` | Snackbar avec le message d'erreur Ghost (champ invalide, titre manquant…) |
| 429 | `RateLimitError` | Snackbar avec invitation à réessayer |
| Autres | `GhostApiError` | Snackbar avec le message d'erreur brut |
| Réseau (timeout, DNS) | `AxiosError` non wrappée | Snackbar "Erreur réseau" |
| Aucune instance active | `NotConfiguredError` | Navigation automatique vers Settings |
