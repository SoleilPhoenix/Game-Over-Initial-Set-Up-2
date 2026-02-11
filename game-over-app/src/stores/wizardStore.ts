/**
 * Event Creation Wizard Store
 * Manages wizard state with persistence
 * Includes auto-save functionality every 30 seconds
 *
 * Storage: Uses MMKV in dev builds, AsyncStorage in Expo Go
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { useEffect, useRef } from 'react';
import { createSyncStorage, deleteFromStorage } from '@/lib/storage';

// Storage instance for wizard (works in both Expo Go and dev builds)
const wizardStorage = createSyncStorage('wizard-storage');

// Auto-save timer reference
let autoSaveTimer: ReturnType<typeof setInterval> | null = null;
const AUTO_SAVE_INTERVAL = 30000; // 30 seconds

// Types
type PartyType = 'bachelor' | 'bachelorette';
type GatheringSize = 'intimate' | 'small_group' | 'party';
type SocialApproach = 'wallflower' | 'butterfly' | 'observer' | 'mingler';
type EnergyLevel = 'low_key' | 'moderate' | 'high_energy' | 'extreme';
type ParticipationStyle = 'active' | 'passive' | 'competitive' | 'cooperative';
type VenuePreference = 'indoors' | 'outdoors' | 'rooftop' | 'dive_bar' | 'club';
type PublicAttention = 'low_key' | 'moderate' | 'center_stage';
type AgeRange = '21-25' | '26-30' | '31-35' | '35+';
type GroupCohesion = 'close_friends' | 'mixed_group' | 'strangers';
type ActivityLevel = 'relaxed' | 'moderate' | 'high_paced';
type TravelDistance = 'local' | 'domestic' | 'international';
type EventDuration = '1_day' | '2_days' | '3_plus_days' | '1_night' | 'weekend' | 'long_weekend';

export interface DraftSnapshot {
  id: string;
  createdAt: string;
  updatedAt: string;
  partyType: PartyType | null;
  honoreeName: string;
  cityId: string | null;
  participantCount: number;
  startDate: string | null;
  endDate: string | null;
  gatheringSize: GatheringSize | null;
  socialApproach: SocialApproach | null;
  energyLevel: EnergyLevel | null;
  participationStyle: ParticipationStyle | null;
  venuePreference: VenuePreference | null;
  publicAttention: PublicAttention | null;
  averageAge: AgeRange | null;
  groupCohesion: GroupCohesion | null;
  vibePreferences: string[];
  activityLevel: ActivityLevel | null;
  travelDistance: TravelDistance | null;
  eventDuration: EventDuration | null;
  selectedPackageId: string | null;
  currentStep: number;
}

interface WizardState {
  // Step 1: Key Details
  partyType: PartyType | null;
  honoreeName: string;
  cityId: string | null;
  participantCount: number;
  startDate: string | null;
  endDate: string | null;

  // Step 2: Honoree Preferences
  gatheringSize: GatheringSize | null;
  socialApproach: SocialApproach | null;
  energyLevel: EnergyLevel | null;
  participationStyle: ParticipationStyle | null;
  venuePreference: VenuePreference | null;
  publicAttention: PublicAttention | null;

  // Step 3: Participant Preferences
  averageAge: AgeRange | null;
  groupCohesion: GroupCohesion | null;
  vibePreferences: string[];
  activityLevel: ActivityLevel | null;
  travelDistance: TravelDistance | null;
  eventDuration: EventDuration | null;

  // Step 4: Package Selection
  selectedPackageId: string | null;

  // Meta
  currentStep: number;
  lastSavedAt: string | null;
  isDirty: boolean;

  // Multi-draft
  activeDraftId: string | null;
  savedDrafts: Record<string, DraftSnapshot>;
}

interface WizardActions {
  // Step 1 actions
  setPartyType: (type: PartyType) => void;
  setHonoreeName: (name: string) => void;
  setCityId: (cityId: string) => void;
  setParticipantCount: (count: number) => void;
  setDates: (startDate: string, endDate: string) => void;

  // Step 2 actions
  setGatheringSize: (size: GatheringSize) => void;
  setSocialApproach: (approach: SocialApproach) => void;
  setEnergyLevel: (level: EnergyLevel) => void;
  setParticipationStyle: (style: ParticipationStyle) => void;
  setVenuePreference: (venue: VenuePreference) => void;
  setPublicAttention: (attention: PublicAttention) => void;

  // Step 3 actions
  setAverageAge: (age: AgeRange) => void;
  setGroupCohesion: (cohesion: GroupCohesion) => void;
  setVibePreferences: (vibes: string[]) => void;
  toggleVibePreference: (vibe: string) => void;
  setActivityLevel: (level: ActivityLevel) => void;
  setTravelDistance: (distance: TravelDistance) => void;
  setEventDuration: (duration: EventDuration) => void;

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

  // Multi-draft actions
  startNewDraft: () => void;
  loadDraft: (id: string) => void;
  deleteDraft: (id: string) => void;
  getAllDrafts: () => DraftSnapshot[];

  // Get data for API
  getEventData: () => {
    event: {
      title: string;
      party_type: PartyType;
      honoree_name: string;
      city_id: string;
      start_date: string | null;
      end_date: string | null;
    };
    preferences: {
      gathering_size: GatheringSize | null;
      social_approach: SocialApproach | null;
      energy_level: EnergyLevel | null;
      participation_style: ParticipationStyle | null;
      venue_preference: VenuePreference | null;
      public_attention: PublicAttention | null;
      average_age: AgeRange | null;
      group_cohesion: GroupCohesion | null;
      vibe_preferences: string[];
      activity_level: ActivityLevel | null;
      travel_distance: TravelDistance | null;
      event_duration: EventDuration | null;
    };
  } | null;
}

const initialWizardFields = {
  partyType: null as PartyType | null,
  honoreeName: '',
  cityId: null as string | null,
  participantCount: 10,
  startDate: null as string | null,
  endDate: null as string | null,
  gatheringSize: null as GatheringSize | null,
  socialApproach: null as SocialApproach | null,
  energyLevel: null as EnergyLevel | null,
  participationStyle: null as ParticipationStyle | null,
  venuePreference: null as VenuePreference | null,
  publicAttention: null as PublicAttention | null,
  averageAge: null as AgeRange | null,
  groupCohesion: null as GroupCohesion | null,
  vibePreferences: [] as string[],
  activityLevel: null as ActivityLevel | null,
  travelDistance: null as TravelDistance | null,
  eventDuration: null as EventDuration | null,
  selectedPackageId: null as string | null,
  currentStep: 1,
};

const initialState: WizardState = {
  ...initialWizardFields,
  lastSavedAt: null,
  isDirty: false,
  activeDraftId: null,
  savedDrafts: {},
};

function generateDraftId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function snapshotFromState(state: WizardState, id: string, now: string): DraftSnapshot {
  return {
    id,
    createdAt: now,
    updatedAt: now,
    partyType: state.partyType,
    honoreeName: state.honoreeName,
    cityId: state.cityId,
    participantCount: state.participantCount,
    startDate: state.startDate,
    endDate: state.endDate,
    gatheringSize: state.gatheringSize,
    socialApproach: state.socialApproach,
    energyLevel: state.energyLevel,
    participationStyle: state.participationStyle,
    venuePreference: state.venuePreference,
    publicAttention: state.publicAttention,
    averageAge: state.averageAge,
    groupCohesion: state.groupCohesion,
    vibePreferences: state.vibePreferences,
    activityLevel: state.activityLevel,
    travelDistance: state.travelDistance,
    eventDuration: state.eventDuration,
    selectedPackageId: state.selectedPackageId,
    currentStep: state.currentStep,
  };
}

function hasActiveData(state: WizardState): boolean {
  return !!(
    state.partyType ||
    state.honoreeName.trim() ||
    state.cityId ||
    state.startDate ||
    state.endDate
  );
}

export const useWizardStore = create<WizardState & WizardActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Step 1 actions
      setPartyType: (type) => set({ partyType: type, isDirty: true }),
      setHonoreeName: (name) => set({ honoreeName: name, isDirty: true }),
      setCityId: (cityId) => set({ cityId, isDirty: true }),
      setParticipantCount: (count) => set({ participantCount: Math.max(1, Math.min(30, count)), isDirty: true }),
      setDates: (startDate, endDate) =>
        set({ startDate, endDate, isDirty: true }),

      // Step 2 actions
      setGatheringSize: (size) => set({ gatheringSize: size, isDirty: true }),
      setSocialApproach: (approach) =>
        set({ socialApproach: approach, isDirty: true }),
      setEnergyLevel: (level) => set({ energyLevel: level, isDirty: true }),
      setParticipationStyle: (style) => set({ participationStyle: style, isDirty: true }),
      setVenuePreference: (venue) => set({ venuePreference: venue, isDirty: true }),
      setPublicAttention: (attention) => set({ publicAttention: attention, isDirty: true }),

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
      setActivityLevel: (level) => set({ activityLevel: level, isDirty: true }),
      setTravelDistance: (distance) => set({ travelDistance: distance, isDirty: true }),
      setEventDuration: (duration) => set({ eventDuration: duration, isDirty: true }),

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
              state.startDate
            );
          case 2:
            return !!(
              state.gatheringSize &&
              state.socialApproach &&
              state.energyLevel &&
              state.participationStyle &&
              state.venuePreference &&
              state.publicAttention
            );
          case 3:
            return !!(
              state.averageAge &&
              state.groupCohesion &&
              state.vibePreferences.length > 0 &&
              state.activityLevel &&
              state.travelDistance &&
              state.eventDuration
            );
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
        const state = get();
        const now = new Date().toISOString();
        if (state.activeDraftId && hasActiveData(state)) {
          const existing = state.savedDrafts[state.activeDraftId];
          const snapshot = snapshotFromState(state, state.activeDraftId, existing?.createdAt || now);
          snapshot.updatedAt = now;
          set({
            lastSavedAt: now,
            isDirty: false,
            savedDrafts: { ...state.savedDrafts, [state.activeDraftId]: snapshot },
          });
        } else {
          set({ lastSavedAt: now, isDirty: false });
        }
      },
      clearDraft: () => {
        // Backward compat — deletes active draft
        const state = get();
        if (state.activeDraftId) {
          get().deleteDraft(state.activeDraftId);
        } else {
          if (autoSaveTimer) {
            clearInterval(autoSaveTimer);
            autoSaveTimer = null;
          }
          set({ ...initialWizardFields, lastSavedAt: null, isDirty: false, activeDraftId: null });
        }
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
            state.saveDraft();
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
        return Object.keys(get().savedDrafts).length > 0 || hasActiveData(get());
      },
      getTimeSinceLastSave: () => {
        const { lastSavedAt } = get();
        if (!lastSavedAt) return null;
        return Math.floor((Date.now() - new Date(lastSavedAt).getTime()) / 1000);
      },

      // Multi-draft actions
      startNewDraft: () => {
        const state = get();
        const now = new Date().toISOString();
        let drafts = { ...state.savedDrafts };

        // Save current active draft if it has data
        if (state.activeDraftId && hasActiveData(state)) {
          const existing = drafts[state.activeDraftId];
          const snapshot = snapshotFromState(state, state.activeDraftId, existing?.createdAt || now);
          snapshot.updatedAt = now;
          drafts[state.activeDraftId] = snapshot;
        }

        const newId = generateDraftId();
        set({
          ...initialWizardFields,
          lastSavedAt: null,
          isDirty: false,
          activeDraftId: newId,
          savedDrafts: drafts,
        });
      },
      loadDraft: (id) => {
        const draft = get().savedDrafts[id];
        if (!draft) return;
        set({
          partyType: draft.partyType,
          honoreeName: draft.honoreeName,
          cityId: draft.cityId,
          participantCount: draft.participantCount,
          startDate: draft.startDate,
          endDate: draft.endDate,
          gatheringSize: draft.gatheringSize,
          socialApproach: draft.socialApproach,
          energyLevel: draft.energyLevel,
          participationStyle: draft.participationStyle,
          venuePreference: draft.venuePreference,
          publicAttention: draft.publicAttention,
          averageAge: draft.averageAge,
          groupCohesion: draft.groupCohesion,
          vibePreferences: draft.vibePreferences,
          activityLevel: draft.activityLevel,
          travelDistance: draft.travelDistance,
          eventDuration: draft.eventDuration,
          selectedPackageId: draft.selectedPackageId,
          currentStep: draft.currentStep,
          activeDraftId: id,
          isDirty: false,
          lastSavedAt: draft.updatedAt,
        });
      },
      deleteDraft: (id) => {
        const state = get();
        const { [id]: _removed, ...remaining } = state.savedDrafts;
        if (autoSaveTimer) {
          clearInterval(autoSaveTimer);
          autoSaveTimer = null;
        }
        if (id === state.activeDraftId) {
          set({
            ...initialWizardFields,
            lastSavedAt: null,
            isDirty: false,
            activeDraftId: null,
            savedDrafts: remaining,
          });
        } else {
          set({ savedDrafts: remaining });
        }
      },
      getAllDrafts: () => {
        return Object.values(get().savedDrafts).sort(
          (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
      },

      // Get data for API
      getEventData: () => {
        const state = get();

        if (
          !state.partyType ||
          !state.honoreeName ||
          !state.cityId
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
            participation_style: state.participationStyle,
            venue_preference: state.venuePreference,
            public_attention: state.publicAttention,
            average_age: state.averageAge,
            group_cohesion: state.groupCohesion,
            vibe_preferences: state.vibePreferences,
            activity_level: state.activityLevel,
            travel_distance: state.travelDistance,
            event_duration: state.eventDuration,
          },
        };
      },
    }),
    {
      name: 'wizard-state',
      storage: createJSONStorage(() => wizardStorage),
      partialize: (state) => ({
        partyType: state.partyType,
        honoreeName: state.honoreeName,
        cityId: state.cityId,
        participantCount: state.participantCount,
        startDate: state.startDate,
        endDate: state.endDate,
        gatheringSize: state.gatheringSize,
        socialApproach: state.socialApproach,
        energyLevel: state.energyLevel,
        participationStyle: state.participationStyle,
        venuePreference: state.venuePreference,
        publicAttention: state.publicAttention,
        averageAge: state.averageAge,
        groupCohesion: state.groupCohesion,
        vibePreferences: state.vibePreferences,
        activityLevel: state.activityLevel,
        travelDistance: state.travelDistance,
        eventDuration: state.eventDuration,
        selectedPackageId: state.selectedPackageId,
        currentStep: state.currentStep,
        lastSavedAt: state.lastSavedAt,
        activeDraftId: state.activeDraftId,
        savedDrafts: state.savedDrafts,
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
