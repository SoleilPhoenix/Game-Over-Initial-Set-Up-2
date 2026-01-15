/**
 * Create Event Journey Test
 * Full happy path through the event creation wizard
 */

import { by, device, element, expect, waitFor } from 'detox';
import { loginAsTestUser } from '../utils/auth';

describe('Create Event Journey', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
    await loginAsTestUser('organizer');
  });

  it('completes full wizard and creates event', async () => {
    // Navigate to wizard
    await element(by.id('create-event-button')).tap();

    // Step 1: Key Details
    await waitFor(element(by.text('What are you planning?')))
      .toBeVisible()
      .withTimeout(5000);
    await element(by.id('party-type-bachelor')).tap();
    await element(by.id('honoree-name-input')).typeText('TestGroom');

    // Try to select a city (may vary based on seed data)
    try {
      await element(by.id('city-chip-las-vegas')).tap();
    } catch {
      // Try first city chip available
      await element(by.id('city-chips')).tap();
    }
    await element(by.id('wizard-next-button')).tap();

    // Step 2: Honoree Preferences
    await waitFor(element(by.text("Groom's Preferences")))
      .toBeVisible()
      .withTimeout(5000);
    await element(by.id('gathering-size-small_group')).tap();
    await element(by.id('energy-level-moderate')).tap();
    await element(by.id('wizard-next-button')).tap();

    // Step 3: Group Preferences
    await waitFor(element(by.text('Group Preferences')))
      .toBeVisible()
      .withTimeout(5000);
    await element(by.id('age-range-26-30')).tap();
    await element(by.id('group-cohesion-close_friends')).tap();
    await element(by.id('wizard-next-button')).tap();

    // Step 4: Package Selection
    await waitFor(element(by.text('Choose Your Package')))
      .toBeVisible()
      .withTimeout(10000);

    // Select first package
    try {
      await element(by.id('package-card-0')).tap();
    } catch {
      // No packages available, skip
    }
    await element(by.id('wizard-next-button')).tap();

    // Step 5: Review
    await waitFor(element(by.text('Review Your Event')))
      .toBeVisible()
      .withTimeout(5000);

    // Verify data is displayed
    await expect(element(by.text('TestGroom'))).toBeVisible();
    await expect(element(by.text('Bachelor Party'))).toBeVisible();

    // Create event
    await element(by.id('create-event-button')).tap();

    // Should navigate to event summary
    await waitFor(element(by.id('event-summary-screen')))
      .toBeVisible()
      .withTimeout(15000);
  });
});
