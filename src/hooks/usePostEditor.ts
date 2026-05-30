/**
 * @file src/hooks/usePostEditor.ts
 * @description Hook regroupant la logique de l'éditeur de post :
 *              état dirty, validation, sauvegarde et confirmation de navigation.
 *
 * @exports usePostEditor
 */

import { useCallback } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';

import { usePostStore } from '../store/postStore';

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Fournit les actions de l'éditeur et la logique de garde contre les pertes de données.
 * Les composants écrans délèguent toute la logique métier à ce hook.
 */
export function usePostEditor() {
  const router = useRouter();
  const {
    currentPost,
    saveCurrentPost,
    resetCurrentPost,
    isSaving,
    error,
  } = usePostStore();

  const isDirty = currentPost?.isDirty ?? false;
  const isEditMode = !!currentPost?.ghostId;
  const originalStatus = currentPost?.originalStatus ?? null;

  // -------------------------------------------------------------------------
  // Garde de navigation
  // -------------------------------------------------------------------------

  /**
   * Affiche une Alert de confirmation si des modifications sont en attente,
   * puis exécute onConfirm si l'utilisateur accepte de quitter.
   * Appelle onConfirm directement si l'éditeur est propre.
   *
   * @param onConfirm - Action à exécuter après confirmation (navigation, reset...)
   */
  const confirmLeaveIfDirty = useCallback(
    (onConfirm: () => void): void => {
      if (!isDirty) {
        onConfirm();
        return;
      }
      Alert.alert(
        'Modifications non sauvegardées',
        'Des modifications n\'ont pas été sauvegardées. Quitter quand même ?',
        [
          { text: 'Rester', style: 'cancel' },
          {
            text: 'Quitter sans sauvegarder',
            style: 'destructive',
            onPress: () => {
              resetCurrentPost();
              onConfirm();
            },
          },
        ],
      );
    },
    [isDirty, resetCurrentPost],
  );

  // -------------------------------------------------------------------------
  // Sauvegarde
  // -------------------------------------------------------------------------

  /**
   * Valide et sauvegarde le post avec le statut demandé.
   * En cas de succès, réinitialise l'éditeur et navigue vers la liste des posts.
   *
   * @param status  - 'draft' ou 'published'
   * @param onError - Callback appelé avec le message si la validation ou l'API échoue
   * @returns true si la sauvegarde a réussi
   */
  const handleSave = useCallback(
    async (
      status: 'draft' | 'published',
      onError: (message: string) => void,
    ): Promise<boolean> => {
      if (!currentPost?.title.trim()) {
        onError('Le titre est obligatoire.');
        return false;
      }

      try {
        await saveCurrentPost(status);
        resetCurrentPost();
        router.replace('/(tabs)/posts');
        return true;
      } catch {
        // L'erreur est déjà stockée dans postStore.error et loggée dans le store
        return false;
      }
    },
    [currentPost, saveCurrentPost, resetCurrentPost, router],
  );

  return {
    isDirty,
    isEditMode,
    originalStatus,
    isSaving,
    error,
    confirmLeaveIfDirty,
    handleSave,
  };
}
