/**
 * Resolves the display name and phone for a guest slot in the organizer's
 * "Manage Invitations" view.
 *
 * Option B (product decision 2026-07-18): once the guest has registered, their
 * OWN profile data wins over the organizer-entered invite_codes data. The
 * organizer entry is only a placeholder until the slot is registered.
 */
export interface GuestDisplayInput {
  isRegistered: boolean;
  profileFullName: string | null;
  profilePhone: string | null;
  inviteFirstName: string;
  inviteLastName: string;
  invitePhone: string;
}

export interface GuestDisplay {
  name: string;
  phone: string;
}

export function resolveGuestDisplay(input: GuestDisplayInput): GuestDisplay {
  const inviteName = [input.inviteFirstName, input.inviteLastName]
    .filter(Boolean)
    .join(' ')
    .trim();

  if (input.isRegistered) {
    return {
      name: (input.profileFullName?.trim() || inviteName),
      phone: (input.profilePhone?.trim() || input.invitePhone || ''),
    };
  }

  return {
    name: inviteName,
    phone: input.invitePhone || '',
  };
}
