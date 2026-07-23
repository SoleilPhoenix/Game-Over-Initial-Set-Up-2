/**
 * Index Route
 * Redirects to appropriate screen based on auth state
 */

import { Redirect } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { shouldPlayIntro } from '@/lib/introSession';

export default function Index() {
  const session = useAuthStore((state) => state.session);

  // Signed-in users go straight to their events. The intro is a first-impression
  // moment for people meeting the brand; making someone who opens the app for
  // the fifth time today sit through it would turn it into a toll.
  if (session) {
    return <Redirect href="/(tabs)/events" />;
  }

  if (shouldPlayIntro()) {
    return <Redirect href="/(auth)/intro" />;
  }

  return <Redirect href="/(auth)/welcome" />;
}
