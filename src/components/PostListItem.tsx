/**
 * @file src/components/PostListItem.tsx
 * @description Carte représentant un post dans la liste.
 *              Affiche le titre, le badge de statut et la date de mise à jour.
 *              Swipe gauche pour faire apparaître le bouton de suppression.
 *
 * @exports PostListItem
 */

import React, { useRef } from 'react';
import { StyleSheet, View, TouchableOpacity, Alert } from 'react-native';
import { Text, Surface } from 'react-native-paper';
import { Swipeable } from 'react-native-gesture-handler';

import { GhostPost } from '../api/ghostTypes';
import { StatusBadge } from './StatusBadge';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PostListItemProps {
  post: GhostPost;
  onPress: (post: GhostPost) => void;
  onDelete: (id: string) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

// ---------------------------------------------------------------------------
// Composant
// ---------------------------------------------------------------------------

/**
 * Carte post avec swipe-to-delete.
 * La suppression déclenche une Alert de confirmation avant d'appeler onDelete.
 */
export function PostListItem({ post, onPress, onDelete }: PostListItemProps): React.JSX.Element {
  const swipeableRef = useRef<Swipeable>(null);

  function handleDeletePress(): void {
    swipeableRef.current?.close();
    Alert.alert(
      'Supprimer le post',
      `Supprimer "${post.title}" définitivement ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => onDelete(post.id),
        },
      ],
    );
  }

  function renderRightActions(): React.JSX.Element {
    return (
      <TouchableOpacity style={styles.deleteAction} onPress={handleDeletePress}>
        <Text style={styles.deleteText}>Supprimer</Text>
      </TouchableOpacity>
    );
  }

  return (
    <Swipeable ref={swipeableRef} renderRightActions={renderRightActions} friction={2}>
      <Surface style={styles.surface} elevation={1}>
        <TouchableOpacity style={styles.content} onPress={() => onPress(post)} activeOpacity={0.7}>
          <View style={styles.header}>
            <StatusBadge status={post.status} />
            <Text style={styles.date} variant="labelSmall">
              {formatDate(post.updated_at)}
            </Text>
          </View>
          <Text style={styles.title} variant="titleMedium" numberOfLines={2}>
            {post.title || '(Sans titre)'}
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
  content: {
    padding: 16,
    gap: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontWeight: '600',
  },
  date: {
    color: '#757575',
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
