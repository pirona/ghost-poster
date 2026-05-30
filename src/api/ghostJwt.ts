/**
 * @file src/api/ghostJwt.ts
 * @description Génération du JWT pour l'authentification Ghost Admin API.
 *              Utilise jose v5 (compatible Hermes) avec l'algorithme HS256.
 *              La clé Admin API ne transite jamais dans les logs.
 *
 * @exports generateGhostJwt
 *
 * @security La clé brute n'est jamais loggée.
 *           Le JWT généré a une durée de vie de 5 minutes maximum.
 */

import { SignJWT } from 'jose';
import { InvalidApiKeyError, JwtSigningError } from './ghostTypes';

/**
 * Décode une chaîne hexadécimale en Uint8Array.
 * Implémentation manuelle pour éviter toute dépendance sur Buffer/Node.js crypto.
 */
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

/**
 * Génère un JWT signé pour l'API Ghost Admin.
 *
 * @param apiKey - Clé Admin API au format `id:secret` (valeurs hexadécimales)
 * @returns JWT signé, prêt à être utilisé dans le header `Authorization: Ghost <token>`
 * @throws InvalidApiKeyError si le format de la clé est incorrect
 * @throws JwtSigningError si la signature échoue
 */
export async function generateGhostJwt(apiKey: string): Promise<string> {
  const parts = apiKey.split(':');
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw new InvalidApiKeyError(
      'Format de clé Admin API invalide. Attendu : id:secret (valeurs hexadécimales)',
    );
  }

  const [id, secret] = parts;

  if (!/^[a-f0-9]+$/i.test(id) || !/^[a-f0-9]+$/i.test(secret)) {
    throw new InvalidApiKeyError('La clé Admin API doit être composée uniquement de caractères hexadécimaux');
  }

  let secretBytes: Uint8Array;
  try {
    secretBytes = hexToUint8Array(secret.toLowerCase());
  } catch (error) {
    if (error instanceof InvalidApiKeyError) throw error;
    throw new InvalidApiKeyError('Impossible de décoder le secret hexadécimal');
  }

  const now = Math.floor(Date.now() / 1000);

  try {
    const token = await new SignJWT({ aud: '/admin/' })
      .setProtectedHeader({ alg: 'HS256', kid: id })
      .setIssuedAt(now)
      .setExpirationTime(now + 300)
      .sign(secretBytes);

    return token;
  } catch (error) {
    throw new JwtSigningError(
      `Échec de la signature JWT: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
