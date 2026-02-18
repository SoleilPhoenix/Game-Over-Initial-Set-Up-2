/**
 * Lightweight cache for event data that may not be in the DB.
 * Bridges the gap between wizard (where data is set) and event screens (where it's displayed).
 * Handles: desired participant counts + planning checklist state.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Participant Count Cache ──────────────────
const PARTICIPANTS_KEY = 'desired_participant_counts';
const participantCache: Record<string, number> = {};

export async function setDesiredParticipants(eventId: string, count: number): Promise<void> {
  participantCache[eventId] = count;
  try {
    const raw = await AsyncStorage.getItem(PARTICIPANTS_KEY);
    const data = raw ? JSON.parse(raw) : {};
    data[eventId] = count;
    await AsyncStorage.setItem(PARTICIPANTS_KEY, JSON.stringify(data));
  } catch {}
}

export async function loadDesiredParticipants(eventId: string): Promise<number | undefined> {
  if (participantCache[eventId]) return participantCache[eventId];
  try {
    const raw = await AsyncStorage.getItem(PARTICIPANTS_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      Object.assign(participantCache, data);
      return data[eventId];
    }
  } catch {}
  return undefined;
}

// ─── Planning Checklist Cache ─────────────────
const CHECKLIST_KEY = 'planning_checklists';
const checklistCache: Record<string, Record<string, boolean>> = {};

export async function setChecklistItem(eventId: string, key: string, value: boolean): Promise<void> {
  if (!checklistCache[eventId]) checklistCache[eventId] = {};
  checklistCache[eventId][key] = value;
  try {
    const raw = await AsyncStorage.getItem(CHECKLIST_KEY);
    const data = raw ? JSON.parse(raw) : {};
    if (!data[eventId]) data[eventId] = {};
    data[eventId][key] = value;
    await AsyncStorage.setItem(CHECKLIST_KEY, JSON.stringify(data));
  } catch {}
}

export async function loadChecklist(eventId: string): Promise<Record<string, boolean>> {
  if (checklistCache[eventId]) return checklistCache[eventId];
  try {
    const raw = await AsyncStorage.getItem(CHECKLIST_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      Object.assign(checklistCache, data);
      return data[eventId] || {};
    }
  } catch {}
  return {};
}

// ─── Guest Details Cache ─────────────────────
export interface GuestDetail {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
}

const GUESTS_KEY = 'guest_details';
const guestsCache: Record<string, Record<number, GuestDetail>> = {};

export async function saveGuestDetails(eventId: string, details: Record<number, GuestDetail>): Promise<void> {
  guestsCache[eventId] = details;
  try {
    const raw = await AsyncStorage.getItem(GUESTS_KEY);
    const data = raw ? JSON.parse(raw) : {};
    data[eventId] = details;
    await AsyncStorage.setItem(GUESTS_KEY, JSON.stringify(data));
  } catch {}
}

export async function loadGuestDetails(eventId: string): Promise<Record<number, GuestDetail>> {
  if (guestsCache[eventId]) return guestsCache[eventId];
  try {
    const raw = await AsyncStorage.getItem(GUESTS_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      Object.assign(guestsCache, data);
      return data[eventId] || {};
    }
  } catch {}
  return {};
}
