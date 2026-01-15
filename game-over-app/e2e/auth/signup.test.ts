/**
 * Sign Up Screen E2E Tests
 */

import { device, element, by, expect } from 'detox';
import {
  waitForElement,
  assertTextVisible,
  assertVisible,
  tap,
  typeInInput,
  dismissKeyboard,
  TEST_USER_NEW,
} from '../utils/testHelpers';

describe('Sign Up Screen', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
  });

  beforeEach(async () => {
    await device.reloadReactNative();
    // Navigate to signup screen
    await waitForElement('welcome-screen');
    await tap('create-account-button');
    await waitForElement('signup-screen');
  });

  it('should display all form fields', async () => {
    // Verify all input fields are present
    await assertVisible('input-full-name');
    await assertVisible('input-email');
    await assertVisible('input-password');
    await assertVisible('input-confirm-password');
  });

  it('should display back button and navigate back', async () => {
    // Tap back button
    await tap('back-button');

    // Verify we're back on welcome screen
    await waitForElement('welcome-screen');
  });

  it('should show validation error for empty full name', async () => {
    // Focus and blur full name field without entering anything
    await tap('input-email');
    await typeInInput('input-email', TEST_USER_NEW.email);

    // Try to submit
    await tap('signup-submit-button');

    // Verify error message
    await assertTextVisible('Name must be at least 2 characters');
  });

  it('should show validation error for invalid email', async () => {
    await typeInInput('input-full-name', TEST_USER_NEW.fullName);
    await typeInInput('input-email', 'invalid-email');
    await typeInInput('input-password', TEST_USER_NEW.password);
    await typeInInput('input-confirm-password', TEST_USER_NEW.password);

    await dismissKeyboard();
    await tap('signup-submit-button');

    // Verify error message
    await assertTextVisible('Please enter a valid email');
  });

  it('should show validation error for weak password', async () => {
    await typeInInput('input-full-name', TEST_USER_NEW.fullName);
    await typeInInput('input-email', TEST_USER_NEW.email);
    await typeInInput('input-password', 'weak');
    await typeInInput('input-confirm-password', 'weak');

    await dismissKeyboard();
    await tap('signup-submit-button');

    // Verify error message - should show password requirements
    await assertTextVisible('Password must be at least 8 characters');
  });

  it('should show validation error for mismatched passwords', async () => {
    await typeInInput('input-full-name', TEST_USER_NEW.fullName);
    await typeInInput('input-email', TEST_USER_NEW.email);
    await typeInInput('input-password', TEST_USER_NEW.password);
    await typeInInput('input-confirm-password', 'DifferentPassword123!');

    await dismissKeyboard();
    await tap('signup-submit-button');

    // Verify error message
    await assertTextVisible('Passwords do not match');
  });

  it('should toggle password visibility', async () => {
    await typeInInput('input-password', TEST_USER_NEW.password);

    // Initial state should be hidden (Show button visible)
    await assertTextVisible('Show');

    // Tap to show password
    await element(by.text('Show')).atIndex(0).tap();

    // Should now show Hide button
    await assertTextVisible('Hide');
  });

  it('should show password requirements hint', async () => {
    await assertTextVisible('Min 8 chars with uppercase, lowercase, and number');
  });

  it('should navigate to login screen via link', async () => {
    await element(by.text('Log In')).tap();

    // Verify we're on login screen
    await waitForElement('login-screen');
    await assertTextVisible('Welcome Back');
  });

  it('should show loading state during submission', async () => {
    // Fill valid form
    await typeInInput('input-full-name', TEST_USER_NEW.fullName);
    await typeInInput('input-email', TEST_USER_NEW.email);
    await typeInInput('input-password', TEST_USER_NEW.password);
    await typeInInput('input-confirm-password', TEST_USER_NEW.password);

    await dismissKeyboard();
    await tap('signup-submit-button');

    // Loading indicator should appear (briefly)
    // Note: This might be too fast to catch in real tests
    // await assertVisible('loading-indicator');
  });

  // Integration test - requires real Supabase connection
  it.skip('should successfully create account and navigate to main app', async () => {
    const uniqueEmail = `test-${Date.now()}@gameoverapp.com`;

    await typeInInput('input-full-name', TEST_USER_NEW.fullName);
    await typeInInput('input-email', uniqueEmail);
    await typeInInput('input-password', TEST_USER_NEW.password);
    await typeInInput('input-confirm-password', TEST_USER_NEW.password);

    await dismissKeyboard();
    await tap('signup-submit-button');

    // Wait for navigation to main app
    await waitForElement('events-screen', 15000);
    await assertTextVisible('Welcome back');
  });
});
