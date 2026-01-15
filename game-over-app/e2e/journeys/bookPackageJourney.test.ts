/**
 * Book Package Journey Test
 * Full happy path through package booking and payment
 */

import { by, device, element, expect, waitFor } from 'detox';
import { loginAsTestUser } from '../utils/auth';

describe('Book Package Journey', () => {
  beforeAll(async () => {
    await device.launchApp({
      newInstance: true,
      launchArgs: {
        E2E_MODE: 'true', // Enable payment mocking
      },
    });
    await loginAsTestUser('organizer');
  });

  it('completes full booking flow', async () => {
    // First create an event (or use existing)
    await element(by.id('fab-create-event')).tap();

    // Quick wizard completion
    await element(by.id('party-type-bachelor')).tap();
    await element(by.id('honoree-name-input')).typeText('BookingTest');
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

    // Step 4 - Select package
    await waitFor(element(by.text('Choose Your Package')))
      .toBeVisible()
      .withTimeout(10000);
    try {
      await element(by.id('package-card-0')).tap();
    } catch {
      // Skip if no packages
    }
    await element(by.id('wizard-next-button')).tap();

    // Step 5 - Create
    await element(by.id('create-event-button')).tap();

    // Wait for event summary
    await waitFor(element(by.id('book-package-button')))
      .toBeVisible()
      .withTimeout(15000);

    // Navigate to booking
    await element(by.id('book-package-button')).tap();

    // Booking Summary
    await waitFor(element(by.id('package-summary-card')))
      .toBeVisible()
      .withTimeout(5000);

    // Verify pricing elements
    await expect(element(by.id('cost-breakdown-card'))).toBeVisible();
    await expect(element(by.id('per-person-card'))).toBeVisible();

    // Toggle exclude honoree
    await element(by.id('exclude-honoree-toggle')).tap();
    await element(by.id('exclude-honoree-toggle')).tap();

    // Proceed to payment
    await element(by.id('proceed-to-payment-button')).tap();

    // Payment Screen
    await waitFor(element(by.id('payment-amount-card')))
      .toBeVisible()
      .withTimeout(5000);

    // Initiate payment (mocked in E2E mode)
    await element(by.id('pay-now-button')).tap();

    // Wait for confirmation
    await waitFor(element(by.id('booking-details-card')))
      .toBeVisible()
      .withTimeout(20000);

    // Verify booking confirmed
    await expect(element(by.text('Booking Confirmed!'))).toBeVisible();
  });
});
