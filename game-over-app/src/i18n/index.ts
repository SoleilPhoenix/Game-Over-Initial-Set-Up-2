/**
 * i18n - Lightweight internationalization
 * Provides useTranslation() hook backed by Zustand language store
 */

import { useLanguageStore, type Language } from '@/stores/languageStore';
import en, { type TranslationKeys } from './en';
import de from './de';

const translations: Record<Language, TranslationKeys> = { en, de };

/**
 * Returns the full translation object for the current language.
 * Usage: const { t } = useTranslation();
 *        <Text>{t.events.title}</Text>
 */
export function useTranslation() {
  const language = useLanguageStore((s) => s.language);
  return { t: translations[language], language };
}

/**
 * Non-hook version for use outside React components (e.g., Alert.alert).
 * Reads current language synchronously from the store.
 */
export function getTranslation() {
  const language = useLanguageStore.getState().language;
  return translations[language];
}

export { type Language } from '@/stores/languageStore';
export { type TranslationKeys } from './en';
