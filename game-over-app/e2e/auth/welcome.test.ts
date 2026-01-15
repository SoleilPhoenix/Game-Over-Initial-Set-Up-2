/**
 * Welcome Screen E2E Tests
 */

import { device, element, by, expect } from 'detox';
import {
  waitForElement,
  assertTextVisible,
  tap,
  restartApp,
} from '../utils/testHelpers';

describe('Welcome Screen', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('should display welcome screen on first launch', async () => {
    // Wait for welcome screen to load
    await waitForElement('welcome-screen');

    // Verify logo is displayed
    await assertTextVisible('GAME');
    await assertTextVisible('OVER');

    // Verify tagline
    await assertTextVisible('Plan the perfect send-off party');
  });

  it('should display all social sign-in buttons', async () => {
    await waitForElement('welcome-screen');

    // Verify social buttons
    await assertTextVisible('Continue with Apple');
    await assertTextVisible('Continue with Google');
    await assertTextVisible('Continue with Facebook');
  });

  it('should display create account button', async () => {
    await waitForElement('welcome-screen');

    // Verify create account button
    await assertTextVisible('Create Account');
  });

  it('should display login link', async () => {
    await waitForElement('welcome-screen');

    // Verify login link
    await assertTextVisible('Already have an account?');
    await assertTextVisible('Log In');
  });

  it('should display terms and privacy policy text', async () => {
    await waitForElement('welcome-screen');

    // Verify terms text
    await assertTextVisible('Terms of Service');
    await assertTextVisible('Privacy Policy');
  });

  it('should navigate to signup screen when Create Account is tapped', async () => {
    await waitForElement('welcome-screen');

    // Tap create account
    await tap('create-account-button');

    // Verify we're on signup screen
    await waitForElement('signup-screen');
    await assertTextVisible('Create Account');
    await assertTextVisible('Full Name');
  });

  it('should navigate to login screen when Log In is tapped', async () => {
    await waitForElement('welcome-screen');

    // Tap login link
    await element(by.text('Log In')).tap();

    // Verify we're on login screen
    await waitForElement('login-screen');
    await assertTextVisible('Welcome Back');
  });
});
