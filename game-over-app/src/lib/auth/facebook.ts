/**
 * Facebook Sign-In Implementation
 * Uses expo-auth-session for OAuth flow
 */

import { useEffect, useState } from 'react';
import * as Facebook from 'expo-auth-session/providers/facebook';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '@/lib/supabase/client';
import { AuthError } from './auth';

// Complete auth session to handle redirect
WebBrowser.maybeCompleteAuthSession();

// Facebook App ID from environment
const FACEBOOK_APP_ID = process.env.EXPO_PUBLIC_FACEBOOK_APP_ID;

interface UseFacebookAuthReturn {
  signInWithFacebook: () => Promise<void>;
  isLoading: boolean;
  isReady: boolean;
  error: AuthError | null;
}

/**
 * Hook for Facebook Sign-In
 * Returns methods and state for Facebook authentication
 */
export function useFacebookAuth(): UseFacebookAuthReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<AuthError | null>(null);

  const [request, response, promptAsync] = Facebook.useAuthRequest({
    clientId: FACEBOOK_APP_ID || '',
  });

  // Handle the OAuth response
  useEffect(() => {
    async function handleResponse() {
      if (response?.type === 'success') {
        setIsLoading(true);
        setError(null);

        try {
          const { access_token } = response.params;

          if (!access_token) {
            throw new AuthError(
              'facebook_no_token',
              'No access token received from Facebook'
            );
          }

          // Exchange Facebook token with Supabase
          const { data, error: supabaseError } = await supabase.auth.signInWithIdToken({
            provider: 'facebook',
            token: access_token,
          });

          if (supabaseError) {
            throw new AuthError(
              supabaseError.name || 'facebook_auth_error',
              supabaseError.message
            );
          }

          return data;
        } catch (err) {
          const authError =
            err instanceof AuthError
              ? err
              : new AuthError('facebook_unknown', 'Facebook Sign-In failed');
          setError(authError);
        } finally {
          setIsLoading(false);
        }
      } else if (response?.type === 'error') {
        setError(
          new AuthError(
            response.error?.code || 'facebook_error',
            response.error?.message || 'Facebook Sign-In failed'
          )
        );
      }
    }

    handleResponse();
  }, [response]);

  const signInWithFacebook = async () => {
    if (!request) {
      throw new AuthError(
        'facebook_not_ready',
        'Facebook Sign-In is not ready. Please try again.'
      );
    }

    if (!FACEBOOK_APP_ID) {
      throw new AuthError(
        'facebook_not_configured',
        'Facebook Sign-In is not configured'
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
      const authError = new AuthError('facebook_unknown', 'Facebook Sign-In failed');
      setError(authError);
      throw authError;
    }
  };

  return {
    signInWithFacebook,
    isLoading,
    isReady: !!request && Boolean(FACEBOOK_APP_ID),
    error,
  };
}

/**
 * Check if Facebook Sign-In is configured
 */
export function isFacebookSignInConfigured(): boolean {
  return Boolean(FACEBOOK_APP_ID);
}
