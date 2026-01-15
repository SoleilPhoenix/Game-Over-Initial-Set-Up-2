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
