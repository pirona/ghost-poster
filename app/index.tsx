/**
 * @file app/index.tsx
 * @description Point d'entrée de l'application.
 *              Redirige vers Settings si aucune instance n'est configurée,
 *              vers la liste des posts sinon.
 *              Aucune logique métier — uniquement le routage conditionnel.
 */

import { Redirect } from 'expo-router';

import { useInstanceStore } from '../src/store/instanceStore';

export default function Index(): React.JSX.Element {
  const activeInstanceId = useInstanceStore((s) => s.activeInstanceId);

  if (!activeInstanceId) {
    return <Redirect href="/settings" />;
  }

  return <Redirect href="/(tabs)/posts" />;
}
