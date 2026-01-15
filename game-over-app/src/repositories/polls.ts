/**
 * Polls Repository
 * Data access layer for polls and voting
 */

import { supabase } from '@/lib/supabase/client';
import type { Database } from '@/lib/supabase/types';

type Poll = Database['public']['Tables']['polls']['Row'];
type PollInsert = Database['public']['Tables']['polls']['Insert'];
type PollOption = Database['public']['Tables']['poll_options']['Row'];
type PollVote = Database['public']['Tables']['poll_votes']['Row'];

export interface PollWithOptions extends Poll {
  options: PollOption[];
  total_votes: number;
  user_vote?: string; // option_id user voted for
}

export const pollsRepository = {
  /**
   * Get all polls for an event
   */
  async getByEventId(
    eventId: string,
    userId?: string
  ): Promise<PollWithOptions[]> {
    const { data, error } = await supabase
      .from('polls')
      .select(`
        *,
        options:poll_options(*)
      `)
      .eq('event_id', eventId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Get user's votes if userId provided
    let userVotes: Record<string, string> = {};
    if (userId) {
      const { data: votes } = await supabase
        .from('poll_votes')
        .select('poll_id, option_id')
        .eq('user_id', userId)
        .in('poll_id', (data || []).map(p => p.id));

      if (votes) {
        userVotes = Object.fromEntries(votes.map(v => [v.poll_id, v.option_id]));
      }
    }

    return (data || []).map(poll => ({
      ...poll,
      options: poll.options || [],
      total_votes: (poll.options || []).reduce((sum, opt) => sum + opt.vote_count, 0),
      user_vote: userVotes[poll.id],
    }));
  },

  /**
   * Get a single poll by ID
   */
  async getById(pollId: string, userId?: string): Promise<PollWithOptions | null> {
    const { data, error } = await supabase
      .from('polls')
      .select(`
        *,
        options:poll_options(*)
      `)
      .eq('id', pollId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    let userVote: string | undefined;
    if (userId) {
      const { data: vote } = await supabase
        .from('poll_votes')
        .select('option_id')
        .eq('poll_id', pollId)
        .eq('user_id', userId)
        .single();

      userVote = vote?.option_id;
    }

    return {
      ...data,
      options: data.options || [],
      total_votes: (data.options || []).reduce((sum, opt) => sum + opt.vote_count, 0),
      user_vote: userVote,
    };
  },

  /**
   * Create a new poll with options
   */
  async create(
    poll: PollInsert,
    options: string[]
  ): Promise<PollWithOptions> {
    const { data: pollData, error: pollError } = await supabase
      .from('polls')
      .insert(poll)
      .select()
      .single();

    if (pollError) throw pollError;

    // Create options
    const optionsToInsert = options.map(label => ({
      poll_id: pollData.id,
      label,
    }));

    const { data: optionsData, error: optionsError } = await supabase
      .from('poll_options')
      .insert(optionsToInsert)
      .select();

    if (optionsError) throw optionsError;

    return {
      ...pollData,
      options: optionsData || [],
      total_votes: 0,
    };
  },

  /**
   * Submit a vote
   */
  async vote(
    pollId: string,
    optionId: string,
    userId: string
  ): Promise<PollVote> {
    // Insert vote
    const { data, error } = await supabase
      .from('poll_votes')
      .insert({
        poll_id: pollId,
        option_id: optionId,
        user_id: userId,
      })
      .select()
      .single();

    if (error) throw error;

    // Increment vote count
    await supabase.rpc('increment_vote_count', { option_id: optionId });

    return data;
  },

  /**
   * Update poll status
   */
  async updateStatus(
    pollId: string,
    status: Poll['status']
  ): Promise<Poll> {
    const { data, error } = await supabase
      .from('polls')
      .update({ status })
      .eq('id', pollId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Close a poll
   */
  async close(pollId: string): Promise<Poll> {
    return this.updateStatus(pollId, 'closed');
  },

  /**
   * Get polls by category
   */
  async getByCategory(
    eventId: string,
    category: Poll['category'],
    userId?: string
  ): Promise<PollWithOptions[]> {
    const polls = await this.getByEventId(eventId, userId);
    return polls.filter(p => p.category === category);
  },

  /**
   * Get active polls for an event
   */
  async getActive(eventId: string, userId?: string): Promise<PollWithOptions[]> {
    const polls = await this.getByEventId(eventId, userId);
    return polls.filter(p => p.status === 'active' || p.status === 'closing_soon');
  },

  /**
   * Add an option to an existing poll
   */
  async addOption(pollId: string, label: string): Promise<PollOption> {
    const { data, error } = await supabase
      .from('poll_options')
      .insert({ poll_id: pollId, label })
      .select()
      .single();

    if (error) throw error;
    return data;
  },
};
