import { describe, it, expect, vi, beforeEach } from 'vitest';
import AsyncStorage from '@react-native-async-storage/async-storage';

describe('initBudgetCache', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('hydrates in-memory budgetCache from AsyncStorage on init', async () => {
    const mockData = {
      'event-abc': { totalCents: 10000, perPersonCents: 5000, payingCount: 2, paidAmountCents: 0 },
    };
    vi.mocked(AsyncStorage.getItem).mockResolvedValueOnce(JSON.stringify(mockData));

    const { initBudgetCache, getAllBudgetInfos } = await import('@/lib/participantCountCache');

    await initBudgetCache();

    expect(getAllBudgetInfos()).toEqual(mockData);
  });

  it('handles missing AsyncStorage data gracefully', async () => {
    vi.mocked(AsyncStorage.getItem).mockResolvedValueOnce(null);
    const { initBudgetCache, getAllBudgetInfos } = await import('@/lib/participantCountCache');

    await initBudgetCache();

    expect(getAllBudgetInfos()).toEqual({});
  });

  it('handles corrupted AsyncStorage data without throwing', async () => {
    vi.mocked(AsyncStorage.getItem).mockResolvedValueOnce('not valid json{{{');
    const { initBudgetCache } = await import('@/lib/participantCountCache');

    await expect(initBudgetCache()).resolves.not.toThrow();
  });
});
