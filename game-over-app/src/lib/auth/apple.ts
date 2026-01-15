/**
 * Apple Sign-In Implementation
 * Required for iOS apps with social login
 */

import * as AppleAuthentication from 'expo-apple-authentication';
import { supabase } from '@/lib/supabase/client';
import { AuthError } from './auth';

/**
 * Check if Apple Sign-In is available on this device
 */
export async function isAppleSignInAvailable(): Promise<boolean> {
  try {
    return await AppleAuthentication.isAvailableAsync();
  } catch {
    return false;
  }
}

/**
 * Sign in with Apple
 * Uses native iOS Sign in with Apple and exchanges token with Supabase
 */
export async function signInWithApple() {
  // Check availability first
  const isAvailable = await isAppleSignInAvailable();
  if (!isAvailable) {
    throw new AuthError(
      'apple_not_available',
      'Apple Sign-In is not available on this device'
    );
  }

  try {
    // Request credentials from Apple
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    if (!credential.identityToken) {
      throw new AuthError(
        'apple_no_token',
        'No identity token received from Apple'
      );
    }

    // Exchange Apple token with Supabase
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: credential.identityToken,
    });

    if (error) {
      throw new AuthError(error.name || 'apple_auth_error', error.message);
    }

    // Update profile with Apple name if provided (Apple only provides name on first sign-in)
    if (credential.fullName?.givenName && data.user) {
      const fullName = [
        credential.fullName.givenName,
        credential.fullName.familyName,
      ]
        .filter(Boolean)
        .join(' ')
        .trim();

      if (fullName) {
        await supabase.from('profiles').upsert({
          id: data.user.id,
          email: data.user.email || '',
          full_name: fullName,
        });
      }
    }

    return data;
  } catch (error) {
    // Handle Apple authentication specific errors
    if (error instanceof AuthError) {
      throw error;
    }

    if (
      error &&
      typeof error === 'object' &&
      'code' in error
    ) {
      const appleError = error as { code: string; message?: string };

      switch (appleError.code) {
        case 'ERR_CANCELED':
          throw new AuthError('cancelled', 'Sign in was cancelled');
        case 'ERR_INVALID_RESPONSE':
          throw new AuthError('invalid_response', 'Invalid response from Apple');
        case 'ERR_NOT_CONFIGURED':
          throw new AuthError(
            'not_configured',
            'Apple Sign-In is not properly configured'
          );
        default:
          throw new AuthError(
            appleError.code,
            appleError.message || 'Apple Sign-In failed'
          );
      }
    }

    throw new AuthError('apple_unknown', 'An unexpected error occurred');
  }
}
