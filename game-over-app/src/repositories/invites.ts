/**
 * Invites Repository
 * Data access layer for invite codes
 */

import { supabase } from '@/lib/supabase/client';
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

/**
 * Generate a random invite code
 */
function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
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

    if (invite.max_uses !== null && invite.use_count >= invite.max_uses) {
      return { valid: false, reason: 'max_uses_reached', invite };
    }

    return { valid: true, invite };
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
    expiresAt.setDate(expiresAt.getDate() + (options?.expiresInDays || 7));

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
   */
  async incrementUseCount(inviteId: string): Promise<void> {
    const { error } = await supabase.rpc('increment_invite_use_count', {
      invite_id: inviteId,
    });

    // If the RPC doesn't exist, fall back to direct update
    if (error && error.code === 'PGRST202') {
      const { data: invite } = await supabase
        .from('invite_codes')
        .select('use_count')
        .eq('id', inviteId)
        .single();

      if (invite) {
        await supabase
          .from('invite_codes')
          .update({ use_count: (invite.use_count || 0) + 1 })
          .eq('id', inviteId);
      }
    } else if (error) {
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
      .single();

    if (existingParticipant) {
      return {
        success: true,
        eventId,
        error: 'You are already a participant of this event.',
      };
    }

    // Add user as participant
    const { error: participantError } = await supabase
      .from('event_participants')
      .insert({
        event_id: eventId,
        user_id: userId,
        role: 'guest',
        invited_via: 'link',
      });

    if (participantError) {
      console.error('Failed to add participant:', participantError);
      return { success: false, error: 'Failed to join the event. Please try again.' };
    }

    // Increment use count
    await this.incrementUseCount(invite.id);

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
};
