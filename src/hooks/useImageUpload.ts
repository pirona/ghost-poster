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
import * as ImageManipulator from 'expo-image-manipulator';

import { uploadImage } from '../api/ghostClient';

const MAX_WIDTH = 1920;

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

    const { uri, width } = result.assets[0];
    setIsUploading(true);

    try {
      const actions: ImageManipulator.Action[] =
        width && width > MAX_WIDTH ? [{ resize: { width: MAX_WIDTH } }] : [];

      const manipulated = await ImageManipulator.manipulateAsync(
        uri,
        actions,
        { compress: 0.85, format: ImageManipulator.SaveFormat.JPEG },
      );

      const imageUrl = await uploadImage(manipulated.uri);
      onInsert(`\n![](${imageUrl})`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Impossible d\'uploader l\'image.';
      console.error('Erreur upload image:', message);
      Alert.alert('Échec de l\'upload', message);
    } finally {
      setIsUploading(false);
    }
  }

  return { isUploading, pickAndUpload };
}
