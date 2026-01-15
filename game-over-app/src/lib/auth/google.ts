/**
 * Google Sign-In Implementation
 * Uses expo-auth-session for OAuth flow
 */

import { useEffect, useState } from 'react';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '@/lib/supabase/client';
import { AuthError } from './auth';

// Complete auth session to handle redirect
WebBrowser.maybeCompleteAuthSession();

// Google OAuth Client IDs from environment
const GOOGLE_CLIENT_ID_IOS = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS;
const GOOGLE_CLIENT_ID_ANDROID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID;
const GOOGLE_CLIENT_ID_WEB = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB;

interface UseGoogleAuthReturn {
  signInWithGoogle: () => Promise<void>;
  isLoading: boolean;
  isReady: boolean;
  error: AuthError | null;
}

/**
 * Hook for Google Sign-In
 * Returns methods and state for Google authentication
 */
export function useGoogleAuth(): UseGoogleAuthReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<AuthError | null>(null);

  const [request, response, promptAsync] = Google.useAuthRequest({
    iosClientId: GOOGLE_CLIENT_ID_IOS,
    androidClientId: GOOGLE_CLIENT_ID_ANDROID,
    webClientId: GOOGLE_CLIENT_ID_WEB,
  });

  // Handle the OAuth response
  useEffect(() => {
    async function handleResponse() {
      if (response?.type === 'success') {
        setIsLoading(true);
        setError(null);

        try {
          const { id_token, access_token } = response.params;

          if (!id_token) {
            throw new AuthError('google_no_token', 'No ID token received from Google');
          }

          // Exchange Google token with Supabase
          const { data, error: supabaseError } = await supabase.auth.signInWithIdToken({
            provider: 'google',
            token: id_token,
            access_token: access_token,
          });

          if (supabaseError) {
            throw new AuthError(
              supabaseError.name || 'google_auth_error',
              supabaseError.message
            );
          }

          // The session is automatically handled by Supabase
          return data;
        } catch (err) {
          const authError =
            err instanceof AuthError
              ? err
              : new AuthError('google_unknown', 'Google Sign-In failed');
          setError(authError);
        } finally {
          setIsLoading(false);
        }
      } else if (response?.type === 'error') {
        setError(
          new AuthError(
            response.error?.code || 'google_error',
            response.error?.message || 'Google Sign-In failed'
          )
        );
      }
    }

    handleResponse();
  }, [response]);

  const signInWithGoogle = async () => {
    if (!request) {
      throw new AuthError(
        'google_not_ready',
        'Google Sign-In is not ready. Please try again.'
      );
    }

    setError(null);

    try {
      const result = await promptAsync();

      if (result.type === 'cancel') {
        throw new AuthError('cancelled', 'Sign in was cancelled');
      }

      if (result.type === 'dismiss') {
        throw new AuthError('dismissed', 'Sign in was dismissed');
      }

      // Response will be handled by useEffect above
    } catch (err) {
      if (err instanceof AuthError) {
        setError(err);
        throw err;
      }
      const authError = new AuthError('google_unknown', 'Google Sign-In failed');
      setError(authError);
      throw authError;
    }
  };

  return {
    signInWithGoogle,
    isLoading,
    isReady: !!request,
    error,
  };
}

/**
 * Check if Google Sign-In is configured
 */
export function isGoogleSignInConfigured(): boolean {
  return Boolean(
    GOOGLE_CLIENT_ID_IOS || GOOGLE_CLIENT_ID_ANDROID || GOOGLE_CLIENT_ID_WEB
  );
}
