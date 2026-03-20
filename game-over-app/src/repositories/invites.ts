/**
 * Invites Repository
 * Data access layer for invite codes
 */

import { supabase } from '@/lib/supabase/client';
import * as Crypto from 'expo-crypto';
import type { Database } from '@/lib/supabase/types';

type InviteCode = Database['public']['Tables']['invite_codes']['Row'];
type InviteCodeInsert = Database['public']['Tables']['invite_codes']['Insert'];

export interface InviteCodeWithEvent extends InviteCode {
  event: {
    id: string;
    title: string;
    honoree_name: string;
    start_date: string;
    end_date: string | null;
    status: string;
    city: { id: string; name: string; country: string } | null;
  } | null;
}

export interface InvitePreview {
  eventId: string;
  eventName: string;
  honoreeName: string;
  cityName: string;
  cityId: string;
  startDate: string;
  organizerName: string;
  acceptedCount: number;
  /** Pre-fill email field in signup step if invite was sent to email. Always undefined — email is not fetched for privacy. */
  guestEmail: string | undefined;
}

/**
 * Generate a cryptographically secure random invite code
 * Uses expo-crypto for secure random number generation
 */
function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const randomBytes = Crypto.getRandomBytes(8);
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(randomBytes[i] % chars.length);
  }
  return code;
}

interface InvitePreviewRow {
  id: string;
  code: string;
  expires_at: string | null;
  max_uses: number | null;
  use_count: number;
  event: {
    id: string;
    title: string;
    honoree_name: string;
    start_date: string;
    city_id: string;
    city: { name: string } | null;
    created_by_profile: { full_name: string } | null;
  };
}

export const invitesRepository = {
  /**
   * Get an invite code by code string with event details
   */
  async getByCode(code: string): Promise<InviteCodeWithEvent | null> {
    const { data, error } = await supabase
      .from('invite_codes')
      .select(`
        *,
        event:events(
          id,
          title,
          honoree_name,
          start_date,
          end_date,
          status,
          city:cities(id, name, country)
        )
      `)
      .eq('code', code.toUpperCase())
      .eq('is_active', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    return {
      ...data,
      event: data.event as InviteCodeWithEvent['event'],
    };
  },

  /**
   * Validate an invite code
   */
  async validate(code: string): Promise<{
    valid: boolean;
    reason?: 'not_found' | 'expired' | 'max_uses_reached' | 'inactive';
    invite?: InviteCodeWithEvent;
  }> {
    const invite = await this.getByCode(code);

    if (!invite) {
      return { valid: false, reason: 'not_found' };
    }

    if (!invite.is_active) {
      return { valid: false, reason: 'inactive', invite };
    }

    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      return { valid: false, reason: 'expired', invite };
    }

    if (invite.max_uses !== null && (invite.use_count ?? 0) >= invite.max_uses) {
      return { valid: false, reason: 'max_uses_reached', invite };
    }

    return { valid: true, invite };
  },

  /**
   * Fetch public invite preview — works WITHOUT authentication.
   * Uses the anonymous SELECT policy on invite_codes.
   */
  async getPreview(code: string): Promise<InvitePreview | null> {
    const upperCode = code.toUpperCase();

    // First: fetch invite + event (needed for subsequent queries)
    const { data, error } = await supabase
      .from('invite_codes')
      .select(`
        expires_at,
        max_uses,
        use_count,
        event:events (
          id,
          title,
          honoree_name,
          start_date,
          city_id,
          city:cities ( name ),
          created_by_profile:profiles!events_created_by_fkey ( full_name )
        )
      `)
      .eq('code', upperCode)
      .eq('is_active', true)
      .single();

    if (error || !data?.event) return null;

    // Validate expiry
    if (data.expires_at && new Date(data.expires_at) < new Date()) return null;

    // Validate max uses
    if (data.max_uses !== null && (data.use_count ?? 0) >= data.max_uses) return null;

    const typedData = data as unknown as InvitePreviewRow;
    const ev = typedData.event;

    // Fetch accepted participant count
    const countResult = await supabase
      .from('event_participants')
      .select('id', { count: 'exact', head: true })
      .eq('event_id', ev.id)
      .eq('role', 'guest')
      .not('confirmed_at', 'is', null);

    const acceptedCount = countResult.error ? 0 : (countResult.count ?? 0);

    return {
      eventId: ev.id,
      eventName: ev.title || `${ev.honoree_name}'s Party`,
      honoreeName: ev.honoree_name,
      cityName: ev.city?.name ?? '',
      cityId: ev.city_id,
      startDate: ev.start_date,
      organizerName: ev.created_by_profile?.full_name ?? 'The organizer',
      acceptedCount,
      guestEmail: undefined,
    };
  },

  /**
   * Create a new invite code for an event
   */
  async create(
    eventId: string,
    createdBy: string,
    options?: {
      expiresInDays?: number;
      maxUses?: number;
    }
  ): Promise<InviteCode> {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (options?.expiresInDays ?? 7));

    const { data, error } = await supabase
      .from('invite_codes')
      .insert({
        event_id: eventId,
        code: generateCode(),
        created_by: createdBy,
        expires_at: expiresAt.toISOString(),
        max_uses: options?.maxUses || null,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Increment use count when an invite is accepted
   * Uses RPC for atomic increment to prevent race conditions
   *
   * IMPORTANT: Requires the 'increment_invite_use_count' RPC function in Supabase:
   *
   * CREATE OR REPLACE FUNCTION increment_invite_use_count(invite_id UUID)
   * RETURNS VOID AS $$
   * BEGIN
   *   UPDATE invite_codes
   *   SET use_count = use_count + 1
   *   WHERE id = invite_id;
   * END;
   * $$ LANGUAGE plpgsql SECURITY DEFINER;
   */
  async incrementUseCount(inviteId: string): Promise<void> {
    // Note: increment_invite_use_count RPC function may need to be created in Supabase
    const { error } = await supabase.rpc('increment_invite_use_count', {
      invite_id: inviteId,
    });

    if (error) {
      // If RPC doesn't exist (PGRST202), throw with clear instructions
      if (error.code === 'PGRST202') {
        console.error(
          'Missing RPC function: increment_invite_use_count. ' +
          'Please create this function in Supabase for atomic invite counting.'
        );
        throw new Error('Server configuration error: Missing invite increment function');
      }
      throw error;
    }
  },

  /**
   * Accept an invite - adds user as participant and increments use count
   */
  async accept(
    inviteCode: string,
    userId: string
  ): Promise<{ success: boolean; eventId?: string; error?: string }> {
    // Validate the invite
    const validation = await this.validate(inviteCode);

    if (!validation.valid) {
      const errorMessages = {
        not_found: 'This invite link is invalid or has been revoked.',
        expired: 'This invite link has expired.',
        max_uses_reached: 'This invite link has reached its maximum number of uses.',
        inactive: 'This invite link is no longer active.',
      };
      return {
        success: false,
        error: errorMessages[validation.reason!] || 'Invalid invite link.',
      };
    }

    const invite = validation.invite!;
    const eventId = invite.event_id;

    // Check if user is already a participant
    const { data: existingParticipant } = await supabase
      .from('event_participants')
      .select('id')
      .eq('event_id', eventId)
      .eq('user_id', userId)
      .maybeSingle();

    if (existingParticipant) {
      return {
        success: true,
        eventId,
        error: 'You are already a participant of this event.',
      };
    }

    // Insert participant first (critical path)
    const { error: participantError } = await supabase
      .from('event_participants')
      .insert({
        event_id: eventId,
        user_id: userId,
        role: 'guest',
        invited_via: 'link',
        confirmed_at: new Date().toISOString(),
      });

    if (participantError) {
      console.error('Failed to add participant:', participantError);
      return { success: false, error: 'Failed to join the event. Please try again.' };
    }

    // NOTE: incrementUseCount is not atomic with the insert above.
    // If this fails, the participant is already added but use_count won't increment.
    // The user can retry and the existingParticipant check will route them correctly.
    // This is acceptable for an MVP where max_uses is enforced at the DB level too.
    try {
      await this.incrementUseCount(invite.id);
    } catch (e) {
      console.warn('incrementUseCount failed after participant insert:', e);
      // Non-critical: continue — participant is already added
    }

    return { success: true, eventId };
  },

  /**
   * Get all invite codes for an event
   */
  async getByEventId(eventId: string): Promise<InviteCode[]> {
    const { data, error } = await supabase
      .from('invite_codes')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  /**
   * Deactivate an invite code
   */
  async deactivate(inviteId: string): Promise<void> {
    const { error } = await supabase
      .from('invite_codes')
      .update({ is_active: false })
      .eq('id', inviteId);

    if (error) throw error;
  },

  /**
   * Get guest details from invite codes for an event
   */
  async getGuestsByEventId(eventId: string): Promise<Array<{
    id: string;
    guest_first_name: string | null;
    guest_last_name: string | null;
    guest_email: string | null;
  }>> {
    const { data, error } = await supabase
      .from('invite_codes')
      .select('id, guest_first_name, guest_last_name, guest_email')
      .eq('event_id', eventId);

    if (error) {
      console.warn('[invitesRepository.getGuestsByEventId]', error.message);
      return [];
    }
    return data ?? [];
  },
};
