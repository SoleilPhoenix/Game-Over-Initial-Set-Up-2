/**
 * UI Store
 * Manages global UI state like modals, loading, and toasts
 */

import { create } from 'zustand';

// Toast types
type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

// Modal types
type ModalType =
  | 'confirm'
  | 'alert'
  | 'create-event'
  | 'invite'
  | 'create-poll'
  | 'package-details';

interface Modal {
  type: ModalType;
  data?: any;
  onConfirm?: () => void;
  onCancel?: () => void;
}

interface UIState {
  // Loading states
  isGlobalLoading: boolean;
  loadingMessage: string | null;
  loadingOperations: Record<string, boolean>;

  // Toast notifications
  toasts: Toast[];

  // Modals
  activeModal: Modal | null;

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

  // Modals
  openModal: (modal: Modal) => void;
  closeModal: () => void;
  confirm: (
    title: string,
    message: string,
    onConfirm: () => void,
    onCancel?: () => void
  ) => void;
  alert: (title: string, message: string, onClose?: () => void) => void;

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

export const useUIStore = create<UIState & UIActions>((set, get) => ({
  // Initial state
  isGlobalLoading: false,
  loadingMessage: null,
  loadingOperations: {},
  toasts: [],
  activeModal: null,
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
    const duration = toast.duration ?? 4000;
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
    get().showToast({ type: 'error', title, message, duration: 6000 }),

  showWarning: (title, message) =>
    get().showToast({ type: 'warning', title, message }),

  showInfo: (title, message) =>
    get().showToast({ type: 'info', title, message }),

  // Modals
  openModal: (modal) => set({ activeModal: modal }),

  closeModal: () => set({ activeModal: null }),

  confirm: (title, message, onConfirm, onCancel) =>
    set({
      activeModal: {
        type: 'confirm',
        data: { title, message },
        onConfirm: () => {
          onConfirm();
          set({ activeModal: null });
        },
        onCancel: () => {
          onCancel?.();
          set({ activeModal: null });
        },
      },
    }),

  alert: (title, message, onClose) =>
    set({
      activeModal: {
        type: 'alert',
        data: { title, message },
        onConfirm: () => {
          onClose?.();
          set({ activeModal: null });
        },
      },
    }),

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

export const useActiveModal = () => useUIStore((state) => state.activeModal);

export const useIsOnline = () => useUIStore((state) => state.isOnline);

export const useKeyboard = () =>
  useUIStore((state) => ({
    isVisible: state.isKeyboardVisible,
    height: state.keyboardHeight,
  }));
