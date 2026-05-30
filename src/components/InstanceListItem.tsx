/**
 * @file src/components/InstanceListItem.tsx
 * @description Carte représentant une instance Ghost dans le gestionnaire d'instances.
 *              Affiche le nom, l'URL et le badge "Actif".
 *              Swipe gauche pour faire apparaître le bouton de suppression.
 *
 * @exports InstanceListItem
 */

import React, { useRef } from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { Text, Surface, Chip } from 'react-native-paper';
import { Swipeable } from 'react-native-gesture-handler';

import { GhostInstance } from '../store/instanceStore';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface InstanceListItemProps {
  instance: GhostInstance;
  isActive: boolean;
  onPress: (instance: GhostInstance) => void;
  onDelete: (id: string) => void;
}

// ---------------------------------------------------------------------------
// Composant
// ---------------------------------------------------------------------------

/**
 * Carte instance avec swipe-to-delete.
 * Un tap sur une instance inactive la sélectionne comme instance active.
 * La suppression est gérée par le parent (confirmation Alert dans useInstances).
 */
export function InstanceListItem({
  instance,
  isActive,
  onPress,
  onDelete,
}: InstanceListItemProps): React.JSX.Element {
  const swipeableRef = useRef<Swipeable>(null);

  function handleDeletePress(): void {
    swipeableRef.current?.close();
    onDelete(instance.id);
  }

  function renderRightActions(): React.JSX.Element {
    return (
      <TouchableOpacity style={styles.deleteAction} onPress={handleDeletePress}>
        <Text style={styles.deleteText}>Supprimer</Text>
      </TouchableOpacity>
    );
  }

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      friction={2}
      // Désactive le swipe sur l'instance active pour éviter une suppression accidentelle
      enabled={!isActive}
    >
      <Surface style={[styles.surface, isActive && styles.surfaceActive]} elevation={1}>
        <TouchableOpacity
          style={styles.content}
          onPress={() => onPress(instance)}
          activeOpacity={0.7}
          disabled={isActive}
        >
          <View style={styles.header}>
            <Text style={styles.name} variant="titleMedium" numberOfLines={1}>
              {instance.name}
            </Text>
            {isActive && (
              <Chip compact style={styles.activeBadge} textStyle={styles.activeBadgeText}>
                Actif
              </Chip>
            )}
          </View>
          <Text style={styles.url} variant="bodySmall" numberOfLines={1}>
            {instance.url}
          </Text>
        </TouchableOpacity>
      </Surface>
    </Swipeable>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  surface: {
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 12,
  },
  surfaceActive: {
    borderWidth: 2,
    borderColor: '#1565C0',
  },
  content: {
    padding: 16,
    gap: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  name: {
    fontWeight: '600',
    flex: 1,
  },
  url: {
    color: '#757575',
  },
  activeBadge: {
    backgroundColor: '#1565C022',
  },
  activeBadgeText: {
    color: '#1565C0',
    fontSize: 11,
    fontWeight: '600',
  },
  deleteAction: {
    backgroundColor: '#D32F2F',
    justifyContent: 'center',
    alignItems: 'center',
    width: 90,
    marginVertical: 6,
    marginRight: 16,
    borderRadius: 12,
  },
  deleteText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
});
