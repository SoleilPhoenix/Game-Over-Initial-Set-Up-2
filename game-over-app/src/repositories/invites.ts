/**
 * Invites Repository
 * Data access layer for invite codes
 */

import { supabase } from '@/lib/supabase/client';
import * as Crypto from 'expo-crypto';
import type { Database } from '@/lib/supabase/types';

type InviteCode = Database['public']['Tables']['invite_codes']['Row'];

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
  guestEmail: string | undefined;
  guestFirstName: string | undefined;
  guestLastName: string | undefined;
  guestPhone: string | undefined;
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
   * Validate an invite code.
   *
   * Uses the `get_invite_status` SECURITY DEFINER RPC rather than a direct table
   * read: the public SELECT policy on invite_codes was removed (it exposed every
   * code + guest PII to anyone with the anon key). The RPC requires the caller to
   * present a specific code and returns only validity info.
   */
  async validate(code: string): Promise<{
    valid: boolean;
    reason?: 'not_found' | 'expired' | 'max_uses_reached' | 'inactive';
  }> {
    const { data, error } = await supabase.rpc('get_invite_status', {
      p_code: code.toUpperCase(),
    });

    if (error) {
      console.error('[validate] get_invite_status RPC error:', error.message);
      return { valid: false, reason: 'not_found' };
    }

    const row = Array.isArray(data) ? data[0] : data;
    if (!row) return { valid: false, reason: 'not_found' };

    if (row.is_valid) return { valid: true };
    return {
      valid: false,
      reason: (row.reason as 'expired' | 'max_uses_reached' | 'inactive') ?? 'not_found',
    };
  },

  /**
   * Fetch public invite preview — works WITHOUT authentication.
   * Uses a SECURITY DEFINER RPC function to bypass events/profiles RLS
   * (anonymous users cannot SELECT those tables directly).
   */
  async getPreview(code: string): Promise<InvitePreview | null> {
    const { data, error } = await supabase
      .rpc('get_invite_preview', { p_code: code.toUpperCase() });

    if (error) {
      console.error('[getPreview] RPC error:', error.message);
      return null;
    }

    // rpc returns an array; take the first row
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) return null;

    return {
      eventId: row.event_id,
      eventName: row.event_title,
      honoreeName: row.honoree_name,
      cityName: row.city_name ?? '',
      cityId: row.city_id,
      startDate: row.start_date,
      organizerName: row.organizer_name,
      acceptedCount: Number(row.accepted_count ?? 0),
      guestEmail: row.guest_email ?? undefined,
      guestFirstName: row.guest_first_name ?? undefined,
      guestLastName: row.guest_last_name ?? undefined,
      guestPhone: row.guest_phone ?? undefined,
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
   * Accept an invite — adds the current user as a participant and increments the
   * use count. Delegated to the `accept_invite` SECURITY DEFINER RPC, which takes
   * a row lock and performs the validity check + participant insert + use_count
   * increment atomically. This closes the previous race where two guests could
   * both redeem the last slot (max_uses was not truly enforced).
   *
   * The RPC derives the user from auth.uid() server-side; the `_userId` argument
   * is retained for call-site compatibility but intentionally not trusted.
   */
  async accept(
    inviteCode: string,
    _userId: string
  ): Promise<{ success: boolean; eventId?: string; error?: string }> {
    const { data, error } = await supabase.rpc('accept_invite', {
      p_code: inviteCode.toUpperCase(),
    });

    if (error) {
      console.error('[accept] accept_invite RPC error:', error.message);
      return { success: false, error: 'Failed to join the event. Please try again.' };
    }

    const row = Array.isArray(data) ? data[0] : data;
    if (!row) {
      return { success: false, error: 'This invite link is invalid or has been revoked.' };
    }

    if (row.success) {
      return { success: true, eventId: row.event_id ?? undefined };
    }

    const errorMessages: Record<string, string> = {
      not_found: 'This invite link is invalid or has been revoked.',
      expired: 'This invite link has expired.',
      max_uses_reached: 'This invite link has reached its maximum number of uses.',
      inactive: 'This invite link is no longer active.',
      unauthenticated: 'Please sign in to accept this invite.',
    };
    return {
      success: false,
      eventId: row.event_id ?? undefined,
      error: errorMessages[row.reason as string] ?? 'Invalid invite link.',
    };
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
  async getGuestsByEventId(eventId: string): Promise<{
    id: string;
    guest_first_name: string | null;
    guest_last_name: string | null;
    guest_email: string | null;
  }[]> {
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
