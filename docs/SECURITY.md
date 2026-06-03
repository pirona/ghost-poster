# ghost-poster — Security by design

This document covers the security decisions embedded in ghost-poster's architecture. It is intended as a reference for contributors, reviewers, and anyone evaluating the app for trust.

---

## Credential storage

The Ghost Admin API key (`id:secret` hex format) is stored exclusively in the Android Keystore via `expo-secure-store`. This means:

- The key is encrypted at rest using hardware-backed encryption on supported devices
- It is never written to AsyncStorage, SQLite, shared preferences, or any plaintext file
- It is never included in logs, error messages, or crash reports
- It is never passed as a URL parameter or embedded in the codebase

The multi-instance model stores all instances as a JSON array under a single SecureStore key (`GHOST_INSTANCES`). The API key of each instance is part of that JSON — encrypted by SecureStore as a whole. The active instance ID (`GHOST_ACTIVE_ID`) is stored separately as a plain string, also under SecureStore.

---

## JWT generation — ephemeral by design

Ghost Admin API uses JWT authentication. The token is:

- Generated **client-side** on every request using the `jose` library (HS256, chosen for Hermes engine compatibility — `jsonwebtoken` requires Node.js crypto which is unavailable in the React Native Hermes runtime)
- Valid for **5 minutes maximum** (`exp: now + 300s`)
- Never persisted between requests — generated fresh each time in the Axios request interceptor
- Signed with the `kid` (key ID) extracted from the API key, per Ghost Admin API spec

This means a compromised network capture yields a token that expires in at most 5 minutes with no refresh path.

---

## Network constraints

- HTTPS only — no HTTP fallback, no cleartext traffic
- Axios timeout: 10 seconds — no indefinite hanging connections
- The Markdown preview WebView is fully sandboxed: `javaScriptEnabled={false}`, `originWhitelist={[]}` — it cannot execute scripts or open external URLs
- Images are uploaded directly to the Ghost instance the user controls — no third-party CDN or relay

---

## Optimistic lock (409 Conflict)

Ghost Admin API uses `updated_at` as an optimistic concurrency token on PUT requests. ghost-poster always sends the `updated_at` value from the last GET of the post. If the post was modified elsewhere (Ghost admin panel, another device) between the GET and the PUT, Ghost returns a 409 Conflict. The app surfaces this as a typed `ConflictError` and prompts the user to reload the post before saving — preventing silent data loss or overwrites.

---

## Dependency choices under security constraints

| Decision | Alternative considered | Reason |
|---|---|---|
| `jose` v5 | `jsonwebtoken` | `jsonwebtoken` depends on Node.js `crypto` module, unavailable in Hermes |
| `expo-secure-store` | AsyncStorage | AsyncStorage is unencrypted plaintext on disk |
| No `console.log` on credential values | — | Enforced by code convention — logs are safe to share |
| Sandboxed WebView for preview | In-app HTML renderer | Prevents script injection from post content |

---

## What this app cannot protect against

For full transparency:

- A rooted Android device can bypass Keystore protections
- A malicious app with sufficient permissions could potentially read SecureStore on rooted devices
- The security of the Ghost instance itself (TLS config, API key scope, server hardening) is outside the app's control
- ghost-poster trusts the Ghost instance it connects to — SSRF via a malicious Ghost URL is theoretically possible if a user is social-engineered into adding a hostile instance
