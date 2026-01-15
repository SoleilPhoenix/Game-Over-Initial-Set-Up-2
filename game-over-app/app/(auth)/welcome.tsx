/**
 * Welcome Screen
 * Initial onboarding screen with social sign-in options
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Image,
} from 'react-native';
import { Link, router } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { SocialButton } from '@/components/ui/SocialButton';
import { colors } from '@/constants/colors';
import { spacing, layout } from '@/constants/spacing';
import { textStyles } from '@/constants/typography';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase/client';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';

WebBrowser.maybeCompleteAuthSession();

export default function WelcomeScreen() {
  const [isLoading, setIsLoading] = React.useState<string | null>(null);
  const setError = useAuthStore((state) => state.setError);

  const handleAppleSignIn = async () => {
    try {
      setIsLoading('apple');
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
      if (error.code !== 'ERR_REQUEST_CANCELED') {
        setError(error.message || 'Apple sign in failed');
      }
    } finally {
      setIsLoading(null);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading('google');
      const redirectUrl = makeRedirectUri({ scheme: 'gameover' });

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true,
        },
      });

      if (error) throw error;

      if (data.url) {
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);

        if (result.type === 'success') {
          const url = new URL(result.url);
          const accessToken = url.searchParams.get('access_token');
          const refreshToken = url.searchParams.get('refresh_token');

          if (accessToken && refreshToken) {
            await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
          }
        }
      }
    } catch (error: any) {
      setError(error.message || 'Google sign in failed');
    } finally {
      setIsLoading(null);
    }
  };

  const handleFacebookSignIn = async () => {
    try {
      setIsLoading('facebook');
      const redirectUrl = makeRedirectUri({ scheme: 'gameover' });

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'facebook',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true,
        },
      });

      if (error) throw error;

      if (data.url) {
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);

        if (result.type === 'success') {
          const url = new URL(result.url);
          const accessToken = url.searchParams.get('access_token');
          const refreshToken = url.searchParams.get('refresh_token');

          if (accessToken && refreshToken) {
            await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
          }
        }
      }
    } catch (error: any) {
      setError(error.message || 'Facebook sign in failed');
    } finally {
      setIsLoading(null);
    }
  };

  return (
    <SafeAreaView style={styles.container} testID="welcome-screen">
      <StatusBar barStyle="dark-content" />

      <View style={styles.content}>
        {/* Logo and Tagline */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Text style={styles.logoText}>GAME</Text>
            <Text style={styles.logoTextAccent}>OVER</Text>
          </View>
          <Text style={styles.tagline}>
            Plan the perfect send-off party
          </Text>
        </View>

        {/* Hero Illustration Placeholder */}
        <View style={styles.heroContainer}>
          <View style={styles.heroPlaceholder}>
            <Text style={styles.heroEmoji}>🎉</Text>
          </View>
        </View>

        {/* Social Sign-In Buttons */}
        <View style={styles.socialButtons}>
          <SocialButton
            provider="apple"
            onPress={handleAppleSignIn}
            loading={isLoading === 'apple'}
            disabled={isLoading !== null}
            testID="social-button-apple"
          />
          <SocialButton
            provider="google"
            onPress={handleGoogleSignIn}
            loading={isLoading === 'google'}
            disabled={isLoading !== null}
            testID="social-button-google"
          />
          <SocialButton
            provider="facebook"
            onPress={handleFacebookSignIn}
            loading={isLoading === 'facebook'}
            disabled={isLoading !== null}
            testID="social-button-facebook"
          />
        </View>

        {/* Divider */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Email Sign-In */}
        <Button
          variant="primary"
          fullWidth
          onPress={() => router.push('/(auth)/signup')}
          testID="create-account-button"
        >
          Create Account
        </Button>

        {/* Login Link */}
        <View style={styles.loginLink}>
          <Text style={styles.loginText}>Already have an account? </Text>
          <Link href="/(auth)/login" asChild>
            <Text style={styles.loginLinkText} testID="login-link">Log In</Text>
          </Link>
        </View>
      </View>

      {/* Terms */}
      <Text style={styles.terms}>
        By continuing, you agree to our{' '}
        <Text style={styles.termsLink}>Terms of Service</Text> and{' '}
        <Text style={styles.termsLink}>Privacy Policy</Text>
      </Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.light.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: layout.screenPaddingHorizontal,
    paddingVertical: layout.screenPaddingVertical,
  },
  header: {
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoText: {
    ...textStyles.h1,
    color: colors.light.textPrimary,
    letterSpacing: 2,
  },
  logoTextAccent: {
    ...textStyles.h1,
    color: colors.primary,
    letterSpacing: 2,
    marginLeft: spacing.xs,
  },
  tagline: {
    ...textStyles.body,
    color: colors.light.textSecondary,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  heroContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: spacing.xl,
  },
  heroPlaceholder: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: colors.transparent.primary10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroEmoji: {
    fontSize: 80,
  },
  socialButtons: {
    gap: spacing.sm,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.lg,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.light.border,
  },
  dividerText: {
    ...textStyles.bodySmall,
    color: colors.light.textTertiary,
    marginHorizontal: spacing.md,
  },
  loginLink: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
  loginText: {
    ...textStyles.body,
    color: colors.light.textSecondary,
  },
  loginLinkText: {
    ...textStyles.body,
    color: colors.primary,
    fontWeight: '600',
  },
  terms: {
    ...textStyles.caption,
    color: colors.light.textTertiary,
    textAlign: 'center',
    paddingHorizontal: layout.screenPaddingHorizontal,
    paddingBottom: spacing.lg,
  },
  termsLink: {
    color: colors.primary,
  },
});
