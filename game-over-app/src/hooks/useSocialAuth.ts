/**
 * useSocialAuth — Apple, Google and Facebook sign-in in one place.
 *
 * The three OAuth flows used to live inline in the welcome screen. They moved
 * here when sign-in got its own screen, so the logic exists once rather than
 * being copied to every screen that offers a sign-in button.
 *
 * `loading` carries the provider currently in flight ('apple' | 'google' |
 * 'facebook' | null), so a caller can show a spinner on the right button and
 * disable the others.
 */
import { useState } from 'react';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import { supabase } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/authStore';

WebBrowser.maybeCompleteAuthSession();

export type SocialProvider = 'apple' | 'google' | 'facebook';

/**
 * Sanity-checks that a token looks like a JWT before it is handed to Supabase:
 * three non-empty base64url parts separated by dots.
 */
function isValidJWTFormat(token: string): boolean {
  if (!token || typeof token !== 'string') return false;
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  return parts.every((part) => part.length > 0 && /^[A-Za-z0-9_-]+$/.test(part));
}

/** Shared tail of the Google and Facebook flows - they only differ in provider. */
async function runOAuthFlow(provider: 'google' | 'facebook') {
  const redirectUrl = makeRedirectUri({ scheme: 'gameover' });

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: redirectUrl, skipBrowserRedirect: true },
  });
  if (error) throw error;
  if (!data.url) return;

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
  if (result.type !== 'success') return;

  const url = new URL(result.url);
  const accessToken = url.searchParams.get('access_token');
  const refreshToken = url.searchParams.get('refresh_token');
  if (!accessToken || !refreshToken) return;

  if (!isValidJWTFormat(accessToken)) {
    throw new Error('Invalid access token format received');
  }
  await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
}

export function useSocialAuth() {
  const [loading, setLoading] = useState<SocialProvider | null>(null);
  const setError = useAuthStore((state) => state.setError);

  const signInWithApple = async () => {
    try {
      setLoading('apple');
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (credential.identityToken) {
        const { error } = await supabase.auth.signInWithIdToken({
          provider: 'apple',
          token: credential.identityToken,
        });
        if (error) throw error;
      }
    } catch (error: any) {
      // Cancelling the native sheet is a normal user action, not a failure.
      if (error.code !== 'ERR_REQUEST_CANCELED') {
        setError(error.message || 'Apple sign in failed');
      }
    } finally {
      setLoading(null);
    }
  };

  const signInWithGoogle = async () => {
    try {
      setLoading('google');
      await runOAuthFlow('google');
    } catch (error: any) {
      setError(error.message || 'Google sign in failed');
    } finally {
      setLoading(null);
    }
  };

  const signInWithFacebook = async () => {
    try {
      setLoading('facebook');
      await runOAuthFlow('facebook');
    } catch (error: any) {
      setError(error.message || 'Facebook sign in failed');
    } finally {
      setLoading(null);
    }
  };

  return { loading, signInWithApple, signInWithGoogle, signInWithFacebook };
}
