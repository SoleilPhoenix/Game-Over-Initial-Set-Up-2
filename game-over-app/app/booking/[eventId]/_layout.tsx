import { Stack } from 'expo-router';
import { DARK_THEME } from '@/constants/theme';

export default function BookingEventLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: DARK_THEME.background },
      }}
    />
  );
}
