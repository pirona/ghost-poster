/**
 * @file src/hooks/useImageUpload.ts
 * @description Hook gérant le flux complet d'ajout d'image :
 *              demande de permission → sélection galerie → upload Ghost → insertion Markdown.
 *
 * @exports useImageUpload
 */

import { useState } from 'react';
import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

import { uploadImage } from '../api/ghostClient';

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Fournit un état d'upload et une fonction pour déclencher la sélection + l'upload.
 */
export function useImageUpload() {
  const [isUploading, setIsUploading] = useState(false);

  /**
   * Demande la permission d'accès à la galerie, ouvre le sélecteur,
   * uploade l'image sélectionnée vers Ghost, puis appelle onInsert
   * avec la syntaxe Markdown `![](url)`.
   *
   * Le bouton déclencheur est désactivé pendant l'upload pour éviter les doublons.
   *
   * @param onInsert - Callback recevant la syntaxe Markdown à insérer dans l'éditeur
   */
  async function pickAndUpload(onInsert: (markdown: string) => void): Promise<void> {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        'Permission refusée',
        'L\'accès à la galerie est nécessaire pour insérer des images dans vos articles.',
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
      allowsEditing: false,
      allowsMultipleSelection: false,
    });

    if (result.canceled || !result.assets[0]) return;

    const { uri } = result.assets[0];
    setIsUploading(true);

    try {
      const imageUrl = await uploadImage(uri);
      // L'image est insérée en fin de contenu — contrainte TextInput React Native
      // (le curseur n'est pas accessible programmatiquement)
      onInsert(`\n![](${imageUrl})`);
    } catch (err) {
      console.error('Erreur upload image:', err instanceof Error ? err.message : err);
      Alert.alert(
        'Échec de l\'upload',
        err instanceof Error ? err.message : 'Impossible d\'uploader l\'image. Réessayez.',
      );
    } finally {
      setIsUploading(false);
    }
  }

  return { isUploading, pickAndUpload };
}
