/**
 * Test Users
 * Pre-seeded test users for E2E testing
 */

export const TEST_USERS = {
  organizer: {
    email: 'e2e-organizer@test.gameoverapp.com',
    password: 'TestPassword123!',
    id: 'e2e-organizer-uuid',
    name: 'E2E Organizer',
  },
  guest: {
    email: 'e2e-guest@test.gameoverapp.com',
    password: 'TestPassword123!',
    id: 'e2e-guest-uuid',
    name: 'E2E Guest',
  },
  newUser: {
    email: `e2e-new-${Date.now()}@test.gameoverapp.com`,
    password: 'NewUser123!',
    name: 'New E2E User',
  },
} as const;

export type TestUserRole = keyof typeof TEST_USERS;
