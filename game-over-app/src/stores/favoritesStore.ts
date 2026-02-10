/**
 * Favorites Store
 * Persists favorited/hearted packages using AsyncStorage
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface FavoritePackage {
  id: string;
  name: string;
  tier: string;
  cityId: string;
  cityName: string;
  pricePerPersonCents: number;
  heroImageUrl?: string;
  savedAt: string;
}

interface FavoritesState {
  favorites: FavoritePackage[];
  toggleFavorite: (pkg: FavoritePackage) => void;
  isFavorite: (packageId: string) => boolean;
  removeFavorite: (packageId: string) => void;
  clearAll: () => void;
}

export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set, get) => ({
      favorites: [],

      toggleFavorite: (pkg) => {
        const { favorites } = get();
        const exists = favorites.some((f) => f.id === pkg.id);
        if (exists) {
          set({ favorites: favorites.filter((f) => f.id !== pkg.id) });
        } else {
          set({ favorites: [...favorites, { ...pkg, savedAt: new Date().toISOString() }] });
        }
      },

      isFavorite: (packageId) => {
        return get().favorites.some((f) => f.id === packageId);
      },

      removeFavorite: (packageId) => {
        set({ favorites: get().favorites.filter((f) => f.id !== packageId) });
      },

      clearAll: () => {
        set({ favorites: [] });
      },
    }),
    {
      name: 'favorites-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
