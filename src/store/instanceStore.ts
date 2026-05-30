/**
 * @file src/store/instanceStore.ts
 * @description Store Zustand pour la gestion des instances Ghost.
 *              Gère la liste des instances configurées, l'instance active,
 *              et la persistance dans SecureStore.
 *
 * @exports useInstanceStore
 * @exports GhostInstance
 *
 * @security Les clés API sont stockées dans SecureStore via secureStorage.ts.
 *           Aucune clé API n'est loggée, même partiellement.
 */

import { create } from 'zustand';
import * as Crypto from 'expo-crypto';

import {
  getSecureItem,
  setSecureItem,
  deleteSecureItem,
} from '../utils/secureStorage';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GhostInstance {
  /** UUID v4 généré à la création de l'instance. */
  id: string;
  /** Nom lisible choisi par l'utilisateur (ex: "Blog perso", "Billisdead"). */
  name: string;
  /** URL de base de l'instance Ghost (ex: https://ghost.example.fr). */
  url: string;
  /** Clé Admin API au format id:secret (valeurs hexadécimales). */
  apiKey: string;
}

interface InstanceState {
  instances: GhostInstance[];
  activeInstanceId: string | null;
  isLoading: boolean;
  error: string | null;
}

interface InstanceActions {
  /** Charge les instances depuis SecureStore. À appeler une seule fois au démarrage. */
  loadInstances(): Promise<void>;
  /**
   * Ajoute une nouvelle instance Ghost.
   * L'appelant est responsable de valider et tester la connexion avant d'appeler cette fonction.
   */
  addInstance(data: Omit<GhostInstance, 'id'>): Promise<GhostInstance>;
  /** Supprime une instance. Si c'était l'instance active, activeInstanceId passe à null. */
  removeInstance(id: string): Promise<void>;
  /** Définit l'instance active et réinitialise le store de posts. */
  setActiveInstance(id: string): Promise<void>;
  /** Met à jour les propriétés d'une instance existante. */
  updateInstance(id: string, data: Partial<Omit<GhostInstance, 'id'>>): Promise<void>;
}

// ---------------------------------------------------------------------------
// Helpers de persistance
// ---------------------------------------------------------------------------

async function persistState(
  instances: GhostInstance[],
  activeInstanceId: string | null,
): Promise<void> {
  await setSecureItem('GHOST_INSTANCES', JSON.stringify(instances));
  if (activeInstanceId !== null) {
    await setSecureItem('GHOST_ACTIVE_ID', activeInstanceId);
  } else {
    await deleteSecureItem('GHOST_ACTIVE_ID');
  }
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useInstanceStore = create<InstanceState & InstanceActions>((set, get) => ({
  instances: [],
  activeInstanceId: null,
  isLoading: false,
  error: null,

  async loadInstances(): Promise<void> {
    set({ isLoading: true, error: null });
    try {
      const instancesJson = await getSecureItem('GHOST_INSTANCES');
      const activeId = await getSecureItem('GHOST_ACTIVE_ID');

      const instances: GhostInstance[] = instancesJson ? JSON.parse(instancesJson) : [];
      // Vérifie que l'instance active existe toujours dans la liste
      const validActiveId =
        activeId && instances.some((i) => i.id === activeId) ? activeId : null;

      set({ instances, activeInstanceId: validActiveId, isLoading: false });
    } catch (error) {
      console.error('Erreur lors du chargement des instances:', error instanceof Error ? error.message : error);
      set({ isLoading: false, error: 'Impossible de charger les instances configurées.' });
    }
  },

  async addInstance(data: Omit<GhostInstance, 'id'>): Promise<GhostInstance> {
    const newInstance: GhostInstance = {
      ...data,
      id: Crypto.randomUUID(),
    };
    const updatedInstances = [...get().instances, newInstance];
    const currentActiveId = get().activeInstanceId;
    // Sélectionne automatiquement la première instance ajoutée
    const newActiveId = currentActiveId ?? newInstance.id;

    set({ instances: updatedInstances, activeInstanceId: newActiveId });
    await persistState(updatedInstances, newActiveId);

    return newInstance;
  },

  async removeInstance(id: string): Promise<void> {
    const updatedInstances = get().instances.filter((i) => i.id !== id);
    const currentActiveId = get().activeInstanceId;
    const newActiveId = currentActiveId === id ? null : currentActiveId;

    set({ instances: updatedInstances, activeInstanceId: newActiveId });
    await persistState(updatedInstances, newActiveId);

    if (newActiveId === null) {
      // Réinitialise les posts car il n'y a plus d'instance active
      const { usePostStore } = await import('./postStore');
      usePostStore.getState().resetPosts();
    }
  },

  async setActiveInstance(id: string): Promise<void> {
    const exists = get().instances.some((i) => i.id === id);
    if (!exists) throw new Error(`Instance introuvable : ${id}`);

    set({ activeInstanceId: id });
    await setSecureItem('GHOST_ACTIVE_ID', id);

    // Réinitialise la liste des posts pour la nouvelle instance
    const { usePostStore } = await import('./postStore');
    usePostStore.getState().resetPosts();
  },

  async updateInstance(id: string, data: Partial<Omit<GhostInstance, 'id'>>): Promise<void> {
    const updatedInstances = get().instances.map((i) =>
      i.id === id ? { ...i, ...data } : i,
    );
    set({ instances: updatedInstances });
    await persistState(updatedInstances, get().activeInstanceId);
  },
}));
