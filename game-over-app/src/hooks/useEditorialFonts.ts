/**
 * useEditorialFonts — loads Inter (functional sans) via @expo-google-fonts.
 * Returns a `fontsLoaded` flag for splash-screen gating.
 *
 * NOTE: Fraunces was removed in the editorial redesign. The design system
 * uses Inter only — see designSystem.ts FONTS tokens.
 */

import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';

export function useEditorialFonts(): { fontsLoaded: boolean } {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  return { fontsLoaded };
}
