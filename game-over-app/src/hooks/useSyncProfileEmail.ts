import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase/client';
import type { Json } from '@/lib/supabase/types';
import { useUser } from '@/stores/authStore';
import { useTranslation } from '@/i18n';
import {
  formatGuestChanges,
  type GuestDataChange,
  type GuestDataChangedMeta,
} from '@/utils/guestDataChange';

/**
 * Completes the application-side part of Supabase's confirmed email-change
 * flow. Auth owns the confirmation; once the new address appears on the
 * authenticated user, this keeps profiles and organizer notifications aligned.
 */
export function useSyncProfileEmail() {
  const user = useUser();
  const { t } = useTranslation();
  const activeSync = useRef<string | null>(null);
  const completedSyncs = useRef(new Set<string>());

  useEffect(() => {
    const userId = user?.id;
    const currentEmail = user?.email;
    const metadataFullName = user?.user_metadata?.full_name as string | undefined;
    if (!userId || !currentEmail) return;
    const syncKey = `${userId}:${currentEmail}`;
    if (activeSync.current === syncKey || completedSyncs.current.has(syncKey)) return;
    activeSync.current = syncKey;

    void (async () => {
      try {
        const { data: profile, error: profileLoadError } = await supabase
          .from('profiles')
          .select('email, full_name')
          .eq('id', userId)
          .single();

        if (profileLoadError) throw profileLoadError;
        if (!profile || profile.email === currentEmail) {
          completedSyncs.current.add(syncKey);
          return;
        }

        const previousEmail = profile.email;
        const { error: profileUpdateError } = await supabase
          .from('profiles')
          .update({ email: currentEmail })
          .eq('id', userId);

        if (profileUpdateError) throw profileUpdateError;
        completedSyncs.current.add(syncKey);

        const changes: GuestDataChange[] = [{
          field: 'email',
          from: previousEmail,
          to: currentEmail,
        }];

        // Organizer notification delivery is intentionally best-effort, exactly
        // like the profile editor: the confirmed profile change must not be
        // rolled back or surfaced as a user-facing failure if a notification
        // query fails.
        try {
          const { data: guestParticipations, error: participationError } = await supabase
            .from('event_participants')
            .select('event_id')
            .eq('user_id', userId)
            .eq('role', 'guest');

          if (participationError) throw participationError;

          const eventIds = [...new Set((guestParticipations ?? []).map(({ event_id }) => event_id))];
          if (eventIds.length === 0) return;

          const { data: events, error: eventsError } = await supabase
            .from('events')
            .select('id, created_by')
            .in('id', eventIds);

          if (eventsError) throw eventsError;

          const guestName = profile.full_name?.trim()
            || metadataFullName?.trim()
            || currentEmail;
          const changesText = formatGuestChanges(changes, {
            name: t.notifications.fieldName,
            email: t.notifications.fieldEmail,
            phone: t.notifications.fieldPhone,
          });
          const metadata: GuestDataChangedMeta = { guestName, changes };

          const { error: notificationError } = await supabase
            .from('notifications')
            .insert((events ?? []).map((event) => ({
              event_id: event.id,
              title: t.notifications.guestDataChangedTitle,
              body: t.notifications.guestDataChangedBody
                .replace('{{guest}}', guestName)
                .replace('{{changes}}', changesText),
              type: 'guest_data_changed',
              user_id: event.created_by,
              action_url: `/event/${event.id}/participants`,
              metadata: (metadata as unknown) as Json,
            })));

          if (notificationError) throw notificationError;
        } catch (notificationError) {
          console.warn('[profile] guest profile update notification failed:', notificationError);
        }
      } catch (error) {
        console.warn('[profile] email sync failed:', error);
      } finally {
        if (activeSync.current === syncKey) activeSync.current = null;
      }
    })();
  }, [t, user]);
}
