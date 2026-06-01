/**
 * @file app/index.tsx
 * @description Point d'entrée de l'application.
 *              Redirige vers Settings si aucune instance n'est configurée,
 *              vers la liste des posts sinon.
 *              Aucune logique métier — uniquement le routage conditionnel.
 */

import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Redirect } from 'expo-router';

import { useInstanceStore } from '../src/store/instanceStore';

export default function Index(): React.JSX.Element {
  const isLoading = useInstanceStore((s) => s.isLoading);
  const activeInstanceId = useInstanceStore((s) => s.activeInstanceId);

  if (isLoading) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator size="large" color="#1565C0" />
      </View>
    );
  }

  if (!activeInstanceId) {
    return <Redirect href="/settings" />;
  }

  return <Redirect href="/(tabs)/posts" />;
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
  },
});
