/**
 * @file src/components/ImagePickerButton.tsx
 * @description Bouton de sélection d'image depuis la galerie Android.
 *              Déclenche la sélection, l'upload Ghost, puis appelle onInsert
 *              avec la syntaxe Markdown `![](url)`.
 *
 * @exports ImagePickerButton
 */

import React from 'react';
import { IconButton } from 'react-native-paper';

import { useImageUpload } from '../hooks/useImageUpload';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ImagePickerButtonProps {
  /** Appelé avec la syntaxe Markdown `![](url)` après un upload réussi. */
  onInsert: (markdown: string) => void;
  disabled?: boolean;
}

// ---------------------------------------------------------------------------
// Composant
// ---------------------------------------------------------------------------

/**
 * Bouton icône pour la toolbar de l'éditeur.
 * Désactivé pendant l'upload pour éviter les doublons.
 *
 * Limite documentée : l'image est insérée en fin de contenu, pas à la position
 * du curseur (contrainte TextInput React Native).
 */
export function ImagePickerButton({ onInsert, disabled = false }: ImagePickerButtonProps): React.JSX.Element {
  const { isUploading, pickAndUpload } = useImageUpload();

  return (
    <IconButton
      icon="image-plus"
      disabled={disabled || isUploading}
      onPress={() => pickAndUpload(onInsert)}
      accessibilityLabel="Insérer une image"
    />
  );
}
