import { useState } from 'react';
import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';

import { uploadImage } from '../api/ghostClient';

const MAX_WIDTH = 1280;
const JPEG_QUALITY = 0.85;

export function useFeatureImageUpload() {
  const [isUploading, setIsUploading] = useState(false);

  async function pickAndUpload(onUploaded: (url: string) => void): Promise<void> {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        'Permission refusée',
        "L'accès à la galerie est nécessaire pour choisir une image à la une.",
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      allowsMultipleSelection: false,
      quality: 1,
    });

    if (result.canceled || !result.assets[0]) return;

    const { uri, width } = result.assets[0];
    setIsUploading(true);

    try {
      const actions: ImageManipulator.Action[] =
        width > MAX_WIDTH ? [{ resize: { width: MAX_WIDTH } }] : [];

      const manipulated = await ImageManipulator.manipulateAsync(
        uri,
        actions,
        { compress: JPEG_QUALITY, format: ImageManipulator.SaveFormat.JPEG },
      );

      const imageUrl = await uploadImage(manipulated.uri);
      onUploaded(imageUrl);
    } catch (err) {
      Alert.alert(
        "Échec de l'upload",
        err instanceof Error ? err.message : "Impossible d'uploader l'image. Réessayez.",
      );
    } finally {
      setIsUploading(false);
    }
  }

  return { isUploading, pickAndUpload };
}
