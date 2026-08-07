/**
 * useEditorialFonts — loads Inter (functional sans) via @expo-google-fonts.
 * Returns a `fontsLoaded` flag for splash-screen gating.
 *
 * NOTE: Fraunces was removed in the editorial redesign. The design system
 * uses Inter only — see designSystem.ts FONTS tokens.
 *
 * Imports go through the per-weight subpaths on purpose. The package index
 * (`@expo-google-fonts/inter`) re-exports all 18 weights including every italic,
 * and Metro cannot tree-shake those away — importing from it pulled ~6 MB of
 * .ttf files into the app bundle for the four weights we actually use.
 */

import { useFonts } from 'expo-font';
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold';

export function useEditorialFonts(): { fontsLoaded: boolean } {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  return { fontsLoaded };
}
