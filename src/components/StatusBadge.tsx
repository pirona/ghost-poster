/**
 * @file src/components/StatusBadge.tsx
 * @description Badge coloré indiquant le statut d'un post Ghost.
 *              Trois états : draft (gris), published (vert), scheduled (orange).
 *
 * @exports StatusBadge
 */

import React from 'react';
import { StyleSheet } from 'react-native';
import { Chip } from 'react-native-paper';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface StatusBadgeProps {
  status: 'draft' | 'published' | 'scheduled';
}

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

const STATUS_CONFIG = {
  draft: { label: 'Brouillon', color: '#757575' },
  published: { label: 'Publié', color: '#2E7D32' },
  scheduled: { label: 'Programmé', color: '#E65100' },
} as const;

// ---------------------------------------------------------------------------
// Composant
// ---------------------------------------------------------------------------

/**
 * Badge compact indiquant le statut d'un post.
 * Non interactif — sert uniquement d'indicateur visuel.
 */
export function StatusBadge({ status }: StatusBadgeProps): React.JSX.Element {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.draft;

  return (
    <Chip
      compact
      style={[styles.chip, { backgroundColor: config.color + '22' }]}
      textStyle={[styles.text, { color: config.color }]}
    >
      {config.label}
    </Chip>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  chip: {
    alignSelf: 'flex-start',
    height: 26,
  },
  text: {
    fontSize: 11,
    fontWeight: '600',
    marginVertical: 0,
  },
});
