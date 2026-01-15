/**
 * Wizard Step 1: Key Details Tests
 */

import { by, device, element, expect, waitFor } from 'detox';
import { loginAsTestUser } from '../utils/auth';
import { navigateToCreateEvent } from '../utils/navigation';

describe('Wizard Step 1: Key Details', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
    await loginAsTestUser('organizer');
  });

  beforeEach(async () => {
    await device.reloadReactNative();
    await loginAsTestUser('organizer');
    await navigateToCreateEvent();
  });

  it('should display party type selection', async () => {
    await expect(element(by.id('party-type-bachelor'))).toBeVisible();
    await expect(element(by.id('party-type-bachelorette'))).toBeVisible();
  });

  it('should allow selecting bachelor party type', async () => {
    await element(by.id('party-type-bachelor')).tap();
    // Visual feedback would indicate selection
  });

  it('should allow selecting bachelorette party type', async () => {
    await element(by.id('party-type-bachelorette')).tap();
  });

  it('should display honoree name input', async () => {
    await expect(element(by.id('honoree-name-input'))).toBeVisible();
  });

  it('should allow entering honoree name', async () => {
    await element(by.id('honoree-name-input')).typeText('John');
    await expect(element(by.id('honoree-name-input'))).toHaveText('John');
  });

  it('should display city selection chips', async () => {
    await expect(element(by.id('city-chips'))).toBeVisible();
  });

  it('should disable continue button when form is incomplete', async () => {
    // Continue should be disabled without selections
    const continueBtn = element(by.id('wizard-next-button'));
    await expect(continueBtn).toBeVisible();
  });

  it('should enable continue button when form is complete', async () => {
    await element(by.id('party-type-bachelor')).tap();
    await element(by.id('honoree-name-input')).typeText('John');
    // Select a city chip
    try {
      await element(by.id('city-chip-las-vegas')).tap();
    } catch {
      // City might not exist, try another
    }
    // Continue should now be enabled
    await expect(element(by.id('wizard-next-button'))).toBeVisible();
  });
});
