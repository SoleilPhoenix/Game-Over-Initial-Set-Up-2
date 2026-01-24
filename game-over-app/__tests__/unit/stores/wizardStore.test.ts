/**
 * Wizard Store Tests
 * Unit tests for the event creation wizard store
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock MMKV before importing store
vi.mock('react-native-mmkv', () => ({
  MMKV: vi.fn(() => ({
    getString: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
    contains: vi.fn(),
    clearAll: vi.fn(),
  })),
}));

// Import store after mocking
import { useWizardStore } from '@/stores/wizardStore';

describe('wizardStore', () => {
  beforeEach(() => {
    // Reset the store before each test
    useWizardStore.getState().reset();
  });

  describe('initial state', () => {
    it('should have correct initial values', () => {
      const state = useWizardStore.getState();

      expect(state.partyType).toBeNull();
      expect(state.honoreeName).toBe('');
      expect(state.cityId).toBeNull();
      expect(state.startDate).toBeNull();
      expect(state.endDate).toBeNull();
      expect(state.currentStep).toBe(1);
      expect(state.isDirty).toBe(false);
    });
  });

  describe('step 1 actions', () => {
    it('should set party type', () => {
      useWizardStore.getState().setPartyType('bachelor');

      expect(useWizardStore.getState().partyType).toBe('bachelor');
      expect(useWizardStore.getState().isDirty).toBe(true);
    });

    it('should set honoree name', () => {
      useWizardStore.getState().setHonoreeName('John');

      expect(useWizardStore.getState().honoreeName).toBe('John');
      expect(useWizardStore.getState().isDirty).toBe(true);
    });

    it('should set city ID', () => {
      useWizardStore.getState().setCityId('city-123');

      expect(useWizardStore.getState().cityId).toBe('city-123');
    });

    it('should set dates', () => {
      useWizardStore.getState().setDates('2024-06-15', '2024-06-17');

      expect(useWizardStore.getState().startDate).toBe('2024-06-15');
      expect(useWizardStore.getState().endDate).toBe('2024-06-17');
    });
  });

  describe('step 2 actions', () => {
    it('should set gathering size', () => {
      useWizardStore.getState().setGatheringSize('small_group');

      expect(useWizardStore.getState().gatheringSize).toBe('small_group');
    });

    it('should set social approach', () => {
      useWizardStore.getState().setSocialApproach('butterfly');

      expect(useWizardStore.getState().socialApproach).toBe('butterfly');
    });

    it('should set energy level', () => {
      useWizardStore.getState().setEnergyLevel('high_energy');

      expect(useWizardStore.getState().energyLevel).toBe('high_energy');
    });
  });

  describe('step 3 actions', () => {
    it('should set average age', () => {
      useWizardStore.getState().setAverageAge('26-30');

      expect(useWizardStore.getState().averageAge).toBe('26-30');
    });

    it('should set group cohesion', () => {
      useWizardStore.getState().setGroupCohesion('close_friends');

      expect(useWizardStore.getState().groupCohesion).toBe('close_friends');
    });

    it('should toggle vibe preferences', () => {
      useWizardStore.getState().toggleVibePreference('adventurous');

      expect(useWizardStore.getState().vibePreferences).toContain('adventurous');

      useWizardStore.getState().toggleVibePreference('adventurous');

      expect(useWizardStore.getState().vibePreferences).not.toContain('adventurous');
    });

    it('should set vibe preferences array', () => {
      useWizardStore.getState().setVibePreferences(['relaxing', 'cultural']);

      expect(useWizardStore.getState().vibePreferences).toEqual(['relaxing', 'cultural']);
    });
  });

  describe('navigation', () => {
    it('should go to next step', () => {
      // Fill step 1 requirements first
      useWizardStore.getState().setPartyType('bachelor');
      useWizardStore.getState().setHonoreeName('John');
      useWizardStore.getState().setCityId('city-123');
      useWizardStore.getState().setDates('2024-06-15', '2024-06-17');

      useWizardStore.getState().nextStep();

      expect(useWizardStore.getState().currentStep).toBe(2);
    });

    it('should go to previous step', () => {
      // Go to step 2 first
      useWizardStore.getState().goToStep(2);
      useWizardStore.getState().previousStep();

      expect(useWizardStore.getState().currentStep).toBe(1);
    });

    it('should not go below step 1', () => {
      useWizardStore.getState().previousStep();

      expect(useWizardStore.getState().currentStep).toBe(1);
    });

    it('should go to specific step', () => {
      useWizardStore.getState().goToStep(3);

      expect(useWizardStore.getState().currentStep).toBe(3);
    });
  });

  describe('validation', () => {
    it('should validate step 1 requires all fields', () => {
      expect(useWizardStore.getState().isStepValid(1)).toBe(false);

      useWizardStore.getState().setPartyType('bachelor');
      expect(useWizardStore.getState().isStepValid(1)).toBe(false);

      useWizardStore.getState().setHonoreeName('John');
      expect(useWizardStore.getState().isStepValid(1)).toBe(false);

      useWizardStore.getState().setCityId('city-123');
      expect(useWizardStore.getState().isStepValid(1)).toBe(false);

      useWizardStore.getState().setDates('2024-06-15', '2024-06-17');
      expect(useWizardStore.getState().isStepValid(1)).toBe(true);
    });
  });

  describe('reset and clear', () => {
    it('should reset to initial state', () => {
      // Set some values
      useWizardStore.getState().setPartyType('bachelor');
      useWizardStore.getState().setHonoreeName('John');
      useWizardStore.getState().goToStep(3);

      // Reset
      useWizardStore.getState().reset();

      const state = useWizardStore.getState();
      expect(state.partyType).toBeNull();
      expect(state.honoreeName).toBe('');
      expect(state.currentStep).toBe(1);
    });

    it('should clear draft', () => {
      useWizardStore.getState().setPartyType('bachelor');
      useWizardStore.getState().setHonoreeName('John');

      useWizardStore.getState().clearDraft();

      const state = useWizardStore.getState();
      expect(state.partyType).toBeNull();
      expect(state.honoreeName).toBe('');
    });
  });
});
