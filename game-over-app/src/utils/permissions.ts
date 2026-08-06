export type EventRole = 'organizer' | 'guest' | 'honoree';

export interface EventCapabilities {
  canViewBudget: boolean;
  canViewExtraCosts: boolean;
  canViewGroupContributions: boolean;
  canViewOwnShareOnly: boolean;
  canManageInvitations: boolean;
  canRemindGuests: boolean;
  canEditEvent: boolean;
  canManagePackages: boolean;
  canViewPackages: boolean;
}

export interface PermissionEventData {
  created_by: string | null;
  /** Denormalized current event_participants.role from repositories/events. */
  current_user_role?: string | null;
  /** User id the denormalized role was loaded for; prevents cross-session cache reuse. */
  current_user_id?: string | null;
}

export interface PermissionParticipantData {
  user_id: string | null;
  role: string | null;
}

export interface PermissionBookingData {
  exclude_honoree: boolean | null;
}

export interface ResolveEventCapabilitiesInput {
  event: PermissionEventData | null | undefined;
  userId: string | null | undefined;
  participants?: readonly PermissionParticipantData[] | null;
  booking?: PermissionBookingData | null;
  /** A trusted result from get_my_event_share, used because honorees cannot read bookings. */
  ownSharePays?: boolean | null;
  /** Navigation may request a lower-privilege preview, but can never grant rights. */
  previewRole?: string | string[] | null;
}

const NO_CAPABILITIES: Readonly<EventCapabilities> = Object.freeze({
  canViewBudget: false,
  canViewExtraCosts: false,
  canViewGroupContributions: false,
  canViewOwnShareOnly: false,
  canManageInvitations: false,
  canRemindGuests: false,
  canEditEvent: false,
  canManagePackages: false,
  canViewPackages: false,
});

const ORGANIZER_CAPABILITIES: Readonly<EventCapabilities> = Object.freeze({
  canViewBudget: true,
  canViewExtraCosts: true,
  canViewGroupContributions: true,
  canViewOwnShareOnly: true,
  canManageInvitations: true,
  canRemindGuests: true,
  canEditEvent: true,
  canManagePackages: true,
  canViewPackages: true,
});

const GUEST_CAPABILITIES: Readonly<EventCapabilities> = Object.freeze({
  canViewBudget: true,
  canViewExtraCosts: true,
  canViewGroupContributions: true,
  canViewOwnShareOnly: true,
  canManageInvitations: false,
  canRemindGuests: false,
  canEditEvent: false,
  canManagePackages: false,
  canViewPackages: true,
});

const ROLE_RANK: Record<EventRole, number> = {
  honoree: 0,
  guest: 1,
  organizer: 2,
};

function normalizeRole(value: unknown): EventRole | null {
  return value === 'organizer' || value === 'guest' || value === 'honoree' ? value : null;
}

function firstParam(value: string | string[] | null | undefined): string | null {
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
}

function resolveDataRole(input: ResolveEventCapabilitiesInput): EventRole | null {
  const { event, userId, participants } = input;
  if (!event || !userId) return null;
  if (event.created_by === userId) return 'organizer';

  const participantRole = normalizeRole(
    participants?.find((participant) => participant.user_id === userId)?.role
      ?? (event.current_user_id === userId ? event.current_user_role : null),
  );

  // Event ownership is the sole source of organizer authority. A stale or
  // malformed participant row must not grant organizer capabilities.
  return participantRole === 'organizer' ? null : participantRole;
}

function reduceForPreview(dataRole: EventRole, previewRoleValue: string | null): EventRole {
  const previewRole = normalizeRole(previewRoleValue);
  if (!previewRole || ROLE_RANK[previewRole] >= ROLE_RANK[dataRole]) return dataRole;
  return previewRole;
}

export function resolveEventCapabilities(
  input: ResolveEventCapabilitiesInput,
): EventCapabilities {
  const dataRole = resolveDataRole(input);
  if (!dataRole) return { ...NO_CAPABILITIES };

  const effectiveRole = reduceForPreview(dataRole, firstParam(input.previewRole));
  if (effectiveRole === 'organizer') return { ...ORGANIZER_CAPABILITIES };
  if (effectiveRole === 'guest') return { ...GUEST_CAPABILITIES };

  const honoreePays = input.booking?.exclude_honoree === false || input.ownSharePays === true;
  return {
    ...NO_CAPABILITIES,
    canViewOwnShareOnly: honoreePays,
  };
}
