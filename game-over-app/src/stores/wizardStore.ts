/**
 * Event Creation Wizard Store
 * Manages wizard state with persistence using MMKV
 * Includes auto-save functionality every 30 seconds
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { MMKV } from 'react-native-mmkv';
import { useEffect, useRef } from 'react';

// MMKV storage instance for wizard
const wizardStorage = new MMKV({ id: 'wizard-storage' });

// Auto-save timer reference
let autoSaveTimer: ReturnType<typeof setInterval> | null = null;
const AUTO_SAVE_INTERVAL = 30000; // 30 seconds

// Custom storage adapter for Zustand persist
const mmkvStorage = {
  getItem: (name: string) => {
    const value = wizardStorage.getString(name);
    return value ?? null;
  },
  setItem: (name: string, value: string) => {
    wizardStorage.set(name, value);
  },
  removeItem: (name: string) => {
    wizardStorage.delete(name);
  },
};

// Types
type PartyType = 'bachelor' | 'bachelorette';
type GatheringSize = 'intimate' | 'small_group' | 'party';
type SocialApproach = 'wallflower' | 'butterfly' | 'observer' | 'mingler';
type EnergyLevel = 'low_key' | 'moderate' | 'high_energy';
type AgeRange = '21-25' | '26-30' | '31-35' | '35+';
type GroupCohesion = 'close_friends' | 'mixed_group' | 'strangers';

interface WizardState {
  // Step 1: Key Details
  partyType: PartyType | null;
  honoreeName: string;
  cityId: string | null;
  startDate: string | null;
  endDate: string | null;

  // Step 2: Honoree Preferences
  gatheringSize: GatheringSize | null;
  socialApproach: SocialApproach | null;
  energyLevel: EnergyLevel | null;

  // Step 3: Participant Preferences
  averageAge: AgeRange | null;
  groupCohesion: GroupCohesion | null;
  vibePreferences: string[];

  // Step 4: Package Selection
  selectedPackageId: string | null;

  // Meta
  currentStep: number;
  lastSavedAt: string | null;
  isDirty: boolean;
}

interface WizardActions {
  // Step 1 actions
  setPartyType: (type: PartyType) => void;
  setHonoreeName: (name: string) => void;
  setCityId: (cityId: string) => void;
  setDates: (startDate: string, endDate: string) => void;

  // Step 2 actions
  setGatheringSize: (size: GatheringSize) => void;
  setSocialApproach: (approach: SocialApproach) => void;
  setEnergyLevel: (level: EnergyLevel) => void;

  // Step 3 actions
  setAverageAge: (age: AgeRange) => void;
  setGroupCohesion: (cohesion: GroupCohesion) => void;
  setVibePreferences: (vibes: string[]) => void;
  toggleVibePreference: (vibe: string) => void;

  // Step 4 actions
  setSelectedPackageId: (packageId: string) => void;

  // Navigation
  nextStep: () => void;
  previousStep: () => void;
  goToStep: (step: number) => void;

  // Validation
  isStepValid: (step: number) => boolean;
  canProceed: () => boolean;

  // Persistence & Auto-save
  saveDraft: () => void;
  clearDraft: () => void;
  reset: () => void;
  startAutoSave: () => void;
  stopAutoSave: () => void;
  hasDraft: () => boolean;
  getTimeSinceLastSave: () => number | null;

  // Get data for API
  getEventData: () => {
    event: {
      title: string;
      party_type: PartyType;
      honoree_name: string;
      city_id: string;
      start_date: string;
      end_date: string;
    };
    preferences: {
      gathering_size: GatheringSize | null;
      social_approach: SocialApproach | null;
      energy_level: EnergyLevel | null;
      average_age: AgeRange | null;
      group_cohesion: GroupCohesion | null;
      vibe_preferences: string[];
    };
  } | null;
}

const initialState: WizardState = {
  partyType: null,
  honoreeName: '',
  cityId: null,
  startDate: null,
  endDate: null,
  gatheringSize: null,
  socialApproach: null,
  energyLevel: null,
  averageAge: null,
  groupCohesion: null,
  vibePreferences: [],
  selectedPackageId: null,
  currentStep: 1,
  lastSavedAt: null,
  isDirty: false,
};

export const useWizardStore = create<WizardState & WizardActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Step 1 actions
      setPartyType: (type) => set({ partyType: type, isDirty: true }),
      setHonoreeName: (name) => set({ honoreeName: name, isDirty: true }),
      setCityId: (cityId) => set({ cityId, isDirty: true }),
      setDates: (startDate, endDate) =>
        set({ startDate, endDate, isDirty: true }),

      // Step 2 actions
      setGatheringSize: (size) => set({ gatheringSize: size, isDirty: true }),
      setSocialApproach: (approach) =>
        set({ socialApproach: approach, isDirty: true }),
      setEnergyLevel: (level) => set({ energyLevel: level, isDirty: true }),

      // Step 3 actions
      setAverageAge: (age) => set({ averageAge: age, isDirty: true }),
      setGroupCohesion: (cohesion) =>
        set({ groupCohesion: cohesion, isDirty: true }),
      setVibePreferences: (vibes) =>
        set({ vibePreferences: vibes, isDirty: true }),
      toggleVibePreference: (vibe) => {
        const current = get().vibePreferences;
        const newVibes = current.includes(vibe)
          ? current.filter((v) => v !== vibe)
          : [...current, vibe];
        set({ vibePreferences: newVibes, isDirty: true });
      },

      // Step 4 actions
      setSelectedPackageId: (packageId) =>
        set({ selectedPackageId: packageId, isDirty: true }),

      // Navigation
      nextStep: () => {
        const { currentStep, canProceed } = get();
        if (canProceed() && currentStep < 4) {
          set({ currentStep: currentStep + 1 });
        }
      },
      previousStep: () => {
        const { currentStep } = get();
        if (currentStep > 1) {
          set({ currentStep: currentStep - 1 });
        }
      },
      goToStep: (step) => {
        if (step >= 1 && step <= 4) {
          set({ currentStep: step });
        }
      },

      // Validation
      isStepValid: (step) => {
        const state = get();
        switch (step) {
          case 1:
            return !!(
              state.partyType &&
              state.honoreeName.trim() &&
              state.cityId &&
              state.startDate &&
              state.endDate
            );
          case 2:
            return !!(state.gatheringSize && state.energyLevel);
          case 3:
            return true; // Step 3 is optional
          case 4:
            return !!state.selectedPackageId;
          default:
            return false;
        }
      },
      canProceed: () => {
        const { currentStep, isStepValid } = get();
        return isStepValid(currentStep);
      },

      // Persistence & Auto-save
      saveDraft: () => {
        set({ lastSavedAt: new Date().toISOString(), isDirty: false });
      },
      clearDraft: () => {
        // Stop auto-save when clearing draft
        if (autoSaveTimer) {
          clearInterval(autoSaveTimer);
          autoSaveTimer = null;
        }
        wizardStorage.delete('wizard-state');
        set(initialState);
      },
      reset: () => {
        set(initialState);
      },
      startAutoSave: () => {
        // Clear any existing timer
        if (autoSaveTimer) {
          clearInterval(autoSaveTimer);
        }
        // Start new auto-save timer
        autoSaveTimer = setInterval(() => {
          const state = get();
          if (state.isDirty) {
            set({ lastSavedAt: new Date().toISOString(), isDirty: false });
            // MMKV persist middleware handles actual save automatically
          }
        }, AUTO_SAVE_INTERVAL);
      },
      stopAutoSave: () => {
        if (autoSaveTimer) {
          clearInterval(autoSaveTimer);
          autoSaveTimer = null;
        }
      },
      hasDraft: () => {
        const state = get();
        // Check if there's any meaningful data in the wizard
        return !!(
          state.partyType ||
          state.honoreeName.trim() ||
          state.cityId ||
          state.startDate ||
          state.endDate
        );
      },
      getTimeSinceLastSave: () => {
        const { lastSavedAt } = get();
        if (!lastSavedAt) return null;
        return Math.floor((Date.now() - new Date(lastSavedAt).getTime()) / 1000);
      },

      // Get data for API
      getEventData: () => {
        const state = get();

        if (
          !state.partyType ||
          !state.honoreeName ||
          !state.cityId ||
          !state.startDate ||
          !state.endDate
        ) {
          return null;
        }

        const title = `${state.honoreeName}'s ${
          state.partyType === 'bachelor' ? 'Bachelor' : 'Bachelorette'
        } Party`;

        return {
          event: {
            title,
            party_type: state.partyType,
            honoree_name: state.honoreeName,
            city_id: state.cityId,
            start_date: state.startDate,
            end_date: state.endDate,
          },
          preferences: {
            gathering_size: state.gatheringSize,
            social_approach: state.socialApproach,
            energy_level: state.energyLevel,
            average_age: state.averageAge,
            group_cohesion: state.groupCohesion,
            vibe_preferences: state.vibePreferences,
          },
        };
      },
    }),
    {
      name: 'wizard-state',
      storage: createJSONStorage(() => mmkvStorage),
      partialize: (state) => ({
        partyType: state.partyType,
        honoreeName: state.honoreeName,
        cityId: state.cityId,
        startDate: state.startDate,
        endDate: state.endDate,
        gatheringSize: state.gatheringSize,
        socialApproach: state.socialApproach,
        energyLevel: state.energyLevel,
        averageAge: state.averageAge,
        groupCohesion: state.groupCohesion,
        vibePreferences: state.vibePreferences,
        selectedPackageId: state.selectedPackageId,
        currentStep: state.currentStep,
        lastSavedAt: state.lastSavedAt,
      }),
    }
  )
);

// Selector hooks for convenience
export const useWizardStep = () => useWizardStore((state) => state.currentStep);
export const useWizardIsDirty = () => useWizardStore((state) => state.isDirty);
export const useWizardCanProceed = () =>
  useWizardStore((state) => state.canProceed());
export const useWizardLastSavedAt = () =>
  useWizardStore((state) => state.lastSavedAt);

/**
 * Custom hook for auto-save indicator
 * Returns formatted time since last save
 */
export const useWizardAutoSaveStatus = () => {
  const lastSavedAt = useWizardStore((state) => state.lastSavedAt);
  const isDirty = useWizardStore((state) => state.isDirty);

  if (!lastSavedAt) return null;

  const secondsAgo = Math.floor(
    (Date.now() - new Date(lastSavedAt).getTime()) / 1000
  );

  if (secondsAgo < 60) {
    return {
      text: `Draft saved ${secondsAgo} seconds ago`,
      isDirty,
    };
  } else if (secondsAgo < 3600) {
    const minutes = Math.floor(secondsAgo / 60);
    return {
      text: `Draft saved ${minutes} minute${minutes > 1 ? 's' : ''} ago`,
      isDirty,
    };
  } else {
    return {
      text: 'Draft saved',
      isDirty,
    };
  }
};

/**
 * Custom hook for managing wizard auto-save lifecycle
 * Use this hook in your wizard component to ensure proper timer cleanup
 * This is the recommended way to enable auto-save instead of calling
 * startAutoSave/stopAutoSave directly
 */
export const useWizardAutoSave = (enabled: boolean = true) => {
  const isDirty = useWizardStore((state) => state.isDirty);
  const saveDraft = useWizardStore((state) => state.saveDraft);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!enabled) {
      // Clean up timer if disabled
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    // Start auto-save timer
    timerRef.current = setInterval(() => {
      const currentState = useWizardStore.getState();
      if (currentState.isDirty) {
        currentState.saveDraft();
      }
    }, AUTO_SAVE_INTERVAL);

    // Cleanup on unmount or when disabled
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [enabled]);

  return { isDirty, saveDraft };
};
