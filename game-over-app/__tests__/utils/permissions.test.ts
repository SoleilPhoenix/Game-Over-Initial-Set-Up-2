import { describe, expect, it } from 'vitest';
import { resolveEventCapabilities } from '@/utils/permissions';

const event = { created_by: 'organizer-id' };
const participants = [
  { user_id: 'organizer-id', role: 'organizer' },
  { user_id: 'guest-id', role: 'guest' },
  { user_id: 'honoree-id', role: 'honoree' },
];

describe('resolveEventCapabilities', () => {
  it('grants the organizer all capabilities from event ownership', () => {
    expect(resolveEventCapabilities({ event, userId: 'organizer-id', participants })).toEqual({
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
  });

  it('keeps existing guest visibility without organizer management rights', () => {
    expect(resolveEventCapabilities({ event, userId: 'guest-id', participants })).toEqual({
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
  });

  it('lets a paying honoree see only their own share', () => {
    expect(resolveEventCapabilities({
      event,
      userId: 'honoree-id',
      participants,
      booking: { exclude_honoree: false },
    })).toEqual({
      canViewBudget: false,
      canViewExtraCosts: false,
      canViewGroupContributions: false,
      canViewOwnShareOnly: true,
      canManageInvitations: false,
      canRemindGuests: false,
      canEditEvent: false,
      canManagePackages: false,
      canViewPackages: false,
    });
  });

  it('gives a non-paying honoree no financial capabilities', () => {
    const capabilities = resolveEventCapabilities({
      event,
      userId: 'honoree-id',
      participants,
      booking: { exclude_honoree: true },
    });

    expect(capabilities.canViewBudget).toBe(false);
    expect(capabilities.canViewExtraCosts).toBe(false);
    expect(capabilities.canViewOwnShareOnly).toBe(false);
  });

  it('default-denies a user without a participant row', () => {
    expect(Object.values(resolveEventCapabilities({
      event,
      userId: 'unknown-id',
      participants,
    }))).toEqual(Array(9).fill(false));
  });

  it('does not reuse a denormalized participant role from another cached user', () => {
    const capabilities = resolveEventCapabilities({
      event: {
        ...event,
        current_user_id: 'guest-id',
        current_user_role: 'guest',
      },
      userId: 'unknown-id',
    });

    expect(capabilities.canViewBudget).toBe(false);
  });

  it('does not let ?role=guest raise a honoree to guest rights', () => {
    const capabilities = resolveEventCapabilities({
      event,
      userId: 'honoree-id',
      participants,
      booking: { exclude_honoree: false },
      previewRole: 'guest',
    });

    expect(capabilities.canViewBudget).toBe(false);
    expect(capabilities.canViewExtraCosts).toBe(false);
    expect(capabilities.canViewGroupContributions).toBe(false);
    expect(capabilities.canViewOwnShareOnly).toBe(true);
  });

  it('allows an organizer to preview the lower-rights guest view', () => {
    const capabilities = resolveEventCapabilities({
      event,
      userId: 'organizer-id',
      participants,
      previewRole: 'guest',
    });

    expect(capabilities.canViewBudget).toBe(true);
    expect(capabilities.canManageInvitations).toBe(false);
    expect(capabilities.canEditEvent).toBe(false);
  });
});
