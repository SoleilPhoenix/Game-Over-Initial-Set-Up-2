/**
 * Auth Layout
 * Stack navigation for authentication screens
 */

import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#0D1B2A' },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="welcome" />
      <Stack.Screen name="continue" />
      <Stack.Screen name="login" />
      <Stack.Screen name="signup" />
      <Stack.Screen name="forgot-password" />
    </Stack>
  );
}
