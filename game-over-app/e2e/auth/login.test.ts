/**
 * Login Screen E2E Tests
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

describe('Login Screen', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
  });

  beforeEach(async () => {
    await device.reloadReactNative();
    // Navigate to login screen
    await waitForElement('welcome-screen');
    await element(by.text('Log In')).tap();
    await waitForElement('login-screen');
  });

  it('should display login form elements', async () => {
    // Verify header
    await assertTextVisible('Welcome Back');
    await assertTextVisible('Sign in to continue planning your party');

    // Verify form fields
    await assertVisible('input-email');
    await assertVisible('input-password');

    // Verify buttons
    await assertTextVisible('Log In');
    await assertTextVisible('Forgot Password?');
  });

  it('should display back button and navigate back', async () => {
    await tap('back-button');
    await waitForElement('welcome-screen');
  });

  it('should show validation error for empty email', async () => {
    await tap('input-password');
    await typeInInput('input-password', TEST_USER.password);

    await dismissKeyboard();
    await tap('login-submit-button');

    // Email field should show error
    await assertTextVisible('Please enter a valid email');
  });

  it('should show validation error for empty password', async () => {
    await typeInInput('input-email', TEST_USER.email);

    await dismissKeyboard();
    await tap('login-submit-button');

    // Password field should show error
    await assertTextVisible('Password is required');
  });

  it('should show validation error for invalid email format', async () => {
    await typeInInput('input-email', 'invalid-email');
    await typeInInput('input-password', TEST_USER.password);

    await dismissKeyboard();
    await tap('login-submit-button');

    await assertTextVisible('Please enter a valid email');
  });

  it('should toggle password visibility', async () => {
    await typeInInput('input-password', TEST_USER.password);

    // Initial state - Show button visible
    await assertTextVisible('Show');

    // Tap to show password
    await element(by.text('Show')).tap();

    // Should now show Hide button
    await assertTextVisible('Hide');

    // Tap to hide again
    await element(by.text('Hide')).tap();
    await assertTextVisible('Show');
  });

  it('should navigate to forgot password screen', async () => {
    await element(by.text('Forgot Password?')).tap();

    await waitForElement('forgot-password-screen');
    await assertTextVisible('Forgot Password?');
  });

  it('should navigate to signup screen via link', async () => {
    await element(by.text('Sign Up')).tap();

    await waitForElement('signup-screen');
    await assertTextVisible('Create Account');
  });

  // Integration test - requires real Supabase connection
  it.skip('should show error for invalid credentials', async () => {
    await typeInInput('input-email', 'wrong@email.com');
    await typeInInput('input-password', 'WrongPassword123!');

    await dismissKeyboard();
    await tap('login-submit-button');

    // Wait for error message
    await waitForElement('error-message', 10000);
    await assertTextVisible('Invalid login credentials');
  });

  // Integration test - requires real Supabase connection
  it.skip('should successfully login and navigate to main app', async () => {
    await typeInInput('input-email', TEST_USER.email);
    await typeInInput('input-password', TEST_USER.password);

    await dismissKeyboard();
    await tap('login-submit-button');

    // Wait for navigation to main app
    await waitForElement('events-screen', 15000);
    await assertTextVisible('Welcome back');
  });
});
