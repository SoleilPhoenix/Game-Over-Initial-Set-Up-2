/**
 * Auth Utilities
 * Helper functions for authentication in E2E tests
 */

import { by, element, expect, waitFor } from 'detox';
import { TEST_USERS, TestUserRole } from '../setup/testUsers';

/**
 * Login via the UI (slow but tests actual flow)
 */
export async function loginAsTestUser(role: TestUserRole = 'organizer') {
  const user = TEST_USERS[role];

  // Navigate to login if not already there
  try {
    await waitFor(element(by.id('login-submit-button')))
      .toBeVisible()
      .withTimeout(5000);
  } catch {
    // Already on login screen or need to navigate
    try {
      await element(by.id('login-link')).tap();
      await waitFor(element(by.id('login-submit-button')))
        .toBeVisible()
        .withTimeout(5000);
    } catch {
      // Already on login
    }
  }

  // Fill login form
  await element(by.id('input-email')).clearText();
  await element(by.id('input-email')).typeText(user.email);
  await element(by.id('input-password')).clearText();
  await element(by.id('input-password')).typeText(user.password);

  // Submit
  await element(by.id('login-submit-button')).tap();

  // Wait for dashboard
  await waitFor(element(by.id('events-list')))
    .toBeVisible()
    .withTimeout(15000);
}

/**
 * Logout the current user
 */
export async function logout() {
  // Navigate to profile tab
  await element(by.id('tab-profile')).tap();

  // Tap logout
  await element(by.id('logout-button')).tap();

  // Confirm if needed
  try {
    await element(by.text('Confirm')).tap();
  } catch {
    // No confirmation needed
  }

  // Wait for welcome screen
  await waitFor(element(by.id('welcome-screen')))
    .toBeVisible()
    .withTimeout(10000);
}

/**
 * Sign up a new user
 */
export async function signUpNewUser() {
  const user = TEST_USERS.newUser;
  const uniqueEmail = `e2e-new-${Date.now()}@test.gameoverapp.com`;

  // Navigate to signup
  await element(by.id('signup-button')).tap();

  // Fill signup form
  await element(by.id('name-input')).typeText(user.name);
  await element(by.id('email-input')).typeText(uniqueEmail);
  await element(by.id('password-input')).typeText(user.password);

  // Accept terms
  await element(by.id('terms-checkbox')).tap();

  // Submit
  await element(by.id('create-account-button')).tap();

  // Wait for dashboard
  await waitFor(element(by.id('events-list')))
    .toBeVisible()
    .withTimeout(15000);

  return { ...user, email: uniqueEmail };
}

/**
 * Check if user is logged in
 */
export async function isLoggedIn(): Promise<boolean> {
  try {
    await expect(element(by.id('events-list'))).toBeVisible();
    return true;
  } catch {
    return false;
  }
}

/**
 * Create a test event with optional participants
 */
export async function createTestEvent(options: {
  withParticipants?: boolean;
  participantCount?: number;
} = {}): Promise<void> {
  const { withParticipants = false, participantCount = 3 } = options;

  // Navigate to events tab
  await element(by.id('tab-events')).tap();
  await waitFor(element(by.id('create-event-button')))
    .toBeVisible()
    .withTimeout(5000);

  // Start event creation
  await element(by.id('create-event-button')).tap();

  // Fill wizard quickly
  await element(by.id('party-type-bachelor')).tap();
  await element(by.id('honoree-name-input')).typeText('TestEvent');

  try {
    await element(by.id('city-chip-las-vegas')).tap();
  } catch {
    await element(by.id('city-chips')).tap();
  }

  await element(by.id('wizard-next-button')).tap();

  // Step 2
  await element(by.id('gathering-size-small_group')).tap();
  await element(by.id('energy-level-moderate')).tap();
  await element(by.id('wizard-next-button')).tap();

  // Step 3
  await element(by.id('age-range-26-30')).tap();
  await element(by.id('wizard-next-button')).tap();

  // Step 4 - skip package
  await element(by.id('wizard-next-button')).tap();

  // Step 5 - create
  await element(by.id('create-event-button')).tap();

  // Wait for event to be created
  await waitFor(element(by.id('event-summary-screen')))
    .toBeVisible()
    .withTimeout(15000);

  // Add participants if requested
  if (withParticipants) {
    await element(by.id('manage-participants-button')).tap();

    for (let i = 0; i < participantCount; i++) {
      await element(by.id('add-participant-button')).tap();
      await element(by.id('participant-email-input')).typeText(
        `participant${i}@test.com`
      );
      await element(by.id('send-invite-button')).tap();
      await waitFor(element(by.text('Invite sent')))
        .toBeVisible()
        .withTimeout(3000);
    }

    await element(by.id('close-participants-modal')).tap();
  }
}
