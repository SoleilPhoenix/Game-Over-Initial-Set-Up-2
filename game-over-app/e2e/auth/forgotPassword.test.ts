/**
 * Forgot Password Screen E2E Tests
 */

import { device, element, by, expect } from 'detox';
import {
  waitForElement,
  assertTextVisible,
  assertVisible,
  tap,
  typeInInput,
  dismissKeyboard,
  TEST_USER,
} from '../utils/testHelpers';

describe('Forgot Password Screen', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
  });

  beforeEach(async () => {
    await device.reloadReactNative();
    // Navigate to forgot password screen
    await waitForElement('welcome-screen');
    await element(by.text('Log In')).tap();
    await waitForElement('login-screen');
    await element(by.text('Forgot Password?')).tap();
    await waitForElement('forgot-password-screen');
  });

  it('should display forgot password form elements', async () => {
    // Verify header
    await assertTextVisible('Forgot Password?');
    await assertTextVisible("No worries! Enter your email and we'll send you a reset link.");

    // Verify form field
    await assertVisible('input-email');

    // Verify buttons
    await assertTextVisible('Send Reset Link');
    await assertTextVisible('Back to Login');
  });

  it('should display back button and navigate back', async () => {
    await tap('back-button');
    await waitForElement('login-screen');
  });

  it('should show validation error for empty email', async () => {
    await tap('forgot-password-submit-button');

    await assertTextVisible('Please enter a valid email');
  });

  it('should show validation error for invalid email format', async () => {
    await typeInInput('input-email', 'invalid-email');

    await dismissKeyboard();
    await tap('forgot-password-submit-button');

    await assertTextVisible('Please enter a valid email');
  });

  it('should navigate back to login via link', async () => {
    await element(by.text('Back to Login')).tap();

    await waitForElement('login-screen');
    await assertTextVisible('Welcome Back');
  });

  // Integration test - requires real Supabase connection
  it.skip('should show success state after submitting valid email', async () => {
    await typeInInput('input-email', TEST_USER.email);

    await dismissKeyboard();
    await tap('forgot-password-submit-button');

    // Wait for success state
    await waitForElement('success-state', 10000);
    await assertTextVisible('Check Your Email');
    await assertTextVisible(TEST_USER.email);
    await assertTextVisible('Back to Login');
    await assertTextVisible('Try Different Email');
  });

  // Integration test - requires real Supabase connection
  it.skip('should allow trying different email from success state', async () => {
    await typeInInput('input-email', TEST_USER.email);

    await dismissKeyboard();
    await tap('forgot-password-submit-button');

    // Wait for success state
    await waitForElement('success-state', 10000);

    // Tap try different email
    await element(by.text('Try Different Email')).tap();

    // Should be back to form
    await assertVisible('input-email');
  });
});
