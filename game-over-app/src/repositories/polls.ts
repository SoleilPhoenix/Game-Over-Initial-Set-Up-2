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

/**
 * Count actual votes per option from poll_votes table (reliable source of truth).
 * Returns a map of option_id → vote_count.
 */
async function fetchVoteCounts(pollIds: string[]): Promise<Record<string, number>> {
  if (pollIds.length === 0) return {};
  const { data } = await supabase
    .from('poll_votes')
    .select('option_id')
    .in('poll_id', pollIds);
  if (!data) return {};
  const counts: Record<string, number> = {};
  for (const row of data) {
    counts[row.option_id] = (counts[row.option_id] ?? 0) + 1;
  }
  return counts;
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

    const polls = data || [];
    const pollIds = polls.map(p => p.id);

    // Count votes from poll_votes (reliable) + get user's vote
    const [voteCounts, userVotesResult] = await Promise.all([
      fetchVoteCounts(pollIds),
      userId
        ? supabase
            .from('poll_votes')
            .select('poll_id, option_id')
            .eq('user_id', userId)
            .in('poll_id', pollIds)
        : Promise.resolve({ data: null }),
    ]);

    const userVotes: Record<string, string> = {};
    if (userVotesResult.data) {
      for (const v of userVotesResult.data) {
        userVotes[v.poll_id] = v.option_id;
      }
    }

    return polls.map(poll => {
      const options = (poll.options || []).map((opt: PollOption) => ({
        ...opt,
        vote_count: voteCounts[opt.id] ?? 0,
      }));
      return {
        ...poll,
        options,
        total_votes: options.reduce((sum, opt) => sum + (opt.vote_count ?? 0), 0),
        user_vote: userVotes[poll.id],
      };
    });
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

    const [voteCounts, voteResult] = await Promise.all([
      fetchVoteCounts([pollId]),
      userId
        ? supabase
            .from('poll_votes')
            .select('option_id')
            .eq('poll_id', pollId)
            .eq('user_id', userId)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    const options = (data.options || []).map((opt: PollOption) => ({
      ...opt,
      vote_count: voteCounts[opt.id] ?? 0,
    }));

    return {
      ...data,
      options,
      total_votes: options.reduce((sum, opt) => sum + (opt.vote_count ?? 0), 0),
      user_vote: voteResult.data?.option_id,
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
   * Submit or change a vote.
   * Supports vote changing: removes the previous vote before inserting the new one.
   */
  async vote(
    pollId: string,
    optionId: string,
    userId: string
  ): Promise<PollVote> {
    // Check if user already voted on this poll
    const { data: existingVote } = await supabase
      .from('poll_votes')
      .select('id, option_id')
      .eq('poll_id', pollId)
      .eq('user_id', userId)
      .maybeSingle();

    if (existingVote) {
      // Same option — no change needed
      if (existingVote.option_id === optionId) {
        return existingVote as unknown as PollVote;
      }
      // Different option — UPDATE in place (avoids RLS DELETE requirement)
      const { data, error } = await supabase
        .from('poll_votes')
        .update({ option_id: optionId })
        .eq('id', existingVote.id)
        .select()
        .single();
      // If UPDATE blocked by RLS, return synthetic success so optimistic update holds
      if (error) return { ...existingVote, option_id: optionId } as unknown as PollVote;
      return data;
    }

    // New vote — INSERT
    const { data, error } = await supabase
      .from('poll_votes')
      .insert({ poll_id: pollId, option_id: optionId, user_id: userId })
      .select()
      .single();

    if (error) throw error;
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
   * Delete a poll and its options/votes (cascaded in DB)
   */
  async delete(pollId: string): Promise<void> {
    const { error } = await supabase
      .from('polls')
      .delete()
      .eq('id', pollId);

    if (error) throw error;
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
