/**
 * Index Route
 * Redirects to appropriate screen based on auth state
 */

import { Redirect } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';

export default function Index() {
  const session = useAuthStore((state) => state.session);

  if (session) {
    return <Redirect href="/(tabs)/events" />;
  }

  return <Redirect href="/(auth)/welcome" />;
}
