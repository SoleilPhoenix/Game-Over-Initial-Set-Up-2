/**
 * Navigation Utilities
 * Helper functions for navigating in E2E tests
 */

import { by, element, waitFor } from 'detox';

/**
 * Navigate to a tab
 */
export async function navigateToTab(tab: 'events' | 'chat' | 'budget' | 'profile') {
  await element(by.id(`tab-${tab}`)).tap();
  await waitFor(element(by.id(`${tab}-screen`)))
    .toBeVisible()
    .withTimeout(5000);
}

/**
 * Navigate to create event wizard
 */
export async function navigateToCreateEvent() {
  await element(by.id('create-event-button')).tap();
  await waitFor(element(by.id('party-type-bachelor')))
    .toBeVisible()
    .withTimeout(5000);
}

/**
 * Navigate to an event by tapping on the first event card
 * Note: Event cards use testID pattern event-card-{uuid}
 */
export async function navigateToFirstEvent() {
  // Use index-based selector to tap first event card in the list
  await element(by.id('events-list')).atIndex(0).tap();
  await waitFor(element(by.id('event-summary-screen')))
    .toBeVisible()
    .withTimeout(5000);
}

/**
 * Go back
 */
export async function goBack() {
  await element(by.id('back-button')).tap();
}

/**
 * Close modal
 */
export async function closeModal() {
  await element(by.id('wizard-close-button')).tap();
}

/**
 * Wait for a screen to be visible
 */
export async function waitForScreen(screenTestId: string, timeout = 10000) {
  await waitFor(element(by.id(screenTestId)))
    .toBeVisible()
    .withTimeout(timeout);
}

/**
 * Scroll to element
 */
export async function scrollToElement(
  elementId: string,
  scrollViewId: string,
  direction: 'up' | 'down' = 'down'
) {
  await waitFor(element(by.id(elementId)))
    .toBeVisible()
    .whileElement(by.id(scrollViewId))
    .scroll(200, direction);
}
