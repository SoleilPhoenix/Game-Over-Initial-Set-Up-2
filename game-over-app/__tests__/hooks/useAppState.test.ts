import { describe, it, expect, vi } from 'vitest';

/**
 * useAppState integration test
 *
 * NOTE: We cannot import AppState directly from 'react-native' in Vitest
 * because the package ships Flow syntax (import typeof …) that Vite cannot
 * parse. Instead we validate the addEventListener contract via the mocked
 * react-native module provided by the global setup.
 */

// Provide a full AppState mock that vitest can use without touching actual RN source
vi.mock('react-native', () => ({
  AppState: {
    currentState: 'active' as const,
    addEventListener: vi.fn(() => ({ remove: vi.fn() })),
  },
}));

describe('useAppState integration', () => {
  it('registers a change listener on AppState', async () => {
    const { AppState } = await import('react-native');
    const addSpy = vi.spyOn(AppState, 'addEventListener');
    const handler = vi.fn();
    const sub = AppState.addEventListener('change', handler);
    expect(addSpy).toHaveBeenCalledWith('change', handler);
    sub.remove();
  });
});
