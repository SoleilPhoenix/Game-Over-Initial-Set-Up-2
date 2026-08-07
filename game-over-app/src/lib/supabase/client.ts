/**
 * Supabase Client Configuration
 * Game-Over App
 */

import { AppState } from 'react-native';
import { createClient } from '@supabase/supabase-js';
import { createStorage } from '../storage';
import type { Database } from './types';

// Create storage adapter (works in both Expo Go and dev builds)
const supabaseStorage = createStorage('supabase-storage');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Fail fast if environment variables are not configured
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Supabase configuration missing. Please set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY environment variables. See .env.example for reference.'
  );
}

export const supabase = createClient<Database>(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      storage: supabaseStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        'x-app-version': '1.0.0',
      },
    },
  }
);

// Keep access tokens fresh while the app is foregrounded.
//
// React Native / Expo does NOT reliably fire supabase-js's internal auto-refresh
// timer (it's tuned for browsers). Without an AppState hook the access token
// silently expires after ~1h, and every authenticated call — especially edge
// functions (getUser() returns 401) — starts failing until the user logs out and
// back in. This was the root cause of "Unauthorized" on booking + invitations.
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});
// Kick off immediately for the current (foreground) state at launch.
if (AppState.currentState === 'active') {
  supabase.auth.startAutoRefresh();
}

// Helper to check if Supabase is properly configured
export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseAnonKey);
}
