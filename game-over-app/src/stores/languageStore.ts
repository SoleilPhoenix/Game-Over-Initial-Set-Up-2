/**
 * Language Store
 * Persists user's language preference using AsyncStorage
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type Language = 'en' | 'de';

interface LanguageState {
  language: Language;
  setLanguage: (lang: Language) => void;
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set) => ({
      language: 'de',
      setLanguage: (lang) => set({ language: lang }),
    }),
    {
      name: 'language-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // German is the product's default language. Raising the default alone
      // would not reach anyone who already has the app installed - their 'en'
      // is already on disk and wins over any new default. The bump to version 1
      // rewrites that stored value exactly once. Anything the user picks after
      // the migration has run is theirs and stays untouched.
      version: 1,
      migrate: (_persisted, fromVersion) =>
        fromVersion < 1 ? { language: 'de' as Language } : (_persisted as LanguageState),
    }
  )
);
