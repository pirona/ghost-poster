// SPDX-License-Identifier: GPL-3.0-or-later
import { useState } from 'react';
import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';

import { uploadImage } from '../api/ghostClient';

const MAX_WIDTH = 1920;

export function useImageUpload() {
  const [isUploading, setIsUploading] = useState(false);

  async function pickAndUpload(onInsert: (markdown: string) => void): Promise<void> {
    setIsUploading(true);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        console.warn('[ImageUpload] Permission galerie refusée');
        Alert.alert(
          'Permission refusée',
          "L'accès à la galerie est nécessaire pour insérer des images dans vos articles.",
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        quality: 1,
        allowsEditing: false,
        allowsMultipleSelection: false,
      });

      if (result.canceled || !result.assets[0]) {
        return;
      }

      const { uri, width } = result.assets[0];

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
      const message = err instanceof Error ? err.message : "Impossible d'uploader l'image.";
      console.error('[ImageUpload] Erreur:', err);
      Alert.alert("Échec de l'upload", message);
    } finally {
      setIsUploading(false);
    }
  }

  return { isUploading, pickAndUpload };
}
