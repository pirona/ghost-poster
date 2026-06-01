/**
 * @file src/api/ghostJwt.ts
 * @description Génération du JWT pour l'authentification Ghost Admin API.
 *              Utilise @noble/hashes (pure JS, sans dépendance WebCrypto/globalThis.crypto)
 *              pour éviter le crash Hermes "Property 'crypto' doesn't exist".
 *
 * @exports generateGhostJwt
 *
 * @security La clé brute n'est jamais loggée.
 *           Le JWT généré a une durée de vie de 5 minutes maximum.
 */

import { hmac } from '@noble/hashes/hmac';
import { sha256 } from '@noble/hashes/sha2';
import { InvalidApiKeyError, JwtSigningError } from './ghostTypes';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function hexToUint8Array(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) {
    throw new InvalidApiKeyError('Longueur du secret invalide (nombre impair de caractères)');
  }
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    const byte = parseInt(hex.substring(i, i + 2), 16);
    if (isNaN(byte)) {
      throw new InvalidApiKeyError('Caractère non hexadécimal détecté dans le secret');
    }
    bytes[i / 2] = byte;
  }
  return bytes;
}

/** Encode un objet JSON ou des bytes en base64url sans dépendance btoa. */
function base64url(input: object | Uint8Array): string {
  const bytes =
    input instanceof Uint8Array
      ? input
      : new TextEncoder().encode(JSON.stringify(input));

  const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let b64 = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i];
    const b1 = bytes[i + 1] ?? 0;
    const b2 = bytes[i + 2] ?? 0;
    b64 += CHARS[b0 >> 2];
    b64 += CHARS[((b0 & 3) << 4) | (b1 >> 4)];
    b64 += i + 1 < bytes.length ? CHARS[((b1 & 15) << 2) | (b2 >> 6)] : '=';
    b64 += i + 2 < bytes.length ? CHARS[b2 & 63] : '=';
  }
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

// ---------------------------------------------------------------------------
// JWT
// ---------------------------------------------------------------------------

/**
 * Génère un JWT HS256 signé pour l'API Ghost Admin.
 * Utilise HMAC-SHA256 via @noble/hashes — aucune dépendance sur crypto.subtle.
 *
 * @param apiKey - Clé Admin API au format `id:secret` (valeurs hexadécimales)
 * @returns JWT signé prêt pour le header `Authorization: Ghost <token>`
 * @throws InvalidApiKeyError si le format de la clé est incorrect
 * @throws JwtSigningError si la signature échoue
 */
export function generateGhostJwt(apiKey: string): string {
  const parts = apiKey.split(':');
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw new InvalidApiKeyError(
      'Format de clé Admin API invalide. Attendu : id:secret (valeurs hexadécimales)',
    );
  }

  const [id, secret] = parts;

  if (!/^[a-f0-9]+$/i.test(id) || !/^[a-f0-9]+$/i.test(secret)) {
    throw new InvalidApiKeyError(
      'La clé Admin API doit être composée uniquement de caractères hexadécimaux',
    );
  }

  let secretBytes: Uint8Array;
  try {
    secretBytes = hexToUint8Array(secret.toLowerCase());
  } catch (error) {
    if (error instanceof InvalidApiKeyError) throw error;
    throw new InvalidApiKeyError('Impossible de décoder le secret hexadécimal');
  }

  try {
    const now = Math.floor(Date.now() / 1000);
    const header = base64url({ alg: 'HS256', kid: id });
    const payload = base64url({ aud: '/admin/', iat: now, exp: now + 300 });
    const signingInput = new TextEncoder().encode(`${header}.${payload}`);
    const signature = hmac(sha256, secretBytes, signingInput);

    return `${header}.${payload}.${base64url(signature)}`;
  } catch (error) {
    throw new JwtSigningError(
      `Échec de la signature JWT: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
