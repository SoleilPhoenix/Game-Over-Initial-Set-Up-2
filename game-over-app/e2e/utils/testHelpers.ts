/**
 * E2E Test Helpers
 * Utility functions for E2E tests
 */

import { device, element, by, expect, waitFor } from 'detox';

// Test user credentials (should match Supabase test users)
export const TEST_USER = {
  email: 'test@gameoverapp.com',
  password: 'TestPassword123!',
  fullName: 'Test User',
};

export const TEST_USER_NEW = {
  email: `test-${Date.now()}@gameoverapp.com`,
  password: 'NewTestPassword123!',
  fullName: 'New Test User',
};

/**
 * Wait for element to be visible with custom timeout
 */
export async function waitForElement(
  testID: string,
  timeout: number = 10000
): Promise<void> {
  await waitFor(element(by.id(testID)))
    .toBeVisible()
    .withTimeout(timeout);
}

/**
 * Wait for text to be visible
 */
export async function waitForText(
  text: string,
  timeout: number = 10000
): Promise<void> {
  await waitFor(element(by.text(text)))
    .toBeVisible()
    .withTimeout(timeout);
}

/**
 * Type text into an input field
 */
export async function typeInInput(
  testID: string,
  text: string
): Promise<void> {
  await element(by.id(testID)).tap();
  await element(by.id(testID)).clearText();
  await element(by.id(testID)).typeText(text);
}

/**
 * Tap a button or element
 */
export async function tap(testID: string): Promise<void> {
  await element(by.id(testID)).tap();
}

/**
 * Tap text
 */
export async function tapText(text: string): Promise<void> {
  await element(by.text(text)).tap();
}

/**
 * Scroll to element
 */
export async function scrollToElement(
  testID: string,
  scrollViewID: string,
  direction: 'up' | 'down' = 'down'
): Promise<void> {
  await waitFor(element(by.id(testID)))
    .toBeVisible()
    .whileElement(by.id(scrollViewID))
    .scroll(200, direction);
}

/**
 * Assert element is visible
 */
export async function assertVisible(testID: string): Promise<void> {
  await expect(element(by.id(testID))).toBeVisible();
}

/**
 * Assert element is not visible
 */
export async function assertNotVisible(testID: string): Promise<void> {
  await expect(element(by.id(testID))).not.toBeVisible();
}

/**
 * Assert text is visible
 */
export async function assertTextVisible(text: string): Promise<void> {
  await expect(element(by.text(text))).toBeVisible();
}

/**
 * Dismiss keyboard
 */
export async function dismissKeyboard(): Promise<void> {
  if (device.getPlatform() === 'ios') {
    await element(by.id('keyboard-dismiss')).tap().catch(() => {
      // Try tapping outside inputs
    });
  } else {
    await device.pressBack();
  }
}

/**
 * Wait for loading to complete
 */
export async function waitForLoadingComplete(
  timeout: number = 15000
): Promise<void> {
  try {
    await waitFor(element(by.id('loading-indicator')))
      .not.toBeVisible()
      .withTimeout(timeout);
  } catch {
    // Loading indicator might not exist, which is fine
  }
}

/**
 * Restart the app
 */
export async function restartApp(): Promise<void> {
  await device.terminateApp();
  await device.launchApp({ newInstance: true });
}

/**
 * Clear app data and restart
 */
export async function cleanStart(): Promise<void> {
  await device.uninstallApp();
  await device.installApp();
  await device.launchApp({ newInstance: true });
}

/**
 * Take screenshot with name
 */
export async function takeScreenshot(name: string): Promise<void> {
  await device.takeScreenshot(name);
}

/**
 * Sign out if signed in
 */
export async function ensureSignedOut(): Promise<void> {
  try {
    // Check if we're on a screen with sign out option
    const profileTab = element(by.id('tab-profile'));
    if (await profileTab.exists) {
      await profileTab.tap();
      await waitForElement('sign-out-button', 2000);
      await tap('sign-out-button');
      await waitForElement('welcome-screen', 5000);
    }
  } catch {
    // Already signed out or on auth screen
  }
}
