# Procédure de release

## Prérequis

- Être sur la branche `main` avec un working tree propre
- Secrets GitHub configurés (voir [BUILD_LOCAL.md](BUILD_LOCAL.md))

## Commande

```bash
./scripts/release.sh patch    # 1.0.0 → 1.0.1
./scripts/release.sh minor    # 1.0.0 → 1.1.0
./scripts/release.sh major    # 1.0.0 → 2.0.0
./scripts/release.sh 1.2.3    # version explicite
```

## Déroulement complet

| # | Acteur | Action | Détail |
|---|---|---|---|
| 1 | **Toi** | `./scripts/release.sh patch` | Lance le script manuellement dans ton terminal |
| 2 | **Script** | Vérifie l'état du repo | Bloque si pas sur `main` ou si modifications non commitées |
| 3 | **Script** | Demande confirmation | Affiche `1.0.0 → 1.0.1 — Continuer ? [y/N]` |
| 4 | **Script** | Bumpe `app.json` | Met à jour `version` et `android.versionCode` |
| 5 | **Script** | Commit | `chore: release v1.0.1` |
| 6 | **Script** | Crée le tag git | `git tag v1.0.1` |
| 7 | **Script** | Push | Envoie le commit + le tag vers le miroir GitHub |
| 8 | **GitHub** | Détecte le tag `v*` | Déclenche automatiquement le workflow `release.yml` |
| 9 | **GitHub Actions** | Installe les dépendances | `npm ci`, Java 21, Android SDK |
| 10 | **GitHub Actions** | Génère le projet Android | `expo prebuild --platform android --clean` |
| 11 | **GitHub Actions** | Configure la signature | Décode la keystore depuis les secrets + `configure-android.py` |
| 12 | **GitHub Actions** | Build l'APK | `./gradlew assembleRelease` |
| 13 | **GitHub Actions** | Crée la GitHub Release | Publie `ghost-poster-1.0.1.apk` sous le tag `v1.0.1` |
| 14 | **Toi** | Télécharge l'APK | Depuis la page Releases du repo GitHub |
