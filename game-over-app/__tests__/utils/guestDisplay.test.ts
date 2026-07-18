import { describe, it, expect } from 'vitest';
import { resolveGuestDisplay } from '@/utils/guestDisplay';

describe('resolveGuestDisplay (Option B)', () => {
  it('prefers the registered guest self-provided name over the organizer-entered name', () => {
    const r = resolveGuestDisplay({
      isRegistered: true,
      profileFullName: 'Max Mustermann',
      profilePhone: '+49 170 1111111',
      inviteFirstName: 'Maximilian',
      inviteLastName: 'M.',
      invitePhone: '+49 170 9999999',
    });
    expect(r.name).toBe('Max Mustermann');
    expect(r.phone).toBe('+49 170 1111111');
  });

  it('falls back to organizer invite data for a not-yet-registered slot', () => {
    const r = resolveGuestDisplay({
      isRegistered: false,
      profileFullName: null,
      profilePhone: null,
      inviteFirstName: 'Anna',
      inviteLastName: 'Beispiel',
      invitePhone: '+49 170 2222222',
    });
    expect(r.name).toBe('Anna Beispiel');
    expect(r.phone).toBe('+49 170 2222222');
  });

  it('uses invite phone when a registered guest has no self-provided phone', () => {
    const r = resolveGuestDisplay({
      isRegistered: true,
      profileFullName: 'Max Mustermann',
      profilePhone: null,
      inviteFirstName: 'Maximilian',
      inviteLastName: 'M.',
      invitePhone: '+49 170 9999999',
    });
    expect(r.phone).toBe('+49 170 9999999');
  });

  it('returns empty name when nothing is known', () => {
    const r = resolveGuestDisplay({
      isRegistered: false,
      profileFullName: null,
      profilePhone: null,
      inviteFirstName: '',
      inviteLastName: '',
      invitePhone: '',
    });
    expect(r.name).toBe('');
    expect(r.phone).toBe('');
  });
});
