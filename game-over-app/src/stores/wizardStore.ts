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

// Step 2: Honoree Preferences
export type HonoreeEnergyLevel = 'relaxed' | 'active' | 'action' | 'party';
export type SpotlightComfort = 'background' | 'group' | 'center_stage';
export type CompetitionStyle = 'cooperative' | 'competitive' | 'spectator';
export type EnjoymentType = 'food' | 'drinks' | 'experience';
export type IndoorOutdoor = 'indoor' | 'outdoor' | 'mix';
export type EveningStyle = 'dinner_only' | 'dinner_bar' | 'full_night';

// Step 3: Group Preferences
export type AgeRange = '21-25' | '26-30' | '31-35' | '35+';
export type GroupCohesion = 'close_friends' | 'mixed' | 'strangers';
export type FitnessLevel = 'low' | 'medium' | 'high';
export type DrinkingCulture = 'low' | 'social' | 'central';
export type GroupDynamic = 'team_players' | 'competitive' | 'relaxed';

export interface DraftSnapshot {
  id: string;
  createdAt: string;
  updatedAt: string;
  partyType: PartyType | null;
  honoreeName: string;
  honoreeLastName: string;
  cityId: string | null;
  participantCount: number;
  startDate: string | null;
  endDate: string | null;
  // Step 2: Honoree
  energyLevel: HonoreeEnergyLevel | null;
  spotlightComfort: SpotlightComfort | null;
  competitionStyle: CompetitionStyle | null;
  enjoymentType: EnjoymentType | null;
  indoorOutdoor: IndoorOutdoor | null;
  eveningStyle: EveningStyle | null;
  // Step 3: Group
  averageAge: AgeRange | null;
  groupCohesion: GroupCohesion | null;
  fitnessLevel: FitnessLevel | null;
  drinkingCulture: DrinkingCulture | null;
  groupDynamic: GroupDynamic | null;
  groupVibe: string[];
  // Step 4
  selectedPackageId: string | null;
  currentStep: number;
  // Created event ID (prevents duplicate creation on back-navigation)
  createdEventId: string | null;
}

interface WizardState {
  // Step 1: Key Details
  partyType: PartyType | null;
  honoreeName: string;
  honoreeLastName: string;
  cityId: string | null;
  participantCount: number;
  startDate: string | null;
  endDate: string | null;

  // Step 2: Honoree Preferences
  energyLevel: HonoreeEnergyLevel | null;
  spotlightComfort: SpotlightComfort | null;
  competitionStyle: CompetitionStyle | null;
  enjoymentType: EnjoymentType | null;
  indoorOutdoor: IndoorOutdoor | null;
  eveningStyle: EveningStyle | null;

  // Step 3: Group Preferences
  averageAge: AgeRange | null;
  groupCohesion: GroupCohesion | null;
  fitnessLevel: FitnessLevel | null;
  drinkingCulture: DrinkingCulture | null;
  groupDynamic: GroupDynamic | null;
  groupVibe: string[];

  // Step 4: Package Selection
  selectedPackageId: string | null;

  // Created event (prevents duplicate creation on back-navigation)
  createdEventId: string | null;

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
  setHonoreeLastName: (name: string) => void;
  setCityId: (cityId: string) => void;
  setParticipantCount: (count: number) => void;
  setDates: (startDate: string, endDate: string) => void;

  // Step 2 actions
  setEnergyLevel: (level: HonoreeEnergyLevel) => void;
  setSpotlightComfort: (comfort: SpotlightComfort) => void;
  setCompetitionStyle: (style: CompetitionStyle) => void;
  setEnjoymentType: (type: EnjoymentType) => void;
  setIndoorOutdoor: (pref: IndoorOutdoor) => void;
  setEveningStyle: (style: EveningStyle) => void;

  // Step 3 actions
  setAverageAge: (age: AgeRange) => void;
  setGroupCohesion: (cohesion: GroupCohesion) => void;
  setFitnessLevel: (level: FitnessLevel) => void;
  setDrinkingCulture: (culture: DrinkingCulture) => void;
  setGroupDynamic: (dynamic: GroupDynamic) => void;
  setGroupVibe: (vibes: string[]) => void;
  toggleGroupVibe: (vibe: string) => void;

  // Step 4 actions
  setSelectedPackageId: (packageId: string) => void;
  setCreatedEventId: (eventId: string) => void;

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
      honoree_energy: HonoreeEnergyLevel | null;
      spotlight_comfort: SpotlightComfort | null;
      competition_style: CompetitionStyle | null;
      enjoyment_type: EnjoymentType | null;
      indoor_outdoor: IndoorOutdoor | null;
      evening_style: EveningStyle | null;
      average_age: AgeRange | null;
      group_cohesion: GroupCohesion | null;
      fitness_level: FitnessLevel | null;
      drinking_culture: DrinkingCulture | null;
      group_dynamic: GroupDynamic | null;
      vibe_preferences: string[];
    };
  } | null;
}

const initialWizardFields = {
  partyType: null as PartyType | null,
  honoreeName: '',
  honoreeLastName: '',
  cityId: null as string | null,
  participantCount: 10,
  startDate: null as string | null,
  endDate: null as string | null,
  energyLevel: null as HonoreeEnergyLevel | null,
  spotlightComfort: null as SpotlightComfort | null,
  competitionStyle: null as CompetitionStyle | null,
  enjoymentType: null as EnjoymentType | null,
  indoorOutdoor: null as IndoorOutdoor | null,
  eveningStyle: null as EveningStyle | null,
  averageAge: null as AgeRange | null,
  groupCohesion: null as GroupCohesion | null,
  fitnessLevel: null as FitnessLevel | null,
  drinkingCulture: null as DrinkingCulture | null,
  groupDynamic: null as GroupDynamic | null,
  groupVibe: [] as string[],
  selectedPackageId: null as string | null,
  currentStep: 1,
  createdEventId: null as string | null,
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
    honoreeLastName: state.honoreeLastName,
    cityId: state.cityId,
    participantCount: state.participantCount,
    startDate: state.startDate,
    endDate: state.endDate,
    energyLevel: state.energyLevel,
    spotlightComfort: state.spotlightComfort,
    competitionStyle: state.competitionStyle,
    enjoymentType: state.enjoymentType,
    indoorOutdoor: state.indoorOutdoor,
    eveningStyle: state.eveningStyle,
    averageAge: state.averageAge,
    groupCohesion: state.groupCohesion,
    fitnessLevel: state.fitnessLevel,
    drinkingCulture: state.drinkingCulture,
    groupDynamic: state.groupDynamic,
    groupVibe: state.groupVibe,
    selectedPackageId: state.selectedPackageId,
    currentStep: state.currentStep,
    createdEventId: state.createdEventId,
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
      setPartyType: (type: PartyType) => set({ partyType: type, isDirty: true }),
      setHonoreeName: (name: string) => set({ honoreeName: name, isDirty: true }),
      setHonoreeLastName: (name: string) => set({ honoreeLastName: name, isDirty: true }),
      setCityId: (cityId: string) => set({ cityId, isDirty: true }),
      setParticipantCount: (count: number) => set({ participantCount: Math.max(1, Math.min(30, count)), isDirty: true }),
      setDates: (startDate: string, endDate: string) =>
        set({ startDate, endDate, isDirty: true }),

      // Step 2 actions
      setEnergyLevel: (level: HonoreeEnergyLevel) => set({ energyLevel: level, isDirty: true }),
      setSpotlightComfort: (comfort: SpotlightComfort) => set({ spotlightComfort: comfort, isDirty: true }),
      setCompetitionStyle: (style: CompetitionStyle) => set({ competitionStyle: style, isDirty: true }),
      setEnjoymentType: (type: EnjoymentType) => set({ enjoymentType: type, isDirty: true }),
      setIndoorOutdoor: (pref: IndoorOutdoor) => set({ indoorOutdoor: pref, isDirty: true }),
      setEveningStyle: (style: EveningStyle) => set({ eveningStyle: style, isDirty: true }),

      // Step 3 actions
      setAverageAge: (age: AgeRange) => set({ averageAge: age, isDirty: true }),
      setGroupCohesion: (cohesion: GroupCohesion) =>
        set({ groupCohesion: cohesion, isDirty: true }),
      setFitnessLevel: (level: FitnessLevel) => set({ fitnessLevel: level, isDirty: true }),
      setDrinkingCulture: (culture: DrinkingCulture) => set({ drinkingCulture: culture, isDirty: true }),
      setGroupDynamic: (dynamic: GroupDynamic) => set({ groupDynamic: dynamic, isDirty: true }),
      setGroupVibe: (vibes: string[]) =>
        set({ groupVibe: vibes.slice(0, 2), isDirty: true }),
      toggleGroupVibe: (vibe: string) => {
        const current = get().groupVibe;
        if (current.includes(vibe)) {
          set({ groupVibe: current.filter((v: string) => v !== vibe), isDirty: true });
        } else if (current.length < 2) {
          set({ groupVibe: [...current, vibe], isDirty: true });
        }
        // If already at max 2 and trying to add, do nothing
      },

      // Step 4 actions
      setSelectedPackageId: (packageId: string) =>
        set({ selectedPackageId: packageId, isDirty: true }),
      setCreatedEventId: (eventId: string) =>
        set({ createdEventId: eventId }),

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
      goToStep: (step: number) => {
        if (step >= 1 && step <= 4) {
          set({ currentStep: step });
        }
      },

      // Validation
      isStepValid: (step: number) => {
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
              state.energyLevel &&
              state.spotlightComfort &&
              state.competitionStyle &&
              state.enjoymentType &&
              state.indoorOutdoor &&
              state.eveningStyle
            );
          case 3:
            return !!(
              state.averageAge &&
              state.groupCohesion &&
              state.fitnessLevel &&
              state.drinkingCulture &&
              state.groupDynamic &&
              state.groupVibe.length >= 1 &&
              state.groupVibe.length <= 2
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
      loadDraft: (id: string) => {
        const draft = get().savedDrafts[id];
        if (!draft) return;
        set({
          partyType: draft.partyType,
          honoreeName: draft.honoreeName,
          honoreeLastName: draft.honoreeLastName ?? '',
          cityId: draft.cityId,
          participantCount: draft.participantCount,
          startDate: draft.startDate,
          endDate: draft.endDate,
          energyLevel: draft.energyLevel,
          spotlightComfort: draft.spotlightComfort,
          competitionStyle: draft.competitionStyle,
          enjoymentType: draft.enjoymentType,
          indoorOutdoor: draft.indoorOutdoor,
          eveningStyle: draft.eveningStyle,
          averageAge: draft.averageAge,
          groupCohesion: draft.groupCohesion,
          fitnessLevel: draft.fitnessLevel,
          drinkingCulture: draft.drinkingCulture,
          groupDynamic: draft.groupDynamic,
          groupVibe: Array.isArray(draft.groupVibe) ? draft.groupVibe : (Array.isArray((draft as any).vibePreferences) ? (draft as any).vibePreferences : []),
          selectedPackageId: draft.selectedPackageId,
          currentStep: draft.currentStep,
          activeDraftId: id,
          isDirty: false,
          lastSavedAt: draft.updatedAt,
        });
      },
      deleteDraft: (id: string) => {
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
        const drafts = Object.values(get().savedDrafts) as DraftSnapshot[];
        return drafts.sort(
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

        const fullName = [state.honoreeName, state.honoreeLastName].filter(Boolean).join(' ');
        // Title uses first name only for brevity: "Sven's Bachelor"
        const title = `${state.honoreeName}'s ${
          state.partyType === 'bachelor' ? 'Bachelor' : 'Bachelorette'
        }`;

        return {
          event: {
            title,
            party_type: state.partyType,
            honoree_name: fullName, // full name stored in DB
            city_id: state.cityId,
            start_date: state.startDate,
            end_date: state.endDate,
          },
          preferences: {
            honoree_energy: state.energyLevel,
            spotlight_comfort: state.spotlightComfort,
            competition_style: state.competitionStyle,
            enjoyment_type: state.enjoymentType,
            indoor_outdoor: state.indoorOutdoor,
            evening_style: state.eveningStyle,
            average_age: state.averageAge,
            group_cohesion: state.groupCohesion,
            fitness_level: state.fitnessLevel,
            drinking_culture: state.drinkingCulture,
            group_dynamic: state.groupDynamic,
            vibe_preferences: state.groupVibe,
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
        honoreeLastName: state.honoreeLastName,
        cityId: state.cityId,
        participantCount: state.participantCount,
        startDate: state.startDate,
        endDate: state.endDate,
        energyLevel: state.energyLevel,
        spotlightComfort: state.spotlightComfort,
        competitionStyle: state.competitionStyle,
        enjoymentType: state.enjoymentType,
        indoorOutdoor: state.indoorOutdoor,
        eveningStyle: state.eveningStyle,
        averageAge: state.averageAge,
        groupCohesion: state.groupCohesion,
        fitnessLevel: state.fitnessLevel,
        drinkingCulture: state.drinkingCulture,
        groupDynamic: state.groupDynamic,
        groupVibe: state.groupVibe,
        selectedPackageId: state.selectedPackageId,
        currentStep: state.currentStep,
        createdEventId: state.createdEventId,
        lastSavedAt: state.lastSavedAt,
        activeDraftId: state.activeDraftId,
        savedDrafts: state.savedDrafts,
      }),
      // Merge persisted state with defaults so new fields always exist
      merge: (persisted: any, current: any) => {
        const merged = { ...current, ...persisted };
        // Ensure new array/object fields have defaults when loading old data
        if (!Array.isArray(merged.groupVibe)) merged.groupVibe = [];
        if (!merged.savedDrafts) merged.savedDrafts = {};
        // Clean up old-schema drafts (from pre-questionnaire-redesign)
        const cleanDrafts: Record<string, any> = {};
        for (const [id, draft] of Object.entries(merged.savedDrafts as Record<string, any>)) {
          // Drop drafts that have old-only fields (gatheringSize, socialApproach, etc.)
          if (draft.gatheringSize || draft.socialApproach || draft.activityLevel || draft.travelDistance) {
            continue; // skip old-schema draft
          }
          // Migrate vibePreferences → groupVibe
          if (!Array.isArray(draft.groupVibe)) {
            draft.groupVibe = Array.isArray(draft.vibePreferences) ? draft.vibePreferences : [];
          }
          cleanDrafts[id] = draft;
        }
        merged.savedDrafts = cleanDrafts;
        // If active draft was removed, reset to null
        if (merged.activeDraftId && !cleanDrafts[merged.activeDraftId]) {
          merged.activeDraftId = null;
        }
        return merged;
      },
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
