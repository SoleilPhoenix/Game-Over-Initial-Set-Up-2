/**
 * Theme Store — Persists user's theme-mode preference (dark / light / system).
 * Structured analogously to languageStore.ts. Persisted via AsyncStorage.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ThemeMode } from '@/constants/designSystem';

interface ThemeState {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      mode: 'dark', // Default matches reference mockups
      setMode: (mode) => set({ mode }),
    }),
    {
      name: 'theme-storage',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
