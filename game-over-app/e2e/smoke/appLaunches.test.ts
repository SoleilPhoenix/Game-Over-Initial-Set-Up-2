/**
 * Smoke Test - App Launches
 * Basic sanity check that the app starts correctly
 */

import { by, device, element, expect } from 'detox';

describe('App Launch', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
  });

  it('should launch app successfully', async () => {
    // App should show either welcome screen (logged out) or events screen (logged in)
    try {
      await expect(element(by.id('welcome-screen'))).toBeVisible();
    } catch {
      await expect(element(by.id('events-list'))).toBeVisible();
    }
  });

  it('should display welcome screen for new users', async () => {
    await device.launchApp({ newInstance: true, delete: true });
    await expect(element(by.id('welcome-screen'))).toBeVisible();
  });

  it('should show create account button on welcome', async () => {
    await expect(element(by.id('create-account-button'))).toBeVisible();
  });

  it('should show login link on welcome', async () => {
    await expect(element(by.id('login-link'))).toBeVisible();
  });
});
