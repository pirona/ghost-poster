/**
 * @file app/_layout.tsx
 * @description Layout racine de l'application.
 *              Configure les providers (Paper, SafeArea, GestureHandler)
 *              et charge les instances Ghost au démarrage.
 *              Aucune logique métier — uniquement la navigation et les providers.
 */

import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { PaperProvider, MD3LightTheme } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';

import { useInstanceStore } from '../src/store/instanceStore';

// ---------------------------------------------------------------------------
// Thème React Native Paper
// ---------------------------------------------------------------------------

const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#1565C0',
    secondary: '#546E7A',
  },
};

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

export default function RootLayout(): React.JSX.Element | null {
  const loadInstances = useInstanceStore((s) => s.loadInstances);
  const [appReady, setAppReady] = useState(false);

  useEffect(() => {
    loadInstances().finally(() => setAppReady(true));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!appReady) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator size="large" color="#1565C0" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <PaperProvider theme={theme}>
          <StatusBar style="auto" />
          <Stack>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen
              name="settings"
              options={{
                title: 'Instances Ghost',
                headerBackTitle: 'Retour',
              }}
            />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          </Stack>
        </PaperProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  splash: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
  },
});
