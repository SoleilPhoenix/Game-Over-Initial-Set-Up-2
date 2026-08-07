/**
 * One-time migration of legacy local chat channels into Supabase.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { supabase } from '@/lib/supabase/client';
import type { Database } from '@/lib/supabase/types';

const LOCAL_CHANNELS_KEY = 'localChannelsByEvent';
const MIGRATION_STATE_KEY = 'localChatMigrationStateV1';

type ChannelCategory = Database['public']['Enums']['channel_category'];

export interface LocalChatChannel {
  id: string;
  name: string;
  icon?: string;
}

export interface LocalChatChannelSection {
  id: ChannelCategory;
  title: string;
  channels: LocalChatChannel[];
}

export type LocalChannelsByEvent = Record<string, LocalChatChannelSection[]>;

interface LocalChatMessage {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  user_name?: string;
}

interface ChannelMigrationState {
  dbChannelId: string;
  messageIds: Record<string, string>;
}

interface EventMigrationState {
  completed: boolean;
  channels: Record<string, ChannelMigrationState>;
}

interface MigrationState {
  version: 1;
  events: Record<string, EventMigrationState>;
}

export interface LocalChatMigrationResult {
  localChannelsByEvent: LocalChannelsByEvent;
  migratedChannels: number;
  failedChannels: number;
  skippedMessages: number;
  alreadyCompleted: boolean;
}

const emptyMigrationState = (): MigrationState => ({ version: 1, events: {} });

function parseJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  return JSON.parse(raw) as T;
}

function getMessageStateKey(message: LocalChatMessage, index: number): string {
  return `${message.id}:${index}`;
}

function countChannels(sections: LocalChatChannelSection[] | undefined): number {
  return (sections ?? []).reduce((total, section) => total + section.channels.length, 0);
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function readLocalChannels(): Promise<LocalChannelsByEvent> {
  return parseJson(await AsyncStorage.getItem(LOCAL_CHANNELS_KEY), {});
}

async function migrateEventInternal(eventId: string): Promise<LocalChatMigrationResult> {
  let localChannelsByEvent = await readLocalChannels();

  // There is deliberately no migration state for the event-less local bucket.
  if (eventId === 'none') {
    return {
      localChannelsByEvent,
      migratedChannels: 0,
      failedChannels: 0,
      skippedMessages: 0,
      alreadyCompleted: false,
    };
  }

  const migrationState = parseJson(
    await AsyncStorage.getItem(MIGRATION_STATE_KEY),
    emptyMigrationState()
  );
  const existingEventState = migrationState.events[eventId];

  if (existingEventState?.completed) {
    return {
      localChannelsByEvent,
      migratedChannels: 0,
      failedChannels: 0,
      skippedMessages: 0,
      alreadyCompleted: true,
    };
  }

  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!authData.user) throw new Error('Authentication required for local chat migration');

  const userId = authData.user.id;
  const eventState: EventMigrationState = existingEventState ?? {
    completed: false,
    channels: {},
  };
  migrationState.events[eventId] = eventState;

  const channels = (localChannelsByEvent[eventId] ?? []).flatMap(section =>
    section.channels.map(channel => ({ channel, category: section.id }))
  );

  let migratedChannels = 0;
  let failedChannels = 0;
  let skippedMessages = 0;

  for (const { channel, category } of channels) {
    try {
      const messageStorageKey = `local-messages-${channel.id}`;
      const rawMessages = await AsyncStorage.getItem(messageStorageKey);
      const localMessages = parseJson<LocalChatMessage[]>(rawMessages, []);
      const ownMessages = localMessages.filter(message => message.user_id === userId);
      const skippedForChannel = localMessages.length - ownMessages.length;

      if (skippedForChannel > 0) {
        skippedMessages += skippedForChannel;
        console.warn(
          `[localChatMigration] Skipped ${skippedForChannel} message(s) in local channel ${channel.id} because they were not authored by the authenticated user.`
        );
      }

      const channelState = eventState.channels[channel.id] ?? {
        dbChannelId: Crypto.randomUUID(),
        messageIds: {},
      };
      eventState.channels[channel.id] = channelState;

      ownMessages.forEach((message, index) => {
        const stateKey = getMessageStateKey(message, index);
        channelState.messageIds[stateKey] ??= Crypto.randomUUID();
      });

      // Persist generated IDs before any DB write so a restart retries idempotently.
      await AsyncStorage.setItem(MIGRATION_STATE_KEY, JSON.stringify(migrationState));

      const { error: channelError } = await supabase
        .from('chat_channels')
        .upsert(
          {
            id: channelState.dbChannelId,
            event_id: eventId,
            name: channel.name,
            category,
            created_by: userId,
          },
          { onConflict: 'id', ignoreDuplicates: true }
        );

      if (channelError) throw channelError;

      if (ownMessages.length > 0) {
        const messages = ownMessages.map((message, index) => ({
          id: channelState.messageIds[getMessageStateKey(message, index)],
          channel_id: channelState.dbChannelId,
          content: message.content,
          created_at: message.created_at,
          user_id: userId,
        }));
        const { error: messagesError } = await supabase
          .from('messages')
          .upsert(messages, { onConflict: 'id', ignoreDuplicates: true });

        if (messagesError) throw messagesError;
      }

      // Remove the message payload first. If updating the channel map fails, restore it.
      await AsyncStorage.removeItem(messageStorageKey);
      try {
        const latestChannels = await readLocalChannels();
        const nextSections = (latestChannels[eventId] ?? []).map(section => ({
          ...section,
          channels: section.channels.filter(localChannel => localChannel.id !== channel.id),
        }));
        localChannelsByEvent = { ...latestChannels, [eventId]: nextSections };
        await AsyncStorage.setItem(LOCAL_CHANNELS_KEY, JSON.stringify(localChannelsByEvent));
      } catch (cleanupError) {
        if (rawMessages !== null) {
          await AsyncStorage.setItem(messageStorageKey, rawMessages);
        }
        throw cleanupError;
      }

      delete eventState.channels[channel.id];
      migratedChannels += 1;
    } catch (error) {
      failedChannels += 1;
      console.warn(
        `[localChatMigration] Failed to migrate local channel ${channel.id}: ${describeError(error)}`
      );
    }
  }

  localChannelsByEvent = await readLocalChannels();
  eventState.completed = countChannels(localChannelsByEvent[eventId]) === 0;
  await AsyncStorage.setItem(MIGRATION_STATE_KEY, JSON.stringify(migrationState));

  return {
    localChannelsByEvent,
    migratedChannels,
    failedChannels,
    skippedMessages,
    alreadyCompleted: false,
  };
}

const inFlightByEvent = new Map<string, Promise<LocalChatMigrationResult>>();
let migrationQueue: Promise<void> = Promise.resolve();

export const localChatMigrationRepository = {
  migrateEvent(eventId: string): Promise<LocalChatMigrationResult> {
    const existingRun = inFlightByEvent.get(eventId);
    if (existingRun) return existingRun;

    const run = migrationQueue.then(() => migrateEventInternal(eventId));
    migrationQueue = run.then(
      () => undefined,
      () => undefined
    );
    inFlightByEvent.set(eventId, run);
    void run.then(() => {
      if (inFlightByEvent.get(eventId) === run) {
        inFlightByEvent.delete(eventId);
      }
    }, () => {
      if (inFlightByEvent.get(eventId) === run) {
        inFlightByEvent.delete(eventId);
      }
    });
    return run;
  },
};
