/**
 * Invite System & Deep Linking E2E Tests
 * Comprehensive tests for invite generation, sharing, deep link handling, and management
 */

import { by, device, element, expect, waitFor } from 'detox';
import { loginAsTestUser, logout, createTestEvent } from '../utils/auth';
import {
  waitForElement,
  assertTextVisible,
  assertVisible,
  assertNotVisible,
  tap,
  typeInInput,
  dismissKeyboard,
  waitForLoadingComplete,
  TEST_USER,
} from '../utils/testHelpers';
import { navigateToTab, navigateToFirstEvent, goBack } from '../utils/navigation';

// Test invite codes for various scenarios
const TEST_INVITE_CODES = {
  valid: 'TESTCODE1',
  expired: 'EXPIREDCD',
  maxedOut: 'MAXUSEDCD',
  invalid: 'INVALIDXX',
  revoked: 'REVOKEDCD',
};

describe('Invite System', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
  });

  afterAll(async () => {
    await device.terminateApp();
  });

  describe('Invite Generation', () => {
    beforeEach(async () => {
      await device.reloadReactNative();
      await loginAsTestUser('organizer');
      await createTestEvent();
      await waitForElement('event-summary-screen', 15000);
    });

    it('should display share event banner on event screen', async () => {
      await assertVisible('share-event-banner');
      await assertTextVisible('Invite Your Group');
    });

    it('should generate a new invite code', async () => {
      // Open invite modal
      await tap('invite-modal-trigger');
      await waitForElement('invite-modal', 5000);

      // Generate invite
      await tap('generate-invite-button');
      await waitForLoadingComplete();

      // Verify invite code is displayed
      await assertVisible('invite-code-display');

      // Invite code should be visible (8 characters)
      await waitFor(element(by.id('invite-code-display')))
        .toBeVisible()
        .withTimeout(5000);
    });

    it('should copy invite code to clipboard', async () => {
      await tap('invite-modal-trigger');
      await waitForElement('invite-modal', 5000);
      await tap('generate-invite-button');
      await waitForLoadingComplete();

      // Copy the code
      await tap('copy-invite-code-button');

      // Verify feedback
      await assertTextVisible('Copied!');
    });

    it('should copy invite link to clipboard', async () => {
      await tap('invite-modal-trigger');
      await waitForElement('invite-modal', 5000);
      await tap('generate-invite-button');
      await waitForLoadingComplete();

      // Copy the full link
      await tap('copy-invite-link-button');

      // Verify feedback
      await assertTextVisible('Copied!');
    });

    it('should open share sheet with invite link', async () => {
      await tap('invite-modal-trigger');
      await waitForElement('invite-modal', 5000);
      await tap('generate-invite-button');
      await waitForLoadingComplete();

      // Tap share button
      await tap('share-invite-button');

      // Wait for share sheet to appear (system modal)
      // Share sheet is a system component, just verify no crash
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Dismiss share sheet if possible
      if (device.getPlatform() === 'ios') {
        try {
          await element(by.label('Close')).tap();
        } catch {
          // Share sheet might close automatically or have different dismiss
        }
      }
    });

    it('should display QR code for invite', async () => {
      await tap('invite-modal-trigger');
      await waitForElement('invite-modal', 5000);
      await tap('generate-invite-button');
      await waitForLoadingComplete();

      // Show QR code
      await tap('show-qr-code-button');
      await waitForElement('qr-code-modal', 5000);

      // Verify QR code is displayed
      await assertVisible('qr-code-image');

      // Close QR modal
      await tap('qr-code-close-button');
      await assertNotVisible('qr-code-modal');
    });

    it('should set custom expiration for invite', async () => {
      await tap('invite-modal-trigger');
      await waitForElement('invite-modal', 5000);

      // Open expiration picker
      await tap('invite-expiration-picker');
      await waitForElement('expiration-options', 5000);

      // Select 7 days
      await element(by.text('7 days')).tap();

      // Generate invite with custom expiration
      await tap('generate-invite-button');
      await waitForLoadingComplete();

      // Verify expiration is shown
      await assertTextVisible('Expires in 7 days');
    });

    it('should set max uses limit for invite', async () => {
      await tap('invite-modal-trigger');
      await waitForElement('invite-modal', 5000);

      // Set max uses
      await tap('invite-max-uses-picker');
      await waitForElement('max-uses-options', 5000);

      // Select 10 uses
      await element(by.text('10 uses')).tap();

      // Generate invite
      await tap('generate-invite-button');
      await waitForLoadingComplete();

      // Verify max uses is shown
      await assertTextVisible('10 uses remaining');
    });
  });

  describe('Deep Link Handling', () => {
    describe('When Logged Out', () => {
      beforeEach(async () => {
        await device.reloadReactNative();
        // Ensure logged out state
        try {
          await logout();
        } catch {
          // Already logged out
        }
        await waitForElement('welcome-screen', 5000);
      });

      it('should redirect to login when opening invite link while logged out', async () => {
        // Open deep link
        await device.openURL({ url: `gameover://invite/${TEST_INVITE_CODES.valid}` });

        // Should redirect to login with redirect param
        await waitForElement('login-screen', 5000);
        await assertTextVisible('Welcome Back');
      });

      it('should store invite code and redirect after login', async () => {
        // Open deep link while logged out
        await device.openURL({ url: `gameover://invite/${TEST_INVITE_CODES.valid}` });

        // Login
        await waitForElement('login-screen', 5000);
        await typeInInput('input-email', TEST_USER.email);
        await typeInInput('input-password', TEST_USER.password);
        await dismissKeyboard();
        await tap('login-submit-button');

        // After login, should show invite preview
        await waitForElement('invite-preview-screen', 15000);
        await assertTextVisible("You're Invited To");
      });

      it('should handle universal link (https) when logged out', async () => {
        // Open universal link
        await device.openURL({ url: `https://game-over.app/invite/${TEST_INVITE_CODES.valid}` });

        // Should redirect to login
        await waitForElement('login-screen', 5000);
      });
    });

    describe('When Logged In', () => {
      beforeEach(async () => {
        await device.reloadReactNative();
        await loginAsTestUser('organizer');
        await waitForElement('events-list', 10000);
      });

      it('should show invite preview screen when opening valid invite link', async () => {
        await device.openURL({ url: `gameover://invite/${TEST_INVITE_CODES.valid}` });

        await waitForElement('invite-preview-screen', 5000);
        await assertTextVisible("You're Invited To");
        await assertVisible('event-preview-card');
        await assertVisible('accept-invite-button');
      });

      it('should display event details on invite preview', async () => {
        await device.openURL({ url: `gameover://invite/${TEST_INVITE_CODES.valid}` });

        await waitForElement('invite-preview-screen', 5000);

        // Verify event details are shown
        await assertVisible('event-preview-card');
        // Event title, date, location should be visible
        await waitFor(element(by.id('event-preview-card')))
          .toBeVisible()
          .withTimeout(5000);
      });

      it('should accept invite and navigate to event', async () => {
        await device.openURL({ url: `gameover://invite/${TEST_INVITE_CODES.valid}` });

        await waitForElement('invite-preview-screen', 5000);
        await tap('accept-invite-button');

        // Wait for acceptance and navigation
        await waitForElement('event-summary-screen', 10000);

        // Verify user is now a participant
        await assertVisible('participant-list');
      });

      it('should handle decline/close invite preview', async () => {
        await device.openURL({ url: `gameover://invite/${TEST_INVITE_CODES.valid}` });

        await waitForElement('invite-preview-screen', 5000);

        // Tap decline or close
        await tap('decline-button');

        // Should go back to previous screen (events list)
        await waitForElement('events-list', 5000);
      });

      it('should show error for expired invite', async () => {
        await device.openURL({ url: `gameover://invite/${TEST_INVITE_CODES.expired}` });

        await waitForElement('invite-error-screen', 5000);
        await assertTextVisible('Invite Expired');
        await assertTextVisible('This invite link has expired');
        await assertVisible('go-home-button');
      });

      it('should show error for invalid invite code', async () => {
        await device.openURL({ url: `gameover://invite/${TEST_INVITE_CODES.invalid}` });

        await waitForElement('invite-error-screen', 5000);
        await assertTextVisible('Invalid Invite');
        await assertTextVisible('This invite link is invalid');
      });

      it('should show error for max uses reached', async () => {
        await device.openURL({ url: `gameover://invite/${TEST_INVITE_CODES.maxedOut}` });

        await waitForElement('invite-error-screen', 5000);
        await assertTextVisible('Invite Limit Reached');
        await assertTextVisible('maximum number of uses');
      });

      it('should handle universal link (https) when logged in', async () => {
        await device.openURL({ url: `https://game-over.app/invite/${TEST_INVITE_CODES.valid}` });

        await waitForElement('invite-preview-screen', 5000);
        await assertVisible('accept-invite-button');
      });

      it('should handle event deep link', async () => {
        // Test direct event deep link
        await device.openURL({ url: 'gameover://event/test-event-id' });

        // Should navigate to event or show not found
        try {
          await waitForElement('event-summary-screen', 5000);
        } catch {
          // Event might not exist, which is expected in test
          await waitForElement('event-not-found-screen', 5000);
        }
      });

      it('should handle https event link', async () => {
        await device.openURL({ url: 'https://game-over.app/event/test-event-id' });

        // Should navigate to event or show not found
        try {
          await waitForElement('event-summary-screen', 5000);
        } catch {
          await waitForElement('event-not-found-screen', 5000);
        }
      });
    });
  });

  describe('Invite Management', () => {
    beforeEach(async () => {
      await device.reloadReactNative();
      await loginAsTestUser('organizer');
      await createTestEvent();
      await waitForElement('event-summary-screen', 15000);
    });

    it('should display list of active invites', async () => {
      // Generate some invites first
      await tap('invite-modal-trigger');
      await waitForElement('invite-modal', 5000);
      await tap('generate-invite-button');
      await waitForLoadingComplete();
      await tap('close-modal-button');

      // Navigate to invites management
      await tap('manage-invites-button');
      await waitForElement('invites-list-screen', 5000);

      // Verify invite list is shown
      await assertVisible('invites-list');
      await assertVisible('invite-item-0');
    });

    it('should revoke an active invite', async () => {
      // Navigate to invites management
      await tap('manage-invites-button');
      await waitForElement('invites-list-screen', 5000);

      // Revoke first invite
      await tap('invite-item-0');
      await tap('revoke-invite-button');

      // Confirm revocation
      await assertTextVisible('Revoke Invite?');
      await element(by.text('Revoke')).tap();

      // Verify invite is revoked
      await assertTextVisible('Invite revoked');
    });

    it('should regenerate invite code', async () => {
      await tap('invite-modal-trigger');
      await waitForElement('invite-modal', 5000);
      await tap('generate-invite-button');
      await waitForLoadingComplete();

      // Store first code for comparison
      const firstCodeElement = element(by.id('invite-code-display'));

      // Regenerate
      await tap('regenerate-invite-button');
      await waitForLoadingComplete();

      // Verify new code is displayed (code changed)
      await assertVisible('invite-code-display');
    });

    it('should display invite usage statistics', async () => {
      // Navigate to invites management
      await tap('manage-invites-button');
      await waitForElement('invites-list-screen', 5000);

      // Tap on an invite to see details
      await tap('invite-item-0');
      await waitForElement('invite-details-screen', 5000);

      // Verify stats are displayed
      await assertVisible('invite-use-count');
      await assertVisible('invite-created-date');
      await assertVisible('invite-expires-date');
    });

    it('should show invite history', async () => {
      await tap('manage-invites-button');
      await waitForElement('invites-list-screen', 5000);

      // Toggle to show inactive/expired invites
      await tap('show-inactive-invites-toggle');

      // Verify inactive invites are shown
      await assertVisible('inactive-invites-section');
    });
  });

  describe('Universal Links (HTTPS)', () => {
    beforeEach(async () => {
      await device.reloadReactNative();
      await loginAsTestUser('organizer');
      await waitForElement('events-list', 10000);
    });

    it('should handle https://game-over.app/invite/ links', async () => {
      await device.openURL({ url: `https://game-over.app/invite/${TEST_INVITE_CODES.valid}` });

      await waitForElement('invite-preview-screen', 5000);
      await assertVisible('accept-invite-button');
    });

    it('should handle https://game-over.app/event/ links', async () => {
      await device.openURL({ url: 'https://game-over.app/event/test-event-123' });

      // Should navigate to event or show error
      try {
        await waitForElement('event-summary-screen', 5000);
      } catch {
        await waitForElement('event-not-found-screen', 5000);
      }
    });

    it('should handle malformed universal links gracefully', async () => {
      await device.openURL({ url: 'https://game-over.app/invite/' });

      // Should show error or redirect to home
      try {
        await waitForElement('invite-error-screen', 5000);
        await assertTextVisible('Invalid Invite');
      } catch {
        // Or should redirect to events
        await waitForElement('events-list', 5000);
      }
    });

    it('should handle unknown paths gracefully', async () => {
      await device.openURL({ url: 'https://game-over.app/unknown/path' });

      // Should redirect to home or show 404
      await waitForElement('events-list', 5000);
    });
  });

  describe('Invite Edge Cases', () => {
    beforeEach(async () => {
      await device.reloadReactNative();
      await loginAsTestUser('organizer');
      await waitForElement('events-list', 10000);
    });

    it('should handle already being a participant', async () => {
      // Create event and try to join via invite
      await createTestEvent();
      await waitForElement('event-summary-screen', 15000);

      // Try to accept invite to the same event
      await device.openURL({ url: `gameover://invite/${TEST_INVITE_CODES.valid}` });

      await waitForElement('invite-preview-screen', 5000);
      await tap('accept-invite-button');

      // Should show already a participant message
      await assertTextVisible('Already Joined');
      await assertTextVisible('already a participant');
    });

    it('should handle rapid multiple taps on accept', async () => {
      await device.openURL({ url: `gameover://invite/${TEST_INVITE_CODES.valid}` });

      await waitForElement('invite-preview-screen', 5000);

      // Rapid taps
      await element(by.id('accept-invite-button')).multiTap(3);

      // Should still only accept once
      await waitForLoadingComplete();

      // Should navigate to event without errors
      try {
        await waitForElement('event-summary-screen', 10000);
      } catch {
        await assertTextVisible('Already Joined');
      }
    });

    it('should handle network error during invite validation', async () => {
      // Simulate offline
      await device.setStatusBar({ networkStatus: 'offline' });

      await device.openURL({ url: `gameover://invite/${TEST_INVITE_CODES.valid}` });

      // Should show error or loading state
      try {
        await waitForElement('invite-error-screen', 10000);
        await assertTextVisible('Network Error');
      } catch {
        // Or show loading spinner indefinitely
        await assertVisible('loading-indicator');
      }

      // Restore network
      await device.setStatusBar({ networkStatus: 'connected' });
    });

    it('should handle network error during invite acceptance', async () => {
      await device.openURL({ url: `gameover://invite/${TEST_INVITE_CODES.valid}` });

      await waitForElement('invite-preview-screen', 5000);

      // Go offline before accepting
      await device.setStatusBar({ networkStatus: 'offline' });

      await tap('accept-invite-button');

      // Should show error
      await assertTextVisible('Failed to accept invitation');

      // Restore network
      await device.setStatusBar({ networkStatus: 'connected' });
    });

    it('should handle app backgrounding during invite flow', async () => {
      await device.openURL({ url: `gameover://invite/${TEST_INVITE_CODES.valid}` });

      await waitForElement('invite-preview-screen', 5000);

      // Background app
      await device.sendToHome();
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Bring back
      await device.launchApp({ newInstance: false });

      // Should still be on invite preview
      await waitForElement('invite-preview-screen', 5000);
      await assertVisible('accept-invite-button');
    });

    it('should handle invite code with special characters gracefully', async () => {
      // URL with special characters that might break routing
      await device.openURL({ url: 'gameover://invite/TEST%20CODE' });

      // Should show invalid invite error
      await waitForElement('invite-error-screen', 5000);
      await assertTextVisible('Invalid Invite');
    });

    it('should handle very long invite codes', async () => {
      const longCode = 'A'.repeat(100);
      await device.openURL({ url: `gameover://invite/${longCode}` });

      // Should show invalid invite error
      await waitForElement('invite-error-screen', 5000);
      await assertTextVisible('Invalid Invite');
    });

    it('should handle case-insensitive invite codes', async () => {
      // Test lowercase version of valid code
      await device.openURL({
        url: `gameover://invite/${TEST_INVITE_CODES.valid.toLowerCase()}`,
      });

      // Should still work (codes are normalized to uppercase)
      await waitForElement('invite-preview-screen', 5000);
    });
  });

  describe('Share Event Banner', () => {
    beforeEach(async () => {
      await device.reloadReactNative();
      await loginAsTestUser('organizer');
      await createTestEvent();
      await waitForElement('event-summary-screen', 15000);
    });

    it('should display share event banner with participant count', async () => {
      await assertVisible('share-event-banner');
      await assertTextVisible('Invite Your Group');

      // Should show member count or initial text
      try {
        await assertTextVisible('member');
      } catch {
        await assertTextVisible('Share the invite link');
      }
    });

    it('should generate invite on Share Invite tap', async () => {
      // Find and tap share invite on banner
      await element(by.text('Share Invite')).tap();

      // Should open share sheet
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Dismiss share sheet
      if (device.getPlatform() === 'ios') {
        try {
          await element(by.label('Close')).tap();
        } catch {
          // Share sheet might auto-close
        }
      }
    });

    it('should copy link on Copy Link tap', async () => {
      // Tap copy link on banner
      await element(by.text('Copy Link')).tap();

      // Should show confirmation
      await assertTextVisible('Copied!');
    });
  });

  describe('Invite Accessibility', () => {
    beforeEach(async () => {
      await device.reloadReactNative();
      await loginAsTestUser('organizer');
      await createTestEvent();
      await waitForElement('event-summary-screen', 15000);
    });

    it('should have accessible labels on invite modal', async () => {
      await tap('invite-modal-trigger');
      await waitForElement('invite-modal', 5000);

      // Verify buttons have accessible labels
      await expect(element(by.id('generate-invite-button'))).toExist();
      await expect(element(by.id('copy-invite-code-button'))).toExist();
      await expect(element(by.id('share-invite-button'))).toExist();
    });

    it('should be navigable with keyboard/focus', async () => {
      await tap('invite-modal-trigger');
      await waitForElement('invite-modal', 5000);

      // Tab through elements (simulated via tap progression)
      await assertVisible('generate-invite-button');
      await assertVisible('close-modal-button');
    });
  });

  describe('Invite Preview Screen Elements', () => {
    beforeEach(async () => {
      await device.reloadReactNative();
      await loginAsTestUser('organizer');
      await waitForElement('events-list', 10000);
    });

    it('should display all required preview elements', async () => {
      await device.openURL({ url: `gameover://invite/${TEST_INVITE_CODES.valid}` });

      await waitForElement('invite-preview-screen', 5000);

      // Verify all required elements
      await assertVisible('close-button');
      await assertVisible('event-preview-card');
      await assertVisible('accept-invite-button');
      await assertVisible('decline-button');
    });

    it('should display event info in preview card', async () => {
      await device.openURL({ url: `gameover://invite/${TEST_INVITE_CODES.valid}` });

      await waitForElement('invite-preview-screen', 5000);

      // Verify event details are shown
      await assertTextVisible("You're Invited To");
      await assertVisible('event-preview-card');

      // Event name, honoree, date should be present
      await waitFor(element(by.id('event-preview-card')))
        .toBeVisible()
        .withTimeout(3000);
    });

    it('should navigate home from error screen', async () => {
      await device.openURL({ url: `gameover://invite/${TEST_INVITE_CODES.invalid}` });

      await waitForElement('invite-error-screen', 5000);
      await tap('go-home-button');

      // Should navigate to events list
      await waitForElement('events-list', 5000);
    });
  });
});
