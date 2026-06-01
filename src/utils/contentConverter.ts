/**
 * @file src/utils/contentConverter.ts
 * @description Conversion bidirectionnelle entre HTML (format Ghost) et Markdown (format éditeur).
 *              Fonctions pures, sans état, sans effets de bord.
 *
 * @exports htmlToMarkdown
 * @exports markdownToHtml
 */

import TurndownService from 'turndown';
import { marked } from 'marked';

// ---------------------------------------------------------------------------
// Configuration — initialisée à la demande (lazy singleton)
// ---------------------------------------------------------------------------

let _turndownService: TurndownService | null = null;

function getTurndownService(): TurndownService {
  if (!_turndownService) {
    _turndownService = new TurndownService({
      headingStyle: 'atx',
      codeBlockStyle: 'fenced',
      bulletListMarker: '-',
    });
  }
  return _turndownService;
}

// ---------------------------------------------------------------------------
// Fonctions exportées
// ---------------------------------------------------------------------------

/**
 * Convertit du HTML Ghost en Markdown pour l'éditeur de l'application.
 * Utilisé lors du chargement d'un post existant.
 *
 * @param html - HTML retourné par Ghost (peut être null pour les posts lexical-only)
 * @returns Markdown correspondant, ou chaîne vide si l'entrée est vide/nulle
 */
export function htmlToMarkdown(html: string | null | undefined): string {
  if (!html) return '';
  try {
    return getTurndownService().turndown(html);
  } catch (error) {
    console.error('Erreur de conversion HTML → Markdown:', error instanceof Error ? error.message : error);
    return html;
  }
}

/**
 * Convertit du Markdown en HTML pour l'envoi vers l'API Ghost Admin.
 * Utilisé lors de la sauvegarde ou de la publication d'un post.
 *
 * @param markdown - Contenu Markdown saisi dans l'éditeur
 * @returns HTML correspondant, ou chaîne vide si l'entrée est vide
 */
export function markdownToHtml(markdown: string): string {
  if (!markdown) return '';
  try {
    return marked.parse(markdown, { async: false, gfm: true, breaks: true });
  } catch (error) {
    console.error('Erreur de conversion Markdown → HTML:', error instanceof Error ? error.message : error);
    return markdown;
  }
}
