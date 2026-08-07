/**
 * Active-event store — shared across Chat + Budget tabs.
 *
 * Both tabs render an "Aktuelles Event" dropdown. Users expect them to
 * agree: picking an event in Chat should update Budget too, and vice
 * versa. Without a shared source, each tab kept its own useState and
 * they drifted apart.
 *
 * eventIdParam from a deep link still wins on that specific navigation
 * (each screen sets the store from its param on mount), but after that
 * the store is the single source of truth.
 */
import { create } from 'zustand';

interface ActiveEventState {
  activeEventId: string | null;
  setActiveEventId: (id: string | null) => void;
}

export const useActiveEventStore = create<ActiveEventState>((set) => ({
  activeEventId: null,
  setActiveEventId: (id) => set({ activeEventId: id }),
}));
