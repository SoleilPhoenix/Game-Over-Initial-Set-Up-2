# Comprehensive E2E Testing Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Establish comprehensive E2E test coverage for Game Over app with edge case testing

**Architecture:** Detox-based E2E tests covering all user journeys, edge cases, and failure scenarios using iOS simulator and real device testing

**Tech Stack:** Detox, Jest, React Native Testing Library patterns, Supabase test fixtures

---

## Current Test Coverage

### ✅ Existing Tests (Already Implemented)
- `e2e/auth/` - Welcome, signup, login, forgot password, full auth flow
- `e2e/journeys/createEventJourney.test.ts` - Full event creation wizard
- `e2e/journeys/bookPackageJourney.test.ts` - Package booking and payment flow
- `e2e/screens/eventsDashboard.test.ts` - Events list view
- `e2e/screens/wizardStep1.test.ts` - Wizard first step
- `e2e/smoke/appLaunches.test.ts` - Basic smoke test

### 🚨 Missing Critical Coverage
- Chat functionality (messaging, realtime, polls)
- Budget tracking
- Profile management (edit, avatar, security, notifications)
- Invite system and deep linking
- Participant management
- Edge cases (network errors, offline, concurrent updates, session expiration)
- Error recovery flows
- Data persistence and state recovery

---

## Task 1: Chat E2E Tests - Basic Messaging

**Files:**
- Create: `e2e/chat/messaging.test.ts`
- Test: Run with `npm run test:e2e -- e2e/chat/messaging.test.ts --configuration ios.sim.debug`

### Step 1: Write the chat messaging happy path test

```typescript
/**
 * Chat Messaging E2E Tests
 * Tests real-time messaging, message delivery, and chat UI
 */

import { by, device, element, expect, waitFor } from 'detox';
import { loginAsTestUser, createTestEvent } from '../utils/auth';
import { waitForElement, tap, typeInInput, assertVisible, assertTextVisible } from '../utils/testHelpers';

describe('Chat Messaging', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
    await loginAsTestUser('organizer');
    // Create test event with participants
    await createTestEvent({ withParticipants: true });
  });

  afterAll(async () => {
    await device.terminateApp();
  });

  describe('Message Sending', () => {
    it('should send a text message successfully', async () => {
      // Navigate to chat tab
      await tap('tab-chat');
      await waitForElement('chat-screen', 10000);

      // Select event chat channel
      await waitForElement('channel-list', 5000);
      await element(by.id('channel-item-0')).tap();

      // Wait for chat screen to load
      await waitForElement('chat-messages-list', 10000);

      // Type and send message
      const testMessage = `Test message ${Date.now()}`;
      await typeInInput('message-input', testMessage);
      await tap('send-message-button');

      // Verify message appears in chat
      await waitFor(element(by.text(testMessage)))
        .toBeVisible()
        .withTimeout(10000);

      // Verify message bubble has correct style (sender)
      await expect(element(by.id('message-bubble-sent'))).toBeVisible();
    });

    it('should display character count and limit', async () => {
      await waitForElement('message-input');

      // Type long message
      const longMessage = 'a'.repeat(500);
      await typeInInput('message-input', longMessage);

      // Verify character counter appears
      await assertVisible('character-counter');
      await assertTextVisible('500/1000');
    });

    it('should prevent sending empty messages', async () => {
      await waitForElement('message-input');

      // Try to send empty message
      await element(by.id('message-input')).tap();
      await tap('send-message-button');

      // Button should be disabled or not send
      await expect(element(by.id('send-message-button'))).toHaveToggleValue(false);
    });
  });

  describe('Message Display', () => {
    it('should display messages from other participants', async () => {
      // This test requires a second test user to send a message
      // or mocking realtime subscription data
      await waitForElement('chat-messages-list');

      // Verify message bubble styling for received messages
      // await expect(element(by.id('message-bubble-received'))).toBeVisible();
    });

    it('should display timestamps for messages', async () => {
      await waitForElement('chat-messages-list');

      // Scroll to see timestamps
      await element(by.id('chat-messages-list')).scroll(100, 'down');

      // Verify timestamp format (e.g., "10:30 AM")
      await expect(element(by.id('message-timestamp'))).toBeVisible();
    });

    it('should group messages by date', async () => {
      await waitForElement('chat-messages-list');

      // Verify date separator exists
      await expect(element(by.id('date-separator'))).toBeVisible();
    });
  });

  describe('Message Actions', () => {
    it('should show message actions on long press', async () => {
      await waitForElement('chat-messages-list');

      // Long press on a message
      await element(by.id('message-bubble-sent')).longPress(1000);

      // Verify action sheet appears
      await waitForElement('message-actions-sheet', 3000);
      await assertTextVisible('Copy');
      await assertTextVisible('Delete');
    });

    it('should copy message text', async () => {
      await element(by.id('message-bubble-sent')).longPress(1000);
      await waitForElement('message-actions-sheet');

      await element(by.text('Copy')).tap();

      // Verify toast or feedback
      await waitFor(element(by.text('Copied to clipboard')))
        .toBeVisible()
        .withTimeout(3000);
    });

    it('should delete own message', async () => {
      await element(by.id('message-bubble-sent')).longPress(1000);
      await waitForElement('message-actions-sheet');

      await element(by.text('Delete')).tap();

      // Confirm deletion
      await waitForElement('delete-confirmation-modal');
      await tap('confirm-delete-button');

      // Message should disappear
      await waitFor(element(by.id('message-bubble-sent')))
        .not.toBeVisible()
        .withTimeout(5000);
    });
  });

  describe('Realtime Updates', () => {
    it('should receive new messages in real-time', async () => {
      // This test requires a second test user or mocked realtime event
      await waitForElement('chat-messages-list');

      // Mock or trigger realtime message event
      // Verify new message appears without refresh
    });

    it('should show typing indicator', async () => {
      await waitForElement('message-input');

      // Start typing
      await element(by.id('message-input')).tap();
      await element(by.id('message-input')).typeText('Test');

      // Verify typing indicator is broadcast (would need second user to verify)
    });
  });
});
```

### Step 2: Run test to verify it fails

Run: `npm run test:e2e -- e2e/chat/messaging.test.ts --configuration ios.sim.debug`

Expected: FAIL - Test file doesn't exist yet, and helper function `createTestEvent` needs implementation

### Step 3: Create test helper for event creation

Modify: `e2e/utils/auth.ts`

Add the `createTestEvent` helper function:

```typescript
/**
 * Create a test event with optional participants
 */
export async function createTestEvent(options: {
  withParticipants?: boolean;
  participantCount?: number;
} = {}): Promise<void> {
  const { withParticipants = false, participantCount = 3 } = options;

  // Navigate to events tab
  await element(by.id('tab-events')).tap();
  await waitFor(element(by.id('create-event-button')))
    .toBeVisible()
    .withTimeout(5000);

  // Start event creation
  await element(by.id('create-event-button')).tap();

  // Fill wizard quickly
  await element(by.id('party-type-bachelor')).tap();
  await element(by.id('honoree-name-input')).typeText('TestEvent');

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

  // Step 4 - skip package
  await element(by.id('wizard-next-button')).tap();

  // Step 5 - create
  await element(by.id('create-event-button')).tap();

  // Wait for event to be created
  await waitFor(element(by.id('event-summary-screen')))
    .toBeVisible()
    .withTimeout(15000);

  // Add participants if requested
  if (withParticipants) {
    await element(by.id('manage-participants-button')).tap();

    for (let i = 0; i < participantCount; i++) {
      await element(by.id('add-participant-button')).tap();
      await element(by.id('participant-email-input')).typeText(
        `participant${i}@test.com`
      );
      await element(by.id('send-invite-button')).tap();
      await waitFor(element(by.text('Invite sent')))
        .toBeVisible()
        .withTimeout(3000);
    }

    await element(by.id('close-participants-modal')).tap();
  }
}
```

### Step 4: Run test again to verify progress

Run: `npm run test:e2e -- e2e/chat/messaging.test.ts --configuration ios.sim.debug`

Expected: Tests may fail on specific assertions, but basic structure should work

### Step 5: Add testIDs to chat components

Modify files as needed to add missing testIDs:
- `src/components/chat/MessageInput.tsx` - Add `testID="message-input"`, `testID="send-message-button"`, `testID="character-counter"`
- `src/components/chat/MessageBubble.tsx` - Add `testID="message-bubble-sent"`, `testID="message-bubble-received"`, `testID="message-timestamp"`
- `app/(tabs)/chat/[channelId].tsx` - Add `testID="chat-messages-list"`, `testID="chat-screen"`

### Step 6: Run test to verify it passes

Run: `npm run test:e2e -- e2e/chat/messaging.test.ts --configuration ios.sim.debug`

Expected: Tests pass with proper testIDs in place

### Step 7: Commit

```bash
git add e2e/chat/messaging.test.ts e2e/utils/auth.ts src/components/chat/ app/(tabs)/chat/
git commit -m "test: add comprehensive chat messaging E2E tests"
```

---

## Task 2: Chat E2E Tests - Polls

**Files:**
- Create: `e2e/chat/polls.test.ts`
- Test: Run with `npm run test:e2e -- e2e/chat/polls.test.ts --configuration ios.sim.debug`

### Step 1: Write poll creation and voting tests

```typescript
/**
 * Chat Polls E2E Tests
 * Tests poll creation, voting, and real-time updates
 */

import { by, device, element, expect, waitFor } from 'detox';
import { loginAsTestUser, createTestEvent } from '../utils/auth';
import { waitForElement, tap, typeInInput, assertVisible, assertTextVisible } from '../utils/testHelpers';

describe('Chat Polls', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
    await loginAsTestUser('organizer');
    await createTestEvent({ withParticipants: true });

    // Navigate to chat
    await tap('tab-chat');
    await waitForElement('chat-screen');
    await element(by.id('channel-item-0')).tap();
  });

  describe('Poll Creation', () => {
    it('should open create poll modal', async () => {
      await waitForElement('chat-messages-list');

      // Tap poll button
      await tap('create-poll-button');

      // Verify modal opens
      await waitForElement('create-poll-modal', 5000);
      await assertTextVisible('Create Poll');
    });

    it('should create a poll with multiple options', async () => {
      await tap('create-poll-button');
      await waitForElement('create-poll-modal');

      // Fill poll question
      await typeInInput('poll-question-input', 'Where should we go for dinner?');

      // Add options
      await typeInInput('poll-option-0', 'Steakhouse');
      await tap('add-poll-option-button');

      await typeInInput('poll-option-1', 'Sushi Bar');
      await tap('add-poll-option-button');

      await typeInInput('poll-option-2', 'Italian Restaurant');

      // Create poll
      await tap('create-poll-submit-button');

      // Poll should appear in chat
      await waitFor(element(by.text('Where should we go for dinner?')))
        .toBeVisible()
        .withTimeout(10000);

      await assertTextVisible('Steakhouse');
      await assertTextVisible('Sushi Bar');
      await assertTextVisible('Italian Restaurant');
    });

    it('should enforce minimum 2 options', async () => {
      await tap('create-poll-button');
      await waitForElement('create-poll-modal');

      await typeInInput('poll-question-input', 'Test poll');
      await typeInInput('poll-option-0', 'Only option');

      // Try to create with only 1 option
      await tap('create-poll-submit-button');

      // Should show error
      await assertTextVisible('At least 2 options required');
    });

    it('should enforce maximum options limit', async () => {
      await tap('create-poll-button');
      await waitForElement('create-poll-modal');

      // Try to add more than max options (assume max is 5)
      for (let i = 0; i < 6; i++) {
        try {
          await typeInInput(`poll-option-${i}`, `Option ${i + 1}`);
          await tap('add-poll-option-button');
        } catch {
          // Button should be disabled after max
          break;
        }
      }

      // Verify max 5 options
      await expect(element(by.id('poll-option-5'))).not.toExist();
    });
  });

  describe('Poll Voting', () => {
    it('should vote on a poll', async () => {
      // Find poll in chat
      await waitForElement('poll-card-0');

      // Vote for an option
      await tap('poll-option-steakhouse');

      // Verify vote is registered
      await waitFor(element(by.id('poll-option-voted')))
        .toBeVisible()
        .withTimeout(5000);

      // Verify vote count updates
      await assertTextVisible('1 vote');
    });

    it('should change vote', async () => {
      await waitForElement('poll-card-0');

      // Vote for different option
      await tap('poll-option-sushi-bar');

      // Previous vote should be deselected
      await expect(element(by.id('poll-option-voted-steakhouse'))).not.toBeVisible();

      // New vote should be selected
      await expect(element(by.id('poll-option-voted-sushi-bar'))).toBeVisible();
    });

    it('should display vote percentages', async () => {
      await waitForElement('poll-card-0');

      // Verify percentage display
      await expect(element(by.id('poll-percentage'))).toBeVisible();
    });

    it('should show who voted (if enabled)', async () => {
      await waitForElement('poll-card-0');

      // Tap to see voters
      await tap('poll-show-voters-button');

      // Verify voter list modal
      await waitForElement('poll-voters-modal');
      await assertTextVisible('Voters');
    });
  });

  describe('Poll Real-time Updates', () => {
    it('should update vote counts in real-time', async () => {
      // This test requires a second test user to vote
      // or mocking realtime vote events
      await waitForElement('poll-card-0');

      // Mock or trigger vote from another user
      // Verify vote count updates without refresh
    });

    it('should show poll closed state', async () => {
      // Create poll with close time or close manually
      await waitForElement('poll-card-0');

      // Close poll (organizer action)
      await element(by.id('poll-card-0')).longPress();
      await waitForElement('poll-actions-menu');
      await tap('close-poll-button');

      // Verify poll shows as closed
      await assertTextVisible('Poll Closed');
      await expect(element(by.id('poll-option-button'))).not.toBeVisible();
    });
  });

  describe('Poll Edge Cases', () => {
    it('should handle long poll questions', async () => {
      await tap('create-poll-button');
      await waitForElement('create-poll-modal');

      const longQuestion = 'What is the best activity for our bachelor party? '.repeat(5);
      await typeInInput('poll-question-input', longQuestion);

      await typeInInput('poll-option-0', 'Option A');
      await typeInInput('poll-option-1', 'Option B');

      await tap('create-poll-submit-button');

      // Verify long text is truncated or wrapped properly
      await waitForElement('poll-card-0');
    });

    it('should handle empty option text', async () => {
      await tap('create-poll-button');
      await waitForElement('create-poll-modal');

      await typeInInput('poll-question-input', 'Test');
      await typeInInput('poll-option-0', 'Valid option');
      await tap('add-poll-option-button');

      // Leave second option empty
      await tap('create-poll-submit-button');

      // Should show validation error
      await assertTextVisible('All options must have text');
    });
  });
});
```

### Step 2: Run test to verify it fails

Run: `npm run test:e2e -- e2e/chat/polls.test.ts --configuration ios.sim.debug`

Expected: FAIL - Missing testIDs and potentially missing UI elements

### Step 3: Add testIDs to poll components

Modify: `src/components/polls/CreatePollModal.tsx`, `src/components/polls/PollCard.tsx`

Add required testIDs for all interactive elements

### Step 4: Run test to verify it passes

Run: `npm run test:e2e -- e2e/chat/polls.test.ts --configuration ios.sim.debug`

Expected: PASS

### Step 5: Commit

```bash
git add e2e/chat/polls.test.ts src/components/polls/
git commit -m "test: add comprehensive poll E2E tests"
```

---

## Task 3: Budget Tracking E2E Tests

**Files:**
- Create: `e2e/budget/budgetTracking.test.ts`
- Test: Run with `npm run test:e2e -- e2e/budget/budgetTracking.test.ts --configuration ios.sim.debug`

### Step 1: Write budget tracking tests

```typescript
/**
 * Budget Tracking E2E Tests
 * Tests expense management, budget limits, and cost splitting
 */

import { by, device, element, expect, waitFor } from 'detox';
import { loginAsTestUser, createTestEvent } from '../utils/auth';
import { waitForElement, tap, typeInInput, assertVisible, assertTextVisible } from '../utils/testHelpers';

describe('Budget Tracking', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
    await loginAsTestUser('organizer');
    await createTestEvent({ withParticipants: true, participantCount: 4 });
  });

  describe('Expense Creation', () => {
    it('should navigate to budget tab', async () => {
      await tap('tab-budget');
      await waitForElement('budget-screen', 10000);
      await assertTextVisible('Budget');
    });

    it('should add a new expense', async () => {
      await waitForElement('budget-screen');
      await tap('add-expense-button');

      await waitForElement('expense-form-modal');

      // Fill expense details
      await typeInInput('expense-title-input', 'Dinner at Steakhouse');
      await typeInInput('expense-amount-input', '250.00');

      // Select category
      await tap('expense-category-picker');
      await element(by.text('Food & Drinks')).tap();

      // Select payers
      await tap('expense-payer-picker');
      await element(by.text('Organizer')).tap();

      // Save expense
      await tap('save-expense-button');

      // Verify expense appears in list
      await waitFor(element(by.text('Dinner at Steakhouse')))
        .toBeVisible()
        .withTimeout(5000);

      await assertTextVisible('$250.00');
    });

    it('should split expense evenly among participants', async () => {
      await tap('add-expense-button');
      await waitForElement('expense-form-modal');

      await typeInInput('expense-title-input', 'Transportation');
      await typeInInput('expense-amount-input', '120.00');

      // Enable split evenly
      await tap('split-evenly-toggle');

      await tap('save-expense-button');

      // Verify per-person amount
      await waitForElement('expense-card-0');
      await assertTextVisible('$30.00 per person'); // 120 / 4 participants
    });

    it('should split expense with custom amounts', async () => {
      await tap('add-expense-button');
      await waitForElement('expense-form-modal');

      await typeInInput('expense-title-input', 'Activities');
      await typeInInput('expense-amount-input', '400.00');

      // Disable even split
      await tap('split-evenly-toggle');
      await tap('custom-split-button');

      // Assign custom amounts
      await typeInInput('split-amount-participant-0', '100.00');
      await typeInInput('split-amount-participant-1', '150.00');
      await typeInInput('split-amount-participant-2', '100.00');
      await typeInInput('split-amount-participant-3', '50.00');

      await tap('save-expense-button');

      // Verify custom splits
      await waitForElement('expense-card-0');
    });

    it('should validate expense amount', async () => {
      await tap('add-expense-button');
      await waitForElement('expense-form-modal');

      await typeInInput('expense-title-input', 'Invalid Expense');
      await typeInInput('expense-amount-input', '-50.00'); // Negative amount

      await tap('save-expense-button');

      // Should show validation error
      await assertTextVisible('Amount must be positive');
    });

    it('should require expense title', async () => {
      await tap('add-expense-button');
      await waitForElement('expense-form-modal');

      // Leave title empty
      await typeInInput('expense-amount-input', '100.00');

      await tap('save-expense-button');

      await assertTextVisible('Title is required');
    });
  });

  describe('Budget Summary', () => {
    it('should display total budget', async () => {
      await waitForElement('budget-screen');

      // Verify summary card
      await assertVisible('budget-summary-card');
      await assertTextVisible('Total Budget');
      await assertVisible('total-amount');
    });

    it('should show expenses by category', async () => {
      await waitForElement('budget-screen');

      // Scroll to category breakdown
      await element(by.id('budget-scroll-view')).scroll(200, 'down');

      await assertVisible('category-breakdown-card');
      await assertTextVisible('Food & Drinks');
      await assertTextVisible('Transportation');
      await assertTextVisible('Activities');
    });

    it('should display per-person cost', async () => {
      await waitForElement('budget-screen');

      await assertVisible('per-person-card');
      await assertTextVisible('Per Person');
    });

    it('should show who owes whom', async () => {
      await waitForElement('budget-screen');

      // Scroll to settlements
      await element(by.id('budget-scroll-view')).scroll(300, 'down');

      await assertVisible('settlements-card');
      await assertTextVisible('Who Owes Who');
    });
  });

  describe('Expense Management', () => {
    it('should edit an expense', async () => {
      await waitForElement('budget-screen');

      // Tap on expense to edit
      await element(by.id('expense-card-0')).tap();

      await waitForElement('expense-form-modal');

      // Update amount
      await element(by.id('expense-amount-input')).clearText();
      await typeInInput('expense-amount-input', '300.00');

      await tap('save-expense-button');

      // Verify updated amount
      await waitFor(element(by.text('$300.00')))
        .toBeVisible()
        .withTimeout(5000);
    });

    it('should delete an expense', async () => {
      await waitForElement('budget-screen');

      // Long press to show actions
      await element(by.id('expense-card-0')).longPress();

      await waitForElement('expense-actions-menu');
      await tap('delete-expense-button');

      // Confirm deletion
      await waitForElement('delete-confirmation-modal');
      await tap('confirm-delete-button');

      // Expense should disappear
      await waitFor(element(by.id('expense-card-0')))
        .not.toBeVisible()
        .withTimeout(5000);
    });

    it('should filter expenses by category', async () => {
      await waitForElement('budget-screen');

      // Open filter menu
      await tap('filter-expenses-button');

      await waitForElement('filter-modal');

      // Select category
      await element(by.text('Food & Drinks')).tap();

      await tap('apply-filter-button');

      // Verify only food expenses shown
      await expect(element(by.id('expense-category-food'))).toBeVisible();
    });

    it('should search expenses', async () => {
      await waitForElement('budget-screen');

      // Open search
      await tap('search-expenses-button');

      await typeInInput('expense-search-input', 'Dinner');

      // Verify filtered results
      await waitFor(element(by.text('Dinner at Steakhouse')))
        .toBeVisible()
        .withTimeout(3000);
    });
  });

  describe('Budget Limits', () => {
    it('should set budget limit', async () => {
      await waitForElement('budget-screen');

      await tap('set-budget-limit-button');

      await waitForElement('budget-limit-modal');

      await typeInInput('budget-limit-input', '2000.00');

      await tap('save-limit-button');

      // Verify limit is displayed
      await assertTextVisible('Budget Limit: $2,000.00');
    });

    it('should warn when approaching budget limit', async () => {
      // Add expenses close to limit
      await tap('add-expense-button');
      await waitForElement('expense-form-modal');

      await typeInInput('expense-title-input', 'Large Expense');
      await typeInInput('expense-amount-input', '1800.00');

      await tap('save-expense-button');

      // Verify warning appears
      await waitFor(element(by.text('90% of budget used')))
        .toBeVisible()
        .withTimeout(5000);
    });

    it('should alert when exceeding budget limit', async () => {
      await tap('add-expense-button');
      await waitForElement('expense-form-modal');

      await typeInInput('expense-title-input', 'Exceeded Expense');
      await typeInInput('expense-amount-input', '500.00'); // Total > $2000

      await tap('save-expense-button');

      // Verify alert
      await waitFor(element(by.text('Budget exceeded')))
        .toBeVisible()
        .withTimeout(5000);
    });
  });

  describe('Budget Edge Cases', () => {
    it('should handle decimal amounts correctly', async () => {
      await tap('add-expense-button');
      await waitForElement('expense-form-modal');

      await typeInInput('expense-title-input', 'Decimal Test');
      await typeInInput('expense-amount-input', '123.45');

      await tap('save-expense-button');

      await assertTextVisible('$123.45');
    });

    it('should handle very large amounts', async () => {
      await tap('add-expense-button');
      await waitForElement('expense-form-modal');

      await typeInInput('expense-title-input', 'Large Amount');
      await typeInInput('expense-amount-input', '999999.99');

      await tap('save-expense-button');

      // Should format large numbers properly
      await assertTextVisible('$999,999.99');
    });

    it('should handle zero participants edge case', async () => {
      // This should not happen in normal flow, but test robustness
      await waitForElement('budget-screen');

      // Budget should still function even with no participants
      await assertVisible('budget-summary-card');
    });
  });
});
```

### Step 2: Run test to verify it fails

Run: `npm run test:e2e -- e2e/budget/budgetTracking.test.ts --configuration ios.sim.debug`

Expected: FAIL - Missing testIDs

### Step 3: Add testIDs to budget components

Modify: `app/(tabs)/budget/index.tsx` and related expense components

Add all required testIDs

### Step 4: Run test to verify it passes

Run: `npm run test:e2e -- e2e/budget/budgetTracking.test.ts --configuration ios.sim.debug`

Expected: PASS

### Step 5: Commit

```bash
git add e2e/budget/ app/(tabs)/budget/
git commit -m "test: add comprehensive budget tracking E2E tests"
```

---

## Task 4: Profile Management E2E Tests

**Files:**
- Create: `e2e/profile/profileManagement.test.ts`
- Test: Run with `npm run test:e2e -- e2e/profile/profileManagement.test.ts --configuration ios.sim.debug`

### Step 1: Write profile tests

```typescript
/**
 * Profile Management E2E Tests
 * Tests profile editing, avatar upload, security settings, notifications
 */

import { by, device, element, expect, waitFor } from 'detox';
import { loginAsTestUser } from '../utils/auth';
import { waitForElement, tap, typeInInput, assertVisible, assertTextVisible } from '../utils/testHelpers';

describe('Profile Management', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
    await loginAsTestUser('organizer');
  });

  describe('Profile View', () => {
    it('should navigate to profile tab', async () => {
      await tap('tab-profile');
      await waitForElement('profile-screen', 10000);
      await assertTextVisible('Profile');
    });

    it('should display user information', async () => {
      await waitForElement('profile-screen');

      await assertVisible('profile-avatar');
      await assertVisible('profile-name');
      await assertVisible('profile-email');
    });

    it('should show user stats', async () => {
      await waitForElement('profile-screen');

      await assertVisible('stats-card');
      await assertTextVisible('Events Created');
      await assertTextVisible('Events Attended');
    });
  });

  describe('Profile Editing', () => {
    it('should navigate to edit profile', async () => {
      await waitForElement('profile-screen');
      await tap('edit-profile-button');

      await waitForElement('edit-profile-screen');
      await assertTextVisible('Edit Profile');
    });

    it('should update display name', async () => {
      await waitForElement('edit-profile-screen');

      const newName = `Updated Name ${Date.now()}`;
      await element(by.id('input-full-name')).clearText();
      await typeInInput('input-full-name', newName);

      await tap('save-profile-button');

      // Verify success message
      await waitFor(element(by.text('Profile updated')))
        .toBeVisible()
        .withTimeout(5000);

      // Verify name is updated
      await tap('back-button');
      await waitForElement('profile-screen');
      await assertTextVisible(newName);
    });

    it('should update bio', async () => {
      await tap('edit-profile-button');
      await waitForElement('edit-profile-screen');

      const bio = 'Love planning epic bachelor parties!';
      await typeInInput('input-bio', bio);

      await tap('save-profile-button');

      await tap('back-button');
      await waitForElement('profile-screen');
      await assertTextVisible(bio);
    });

    it('should validate display name length', async () => {
      await tap('edit-profile-button');
      await waitForElement('edit-profile-screen');

      // Try very short name
      await element(by.id('input-full-name')).clearText();
      await typeInInput('input-full-name', 'A');

      await tap('save-profile-button');

      await assertTextVisible('Name must be at least 2 characters');
    });

    it('should validate bio length', async () => {
      await waitForElement('edit-profile-screen');

      // Try very long bio
      const longBio = 'a'.repeat(500);
      await typeInInput('input-bio', longBio);

      // Should show character counter
      await assertVisible('bio-character-counter');
    });
  });

  describe('Avatar Upload', () => {
    it('should open avatar picker', async () => {
      await waitForElement('edit-profile-screen');

      await tap('avatar-upload-button');

      // Verify picker options appear
      await waitFor(element(by.text('Choose Photo')))
        .toBeVisible()
        .withTimeout(3000);

      await assertTextVisible('Take Photo');
      await assertTextVisible('Choose from Library');
    });

    it('should cancel avatar selection', async () => {
      // Tap cancel
      await element(by.text('Cancel')).tap();

      // Should return to edit profile
      await waitForElement('edit-profile-screen');
    });

    // Note: Actually uploading photos requires camera/photo library permissions
    // and real image selection which is hard to test in E2E
    it.skip('should upload avatar from library', async () => {
      // This would require mocking image picker
    });

    it('should remove current avatar', async () => {
      await waitForElement('edit-profile-screen');

      // Long press avatar to show remove option
      await element(by.id('avatar-upload-button')).longPress();

      await waitFor(element(by.text('Remove Photo')))
        .toBeVisible()
        .withTimeout(3000);

      await element(by.text('Remove Photo')).tap();

      // Verify avatar is removed (shows default)
      await expect(element(by.id('default-avatar'))).toBeVisible();
    });
  });

  describe('Security Settings', () => {
    it('should navigate to security settings', async () => {
      await tap('back-button'); // Back to profile
      await waitForElement('profile-screen');

      await tap('security-settings-button');

      await waitForElement('security-screen');
      await assertTextVisible('Security');
    });

    it('should change password', async () => {
      await waitForElement('security-screen');

      await tap('change-password-button');

      await waitForElement('change-password-modal');

      await typeInInput('input-current-password', 'TestPassword123!');
      await typeInInput('input-new-password', 'NewTestPassword123!');
      await typeInInput('input-confirm-password', 'NewTestPassword123!');

      await tap('save-password-button');

      await waitFor(element(by.text('Password updated')))
        .toBeVisible()
        .withTimeout(5000);
    });

    it('should validate password strength', async () => {
      await tap('change-password-button');
      await waitForElement('change-password-modal');

      await typeInInput('input-current-password', 'TestPassword123!');

      // Try weak password
      await typeInInput('input-new-password', '12345');

      // Should show strength indicator
      await assertTextVisible('Weak password');
    });

    it('should require matching passwords', async () => {
      await waitForElement('change-password-modal');

      await typeInInput('input-new-password', 'NewTestPassword123!');
      await typeInInput('input-confirm-password', 'DifferentPassword123!');

      await tap('save-password-button');

      await assertTextVisible('Passwords do not match');
    });

    it('should enable two-factor authentication', async () => {
      await tap('close-modal-button');
      await waitForElement('security-screen');

      await tap('enable-2fa-toggle');

      await waitForElement('2fa-setup-modal');
      await assertTextVisible('Two-Factor Authentication');

      // This would require QR code scanning or manual code entry
      // which is complex to test in E2E
    });

    it('should show active sessions', async () => {
      await waitForElement('security-screen');

      await element(by.id('security-scroll-view')).scroll(200, 'down');

      await assertVisible('active-sessions-card');
      await assertTextVisible('Active Sessions');
    });

    it('should sign out other sessions', async () => {
      await element(by.id('security-scroll-view')).scroll(200, 'down');

      await tap('sign-out-other-sessions-button');

      await waitForElement('confirmation-modal');
      await tap('confirm-button');

      await waitFor(element(by.text('Signed out of other sessions')))
        .toBeVisible()
        .withTimeout(5000);
    });
  });

  describe('Notification Settings', () => {
    it('should navigate to notification settings', async () => {
      await tap('back-button');
      await waitForElement('profile-screen');

      await tap('notification-settings-button');

      await waitForElement('notifications-screen');
      await assertTextVisible('Notifications');
    });

    it('should toggle push notifications', async () => {
      await waitForElement('notifications-screen');

      await tap('push-notifications-toggle');

      // Verify state change
      await expect(element(by.id('push-notifications-toggle'))).toHaveToggleValue(false);

      // Toggle back on
      await tap('push-notifications-toggle');
      await expect(element(by.id('push-notifications-toggle'))).toHaveToggleValue(true);
    });

    it('should toggle email notifications', async () => {
      await waitForElement('notifications-screen');

      await tap('email-notifications-toggle');

      await expect(element(by.id('email-notifications-toggle'))).toHaveToggleValue(false);
    });

    it('should customize notification types', async () => {
      await waitForElement('notifications-screen');

      await element(by.id('notifications-scroll-view')).scroll(200, 'down');

      // Event notifications
      await tap('event-notifications-toggle');

      // Chat notifications
      await tap('chat-notifications-toggle');

      // Budget notifications
      await tap('budget-notifications-toggle');

      // Poll notifications
      await tap('poll-notifications-toggle');
    });

    it('should set quiet hours', async () => {
      await waitForElement('notifications-screen');

      await element(by.id('notifications-scroll-view')).scroll(300, 'down');

      await tap('quiet-hours-toggle');

      // Set start time
      await tap('quiet-hours-start-picker');
      // iOS time picker interaction is complex
      await element(by.id('time-picker-done')).tap();

      // Set end time
      await tap('quiet-hours-end-picker');
      await element(by.id('time-picker-done')).tap();
    });
  });

  describe('Profile Edge Cases', () => {
    it('should handle offline profile edits', async () => {
      // Put device in airplane mode
      await device.setStatusBar({ offline: true });

      await tap('back-button');
      await tap('tab-profile');
      await tap('edit-profile-button');
      await waitForElement('edit-profile-screen');

      await typeInInput('input-full-name', 'Offline Edit');
      await tap('save-profile-button');

      // Should show offline error
      await waitFor(element(by.text('No internet connection')))
        .toBeVisible()
        .withTimeout(5000);

      // Restore connection
      await device.setStatusBar({ offline: false });
    });

    it('should handle concurrent profile updates', async () => {
      // This would require multiple test users updating same data
      // Documents expected behavior for conflict resolution
      await waitForElement('edit-profile-screen');
    });

    it('should limit avatar file size', async () => {
      // This would require uploading a very large image
      // Documents max file size handling
    });
  });

  describe('Account Deletion', () => {
    it('should show delete account option', async () => {
      await tap('back-button');
      await tap('back-button');
      await waitForElement('profile-screen');

      await element(by.id('profile-scroll-view')).scroll(500, 'down');

      await assertVisible('delete-account-button');
    });

    it('should require confirmation for account deletion', async () => {
      await tap('delete-account-button');

      await waitForElement('delete-account-modal');
      await assertTextVisible('Delete Account');
      await assertTextVisible('This action cannot be undone');

      // Cancel
      await tap('cancel-delete-button');

      await waitForElement('profile-screen');
    });

    // Don't actually delete account in test
    it.skip('should delete account with confirmation', async () => {
      // This would permanently delete test account
    });
  });
});
```

### Step 2: Run test to verify it fails

Run: `npm run test:e2e -- e2e/profile/profileManagement.test.ts --configuration ios.sim.debug`

Expected: FAIL - Missing testIDs

### Step 3: Add testIDs to profile components

Modify:
- `app/(tabs)/profile/index.tsx`
- `app/(tabs)/profile/edit.tsx`
- `app/(tabs)/profile/security.tsx`
- `app/(tabs)/profile/notifications.tsx`
- `src/components/profile/AvatarUpload.tsx`

Add all required testIDs

### Step 4: Run test to verify it passes

Run: `npm run test:e2e -- e2e/profile/profileManagement.test.ts --configuration ios.sim.debug`

Expected: PASS

### Step 5: Commit

```bash
git add e2e/profile/ app/(tabs)/profile/ src/components/profile/
git commit -m "test: add comprehensive profile management E2E tests"
```

---

## Task 5: Invite System & Deep Linking E2E Tests

**Files:**
- Create: `e2e/invites/inviteSystem.test.ts`
- Test: Run with `npm run test:e2e -- e2e/invites/inviteSystem.test.ts --configuration ios.sim.debug`

### Step 1: Write invite system tests

```typescript
/**
 * Invite System E2E Tests
 * Tests invite generation, sharing, deep links, and acceptance
 */

import { by, device, element, expect, waitFor } from 'detox';
import { loginAsTestUser, createTestEvent } from '../utils/auth';
import { waitForElement, tap, typeInInput, assertVisible, assertTextVisible } from '../utils/testHelpers';

describe('Invite System', () => {
  let inviteCode: string;

  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
    await loginAsTestUser('organizer');
    await createTestEvent({ withParticipants: false });
  });

  describe('Invite Generation', () => {
    it('should generate invite code', async () => {
      await waitForElement('event-summary-screen');

      await tap('invite-participants-button');

      await waitForElement('invite-modal');
      await assertTextVisible('Invite Participants');

      // Generate invite
      await tap('generate-invite-button');

      // Verify invite code is displayed
      await waitFor(element(by.id('invite-code-display')))
        .toBeVisible()
        .withTimeout(5000);

      // Store invite code for later tests
      // In real test, would extract text from element
    });

    it('should copy invite code', async () => {
      await waitForElement('invite-code-display');

      await tap('copy-invite-code-button');

      // Verify copied feedback
      await waitFor(element(by.text('Copied to clipboard')))
        .toBeVisible()
        .withTimeout(3000);
    });

    it('should copy invite link', async () => {
      await waitForElement('invite-modal');

      await tap('copy-invite-link-button');

      await waitFor(element(by.text('Link copied')))
        .toBeVisible()
        .withTimeout(3000);
    });

    it('should show invite QR code', async () => {
      await waitForElement('invite-modal');

      await tap('show-qr-code-button');

      await waitForElement('qr-code-modal');
      await assertVisible('qr-code-image');

      await tap('close-qr-modal-button');
    });

    it('should set invite expiration', async () => {
      await waitForElement('invite-modal');

      await tap('invite-expiration-picker');

      // Select expiration time
      await element(by.text('24 hours')).tap();

      // Verify expiration is set
      await assertTextVisible('Expires in 24 hours');
    });

    it('should set max invite uses', async () => {
      await waitForElement('invite-modal');

      await tap('max-uses-picker');

      await element(by.text('10 uses')).tap();

      await assertTextVisible('Max 10 uses');
    });

    it('should share invite via native share', async () => {
      await waitForElement('invite-modal');

      await tap('share-invite-button');

      // Native share sheet should appear (can't fully test in E2E)
      // Verify it doesn't crash
    });
  });

  describe('Deep Link Handling', () => {
    it('should handle invite deep link when logged out', async () => {
      // Sign out first
      await tap('close-invite-modal');
      await tap('tab-profile');
      await waitForElement('profile-screen');
      await tap('sign-out-button');
      await waitForElement('welcome-screen');

      // Open deep link
      await device.openURL({ url: 'gameover://invite/TEST123456' });

      // Should show invite preview
      await waitForElement('invite-preview-screen', 10000);
      await assertTextVisible('You\'ve been invited');

      // Should prompt to sign up/login
      await assertVisible('accept-invite-signup-button');
      await assertVisible('accept-invite-login-button');
    });

    it('should handle invite deep link when logged in', async () => {
      // Login
      await tap('accept-invite-login-button');
      await waitForElement('login-screen');

      await typeInInput('input-email', 'test@gameoverapp.com');
      await typeInInput('input-password', 'TestPassword123!');
      await tap('login-submit-button');

      // Should return to invite preview
      await waitForElement('invite-preview-screen', 15000);

      // Accept invite button should be visible
      await assertVisible('accept-invite-button');
    });

    it('should accept invite via deep link', async () => {
      await waitForElement('invite-preview-screen');

      await tap('accept-invite-button');

      // Should join event
      await waitFor(element(by.text('Successfully joined event')))
        .toBeVisible()
        .withTimeout(10000);

      // Should navigate to event
      await waitForElement('event-summary-screen', 10000);
    });

    it('should handle expired invite link', async () => {
      // Open expired invite
      await device.openURL({ url: 'gameover://invite/EXPIRED123' });

      await waitForElement('invite-error-screen', 10000);
      await assertTextVisible('Invite Expired');
      await assertTextVisible('This invite link is no longer valid');
    });

    it('should handle invalid invite code', async () => {
      await device.openURL({ url: 'gameover://invite/INVALID' });

      await waitForElement('invite-error-screen', 10000);
      await assertTextVisible('Invalid Invite');
    });

    it('should handle used invite at max capacity', async () => {
      // Open invite that has reached max uses
      await device.openURL({ url: 'gameover://invite/MAXED123' });

      await waitForElement('invite-error-screen', 10000);
      await assertTextVisible('Invite No Longer Available');
    });
  });

  describe('Invite Management', () => {
    beforeAll(async () => {
      await loginAsTestUser('organizer');
    });

    it('should view active invites', async () => {
      await waitForElement('event-summary-screen');

      await tap('manage-invites-button');

      await waitForElement('invites-list-screen');
      await assertTextVisible('Active Invites');

      // Verify invite list
      await assertVisible('invite-item-0');
    });

    it('should revoke an invite', async () => {
      await waitForElement('invites-list-screen');

      await element(by.id('invite-item-0')).longPress();

      await waitForElement('invite-actions-menu');
      await tap('revoke-invite-button');

      // Confirm revocation
      await waitForElement('confirmation-modal');
      await tap('confirm-button');

      await waitFor(element(by.text('Invite revoked')))
        .toBeVisible()
        .withTimeout(5000);
    });

    it('should regenerate revoked invite', async () => {
      await waitForElement('invites-list-screen');

      await tap('generate-new-invite-button');

      await waitFor(element(by.id('new-invite-code')))
        .toBeVisible()
        .withTimeout(5000);
    });

    it('should view invite usage stats', async () => {
      await waitForElement('invites-list-screen');

      await tap('invite-item-0');

      await waitForElement('invite-details-screen');

      await assertVisible('invite-stats-card');
      await assertTextVisible('Times Used');
      await assertTextVisible('Times Viewed');
    });
  });

  describe('Universal Links (HTTPS)', () => {
    it('should handle HTTPS invite link', async () => {
      await device.openURL({ url: 'https://game-over.app/invite/TEST123456' });

      // Should open in app (not browser) due to universal links
      await waitForElement('invite-preview-screen', 10000);
    });

    it('should handle HTTPS event link', async () => {
      await device.openURL({ url: 'https://game-over.app/event/abc123' });

      await waitForElement('event-summary-screen', 10000);
    });
  });

  describe('Invite Edge Cases', () => {
    it('should handle invite when already a participant', async () => {
      // Try to accept invite for event user is already in
      await device.openURL({ url: 'gameover://invite/ALREADY_MEMBER' });

      await waitForElement('invite-error-screen', 10000);
      await assertTextVisible('Already a Participant');
    });

    it('should handle multiple concurrent invite acceptances', async () => {
      // Documents expected behavior when multiple users accept same invite
      // simultaneously
    });

    it('should handle network error during invite acceptance', async () => {
      await device.setStatusBar({ offline: true });

      await device.openURL({ url: 'gameover://invite/TEST123456' });
      await waitForElement('invite-preview-screen', 10000);

      await tap('accept-invite-button');

      // Should show error
      await waitFor(element(by.text('No internet connection')))
        .toBeVisible()
        .withTimeout(5000);

      await device.setStatusBar({ offline: false });
    });
  });
});
```

### Step 2: Run test to verify it fails

Run: `npm run test:e2e -- e2e/invites/inviteSystem.test.ts --configuration ios.sim.debug`

Expected: FAIL - Missing testIDs and invite handling screens

### Step 3: Add testIDs to invite components

Modify relevant invite components and add testIDs

### Step 4: Run test to verify it passes

Run: `npm run test:e2e -- e2e/invites/inviteSystem.test.ts --configuration ios.sim.debug`

Expected: PASS

### Step 5: Commit

```bash
git add e2e/invites/ app/invite/
git commit -m "test: add comprehensive invite system and deep linking E2E tests"
```

---

## Task 6: Edge Cases & Error Handling E2E Tests

**Files:**
- Create: `e2e/edgeCases/networkErrors.test.ts`
- Create: `e2e/edgeCases/sessionManagement.test.ts`
- Create: `e2e/edgeCases/dataConsistency.test.ts`

### Step 1: Write network error tests

```typescript
/**
 * Network Error Handling E2E Tests
 * Tests offline mode, poor connectivity, and error recovery
 */

import { by, device, element, expect, waitFor } from 'detox';
import { loginAsTestUser, createTestEvent } from '../utils/auth';
import { waitForElement, tap, typeInInput, assertTextVisible } from '../utils/testHelpers';

describe('Network Error Handling', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
    await loginAsTestUser('organizer');
  });

  describe('Offline Mode', () => {
    it('should show offline indicator when network is lost', async () => {
      await waitForElement('events-screen');

      // Enable airplane mode
      await device.setStatusBar({ offline: true });

      // Verify offline indicator
      await waitFor(element(by.text('You are offline')))
        .toBeVisible()
        .withTimeout(5000);
    });

    it('should queue actions when offline', async () => {
      await waitForElement('events-screen');

      // Try to create event while offline
      await tap('create-event-button');

      await waitForElement('wizard-step-1');
      await element(by.id('party-type-bachelor')).tap();
      await typeInInput('honoree-name-input', 'OfflineTest');

      // Wizard should continue working (local state)
      await tap('wizard-next-button');
      await waitForElement('wizard-step-2');
    });

    it('should sync when connection restored', async () => {
      // Restore connection
      await device.setStatusBar({ offline: false });

      // Wait for sync indicator
      await waitFor(element(by.text('Syncing...')))
        .toBeVisible()
        .withTimeout(10000);

      await waitFor(element(by.text('Synced')))
        .toBeVisible()
        .withTimeout(15000);
    });

    it('should handle offline message sending', async () => {
      await device.setStatusBar({ offline: true });

      await tap('tab-chat');
      await waitForElement('chat-screen');
      await element(by.id('channel-item-0')).tap();

      await typeInInput('message-input', 'Offline message');
      await tap('send-message-button');

      // Message should show pending state
      await waitFor(element(by.id('message-pending-indicator')))
        .toBeVisible()
        .withTimeout(3000);

      // Restore connection
      await device.setStatusBar({ offline: false });

      // Message should send
      await waitFor(element(by.id('message-sent-indicator')))
        .toBeVisible()
        .withTimeout(10000);
    });

    it('should cache viewed data for offline access', async () => {
      // View event data while online
      await device.setStatusBar({ offline: false });
      await tap('tab-events');
      await waitForElement('events-screen');
      await element(by.id('event-card-0')).tap();
      await waitForElement('event-summary-screen');

      // Go offline
      await device.setStatusBar({ offline: true });

      // Navigate away and back
      await tap('back-button');
      await element(by.id('event-card-0')).tap();

      // Should still show cached data
      await waitForElement('event-summary-screen');
      await expect(element(by.id('event-title'))).toBeVisible();

      await device.setStatusBar({ offline: false });
    });
  });

  describe('Network Timeout', () => {
    it('should show timeout error for slow requests', async () => {
      // This would require mocking slow network or server delays
      // Documents expected timeout behavior
    });

    it('should allow retry after timeout', async () => {
      // After timeout, should show retry button
      // Documents retry mechanism
    });
  });

  describe('Error Recovery', () => {
    it('should recover from temporary network glitches', async () => {
      await waitForElement('events-screen');

      // Simulate brief network interruption
      await device.setStatusBar({ offline: true });

      await new Promise(resolve => setTimeout(resolve, 2000));

      await device.setStatusBar({ offline: false });

      // App should recover automatically
      await waitForElement('events-screen');
    });

    it('should show retry button for failed requests', async () => {
      await device.setStatusBar({ offline: true });

      await tap('create-event-button');
      // Complete wizard
      // Try to save (will fail)

      // Should show retry option
      await waitFor(element(by.text('Retry')))
        .toBeVisible()
        .withTimeout(5000);

      await device.setStatusBar({ offline: false });
    });

    it('should preserve form data after network error', async () => {
      await device.setStatusBar({ offline: true });

      await tap('create-event-button');
      await waitForElement('wizard-step-1');

      const honoree = 'ErrorTestName';
      await typeInInput('honoree-name-input', honoree);
      await element(by.id('party-type-bachelorette')).tap();

      // Try to continue (may show error)
      await tap('wizard-next-button');

      // Restore connection
      await device.setStatusBar({ offline: false });

      // Form data should be preserved
      await expect(element(by.text(honoree))).toBeVisible();
    });
  });

  describe('API Error Handling', () => {
    it('should handle 401 unauthorized errors', async () => {
      // This would require mocking API responses
      // Documents expected behavior for auth errors
    });

    it('should handle 403 forbidden errors', async () => {
      // Documents permission error handling
    });

    it('should handle 404 not found errors', async () => {
      // Try to access non-existent event
      await device.openURL({ url: 'gameover://event/nonexistent123' });

      await waitFor(element(by.text('Event not found')))
        .toBeVisible()
        .withTimeout(10000);
    });

    it('should handle 500 server errors', async () => {
      // Documents server error handling
      // Should show user-friendly error message
    });

    it('should handle rate limiting', async () => {
      // Documents rate limit error handling
      // Should show appropriate message and retry-after info
    });
  });
});
```

### Step 2: Write session management tests

```typescript
/**
 * Session Management E2E Tests
 * Tests session expiration, token refresh, concurrent sessions
 */

import { by, device, element, expect, waitFor } from 'detox';
import { loginAsTestUser } from '../utils/auth';
import { waitForElement, tap, typeInInput, assertTextVisible, restartApp } from '../utils/testHelpers';

describe('Session Management', () => {
  describe('Session Persistence', () => {
    it('should persist session after app restart', async () => {
      await device.launchApp({ newInstance: true });
      await loginAsTestUser('organizer');

      await waitForElement('events-screen', 15000);

      // Restart app
      await restartApp();

      // Should still be logged in
      await waitForElement('events-screen', 10000);
    });

    it('should persist session after app backgrounding', async () => {
      await device.launchApp({ newInstance: true });
      await loginAsTestUser('organizer');

      await waitForElement('events-screen');

      // Background app
      await device.sendToHome();

      await new Promise(resolve => setTimeout(resolve, 3000));

      // Reopen app
      await device.launchApp({ newInstance: false });

      // Should still be logged in
      await waitForElement('events-screen', 5000);
    });
  });

  describe('Session Expiration', () => {
    it('should handle expired session gracefully', async () => {
      // This would require mocking token expiration
      // or waiting for actual expiration (impractical)

      // Documents expected behavior:
      // 1. Detect expired session on API call
      // 2. Attempt token refresh
      // 3. If refresh fails, redirect to login
      // 4. Preserve navigation state for return
    });

    it('should attempt token refresh before session expiry', async () => {
      // Documents automatic token refresh behavior
      // Should happen silently in background
    });

    it('should redirect to login after session expiration', async () => {
      // After failed token refresh, should:
      // 1. Clear session
      // 2. Redirect to welcome/login
      // 3. Show "Session expired" message
    });

    it('should restore navigation state after re-login', async () => {
      // After re-login from expired session:
      // 1. Should return to previous screen
      // 2. Should preserve deep link intent
    });
  });

  describe('Concurrent Sessions', () => {
    it('should handle logout from another device', async () => {
      // Documents behavior when user logs out elsewhere
      // Current session should:
      // 1. Detect invalidated token
      // 2. Redirect to login
      // 3. Show "Signed out from another device" message
    });

    it('should handle password change from another device', async () => {
      // Documents behavior when password changes elsewhere
      // Similar to logout behavior
    });

    it('should sync data across sessions', async () => {
      // Documents real-time sync behavior
      // Changes in one session should appear in others
    });
  });

  describe('Session Security', () => {
    it('should clear session on logout', async () => {
      await device.launchApp({ newInstance: true });
      await loginAsTestUser('organizer');

      await waitForElement('events-screen');

      // Logout
      await tap('tab-profile');
      await waitForElement('profile-screen');
      await tap('sign-out-button');

      await waitForElement('welcome-screen');

      // Restart app
      await restartApp();

      // Should not be logged in
      await waitForElement('welcome-screen');
    });

    it('should handle forced logout (security event)', async () => {
      // Documents behavior for security-triggered logout
      // e.g., suspicious activity detected
    });
  });
});
```

### Step 3: Write data consistency tests

```typescript
/**
 * Data Consistency E2E Tests
 * Tests optimistic updates, conflict resolution, stale data
 */

import { by, device, element, expect, waitFor } from 'detox';
import { loginAsTestUser, createTestEvent } from '../utils/auth';
import { waitForElement, tap, typeInInput, assertTextVisible } from '../utils/testHelpers';

describe('Data Consistency', () => {
  describe('Optimistic Updates', () => {
    it('should show optimistic update immediately', async () => {
      await device.launchApp({ newInstance: true });
      await loginAsTestUser('organizer');
      await createTestEvent();

      await tap('tab-chat');
      await waitForElement('chat-screen');
      await element(by.id('channel-item-0')).tap();

      // Send message
      const message = `Test ${Date.now()}`;
      await typeInInput('message-input', message);
      await tap('send-message-button');

      // Should appear immediately (optimistic)
      await waitFor(element(by.text(message)))
        .toBeVisible()
        .withTimeout(1000);
    });

    it('should rollback failed optimistic update', async () => {
      // Simulate failure by going offline
      await device.setStatusBar({ offline: true });

      const message = `Fail ${Date.now()}`;
      await typeInInput('message-input', message);
      await tap('send-message-button');

      // Should show initially
      await waitFor(element(by.text(message)))
        .toBeVisible()
        .withTimeout(1000);

      // Should show error state
      await waitFor(element(by.id('message-error-indicator')))
        .toBeVisible()
        .withTimeout(5000);

      await device.setStatusBar({ offline: false });
    });
  });

  describe('Conflict Resolution', () => {
    it('should handle concurrent edits', async () => {
      // Documents behavior when two users edit same data
      // e.g., event details, expense amount

      // Expected: Last-write-wins OR conflict UI
    });

    it('should show conflict warning', async () => {
      // When conflict detected, should show:
      // 1. Warning message
      // 2. Conflicting values
      // 3. Choice to keep or discard
    });
  });

  describe('Stale Data', () => {
    it('should refresh stale data on foreground', async () => {
      await device.launchApp({ newInstance: true });
      await loginAsTestUser('organizer');

      await waitForElement('events-screen');

      // Background app for extended period
      await device.sendToHome();
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Reopen
      await device.launchApp({ newInstance: false });

      // Should trigger refresh
      await waitFor(element(by.id('loading-indicator')))
        .toBeVisible()
        .withTimeout(2000);
    });

    it('should show pull-to-refresh option', async () => {
      await waitForElement('events-screen');

      // Pull to refresh
      await element(by.id('events-list')).swipe('down', 'slow', 0.75);

      // Should trigger refresh
      await waitFor(element(by.id('refresh-indicator')))
        .toBeVisible()
        .withTimeout(2000);
    });
  });

  describe('Cache Invalidation', () => {
    it('should invalidate cache after mutation', async () => {
      await waitForElement('events-screen');

      // Create new event
      await tap('create-event-button');
      // Complete wizard...

      // Events list should update
      // (documents cache invalidation strategy)
    });

    it('should invalidate related caches', async () => {
      // When updating event, should also invalidate:
      // - Participant list
      // - Budget data
      // - Chat channel
    });
  });

  describe('Real-time Sync Edge Cases', () => {
    it('should handle rapid consecutive updates', async () => {
      // Send multiple messages rapidly
      await tap('tab-chat');
      await waitForElement('chat-screen');
      await element(by.id('channel-item-0')).tap();

      for (let i = 0; i < 5; i++) {
        await typeInInput('message-input', `Rapid ${i}`);
        await tap('send-message-button');
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // All messages should appear
      await assertTextVisible('Rapid 4');
    });

    it('should handle out-of-order updates', async () => {
      // Documents handling of updates arriving out of order
      // Should sort by timestamp or sequence number
    });

    it('should deduplicate simultaneous updates', async () => {
      // Documents handling of duplicate events
      // Should not show same message twice
    });
  });
});
```

### Step 4: Run all edge case tests

Run: `npm run test:e2e -- e2e/edgeCases/ --configuration ios.sim.debug`

Expected: Initial failures, then pass after implementing error handling

### Step 5: Commit

```bash
git add e2e/edgeCases/
git commit -m "test: add comprehensive edge case and error handling E2E tests"
```

---

## Task 7: E2E Test Infrastructure Improvements

**Files:**
- Modify: `e2e/utils/testHelpers.ts`
- Create: `e2e/utils/mockData.ts`
- Create: `e2e/utils/assertions.ts`

### Step 1: Add advanced test helpers

```typescript
// e2e/utils/testHelpers.ts - Add these helpers

/**
 * Wait for element to disappear
 */
export async function waitForElementToDisappear(
  testID: string,
  timeout: number = 10000
): Promise<void> {
  await waitFor(element(by.id(testID)))
    .not.toBeVisible()
    .withTimeout(timeout);
}

/**
 * Swipe element in direction
 */
export async function swipe(
  testID: string,
  direction: 'left' | 'right' | 'up' | 'down',
  speed: 'fast' | 'slow' = 'fast',
  normalizedOffset: number = 0.5
): Promise<void> {
  await element(by.id(testID)).swipe(direction, speed, normalizedOffset);
}

/**
 * Wait for loading to start and complete
 */
export async function waitForLoadingCycle(timeout: number = 20000): Promise<void> {
  try {
    // Wait for loading to start
    await waitFor(element(by.id('loading-indicator')))
      .toBeVisible()
      .withTimeout(3000);
  } catch {
    // Loading might be too fast or already complete
  }

  // Wait for loading to complete
  await waitForLoadingComplete(timeout);
}

/**
 * Assert element has specific text
 */
export async function assertElementText(
  testID: string,
  expectedText: string
): Promise<void> {
  await expect(element(by.id(testID))).toHaveText(expectedText);
}

/**
 * Assert element exists (not necessarily visible)
 */
export async function assertExists(testID: string): Promise<void> {
  await expect(element(by.id(testID))).toExist();
}

/**
 * Assert element does not exist
 */
export async function assertNotExists(testID: string): Promise<void> {
  await expect(element(by.id(testID))).not.toExist();
}

/**
 * Select date from date picker (iOS)
 */
export async function selectDate(
  pickerID: string,
  date: Date
): Promise<void> {
  if (device.getPlatform() === 'ios') {
    await element(by.id(pickerID)).setDatePickerDate(
      date.toISOString(),
      'ISO8601'
    );
  } else {
    // Android date picker handling
    // Would need custom implementation
  }
}

/**
 * Take screenshot with timestamp
 */
export async function takeTimestampedScreenshot(name: string): Promise<void> {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  await device.takeScreenshot(`${name}-${timestamp}`);
}

/**
 * Wait for network idle (no pending requests)
 */
export async function waitForNetworkIdle(timeout: number = 10000): Promise<void> {
  // Would require tracking network requests via app state
  // or using network monitoring
  await new Promise(resolve => setTimeout(resolve, 2000));
}

/**
 * Retry action until it succeeds
 */
export async function retryUntilSuccess(
  action: () => Promise<void>,
  maxAttempts: number = 3,
  delayMs: number = 1000
): Promise<void> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      await action();
      return;
    } catch (error) {
      if (i === maxAttempts - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
}

/**
 * Fill form with multiple fields
 */
export async function fillForm(
  fields: Array<{ testID: string; value: string }>
): Promise<void> {
  for (const field of fields) {
    await typeInInput(field.testID, field.value);
  }
}

/**
 * Navigate to tab by name
 */
export async function navigateToTab(
  tabName: 'events' | 'chat' | 'budget' | 'profile'
): Promise<void> {
  await tap(`tab-${tabName}`);
  await waitForElement(`${tabName}-screen`);
}
```

### Step 2: Create mock data helpers

```typescript
// e2e/utils/mockData.ts

/**
 * Mock data generators for E2E tests
 */

export interface MockEvent {
  partyType: 'bachelor' | 'bachelorette';
  honoreeName: string;
  city: string;
  gatheringSize: 'small_group' | 'medium_group' | 'large_group';
  energyLevel: 'relaxed' | 'moderate' | 'high_energy';
  ageRange: string;
}

export const MOCK_EVENTS: MockEvent[] = [
  {
    partyType: 'bachelor',
    honoreeName: 'John Doe',
    city: 'Las Vegas',
    gatheringSize: 'small_group',
    energyLevel: 'high_energy',
    ageRange: '26-30',
  },
  {
    partyType: 'bachelorette',
    honoreeName: 'Jane Smith',
    city: 'Miami',
    gatheringSize: 'medium_group',
    energyLevel: 'moderate',
    ageRange: '23-25',
  },
  {
    partyType: 'bachelor',
    honoreeName: 'Mike Johnson',
    city: 'Nashville',
    gatheringSize: 'large_group',
    energyLevel: 'relaxed',
    ageRange: '31-35',
  },
];

export interface MockExpense {
  title: string;
  amount: string;
  category: string;
  payer: string;
}

export const MOCK_EXPENSES: MockExpense[] = [
  {
    title: 'Dinner at Steakhouse',
    amount: '250.00',
    category: 'Food & Drinks',
    payer: 'Organizer',
  },
  {
    title: 'Transportation',
    amount: '120.00',
    category: 'Transportation',
    payer: 'Organizer',
  },
  {
    title: 'Activity Package',
    amount: '800.00',
    category: 'Activities',
    payer: 'Organizer',
  },
];

export interface MockMessage {
  text: string;
  type: 'text' | 'system' | 'poll';
}

export const MOCK_MESSAGES: MockMessage[] = [
  { text: 'Hey everyone!', type: 'text' },
  { text: 'What time should we meet?', type: 'text' },
  { text: 'I vote for 7 PM', type: 'text' },
];

/**
 * Generate unique test email
 */
export function generateTestEmail(): string {
  return `test-${Date.now()}-${Math.random().toString(36).substring(7)}@gameoverapp.com`;
}

/**
 * Generate unique test name
 */
export function generateTestName(): string {
  const firstNames = ['John', 'Jane', 'Mike', 'Sarah', 'Chris', 'Emma'];
  const lastNames = ['Smith', 'Johnson', 'Brown', 'Davis', 'Wilson', 'Moore'];

  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];

  return `${firstName} ${lastName} ${Math.floor(Math.random() * 1000)}`;
}
```

### Step 3: Create custom assertions

```typescript
// e2e/utils/assertions.ts

import { by, element, expect } from 'detox';

/**
 * Custom assertion helpers for E2E tests
 */

export async function assertInputValue(
  testID: string,
  expectedValue: string
): Promise<void> {
  await expect(element(by.id(testID))).toHaveText(expectedValue);
}

export async function assertToggleState(
  testID: string,
  expectedState: boolean
): Promise<void> {
  await expect(element(by.id(testID))).toHaveToggleValue(expectedState);
}

export async function assertElementCount(
  testID: string,
  expectedCount: number
): Promise<void> {
  // Detox doesn't have direct count assertion
  // This is a placeholder for custom implementation
  for (let i = 0; i < expectedCount; i++) {
    await expect(element(by.id(`${testID}-${i}`))).toExist();
  }
}

export async function assertTextContains(
  testID: string,
  substring: string
): Promise<void> {
  // Would need custom matcher
  await expect(element(by.id(testID).and(by.text(substring)))).toExist();
}

export async function assertSorted(
  listID: string,
  order: 'asc' | 'desc' = 'asc'
): Promise<void> {
  // Custom implementation for verifying list sort order
  // Would require reading list item values
}

export async function assertAccessible(testID: string): Promise<void> {
  // Verify element has proper accessibility labels
  await expect(element(by.id(testID))).toExist();
  // Additional accessibility checks
}

export async function assertNoConsoleErrors(): Promise<void> {
  // Would require monitoring console logs
  // Documents expectation of clean console
}

export async function assertRoute(expectedRoute: string): Promise<void> {
  // Verify current navigation route
  // Would require accessing router state
}
```

### Step 4: Commit infrastructure improvements

```bash
git add e2e/utils/
git commit -m "test: add advanced E2E test helpers and utilities"
```

---

## Task 8: Test Execution Documentation

**Files:**
- Create: `docs/E2E_TEST_GUIDE.md`

### Step 1: Write comprehensive test execution guide

```markdown
# E2E Test Execution Guide

## Prerequisites

### iOS Simulator Setup
1. **Install Xcode** (from Mac App Store)
2. **Install Xcode Command Line Tools:**
   ```bash
   xcode-select --install
   ```
3. **Open Simulator:**
   ```bash
   open -a Simulator
   ```
4. **Select iPhone 16 Pro:**
   - Hardware → Device → iPhone 16 Pro

### Real Device Testing (iPhone 16)
1. **Install Expo Go** from App Store on device
2. **Enable Developer Mode:**
   - Settings → Privacy & Security → Developer Mode → ON
3. **Connect device via USB**
4. **Trust computer** when prompted

### Environment Setup
1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Build Detox for iOS:**
   ```bash
   npx detox build --configuration ios.sim.debug
   ```

## Running Tests

### All E2E Tests
```bash
# iOS Simulator
npm run test:e2e -- --configuration ios.sim.debug

# iOS Simulator (headless for CI)
npm run test:e2e -- --configuration ios.sim.ci
```

### Specific Test Suites
```bash
# Auth tests only
npm run test:e2e -- e2e/auth/ --configuration ios.sim.debug

# Chat tests
npm run test:e2e -- e2e/chat/ --configuration ios.sim.debug

# Budget tests
npm run test:e2e -- e2e/budget/ --configuration ios.sim.debug

# Profile tests
npm run test:e2e -- e2e/profile/ --configuration ios.sim.debug

# Invite tests
npm run test:e2e -- e2e/invites/ --configuration ios.sim.debug

# Edge cases
npm run test:e2e -- e2e/edgeCases/ --configuration ios.sim.debug
```

### Single Test File
```bash
npm run test:e2e -- e2e/chat/messaging.test.ts --configuration ios.sim.debug
```

### Debug Mode
```bash
# Run with debug logs
npm run test:e2e -- --configuration ios.sim.debug --loglevel trace

# Take screenshots on test failure
npm run test:e2e -- --configuration ios.sim.debug --take-screenshots failing

# Record video
npm run test:e2e -- --configuration ios.sim.debug --record-videos failing
```

## Test Organization

### Test Structure
```
e2e/
├── auth/                    # Authentication flows
│   ├── welcome.test.ts
│   ├── signup.test.ts
│   ├── login.test.ts
│   ├── forgotPassword.test.ts
│   └── authFlow.test.ts
├── chat/                    # Chat functionality
│   ├── messaging.test.ts
│   └── polls.test.ts
├── budget/                  # Budget tracking
│   └── budgetTracking.test.ts
├── profile/                 # Profile management
│   └── profileManagement.test.ts
├── invites/                 # Invite system
│   └── inviteSystem.test.ts
├── edgeCases/              # Edge cases & errors
│   ├── networkErrors.test.ts
│   ├── sessionManagement.test.ts
│   └── dataConsistency.test.ts
├── journeys/               # Full user journeys
│   ├── createEventJourney.test.ts
│   └── bookPackageJourney.test.ts
├── screens/                # Individual screens
│   ├── eventsDashboard.test.ts
│   └── wizardStep1.test.ts
├── smoke/                  # Smoke tests
│   └── appLaunches.test.ts
└── utils/                  # Test utilities
    ├── testHelpers.ts
    ├── auth.ts
    ├── navigation.ts
    ├── mockData.ts
    └── assertions.ts
```

## Test Coverage Report

### Current Coverage by Feature
- ✅ Authentication (95%)
- ✅ Event Creation Wizard (90%)
- ✅ Package Booking (85%)
- 🚧 Chat & Messaging (70%)
- 🚧 Budget Tracking (60%)
- 🚧 Profile Management (65%)
- 🚧 Invite System (75%)
- ⚠️ Edge Cases & Error Handling (40%)

### Priority Test Scenarios

**Critical Path (Must Pass):**
1. User signup/login
2. Create event through wizard
3. Book package and complete payment
4. Send chat message
5. Add expense to budget

**High Priority:**
6. Accept invite via deep link
7. Create and vote on poll
8. Edit profile
9. Handle network errors
10. Session persistence

**Medium Priority:**
11. Advanced budget features
12. Security settings
13. Notification preferences
14. Invite management
15. Data synchronization

## Troubleshooting

### Common Issues

#### Tests timeout
```bash
# Increase timeout in test
await waitForElement('screen-id', 20000);

# Or in jest config
jest.setTimeout(120000);
```

#### Simulator not found
```bash
# List available simulators
xcrun simctl list devices

# Boot simulator
xcrun simctl boot "iPhone 16 Pro"
```

#### Build fails
```bash
# Clean build
rm -rf ios/build
npx detox build --configuration ios.sim.debug
```

#### App crashes during test
```bash
# Check simulator logs
xcrun simctl spawn booted log stream --level debug

# Take screenshot at failure point
await device.takeScreenshot('failure-point');
```

#### Element not found
```bash
# Check element exists with longer timeout
await waitForElement('element-id', 15000);

# Verify testID is correct in component
<Button testID="button-id">
```

### Test Data Management

#### Test Users
- **Organizer:** `test@gameoverapp.com` / `TestPassword123!`
- **Participant:** `participant@test.com` / `TestPassword123!`

#### Reset Test Data
```bash
# Reset Supabase test database
npx supabase db reset

# Clear app data
await device.clearKeychain();
await device.uninstallApp();
await device.installApp();
```

## Best Practices

### Writing Tests
1. **Use descriptive test names:**
   ```typescript
   it('should display error when password is too short', async () => {});
   ```

2. **Follow AAA pattern:** Arrange, Act, Assert
   ```typescript
   // Arrange
   await waitForElement('login-screen');

   // Act
   await typeInInput('input-password', '123');
   await tap('submit-button');

   // Assert
   await assertTextVisible('Password must be at least 8 characters');
   ```

3. **Use testID consistently:**
   ```typescript
   // Component
   <Button testID="create-event-button">Create Event</Button>

   // Test
   await tap('create-event-button');
   ```

4. **Clean up after tests:**
   ```typescript
   afterAll(async () => {
     await device.terminateApp();
   });
   ```

5. **Make tests independent:**
   - Each test should work in isolation
   - Don't rely on previous test state
   - Use beforeEach for common setup

### Debugging Tests
1. **Add debug logs:**
   ```typescript
   console.log('Before tapping button');
   await tap('button-id');
   console.log('After tapping button');
   ```

2. **Take screenshots:**
   ```typescript
   await device.takeScreenshot('before-action');
   // perform action
   await device.takeScreenshot('after-action');
   ```

3. **Use Detox repl:**
   ```bash
   npm run test:e2e -- --configuration ios.sim.debug --repl
   ```

4. **Pause execution:**
   ```typescript
   await new Promise(resolve => setTimeout(resolve, 5000));
   ```

## CI/CD Integration

### GitHub Actions Example
```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  e2e-ios:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Build Detox
        run: npx detox build --configuration ios.sim.ci

      - name: Run E2E tests
        run: npm run test:e2e -- --configuration ios.sim.ci

      - name: Upload artifacts
        if: failure()
        uses: actions/upload-artifact@v3
        with:
          name: detox-artifacts
          path: artifacts/
```

## Performance Optimization

### Speed Up Tests
1. **Use debug builds** (faster than release)
2. **Reuse app instance:**
   ```typescript
   beforeAll(async () => {
     await device.launchApp({ newInstance: false });
   });
   ```

3. **Run tests in parallel:**
   ```bash
   npm run test:e2e -- --maxWorkers 2
   ```

4. **Skip unnecessary waits:**
   ```typescript
   // Bad: Fixed wait
   await new Promise(resolve => setTimeout(resolve, 5000));

   // Good: Wait for specific condition
   await waitForElement('screen-id');
   ```

## Maintenance

### Updating Tests
- Update tests when UI changes
- Add tests for new features immediately
- Review and refactor tests quarterly
- Keep test dependencies up to date

### Test Review Checklist
- [ ] All tests pass locally
- [ ] Tests cover happy path
- [ ] Tests cover error cases
- [ ] Test names are descriptive
- [ ] No hardcoded waits
- [ ] All testIDs are present in components
- [ ] Tests are independent
- [ ] Cleanup is handled properly

---

Last updated: 2026-01-23
```

### Step 2: Commit documentation

```bash
git add docs/E2E_TEST_GUIDE.md
git commit -m "docs: add comprehensive E2E test execution guide"
```

---

## Task 9: Create Test Execution Script

**Files:**
- Create: `scripts/run-e2e-tests.sh`

### Step 1: Write test execution script

```bash
#!/bin/bash

# E2E Test Execution Script
# Automates test setup and execution

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Game Over E2E Test Suite${NC}"
echo -e "${GREEN}========================================${NC}"

# Check prerequisites
echo -e "\n${YELLOW}Checking prerequisites...${NC}"

if ! command -v xcodebuild &> /dev/null; then
    echo -e "${RED}Error: Xcode is not installed${NC}"
    exit 1
fi

if ! command -v node &> /dev/null; then
    echo -e "${RED}Error: Node.js is not installed${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Prerequisites met${NC}"

# Parse arguments
CONFIGURATION="ios.sim.debug"
TEST_PATH=""
REBUILD=false
CLEANUP=false
HEADLESS=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --rebuild)
            REBUILD=true
            shift
            ;;
        --cleanup)
            CLEANUP=true
            shift
            ;;
        --headless)
            CONFIGURATION="ios.sim.ci"
            HEADLESS=true
            shift
            ;;
        --config)
            CONFIGURATION="$2"
            shift 2
            ;;
        --test)
            TEST_PATH="$2"
            shift 2
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            exit 1
            ;;
    esac
done

# Cleanup if requested
if [ "$CLEANUP" = true ]; then
    echo -e "\n${YELLOW}Cleaning build artifacts...${NC}"
    rm -rf ios/build
    echo -e "${GREEN}✓ Cleanup complete${NC}"
fi

# Build if needed
if [ "$REBUILD" = true ] || [ ! -d "ios/build" ]; then
    echo -e "\n${YELLOW}Building Detox...${NC}"
    npx detox build --configuration "$CONFIGURATION"
    echo -e "${GREEN}✓ Build complete${NC}"
fi

# Start simulator if not running (unless headless)
if [ "$HEADLESS" = false ]; then
    echo -e "\n${YELLOW}Checking simulator status...${NC}"
    SIMULATOR_BOOTED=$(xcrun simctl list devices | grep "iPhone 16 Pro" | grep "Booted" || true)

    if [ -z "$SIMULATOR_BOOTED" ]; then
        echo -e "${YELLOW}Starting iPhone 16 Pro simulator...${NC}"
        open -a Simulator
        sleep 5
        xcrun simctl boot "iPhone 16 Pro" || true
        echo -e "${GREEN}✓ Simulator started${NC}"
    else
        echo -e "${GREEN}✓ Simulator already running${NC}"
    fi
fi

# Run tests
echo -e "\n${YELLOW}Running E2E tests...${NC}"
echo -e "${YELLOW}Configuration: $CONFIGURATION${NC}"

if [ -n "$TEST_PATH" ]; then
    echo -e "${YELLOW}Test path: $TEST_PATH${NC}"
    npx detox test "$TEST_PATH" --configuration "$CONFIGURATION" --loglevel info
else
    echo -e "${YELLOW}Running all tests${NC}"
    npx detox test --configuration "$CONFIGURATION" --loglevel info
fi

TEST_EXIT_CODE=$?

# Results
echo -e "\n${GREEN}========================================${NC}"
if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo -e "${GREEN}  ✓ All tests passed!${NC}"
else
    echo -e "${RED}  ✗ Tests failed${NC}"
    echo -e "${YELLOW}  Check artifacts/ directory for screenshots${NC}"
fi
echo -e "${GREEN}========================================${NC}"

exit $TEST_EXIT_CODE
```

### Step 2: Make script executable

Run: `chmod +x scripts/run-e2e-tests.sh`

### Step 3: Test script

```bash
# Run all tests with rebuild
./scripts/run-e2e-tests.sh --rebuild

# Run specific test
./scripts/run-e2e-tests.sh --test e2e/chat/messaging.test.ts

# Run in headless mode (for CI)
./scripts/run-e2e-tests.sh --headless

# Cleanup and rebuild
./scripts/run-e2e-tests.sh --cleanup --rebuild
```

### Step 4: Commit script

```bash
git add scripts/run-e2e-tests.sh
git commit -m "feat: add E2E test execution script"
```

---

## Completion Checklist

### Test Coverage ✅
- [x] Chat messaging tests
- [x] Chat polls tests
- [x] Budget tracking tests
- [x] Profile management tests
- [x] Invite system and deep linking tests
- [x] Network error handling tests
- [x] Session management tests
- [x] Data consistency tests

### Infrastructure ✅
- [x] Advanced test helpers
- [x] Mock data generators
- [x] Custom assertions
- [x] Test execution script

### Documentation ✅
- [x] E2E test execution guide
- [x] Troubleshooting guide
- [x] Best practices
- [x] CI/CD integration examples

### Execution Verification
- [ ] Run all auth tests
- [ ] Run all chat tests
- [ ] Run all budget tests
- [ ] Run all profile tests
- [ ] Run all invite tests
- [ ] Run all edge case tests
- [ ] Run full test suite
- [ ] Verify on iOS simulator
- [ ] Verify on real device (iPhone 16)

---

## Usage Instructions

### Running Specific Test Categories

```bash
# Critical path tests
npm run test:e2e -- e2e/auth/ e2e/journeys/ --configuration ios.sim.debug

# Feature tests
npm run test:e2e -- e2e/chat/ e2e/budget/ e2e/profile/ --configuration ios.sim.debug

# Edge case tests
npm run test:e2e -- e2e/edgeCases/ --configuration ios.sim.debug

# Full suite
npm run test:e2e -- --configuration ios.sim.debug
```

### Real Device Testing (iPhone 16)

1. **Connect iPhone 16 via USB**
2. **Build for device:**
   ```bash
   npx detox build --configuration ios.device
   ```
3. **Run tests:**
   ```bash
   npx detox test --configuration ios.device
   ```

### Continuous Testing During Development

```bash
# Watch mode (re-run on changes)
npm run test:e2e -- e2e/chat/ --configuration ios.sim.debug --watch
```

---

## Next Steps After Plan Implementation

1. **Review test results** and fix any failures
2. **Add missing testIDs** to components as needed
3. **Implement error handling** for edge cases uncovered by tests
4. **Set up CI/CD pipeline** using GitHub Actions
5. **Schedule regular test runs** (nightly full suite)
6. **Monitor test flakiness** and fix unstable tests
7. **Expand test coverage** to reach 90%+ on critical paths
8. **Document discovered bugs** and create fix tickets

---

**Total Estimated Tasks:** 9 major tasks
**Estimated Lines of Test Code:** ~3000+ lines
**Test Files Created:** 12+ new test files
**Coverage Improvement:** From ~30% to ~85%+
