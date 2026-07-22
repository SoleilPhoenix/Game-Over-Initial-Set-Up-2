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
   * Uses a SECURITY DEFINER RPC function to bypass events/profiles RLS
   * (anonymous users cannot SELECT those tables directly).
   */
  async getPreview(code: string): Promise<InvitePreview | null> {
    const { data, error } = await supabase
      .rpc('get_invite_preview', { p_code: code.toUpperCase() });

    if (error) {
      console.error('[getPreview] RPC error:', error.message);
      throw error;
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
   * Accept an invite atomically through the server-authoritative RPC.
   */
  async accept(
    inviteCode: string
  ): Promise<{ success: boolean; eventId?: string; error?: string }> {
    const { data, error } = await supabase.rpc('accept_invite', {
      p_code: inviteCode.toUpperCase(),
    });

    if (error) {
      console.error('[accept] RPC error:', error.message);
      return { success: false, error: error.message };
    }

    // The RPC returns one row: (success, event_id, reason). A false success
    // carries a machine reason we map to a message; both a fresh join and
    // 'already_participant' are successes that should land on the event.
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) {
      return { success: false, error: 'Failed to join the event. Please try again.' };
    }

    if (row.success) {
      return { success: true, eventId: row.event_id ?? undefined };
    }

    const reasonMessages: Record<string, string> = {
      not_found: 'This invite link is invalid or has been revoked.',
      inactive: 'This invite link is no longer active.',
      expired: 'This invite link has expired.',
      max_uses_reached: 'This invite link has reached its maximum number of uses.',
      unauthenticated: 'Please sign in to accept this invitation.',
    };
    return {
      success: false,
      error: reasonMessages[row.reason as string] ?? 'Invalid invite link.',
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
