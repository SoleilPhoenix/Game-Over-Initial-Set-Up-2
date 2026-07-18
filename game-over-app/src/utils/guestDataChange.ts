/**
 * Shared shape + formatting for `guest_data_changed` notifications.
 *
 * The notification is created on the guest's device but shown to the organizer,
 * so the structured change set is stored in `notifications.metadata` and the
 * human text is built at render time from localized labels. Both the guest-side
 * fallback text and the organizer-side display go through `formatGuestChanges`
 * so the wording can never drift between them.
 */
export type GuestChangeField = 'name' | 'email' | 'phone';

export interface GuestDataChange {
  field: GuestChangeField;
  from: string;
  to: string;
}

export interface GuestDataChangedMeta {
  guestName: string;
  changes: GuestDataChange[];
}

/** Narrow an untrusted `notifications.metadata` value to our shape. */
export function isGuestDataChangedMeta(x: unknown): x is GuestDataChangedMeta {
  if (!x || typeof x !== 'object') return false;
  const m = x as Record<string, unknown>;
  if (typeof m.guestName !== 'string' || !Array.isArray(m.changes)) return false;
  return m.changes.every(
    (c) =>
      c && typeof c === 'object' &&
      typeof (c as any).field === 'string' &&
      typeof (c as any).from === 'string' &&
      typeof (c as any).to === 'string',
  );
}

/**
 * Renders the change list as "Name: Max M. → Maximilian, Telefon: … → …".
 * `fieldLabels` supplies the localized label per field.
 */
export function formatGuestChanges(
  changes: GuestDataChange[],
  fieldLabels: Record<GuestChangeField, string>,
): string {
  return changes
    .map((c) => `${fieldLabels[c.field]}: ${c.from} → ${c.to}`)
    .join(', ');
}
