import { describe, it, expect } from 'vitest';
import {
  formatGuestChanges,
  formatPreviousGuestValues,
  isGuestDataChangedMeta,
  joinList,
} from '@/utils/guestDataChange';

const labels = { name: 'Name', email: 'E-Mail', phone: 'Telefon' } as const;

describe('formatGuestChanges', () => {
  it('renders a single change with its localized label', () => {
    expect(
      formatGuestChanges([{ field: 'name', from: 'Max M.', to: 'Maximilian' }], labels),
    ).toBe('Name: Max M. → Maximilian');
  });

  it('joins multiple changes with a comma', () => {
    expect(
      formatGuestChanges(
        [
          { field: 'name', from: 'Max M.', to: 'Maximilian' },
          { field: 'phone', from: '+49 1', to: '+49 2' },
        ],
        labels,
      ),
    ).toBe('Name: Max M. → Maximilian, Telefon: +49 1 → +49 2');
  });
});

describe('formatPreviousGuestValues', () => {
  it('joins previous name, email, and phone values', () => {
    expect(
      formatPreviousGuestValues([
        { field: 'name', from: 'Svenja Schmidt', to: 'Svenja Meier' },
        { field: 'email', from: 'old@example.com', to: 'new@example.com' },
        { field: 'phone', from: '0160-54864643', to: '0170-1234567' },
      ]),
    ).toBe('Svenja Schmidt, old@example.com & 0160-54864643');
  });
});

describe('joinList', () => {
  // Guards the wording: a plain join produces "Name und E-Mail und Telefon",
  // which reads as a mistake — and three changed fields is the normal case,
  // because a guest correcting their entry usually corrects all of it.
  it('renders one, two and three items the way a person writes them', () => {
    expect(joinList(['Name'], 'und')).toBe('Name');
    expect(joinList(['Name', 'Telefon'], 'und')).toBe('Name und Telefon');
    expect(joinList(['Name', 'E-Mail', 'Telefon'], 'und')).toBe('Name, E-Mail und Telefon');
    expect(joinList(['Name', 'Email', 'Phone'], 'and')).toBe('Name, Email and Phone');
  });

  it('returns an empty string for an empty list', () => {
    expect(joinList([], 'und')).toBe('');
  });
});

describe('isGuestDataChangedMeta', () => {
  it('accepts a well-formed metadata object', () => {
    expect(
      isGuestDataChangedMeta({ guestName: 'Max', changes: [{ field: 'name', from: 'a', to: 'b' }] }),
    ).toBe(true);
  });

  it('rejects malformed values', () => {
    expect(isGuestDataChangedMeta(null)).toBe(false);
    expect(isGuestDataChangedMeta({ guestName: 'Max' })).toBe(false);
    expect(isGuestDataChangedMeta({ guestName: 'Max', changes: [{ field: 'name' }] })).toBe(false);
  });
});
