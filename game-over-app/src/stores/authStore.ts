/**
 * Authentication Store
 * Manages authentication state using Zustand
 */

import { create } from 'zustand';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';
import { tokenStorage } from '@/lib/auth/storage';

interface AuthState {
  // State
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;

  // Actions
  initialize: () => Promise<(() => void) | void>;
  setSession: (session: Session | null) => void;
  setUser: (user: User | null) => void;
  setError: (error: string | null) => void;
  signOut: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  // Initial state
  user: null,
  session: null,
  isLoading: true,
  isInitialized: false,
  error: null,

  // Initialize auth state
  initialize: async () => {
    try {
      set({ isLoading: true, error: null });

      // Get current session
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        console.error('Error getting session:', error);
        set({ error: error.message });
      }

      set({
        session,
        user: session?.user ?? null,
        isLoading: false,
        isInitialized: true,
      });

      // Listen for auth state changes
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          console.log('Auth state changed:', event);

          set({
            session,
            user: session?.user ?? null,
          });

          // Handle specific events
          if (event === 'SIGNED_OUT') {
            await tokenStorage.clearAll();
          }

          if (event === 'TOKEN_REFRESHED' && session) {
            // Session refreshed successfully
            console.log('Token refreshed');
          }

          if (event === 'USER_UPDATED' && session?.user) {
            // User profile updated
            set({ user: session.user });
          }
        }
      );

      // Store subscription for cleanup (not needed in Zustand but good practice)
      return () => {
        subscription.unsubscribe();
      };
    } catch (error) {
      console.error('Auth initialization error:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to initialize auth',
        isLoading: false,
        isInitialized: true,
      });
    }
  },

  // Set session
  setSession: (session) => {
    set({
      session,
      user: session?.user ?? null,
    });
  },

  // Set user
  setUser: (user) => {
    set({ user });
  },

  // Set error
  setError: (error) => {
    set({ error });
  },

  // Clear error
  clearError: () => {
    set({ error: null });
  },

  // Sign out
  signOut: async () => {
    try {
      set({ isLoading: true, error: null });

      const { error } = await supabase.auth.signOut();

      if (error) {
        throw error;
      }

      // Clear all stored tokens
      await tokenStorage.clearAll();

      set({
        session: null,
        user: null,
        isLoading: false,
      });
    } catch (error) {
      console.error('Sign out error:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to sign out',
        isLoading: false,
      });
    }
  },
}));

// Selector hooks for convenience
export const useUser = () => useAuthStore((state) => state.user);
export const useSession = () => useAuthStore((state) => state.session);
export const useIsAuthenticated = () => useAuthStore((state) => !!state.session);
export const useAuthLoading = () => useAuthStore((state) => state.isLoading);
export const useAuthError = () => useAuthStore((state) => state.error);
