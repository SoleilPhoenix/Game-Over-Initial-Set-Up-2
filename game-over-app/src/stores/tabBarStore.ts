/**
 * Tab Bar visibility store
 * Used by screens that should hide the bottom tab bar (e.g. Budget/Chat from Event Summary)
 */
import { create } from 'zustand';

interface TabBarState {
  hidden: boolean;
  setHidden: (hidden: boolean) => void;
}

export const useTabBarStore = create<TabBarState>((set) => ({
  hidden: false,
  setHidden: (hidden) => set({ hidden }),
}));
