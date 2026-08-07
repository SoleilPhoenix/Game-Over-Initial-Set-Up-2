import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useUser } from '@/stores/authStore';
import { useLanguageStore } from '@/stores/languageStore';

/**
 * Mirrors the in-app language choice into `profiles.language`.
 *
 * Why this exists: `languageStore` persists to AsyncStorage, which is device-local.
 * Nothing ever wrote the `profiles.language` column, and its DB default is 'en' - so
 * every profile stayed English no matter what the user picked in the app. Anything sent
 * from the server reads that column, which meant the briefing and the payment reminders
 * always went out in English even for a user whose whole app was German.
 *
 * Found on 2026-07-29: all seven profiles read 'en' while the owner's app was set to
 * German, and the German briefing copy could therefore never fire.
 *
 * Follows the useSyncProfileEmail pattern: best-effort, never surfaces a failure to the
 * user, and skips the write when the column already matches.
 */
export function useSyncProfileLanguage() {
  const user = useUser();
  const language = useLanguageStore((s) => s.language);
  const lastSynced = useRef<string | null>(null);

  useEffect(() => {
    const userId = user?.id;
    if (!userId || !language) return;

    const syncKey = `${userId}:${language}`;
    if (lastSynced.current === syncKey) return;

    void (async () => {
      try {
        const { data: profile, error: loadError } = await supabase
          .from('profiles')
          .select('language')
          .eq('id', userId)
          .single();

        if (loadError) throw loadError;

        if (profile?.language === language) {
          lastSynced.current = syncKey;
          return;
        }

        const { error: updateError } = await supabase
          .from('profiles')
          .update({ language })
          .eq('id', userId);

        if (updateError) throw updateError;
        lastSynced.current = syncKey;
      } catch (error) {
        // Best-effort: a failed sync must not block the app. The next mount or
        // language change retries, because lastSynced was not advanced.
        console.warn('[profile] language sync failed:', error);
      }
    })();
  }, [language, user]);
}
