/**
 * Stores Index
 * Central export for all Zustand stores
 */

export {
  useAuthStore,
  useUser,
  useSession,
  useIsAuthenticated,
  useAuthLoading,
  useAuthError,
} from './authStore';

export {
  useWizardStore,
  useWizardStep,
  useWizardIsDirty,
  useWizardCanProceed,
} from './wizardStore';

export {
  useUIStore,
  useGlobalLoading,
  useToasts,
  useActiveModal,
  useIsOnline,
  useKeyboard,
} from './uiStore';
