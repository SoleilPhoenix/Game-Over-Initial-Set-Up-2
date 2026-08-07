import { describe, it, expect } from 'vitest';
import { resolveGuestDisplay } from '@/utils/guestDisplay';

describe('resolveGuestDisplay (Option B)', () => {
  it('prefers the registered guest self-provided name over the organizer-entered name', () => {
    const r = resolveGuestDisplay({
      isRegistered: true,
      profileFullName: 'Max Mustermann',
      profileEmail: 'max@example.com',
      profilePhone: '+49 170 1111111',
      inviteFirstName: 'Maximilian',
      inviteLastName: 'M.',
      inviteEmail: 'max@example.com',
      invitePhone: '+49 170 9999999',
    });
    expect(r.name).toBe('Max Mustermann');
    expect(r.phone).toBe('+49 170 1111111');
  });

  it('falls back to organizer invite data for a not-yet-registered slot', () => {
    const r = resolveGuestDisplay({
      isRegistered: false,
      profileFullName: null,
      profileEmail: null,
      profilePhone: null,
      inviteFirstName: 'Anna',
      inviteLastName: 'Beispiel',
      inviteEmail: 'anna@example.com',
      invitePhone: '+49 170 2222222',
    });
    expect(r.name).toBe('Anna Beispiel');
    expect(r.phone).toBe('+49 170 2222222');
  });

  it('uses invite phone when a registered guest has no self-provided phone', () => {
    const r = resolveGuestDisplay({
      isRegistered: true,
      profileFullName: 'Max Mustermann',
      profileEmail: 'max@example.com',
      profilePhone: null,
      inviteFirstName: 'Maximilian',
      inviteLastName: 'M.',
      inviteEmail: 'max@example.com',
      invitePhone: '+49 170 9999999',
    });
    expect(r.phone).toBe('+49 170 9999999');
  });

  it('returns empty name when nothing is known', () => {
    const r = resolveGuestDisplay({
      isRegistered: false,
      profileFullName: null,
      profileEmail: null,
      profilePhone: null,
      inviteFirstName: '',
      inviteLastName: '',
      inviteEmail: '',
      invitePhone: '',
    });
    expect(r.name).toBe('');
    expect(r.phone).toBe('');
  });

  describe('changedFromInvite', () => {
    it('flags a name change for a registered guest whose self-name differs from the invite name', () => {
      const r = resolveGuestDisplay({
        isRegistered: true,
        profileFullName: 'Maximilian Mustermann',
        profileEmail: 'max@example.com',
        profilePhone: null,
        inviteFirstName: 'Max',
        inviteLastName: 'M.',
        inviteEmail: 'max@example.com',
        invitePhone: '',
      });
      expect(r.changedFromInvite.name).toEqual({ from: 'Max M.', to: 'Maximilian Mustermann' });
    });

    it('flags a phone change when the registered guest phone differs from the invite phone', () => {
      const r = resolveGuestDisplay({
        isRegistered: true,
        profileFullName: 'Max M.',
        profileEmail: 'max@example.com',
        profilePhone: '+49 170 1111111',
        inviteFirstName: 'Max',
        inviteLastName: 'M.',
        inviteEmail: 'max@example.com',
        invitePhone: '+49 170 9999999',
      });
      expect(r.changedFromInvite.phone).toEqual({ from: '+49 170 9999999', to: '+49 170 1111111' });
      expect(r.changedFromInvite.name).toBeUndefined();
    });

    it('treats phone numbers that differ only in formatting as unchanged', () => {
      const r = resolveGuestDisplay({
        isRegistered: true,
        profileFullName: 'Max M.',
        profileEmail: 'max@example.com',
        profilePhone: '+49 170 1234567',
        inviteFirstName: 'Max',
        inviteLastName: 'M.',
        inviteEmail: 'max@example.com',
        invitePhone: '0170 1234567',
      });
      expect(r.changedFromInvite.phone).toBeUndefined();
    });

    it('reports no changes for a not-yet-registered slot', () => {
      const r = resolveGuestDisplay({
        isRegistered: false,
        profileFullName: null,
        profileEmail: null,
        profilePhone: null,
        inviteFirstName: 'Anna',
        inviteLastName: 'Beispiel',
        inviteEmail: 'anna@example.com',
        invitePhone: '+49 170 2222222',
      });
      expect(r.changedFromInvite).toEqual({});
    });

    it('reports no change when there was no organizer-entered value to diverge from', () => {
      const r = resolveGuestDisplay({
        isRegistered: true,
        profileFullName: 'Solo Guest',
        profileEmail: 'solo@example.com',
        profilePhone: '+49 170 3333333',
        inviteFirstName: '',
        inviteLastName: '',
        inviteEmail: '',
        invitePhone: '',
      });
      expect(r.changedFromInvite).toEqual({});
    });

    it('flags an email change when the registered account uses a different address', () => {
      const r = resolveGuestDisplay({
        isRegistered: true,
        profileFullName: 'Max M.',
        profileEmail: 'new@example.com',
        profilePhone: null,
        inviteFirstName: 'Max',
        inviteLastName: 'M.',
        inviteEmail: 'old@example.com',
        invitePhone: '',
      });
      expect(r.changedFromInvite.email).toEqual({
        from: 'old@example.com',
        to: 'new@example.com',
      });
    });

    it('reports no email change when the addresses are equal', () => {
      const r = resolveGuestDisplay({
        isRegistered: true,
        profileFullName: 'Max M.',
        profileEmail: 'same@example.com',
        profilePhone: null,
        inviteFirstName: 'Max',
        inviteLastName: 'M.',
        inviteEmail: 'same@example.com',
        invitePhone: '',
      });
      expect(r.changedFromInvite.email).toBeUndefined();
    });

    it('ignores email whitespace and casing differences', () => {
      const r = resolveGuestDisplay({
        isRegistered: true,
        profileFullName: 'Max M.',
        profileEmail: ' test-go4@action.ms ',
        profilePhone: null,
        inviteFirstName: 'Max',
        inviteLastName: 'M.',
        inviteEmail: ' Test-go4@action.ms ',
        invitePhone: '',
      });
      expect(r.changedFromInvite.email).toBeUndefined();
    });

    it('reports no email change when the invitation has no address', () => {
      const r = resolveGuestDisplay({
        isRegistered: true,
        profileFullName: 'Max M.',
        profileEmail: 'max@example.com',
        profilePhone: null,
        inviteFirstName: 'Max',
        inviteLastName: 'M.',
        inviteEmail: '',
        invitePhone: '',
      });
      expect(r.changedFromInvite.email).toBeUndefined();
    });
  });
});
