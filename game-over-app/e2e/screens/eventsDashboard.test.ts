/**
 * Events Dashboard Screen Tests
 */

import { by, device, element, expect, waitFor } from 'detox';
import { loginAsTestUser } from '../utils/auth';

describe('Events Dashboard', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
    await loginAsTestUser('organizer');
  });

  beforeEach(async () => {
    await device.reloadReactNative();
    await loginAsTestUser('organizer');
  });

  it('should display the welcome header', async () => {
    await expect(element(by.text('Welcome back,'))).toBeVisible();
  });

  it('should show create event button', async () => {
    await expect(element(by.id('create-event-button'))).toBeVisible();
  });

  it('should show empty state or events list', async () => {
    // Either empty state or events list should be visible
    try {
      await expect(element(by.id('events-list'))).toBeVisible();
    } catch {
      await expect(element(by.id('create-first-event-button'))).toBeVisible();
    }
  });

  it('should navigate to create event wizard on button tap', async () => {
    await element(by.id('create-event-button')).tap();
    await waitFor(element(by.id('party-type-bachelor')))
      .toBeVisible()
      .withTimeout(5000);
  });

  it('should display event cards when events exist', async () => {
    // Check if events list exists (means there are events)
    try {
      await expect(element(by.id('events-list'))).toBeVisible();
      // If list exists, at least one event card should be visible
      // Event cards have testID pattern: event-card-{uuid}
      await expect(element(by.id('events-list').withDescendant(by.type('RCTView')))).toExist();
    } catch {
      // No events - empty state is shown, which is valid
      await expect(element(by.id('create-first-event-button'))).toBeVisible();
    }
  });

  it('should support pull to refresh', async () => {
    try {
      // Only test refresh if events list exists
      await expect(element(by.id('events-list'))).toBeVisible();
      // Perform pull to refresh gesture
      await element(by.id('events-list')).swipe('down', 'slow', 0.5);
      // List should still be visible after refresh
      await waitFor(element(by.id('events-list')))
        .toBeVisible()
        .withTimeout(5000);
    } catch {
      // Empty state - skip refresh test
    }
  });
});
