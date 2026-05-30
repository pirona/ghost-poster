/**
 * @file app/(tabs)/_layout.tsx
 * @description Tab navigator (Compose, Posts).
 *              Configuration des onglets et du bouton Settings dans le header.
 *              Aucune logique métier — uniquement la navigation.
 */

import React from 'react';
import { Tabs, useRouter } from 'expo-router';
import { IconButton } from 'react-native-paper';

// ---------------------------------------------------------------------------
// Bouton Settings partagé entre les deux tabs
// ---------------------------------------------------------------------------

function SettingsButton(): React.JSX.Element {
  const router = useRouter();
  return (
    <IconButton
      icon="cog-outline"
      onPress={() => router.push('/settings')}
      accessibilityLabel="Gérer les instances Ghost"
    />
  );
}

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

export default function TabsLayout(): React.JSX.Element {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#1565C0',
        headerRight: () => <SettingsButton />,
      }}
    >
      <Tabs.Screen
        name="posts"
        options={{
          title: 'Posts',
          tabBarIcon: ({ color, size }) => (
            <IconButton icon="text-box-multiple-outline" iconColor={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="compose"
        options={{
          title: 'Compose',
          tabBarIcon: ({ color, size }) => (
            <IconButton icon="pencil-outline" iconColor={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
