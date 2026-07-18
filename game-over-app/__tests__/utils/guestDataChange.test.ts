import { describe, it, expect } from 'vitest';
import { formatGuestChanges, isGuestDataChangedMeta } from '@/utils/guestDataChange';

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
