/**
 * Test Utilities
 * Helper functions and providers for testing
 */

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

/**
 * Creates a fresh QueryClient for testing
 */
export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

/**
 * Wrapper component with all providers for testing
 */
export function TestProviders({ children }: { children: React.ReactNode }) {
  const queryClient = createTestQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

/**
 * Wait for next tick (useful for async state updates)
 */
export function waitForNextTick() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

/**
 * Create a mock user object
 */
export function createMockUser(overrides = {}) {
  return {
    id: 'test-user-id',
    email: 'test@example.com',
    user_metadata: {
      full_name: 'Test User',
      avatar_url: null,
    },
    ...overrides,
  };
}

/**
 * Create a mock session object
 */
export function createMockSession(overrides = {}) {
  return {
    access_token: 'test-access-token',
    refresh_token: 'test-refresh-token',
    expires_in: 3600,
    token_type: 'bearer',
    user: createMockUser(),
    ...overrides,
  };
}

/**
 * Create a mock event object
 */
export function createMockEvent(overrides = {}) {
  return {
    id: 'test-event-id',
    created_by: 'test-user-id',
    title: 'Test Bachelor Party',
    party_type: 'bachelor' as const,
    honoree_name: 'John',
    city_id: 'city-1',
    start_date: '2024-06-15',
    end_date: '2024-06-17',
    status: 'planning' as const,
    ...overrides,
  };
}

/**
 * Create a mock package object
 */
export function createMockPackage(overrides = {}) {
  return {
    id: 'test-package-id',
    name: 'VIP Experience',
    tier: 'grand' as const,
    city_id: 'city-1',
    base_price_cents: 200000,
    price_per_person_cents: 15000,
    description: 'The ultimate party experience',
    features: ['VIP table', 'Premium drinks', 'Photography'],
    rating: 4.8,
    review_count: 125,
    ...overrides,
  };
}
