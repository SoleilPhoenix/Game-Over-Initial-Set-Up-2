/**
 * UI Store
 * Manages global UI state like modals, loading, and toasts
 */

import { create } from 'zustand';

// Toast types
export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  destructive?: boolean;
}

export interface ChoiceOption {
  value: string;
  label: string;
  destructive?: boolean;
}

export interface ChoiceOptions {
  title: string;
  message: string;
  options: ChoiceOption[];
  cancelLabel: string;
}

export interface ConfirmRequest extends ChoiceOptions {
  id: string;
  resolve: (value: string | null) => void;
}

interface UIState {
  // Loading states
  isGlobalLoading: boolean;
  loadingMessage: string | null;
  loadingOperations: Record<string, boolean>;

  // Toast notifications
  toasts: Toast[];

  // App-owned decision sheet
  activeConfirm: ConfirmRequest | null;

  // Bottom sheet
  bottomSheetContent: React.ReactNode | null;
  bottomSheetSnapPoints: (string | number)[];

  // Keyboard
  isKeyboardVisible: boolean;
  keyboardHeight: number;

  // Network
  isOnline: boolean;
  isRefreshing: boolean;
}

interface UIActions {
  // Loading
  setGlobalLoading: (loading: boolean, message?: string) => void;
  setOperationLoading: (operation: string, loading: boolean) => void;
  isOperationLoading: (operation: string) => boolean;

  // Toasts
  showToast: (toast: Omit<Toast, 'id'>) => void;
  hideToast: (id: string) => void;
  clearAllToasts: () => void;

  // Convenience toast methods
  showSuccess: (title: string, message?: string) => void;
  showError: (title: string, message?: string) => void;
  showWarning: (title: string, message?: string) => void;
  showInfo: (title: string, message?: string) => void;

  // App-owned decision sheet
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  choose: (options: ChoiceOptions) => Promise<string | null>;
  resolveConfirm: (value: string | null) => void;

  // Bottom sheet
  openBottomSheet: (
    content: React.ReactNode,
    snapPoints?: (string | number)[]
  ) => void;
  closeBottomSheet: () => void;

  // Keyboard
  setKeyboardVisible: (visible: boolean, height?: number) => void;

  // Network
  setOnline: (online: boolean) => void;
  setRefreshing: (refreshing: boolean) => void;
}

const generateId = () => Math.random().toString(36).substring(2, 9);

/**
 * How long each kind of toast stays up, in ms. Errors get the longest run
 * because they are the only ones the user may have to read twice; a passing
 * "profile updated" is gone before it can get in the way. Every toast is
 * tappable, so these are ceilings, not waiting times.
 */
const TOAST_DURATIONS: Record<ToastType, number> = {
  error: 6000,
  success: 4000,
  warning: 2000,
  info: 2000,
};

export const useUIStore = create<UIState & UIActions>((set, get) => ({
  // Initial state
  isGlobalLoading: false,
  loadingMessage: null,
  loadingOperations: {},
  toasts: [],
  activeConfirm: null,
  bottomSheetContent: null,
  bottomSheetSnapPoints: ['25%', '50%'],
  isKeyboardVisible: false,
  keyboardHeight: 0,
  isOnline: true,
  isRefreshing: false,

  // Loading
  setGlobalLoading: (loading, message) =>
    set({ isGlobalLoading: loading, loadingMessage: message ?? null }),

  setOperationLoading: (operation, loading) =>
    set((state) => ({
      loadingOperations: {
        ...state.loadingOperations,
        [operation]: loading,
      },
    })),

  isOperationLoading: (operation) => {
    return get().loadingOperations[operation] ?? false;
  },

  // Toasts
  showToast: (toast) => {
    const id = generateId();
    const newToast: Toast = { ...toast, id };

    set((state) => ({
      toasts: [...state.toasts, newToast],
    }));

    // Auto-hide after duration
    const duration = toast.duration ?? TOAST_DURATIONS[toast.type];
    if (duration > 0) {
      setTimeout(() => {
        get().hideToast(id);
      }, duration);
    }
  },

  hideToast: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),

  clearAllToasts: () => set({ toasts: [] }),

  // Convenience toast methods
  showSuccess: (title, message) =>
    get().showToast({ type: 'success', title, message }),

  showError: (title, message) =>
    get().showToast({ type: 'error', title, message }),

  showWarning: (title, message) =>
    get().showToast({ type: 'warning', title, message }),

  showInfo: (title, message) =>
    get().showToast({ type: 'info', title, message }),

  // App-owned decision sheet
  confirm: (options) =>
    get().choose({
      title: options.title,
      message: options.message,
      cancelLabel: options.cancelLabel,
      options: [{
        value: 'confirm',
        label: options.confirmLabel,
        destructive: options.destructive,
      }],
    }).then((value) => value === 'confirm'),

  choose: (options) =>
    new Promise<string | null>((resolve) => {
      const previous = get().activeConfirm;
      previous?.resolve(null);
      set({
        activeConfirm: {
          ...options,
          id: generateId(),
          resolve,
        },
      });
    }),

  resolveConfirm: (value) => {
    const request = get().activeConfirm;
    if (!request) return;
    set({ activeConfirm: null });
    request.resolve(value);
  },

  // Bottom sheet
  openBottomSheet: (content, snapPoints) =>
    set({
      bottomSheetContent: content,
      bottomSheetSnapPoints: snapPoints ?? ['25%', '50%'],
    }),

  closeBottomSheet: () =>
    set({
      bottomSheetContent: null,
    }),

  // Keyboard
  setKeyboardVisible: (visible, height) =>
    set({
      isKeyboardVisible: visible,
      keyboardHeight: height ?? 0,
    }),

  // Network
  setOnline: (online) => set({ isOnline: online }),

  setRefreshing: (refreshing) => set({ isRefreshing: refreshing }),
}));

// Selector hooks for convenience
export const useGlobalLoading = () =>
  useUIStore((state) => ({
    isLoading: state.isGlobalLoading,
    message: state.loadingMessage,
  }));

export const useToasts = () => useUIStore((state) => state.toasts);

export const useActiveConfirm = () => useUIStore((state) => state.activeConfirm);

export const useIsOnline = () => useUIStore((state) => state.isOnline);

export const useKeyboard = () =>
  useUIStore((state) => ({
    isVisible: state.isKeyboardVisible,
    height: state.keyboardHeight,
  }));

/**
 * One feedback API for React components and imperative utilities alike.
 * Components that need to render state should still subscribe with useUIStore.
 */
export const feedback = {
  show: (type: ToastType, title: string, message?: string, duration?: number) =>
    useUIStore.getState().showToast({ type, title, message, duration }),
  success: (title: string, message?: string, duration?: number) =>
    useUIStore.getState().showToast({ type: 'success', title, message, duration }),
  error: (title: string, message?: string, duration?: number) =>
    useUIStore.getState().showToast({ type: 'error', title, message, duration }),
  warning: (title: string, message?: string, duration?: number) =>
    useUIStore.getState().showToast({ type: 'warning', title, message, duration }),
  info: (title: string, message?: string, duration?: number) =>
    useUIStore.getState().showToast({ type: 'info', title, message, duration }),
  confirm: (options: ConfirmOptions) => useUIStore.getState().confirm(options),
  choose: (options: ChoiceOptions) => useUIStore.getState().choose(options),
};
