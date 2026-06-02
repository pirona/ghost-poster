# Ghost Poster

> **Who ya gonna post?** — A mobile client for [Ghost CMS](https://ghost.org), built for Android with Expo / React Native.

Ghost Poster lets you write, edit and publish articles on your Ghost blog directly from your phone. No browser, no laptop — draft in Markdown, preview in-app, and hit publish from anywhere.

---

## Features

- **Write in Markdown** — full Markdown editor with live HTML preview via WebView
- **Draft / Publish / Depublish** — full post lifecycle from your phone
- **Multi-instance** — manage several Ghost blogs in one app, switch with a tap
- **Secure by design** — Admin API keys stored in the device secure enclave (Expo SecureStore), JWT generated on-device with `@noble/hashes`, no third-party auth server
- **Dark mode** — follows system preference or manual override (light / auto / dark)
- **Tag management** — add and remove tags inline in the editor
- **Image upload** — pick from gallery, upload to Ghost, insert Markdown link automatically
- **Infinite scroll** — paginated post list with pull-to-refresh
- **Filter by status** — view all posts, drafts only, or published only
- **No cloud sync** — your credentials never leave your device

---

## Screenshots

> Coming soon.

---

## Installation

### Prerequisites

- [Node.js](https://nodejs.org) ≥ 18
- [Expo CLI](https://docs.expo.dev/get-started/installation/) (`npm install -g expo`)
- [EAS CLI](https://docs.expo.dev/eas-update/getting-started/) (`npm install -g eas-cli`) — for builds
- A Ghost instance with an **Admin API key** (Ghost Admin → Settings → Integrations → Add custom integration)

### Run locally (Expo Go / development build)

```bash
git clone https://github.com/billisdead/ghost-poster.git
cd ghost-poster
npm install
npx expo start
```

Scan the QR code with **Expo Go** (Android) or run on an emulator.

> Note: `expo-secure-store` and `expo-image-picker` require a [development build](https://docs.expo.dev/develop/development-builds/introduction/) — Expo Go will warn about these on first launch.

### Build APK (EAS)

```bash
eas build --profile preview --platform android
```

This produces a standalone APK installable on any Android device.

### Build production AAB (Play Store)

```bash
eas build --profile production --platform android
```

---

## Update

```bash
git pull
npm install          # in case dependencies changed
npx expo start       # or rebuild with eas build
```

There is no OTA update mechanism — each new version requires a fresh build.

---

## Architecture

```
ghost-poster/
├── app/
│   ├── _layout.tsx          # Root layout: PaperProvider, theme, font loading
│   ├── index.tsx            # Entry: redirect to /settings or /(drawer)/posts
│   ├── settings.tsx         # Ghost instance manager + app preferences
│   └── (drawer)/
│       ├── _layout.tsx      # Drawer navigator (slide), header theming
│       ├── posts.tsx        # Post list (filter, infinite scroll, swipe-delete)
│       └── compose.tsx      # Markdown editor + preview + publish actions
├── src/
│   ├── api/
│   │   ├── ghostClient.ts   # Ghost Admin API v5 calls (CRUD posts, upload)
│   │   ├── ghostJwt.ts      # JWT generation with @noble/hashes (Hermes-compatible)
│   │   └── ghostTypes.ts    # TypeScript types for Ghost API responses
│   ├── components/
│   │   ├── InstanceListItem.tsx
│   │   ├── PostListItem.tsx
│   │   ├── TagChipList.tsx
│   │   ├── MarkdownPreview.tsx  # WebView-based HTML preview
│   │   └── ImagePickerButton.tsx
│   ├── hooks/
│   │   ├── useInstances.ts  # Instance CRUD + validation + connection test
│   │   ├── usePostEditor.ts # Editor state, dirty-check, navigation guard
│   │   └── useSettingsStore.ts
│   ├── store/
│   │   ├── instanceStore.ts # Zustand: multi-instance list, active instance
│   │   ├── postStore.ts     # Zustand: post list + current post (editor state)
│   │   └── settingsStore.ts # Zustand: theme preference, editor defaults
│   └── theme.ts             # React Native Paper MD3 themes (light + dark)
├── assets/
│   ├── icon.png             # 1024x1024 launcher icon
│   └── adaptive-icon.png    # 1024x1024 RGBA foreground for Android adaptive icons
├── docs/
│   └── gen_icons.py         # Icon generator (pure Python stdlib, no Pillow)
├── app.json                 # Expo config (package name, EAS project ID, permissions)
└── eas.json                 # EAS build profiles (preview -> APK, production -> AAB)
```

### Key technical choices

| Choice | Reason |
|---|---|
| **Expo SDK ~52 + expo-router** | File-based routing, managed workflow, EAS builds |
| **React Native Paper v5 (MD3)** | Material You components, full dark mode support |
| **Zustand v5** | Minimal state management, no boilerplate |
| **@noble/hashes** | Ghost JWT requires SHA-256 HMAC — `jose` is incompatible with Hermes JS engine |
| **expo-secure-store** | OS-level key storage (Android Keystore / iOS Secure Enclave) |
| **WebView + inline HTML** | Markdown preview without a native renderer dependency |

---

## Ghost API setup

1. Open your Ghost Admin panel
2. Go to **Settings → Integrations → Add custom integration**
3. Name it (e.g. "Ghost Poster Mobile")
4. Copy the **Admin API key** (format: `id:secret`)
5. In Ghost Poster, go to **Settings → Instances → +** and enter:
   - A display name for the instance
   - The base URL of your Ghost site (e.g. `https://ghost.example.com`)
   - The Admin API key

The app tests the connection before saving. The key is stored encrypted on-device and never transmitted to any server other than your Ghost instance.

---

## Development notes

- Requires a **development build** (not Expo Go) for full functionality — `expo-secure-store` and `expo-image-picker` use native modules not included in Expo Go
- The `android/` directory is gitignored — EAS runs its own `expo prebuild` during cloud builds
- Font: **Barlow 700 Bold** via `@expo-google-fonts/barlow`, applied globally via `configureFonts`

---

## License

MIT — do whatever you want, but don't blame the ghost.
