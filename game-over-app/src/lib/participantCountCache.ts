/**
 * Lightweight cache for event data that may not be in the DB.
 * Bridges the gap between wizard (where data is set) and event screens (where it's displayed).
 * Handles: desired participant counts + planning checklist state.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

/** Best-effort persistence should never crash callers, but silent failures hide
 *  real bugs. Surface them in development while staying quiet in production. */
function warnDev(scope: string, err: unknown): void {
  if (__DEV__) console.warn(`[participantCountCache] ${scope}:`, err);
}

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
  } catch (err) { warnDev('setDesiredParticipants', err); }
}

export async function loadDesiredParticipants(eventId: string): Promise<number | undefined> {
  // NOTE: use hasOwnProperty, not truthiness — a legitimately cached 0 must not
  // be treated as a cache miss.
  if (Object.prototype.hasOwnProperty.call(participantCache, eventId)) {
    return participantCache[eventId];
  }
  try {
    const raw = await AsyncStorage.getItem(PARTICIPANTS_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      Object.assign(participantCache, data);
      return data[eventId];
    }
  } catch (err) { warnDev('loadDesiredParticipants', err); }
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

// ─── Guest Details Cache (PII → encrypted at rest) ───────────
export interface GuestDetail {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
}

// Guest names/emails/phones are personal data, so they are stored via
// expo-secure-store (OS keychain / EncryptedSharedPreferences) rather than
// plaintext AsyncStorage. One key per event keeps each value small.
const GUESTS_KEY_PREFIX = 'guest_details_';
const guestsCache: Record<string, Record<number, GuestDetail>> = {};

// SecureStore keys allow only [A-Za-z0-9._-]; UUID event ids already qualify,
// but sanitise defensively.
function guestStoreKey(eventId: string): string {
  return `${GUESTS_KEY_PREFIX}${eventId.replace(/[^A-Za-z0-9._-]/g, '_')}`;
}

export async function saveGuestDetails(eventId: string, details: Record<number, GuestDetail>): Promise<void> {
  guestsCache[eventId] = details;
  try {
    await SecureStore.setItemAsync(guestStoreKey(eventId), JSON.stringify(details));
  } catch (err) { warnDev('saveGuestDetails', err); }
}

export async function loadGuestDetails(eventId: string): Promise<Record<number, GuestDetail>> {
  if (guestsCache[eventId]) return guestsCache[eventId];
  try {
    const raw = await SecureStore.getItemAsync(guestStoreKey(eventId));
    if (raw) {
      const data = JSON.parse(raw) as Record<number, GuestDetail>;
      guestsCache[eventId] = data;
      return data;
    }
  } catch (err) { warnDev('loadGuestDetails', err); }
  return {};
}

/** One-time migration: move any pre-existing plaintext guest details out of
 *  AsyncStorage into SecureStore, then delete the plaintext copy. Safe to call
 *  on every app start; it no-ops once the legacy key is gone. */
export async function migratePlaintextGuestDetails(): Promise<void> {
  try {
    const legacy = await AsyncStorage.getItem('guest_details');
    if (!legacy) return;
    const data = JSON.parse(legacy) as Record<string, Record<number, GuestDetail>>;
    await Promise.all(
      Object.entries(data).map(([eventId, details]) =>
        SecureStore.setItemAsync(guestStoreKey(eventId), JSON.stringify(details))
      )
    );
    await AsyncStorage.removeItem('guest_details');
  } catch (err) { warnDev('migratePlaintextGuestDetails', err); }
}

// ─── Budget Info Cache (demo-mode events) ────
export interface BudgetInfo {
  totalCents: number;
  perPersonCents: number;
  payingCount: number;
  /** Actual amount paid so far (cents). If absent, budget screen assumes 25% deposit. */
  paidAmountCents?: number;
  /** Package slug (e.g. "hamburg-classic") — used for navigation and image display. */
  packageId?: string;
  /** Top activity name from the assembled package (features[0]). Used as Package Highlight on event summary. */
  packageHighlight?: string;
  /** Full features array of the assembled package. Used to display correct includes in package detail view. */
  packageFeatures?: string[];
  /** Total participant count including honoree — authoritative source to prevent inflation bugs. */
  totalParticipants?: number;
  /** Full wizard questionnaire answers — stored at event creation so viewOnly can re-assemble correct features. */
  wizardAnswers?: Record<string, string | string[] | null>;
}

const BUDGET_KEY = 'budget_info';
const budgetCache: Record<string, BudgetInfo> = {};

export async function setBudgetInfo(eventId: string, info: BudgetInfo): Promise<void> {
  // Merge: preserve existing optional fields when new info omits them (e.g. payment.tsx
  // doesn't know wizard features, packages.tsx doesn't know paidAmountCents).
  const existing = budgetCache[eventId];
  const merged: BudgetInfo = existing
    ? {
        ...existing,
        ...Object.fromEntries(
          Object.entries(info).filter(([, v]) => v !== undefined)
        ),
      }
    : info;
  budgetCache[eventId] = merged;
  try {
    const raw = await AsyncStorage.getItem(BUDGET_KEY);
    const data = raw ? JSON.parse(raw) : {};
    data[eventId] = merged;
    await AsyncStorage.setItem(BUDGET_KEY, JSON.stringify(data));
  } catch {}
}

/** Returns a snapshot of the in-memory budget cache (synchronous — no I/O). */
export function getAllBudgetInfos(): Record<string, BudgetInfo> {
  return { ...budgetCache };
}

export async function loadBudgetInfo(eventId: string): Promise<BudgetInfo | undefined> {
  if (budgetCache[eventId]) return budgetCache[eventId];
  try {
    const raw = await AsyncStorage.getItem(BUDGET_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      Object.assign(budgetCache, data);
      return data[eventId];
    }
  } catch {}
  return undefined;
}

// ─── Invited Guest Count Cache ────────────────
const INVITED_KEY = 'invited_guest_counts';
const invitedCache: Record<string, number> = {};

export async function setInvitedCount(eventId: string, count: number): Promise<void> {
  invitedCache[eventId] = count;
  try {
    const raw = await AsyncStorage.getItem(INVITED_KEY);
    const data = raw ? JSON.parse(raw) : {};
    data[eventId] = count;
    await AsyncStorage.setItem(INVITED_KEY, JSON.stringify(data));
  } catch {}
}

export async function loadInvitedCount(eventId: string): Promise<number> {
  if (invitedCache[eventId] !== undefined) return invitedCache[eventId];
  try {
    const raw = await AsyncStorage.getItem(INVITED_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      Object.assign(invitedCache, data);
      return data[eventId] || 0;
    }
  } catch {}
  return 0;
}

/**
 * Eagerly hydrates the in-memory budgetCache from AsyncStorage.
 * Call once at app startup (before any queries run) to ensure
 * getAllBudgetInfos() returns correct data on cold start.
 */
export async function initBudgetCache(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(BUDGET_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      Object.assign(budgetCache, data);
    }
  } catch {}
}
