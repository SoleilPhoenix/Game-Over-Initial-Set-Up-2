/**
 * Resolves the display name and phone for a guest slot in the organizer's
 * "Manage Invitations" view.
 *
 * Option B (product decision 2026-07-18): once the guest has registered, their
 * OWN profile data wins over the organizer-entered invite_codes data. The
 * organizer entry is only a placeholder until the slot is registered.
 *
 * `changedFromInvite` additionally reports which fields the registered guest
 * changed relative to the organizer's original invite entry, so the organizer
 * can be shown a "guest adjusted their details" hint.
 */
export interface GuestDisplayInput {
  isRegistered: boolean;
  profileFullName: string | null;
  profilePhone: string | null;
  inviteFirstName: string;
  inviteLastName: string;
  invitePhone: string;
}

export interface FieldChange {
  from: string;
  to: string;
}

export interface GuestDisplay {
  name: string;
  phone: string;
  changedFromInvite: {
    name?: FieldChange;
    phone?: FieldChange;
  };
}

/** Normalise a phone to a comparable key so formatting differences don't count
 *  as a change. Leading 0 is treated as German (+49). */
export function normalizePhoneKey(phone: string): string {
  if (!phone) return '';
  let s = phone.replace(/[^\d+]/g, '');
  if (!s) return '';
  if (s.startsWith('00')) s = '+' + s.slice(2);
  if (s.startsWith('0')) return '+49' + s.slice(1);
  if (s.startsWith('+')) return s;
  return '+' + s;
}

export function resolveGuestDisplay(input: GuestDisplayInput): GuestDisplay {
  const inviteName = [input.inviteFirstName, input.inviteLastName]
    .filter(Boolean)
    .join(' ')
    .trim();

  const changedFromInvite: GuestDisplay['changedFromInvite'] = {};

  if (input.isRegistered) {
    const selfName = input.profileFullName?.trim() || '';
    const selfPhone = input.profilePhone?.trim() || '';
    const name = selfName || inviteName;
    const phone = selfPhone || input.invitePhone || '';

    // Name changed: organizer entered a name, guest registered with a different one.
    if (inviteName && selfName && selfName.toLowerCase() !== inviteName.toLowerCase()) {
      changedFromInvite.name = { from: inviteName, to: selfName };
    }
    // Phone changed: organizer entered a phone, guest provided a different one.
    if (input.invitePhone && selfPhone &&
        normalizePhoneKey(selfPhone) !== normalizePhoneKey(input.invitePhone)) {
      changedFromInvite.phone = { from: input.invitePhone, to: selfPhone };
    }

    return { name, phone, changedFromInvite };
  }

  return {
    name: inviteName,
    phone: input.invitePhone || '',
    changedFromInvite,
  };
}
