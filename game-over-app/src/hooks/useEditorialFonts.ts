/**
 * useEditorialFonts — loads Fraunces (editorial serif) + Inter (functional sans)
 * via @expo-google-fonts. Returns a `fontsLoaded` flag for splash-screen gating.
 */

import {
  useFonts as useFraunces,
  Fraunces_500Medium,
  Fraunces_500Medium_Italic,
  Fraunces_600SemiBold,
  Fraunces_600SemiBold_Italic,
} from '@expo-google-fonts/fraunces';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';

export function useEditorialFonts(): { fontsLoaded: boolean } {
  const [fontsLoaded] = useFraunces({
    Fraunces_500Medium,
    Fraunces_500Medium_Italic,
    Fraunces_600SemiBold,
    Fraunces_600SemiBold_Italic,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  return { fontsLoaded };
}
