/**
 * useTheme — central accessor for the active editorial theme.
 *
 * Resolves: user-chosen mode (from themeStore) vs. system appearance.
 * Returns the full token object so components can style Mode-agnostically.
 */

import { useColorScheme } from 'react-native';
import { useThemeStore } from '@/stores/themeStore';
import {
  EDITORIAL_DARK,
  EDITORIAL_LIGHT,
  type EditorialTheme,
  type ThemeMode,
} from '@/constants/designSystem';

export interface UseThemeResult {
  /** Active resolved theme tokens (what components should consume). */
  theme: EditorialTheme;
  /** User-selected mode, may be 'system'. */
  mode: ThemeMode;
  /** Effective mode after resolving 'system'. */
  resolvedMode: 'dark' | 'light';
  /** Update the user's mode preference. */
  setMode: (mode: ThemeMode) => void;
  /** Convenience flag for conditional logic. */
  isDark: boolean;
}

export function useTheme(): UseThemeResult {
  const mode = useThemeStore((s) => s.mode);
  const setMode = useThemeStore((s) => s.setMode);
  const system = useColorScheme();

  const resolvedMode: 'dark' | 'light' =
    mode === 'system' ? (system === 'light' ? 'light' : 'dark') : mode;

  const theme = resolvedMode === 'light' ? EDITORIAL_LIGHT : EDITORIAL_DARK;

  return {
    theme,
    mode,
    resolvedMode,
    setMode,
    isDark: resolvedMode === 'dark',
  };
}
