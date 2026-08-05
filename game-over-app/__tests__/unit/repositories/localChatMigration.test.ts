import { beforeEach, describe, expect, it, vi } from 'vitest';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { supabase } from '@/lib/supabase/client';
import { localChatMigrationRepository } from '@/repositories/localChatMigration';

vi.mock('expo-crypto', () => ({
  randomUUID: vi.fn(),
}));

const eventId = 'event-1';

function localSections(channels: { id: string; name: string }[]) {
  return [
    { id: 'general' as const, title: 'GENERAL', channels },
    { id: 'accommodation' as const, title: 'ACCOMMODATION', channels: [] },
  ];
}

describe('localChatMigrationRepository', () => {
  let storage: Map<string, string>;
  let channelUpsert: ReturnType<typeof vi.fn>;
  let messagesUpsert: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    storage = new Map();
    vi.mocked(AsyncStorage.getItem).mockImplementation(async key => storage.get(key) ?? null);
    vi.mocked(AsyncStorage.setItem).mockImplementation(async (key, value) => {
      storage.set(key, value);
    });
    vi.mocked(AsyncStorage.removeItem).mockImplementation(async key => {
      storage.delete(key);
    });
    vi.mocked(Crypto.randomUUID).mockReset();
    vi.mocked(Crypto.randomUUID)
      .mockReturnValueOnce('00000000-0000-4000-8000-000000000001')
      .mockReturnValueOnce('00000000-0000-4000-8000-000000000002')
      .mockReturnValueOnce('00000000-0000-4000-8000-000000000003')
      .mockReturnValueOnce('00000000-0000-4000-8000-000000000004');
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    } as any);

    channelUpsert = vi.fn().mockResolvedValue({ error: null });
    messagesUpsert = vi.fn().mockResolvedValue({ error: null });
    vi.mocked(supabase.from).mockImplementation(table => ({
      upsert: String(table) === 'chat_channels' ? channelUpsert : messagesUpsert,
    }) as any);
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  it('migrates channel data and only the current user messages with original timestamps', async () => {
    storage.set('localChannelsByEvent', JSON.stringify({
      [eventId]: localSections([{ id: '1700000000000', name: 'Anreise' }]),
      none: localSections([{ id: '1700000000999', name: 'Ohne Event' }]),
    }));
    storage.set('local-messages-1700000000000', JSON.stringify([
      {
        id: '1700000000001',
        content: 'Treffen um neun',
        created_at: '2026-07-01T07:30:00.000Z',
        user_id: 'user-1',
        user_name: 'Alex',
      },
      {
        id: '1700000000002',
        content: 'Fremde Nachricht',
        created_at: '2026-07-01T07:31:00.000Z',
        user_id: 'user-2',
        user_name: 'Sam',
      },
    ]));

    const result = await localChatMigrationRepository.migrateEvent(eventId);

    expect(channelUpsert).toHaveBeenCalledWith(
      {
        id: '00000000-0000-4000-8000-000000000001',
        event_id: eventId,
        name: 'Anreise',
        category: 'general',
        created_by: 'user-1',
      },
      { onConflict: 'id', ignoreDuplicates: true }
    );
    expect(messagesUpsert).toHaveBeenCalledWith(
      [{
        id: '00000000-0000-4000-8000-000000000002',
        channel_id: '00000000-0000-4000-8000-000000000001',
        content: 'Treffen um neun',
        created_at: '2026-07-01T07:30:00.000Z',
        user_id: 'user-1',
      }],
      { onConflict: 'id', ignoreDuplicates: true }
    );
    expect(result).toMatchObject({
      migratedChannels: 1,
      failedChannels: 0,
      skippedMessages: 1,
    });
    expect(result.localChannelsByEvent[eventId][0].channels).toEqual([]);
    expect(result.localChannelsByEvent.none[0].channels).toHaveLength(1);
    expect(storage.has('local-messages-1700000000000')).toBe(false);
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('Skipped 1 message'));
  });

  it('removes successful channels but retains a failed channel and its messages', async () => {
    storage.set('localChannelsByEvent', JSON.stringify({
      [eventId]: localSections([
        { id: 'channel-ok', name: 'Erfolg' },
        { id: 'channel-fail', name: 'Bleibt lokal' },
      ]),
    }));
    storage.set('local-messages-channel-ok', JSON.stringify([{
      id: 'message-ok',
      content: 'Gesichert',
      created_at: '2026-07-02T08:00:00.000Z',
      user_id: 'user-1',
    }]));
    const failedMessages = JSON.stringify([{
      id: 'message-fail',
      content: 'Noch lokal',
      created_at: '2026-07-02T09:00:00.000Z',
      user_id: 'user-1',
    }]);
    storage.set('local-messages-channel-fail', failedMessages);
    channelUpsert.mockImplementation(async channel => ({
      error: channel.name === 'Bleibt lokal' ? { message: 'insert failed' } : null,
    }));

    const result = await localChatMigrationRepository.migrateEvent(eventId);

    expect(result).toMatchObject({ migratedChannels: 1, failedChannels: 1 });
    expect(result.localChannelsByEvent[eventId][0].channels).toEqual([
      { id: 'channel-fail', name: 'Bleibt lokal' },
    ]);
    expect(storage.has('local-messages-channel-ok')).toBe(false);
    expect(storage.get('local-messages-channel-fail')).toBe(failedMessages);
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining('Failed to migrate'));
  });

  it('deduplicates concurrent runs and persists completion for later runs', async () => {
    storage.set('localChannelsByEvent', JSON.stringify({
      [eventId]: localSections([{ id: 'channel-once', name: 'Einmal' }]),
    }));

    const [first, concurrent] = await Promise.all([
      localChatMigrationRepository.migrateEvent(eventId),
      localChatMigrationRepository.migrateEvent(eventId),
    ]);
    const afterRestartEquivalent = await localChatMigrationRepository.migrateEvent(eventId);

    expect(first.migratedChannels).toBe(1);
    expect(concurrent.migratedChannels).toBe(1);
    expect(afterRestartEquivalent.alreadyCompleted).toBe(true);
    expect(channelUpsert).toHaveBeenCalledTimes(1);
    expect(supabase.auth.getUser).toHaveBeenCalledTimes(1);
  });

  it('leaves the none bucket untouched and performs no database write', async () => {
    const original = JSON.stringify({
      none: localSections([{ id: 'channel-none', name: 'Ohne Event' }]),
    });
    storage.set('localChannelsByEvent', original);
    storage.set('local-messages-channel-none', '[]');

    const result = await localChatMigrationRepository.migrateEvent('none');

    expect(result.localChannelsByEvent.none[0].channels).toHaveLength(1);
    expect(storage.get('localChannelsByEvent')).toBe(original);
    expect(storage.get('local-messages-channel-none')).toBe('[]');
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
    expect(AsyncStorage.removeItem).not.toHaveBeenCalled();
    expect(supabase.auth.getUser).not.toHaveBeenCalled();
    expect(supabase.from).not.toHaveBeenCalled();
  });
});
