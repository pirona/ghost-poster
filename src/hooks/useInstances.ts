/**
 * @file src/hooks/useInstances.ts
 * @description Hook de gestion des instances Ghost.
 *              Encapsule la validation du formulaire, le test de connexion
 *              et la confirmation de suppression — logique UI absente du store.
 *
 * @exports useInstances
 * @exports InstanceFormData
 * @exports InstanceFormErrors
 */

import { useState } from 'react';
import { Alert } from 'react-native';
import axios from 'axios';

import { useInstanceStore, GhostInstance } from '../store/instanceStore';
import { testGhostConnection } from '../api/ghostClient';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface InstanceFormData {
  name: string;
  url: string;
  apiKey: string;
}

export type InstanceFormErrors = Partial<Record<keyof InstanceFormData, string>>;

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Fournit les opérations CRUD sur les instances avec validation et feedback UI.
 * Le store ne contient que la logique de persistance ; ce hook ajoute
 * la validation de formulaire et le test réseau.
 */
export function useInstances() {
  const {
    instances,
    activeInstanceId,
    isLoading,
    error,
    addInstance,
    removeInstance,
    setActiveInstance,
    updateInstance,
  } = useInstanceStore();

  const [isTesting, setIsTesting] = useState(false);

  const activeInstance = instances.find((i) => i.id === activeInstanceId) ?? null;

  // -------------------------------------------------------------------------
  // Validation du formulaire
  // -------------------------------------------------------------------------

  function validateForm(data: InstanceFormData): InstanceFormErrors {
    const errors: InstanceFormErrors = {};

    if (!data.name.trim()) {
      errors.name = 'Le nom est requis.';
    }

    if (!data.url.trim()) {
      errors.url = 'L\'URL est requise.';
    } else if (!/^https:\/\/.+/.test(data.url.trim())) {
      errors.url = 'L\'URL doit commencer par https://';
    } else if (data.url.trim().endsWith('/')) {
      errors.url = 'L\'URL ne doit pas se terminer par un /.';
    }

    if (!data.apiKey.trim()) {
      errors.apiKey = 'La clé Admin API est requise.';
    } else if (!/^[a-f0-9]+:[a-f0-9]+$/i.test(data.apiKey.trim())) {
      errors.apiKey = 'Format invalide. Attendu : id:secret (caractères hexadécimaux uniquement).';
    }

    return errors;
  }

  // -------------------------------------------------------------------------
  // Ajout avec validation et test de connexion
  // -------------------------------------------------------------------------

  /**
   * Valide le formulaire, teste la connexion Ghost, puis ajoute l'instance.
   *
   * @param data     - Données du formulaire
   * @param onError  - Appelé pour chaque champ en erreur avec le message correspondant
   * @returns true si l'instance a été ajoutée, false sinon
   */
  async function addInstanceWithValidation(
    data: InstanceFormData,
    onError: (field: keyof InstanceFormErrors, message: string) => void,
  ): Promise<boolean> {
    const errors = validateForm(data);
    if (Object.keys(errors).length > 0) {
      (Object.entries(errors) as Array<[keyof InstanceFormErrors, string]>).forEach(
        ([field, message]) => onError(field, message),
      );
      return false;
    }

    setIsTesting(true);
    try {
      await testGhostConnection(data.url.trim(), data.apiKey.trim());
      await addInstance({
        name: data.name.trim(),
        url: data.url.trim(),
        apiKey: data.apiKey.trim(),
      });
      return true;
    } catch (err) {
      const status = axios.isAxiosError(err) ? err.response?.status : null;
      if (status === 401 || status === 403) {
        onError('apiKey', 'Clé API invalide ou accès refusé (401/403).');
      } else {
        const message =
          err instanceof Error
            ? `Connexion impossible : ${err.message}`
            : 'Connexion impossible. Vérifiez l\'URL.';
        onError('url', message);
      }
      return false;
    } finally {
      setIsTesting(false);
    }
  }

  // -------------------------------------------------------------------------
  // Suppression avec confirmation
  // -------------------------------------------------------------------------

  /**
   * Demande confirmation puis supprime l'instance si l'utilisateur accepte.
   * La confirmation est une Alert native (action irréversible).
   *
   * @param instance - Instance à supprimer
   */
  function removeInstanceWithConfirm(instance: GhostInstance): void {
    Alert.alert(
      'Supprimer l\'instance',
      `Supprimer "${instance.name}" ? Cette action est irréversible et la configuration sera perdue.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => {
            removeInstance(instance.id).catch((err) => {
              console.error('Erreur removeInstance:', err instanceof Error ? err.message : err);
            });
          },
        },
      ],
    );
  }

  return {
    instances,
    activeInstanceId,
    activeInstance,
    isLoading,
    isTesting,
    error,
    addInstanceWithValidation,
    removeInstanceWithConfirm,
    setActiveInstance,
    updateInstance,
  };
}
