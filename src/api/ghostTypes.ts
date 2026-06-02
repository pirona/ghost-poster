/**
 * @file src/api/ghostTypes.ts
 * @description Définitions TypeScript pour l'API Ghost Admin.
 *              Contient les interfaces de données, les types de payload,
 *              et les classes d'erreurs typées utilisées dans toute l'application.
 *
 * @exports GhostSite
 * @exports GhostTag
 * @exports GhostPost
 * @exports GhostPostsResponse
 * @exports GhostImageUploadResponse
 * @exports CreatePostPayload
 * @exports UpdatePostPayload
 * @exports PostFilter
 * @exports GhostApiError
 * @exports AuthenticationError
 * @exports ConflictError
 * @exports ValidationError
 * @exports RateLimitError
 * @exports NotConfiguredError
 * @exports InvalidApiKeyError
 * @exports JwtSigningError
 */

// ---------------------------------------------------------------------------
// Données Ghost
// ---------------------------------------------------------------------------

export interface GhostSite {
  title: string;
  description: string;
  url: string;
  version: string;
}

export interface GhostTag {
  id?: string;
  name: string;
  slug?: string;
}

export interface GhostPost {
  id: string;
  uuid: string;
  title: string;
  /** Contenu HTML rendu — utilisé pour la conversion vers Markdown à l'édition. */
  html: string | null;
  /** Format natif Ghost Lexical — non utilisé côté app, on travaille toujours avec html. */
  lexical: string | null;
  status: 'draft' | 'published' | 'scheduled';
  tags: GhostTag[];
  /** URL de l'image à la une — null si aucune image définie. */
  feature_image: string | null;
  /** ISO 8601 — obligatoire dans les requêtes PUT (optimistic lock). */
  updated_at: string;
  published_at: string | null;
  url: string;
}

export interface GhostPostsResponse {
  posts: GhostPost[];
  meta: {
    pagination: {
      page: number;
      pages: number;
      limit: number;
      total: number;
      next: number | null;
      prev: number | null;
    };
  };
}

export interface GhostImageUploadResponse {
  images: Array<{
    url: string;
    ref: string | null;
  }>;
}

// ---------------------------------------------------------------------------
// Payloads de mutation
// ---------------------------------------------------------------------------

export interface CreatePostPayload {
  posts: Array<{
    title: string;
    html: string;
    status: 'draft' | 'published';
    tags?: Array<{ name: string }>;
    feature_image?: string | null;
  }>;
}

export interface UpdatePostPayload {
  posts: Array<{
    title: string;
    html: string;
    status: 'draft' | 'published';
    tags?: Array<{ name: string }>;
    feature_image?: string | null;
    /** OBLIGATOIRE — Ghost rejette le PUT en 409 si ce champ est absent ou périmé. */
    updated_at: string;
  }>;
}

export type PostFilter = 'all' | 'draft' | 'published';

// ---------------------------------------------------------------------------
// Classes d'erreurs typées
// ---------------------------------------------------------------------------

/**
 * Erreur générique Ghost API — inclut le code HTTP d'origine.
 */
export class GhostApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'GhostApiError';
  }
}

/** Clé API invalide (401) — redirige vers l'écran Settings. */
export class AuthenticationError extends GhostApiError {
  constructor(status: number, message: string) {
    super(status, message);
    this.name = 'AuthenticationError';
  }
}

/**
 * Conflit de version (409) — `updated_at` périmé.
 * Invite l'utilisateur à recharger le post avant de sauvegarder.
 */
export class ConflictError extends GhostApiError {
  constructor(status: number, message: string) {
    super(status, message);
    this.name = 'ConflictError';
  }
}

/** Erreur de validation Ghost (422) — contenu ou champ refusé. */
export class ValidationError extends GhostApiError {
  constructor(status: number, message: string) {
    super(status, message);
    this.name = 'ValidationError';
  }
}

/** Limite de débit atteinte (429) — attendre avant de réessayer. */
export class RateLimitError extends GhostApiError {
  constructor(status: number, message: string) {
    super(status, message);
    this.name = 'RateLimitError';
  }
}

/** Aucune instance Ghost configurée — redirige vers Settings. */
export class NotConfiguredError extends Error {
  constructor(message = 'Aucune instance Ghost configurée') {
    super(message);
    this.name = 'NotConfiguredError';
  }
}

/** Format de clé Admin API invalide — doit être `id:secret` en hexadécimal. */
export class InvalidApiKeyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidApiKeyError';
  }
}

/** Échec de la signature du JWT Ghost. */
export class JwtSigningError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'JwtSigningError';
  }
}
