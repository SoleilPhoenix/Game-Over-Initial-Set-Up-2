import { beforeEach, describe, expect, it, vi } from 'vitest';
import { supabase } from '@/lib/supabase/client';
import { channelsRepository } from '@/repositories/channels';

const channelRow = {
  id: 'channel-1',
  event_id: 'event-1',
  name: 'General',
  category: 'general' as const,
  created_at: '2026-08-05T09:00:00.000Z',
  created_by: 'user-1',
  last_message_at: null,
};

describe('channelsRepository', () => {
  beforeEach(() => {
    vi.mocked(supabase.from).mockReset();
    vi.mocked(supabase.auth.getUser).mockReset();
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    } as any);
  });

  it('creates channels for the authenticated user', async () => {
    const chain = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: channelRow, error: null }),
    };
    vi.mocked(supabase.from).mockReturnValue(chain as any);

    await channelsRepository.create({
      event_id: 'event-1',
      name: 'General',
      category: 'general',
    });

    expect(chain.insert).toHaveBeenCalledWith({
      event_id: 'event-1',
      name: 'General',
      category: 'general',
      created_by: 'user-1',
    });
  });

  it('upserts the authenticated user read state on the compound key', async () => {
    const chain = {
      upsert: vi.fn().mockResolvedValue({ error: null }),
    };
    vi.mocked(supabase.from).mockReturnValue(chain as any);

    await channelsRepository.markAsRead('channel-1');

    expect(supabase.from).toHaveBeenCalledWith('channel_read_state');
    expect(chain.upsert).toHaveBeenCalledWith(
      {
        channel_id: 'channel-1',
        user_id: 'user-1',
        last_read_at: expect.any(String),
      },
      { onConflict: 'channel_id,user_id' }
    );
  });

  it('reads a channel from the unread view and resolves its creator name', async () => {
    const channelChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { ...channelRow, unread_count: 3 },
        error: null,
      }),
    };
    const profileChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { full_name: 'Alex Example' },
        error: null,
      }),
    };
    vi.mocked(supabase.from).mockImplementation((table) =>
      (table === 'chat_channels_with_unread' ? channelChain : profileChain) as any
    );

    const result = await channelsRepository.getById('channel-1');

    expect(supabase.from).toHaveBeenNthCalledWith(1, 'chat_channels_with_unread');
    expect(supabase.from).toHaveBeenNthCalledWith(2, 'profiles');
    expect(result).toMatchObject({ unread_count: 3, creator_name: 'Alex Example' });
  });

  it('rejects a delete that returns no affected rows', async () => {
    const chain = {
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockResolvedValue({ data: [], error: null }),
    };
    vi.mocked(supabase.from).mockReturnValue(chain as any);

    await expect(channelsRepository.delete('channel-1')).rejects.toThrow(
      'Channel was not deleted or delete permission was denied'
    );
  });

  it('accepts a delete only when the deleted row is returned', async () => {
    const chain = {
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockResolvedValue({ data: [{ id: 'channel-1' }], error: null }),
    };
    vi.mocked(supabase.from).mockReturnValue(chain as any);

    await expect(channelsRepository.delete('channel-1')).resolves.toBeUndefined();
  });
});
