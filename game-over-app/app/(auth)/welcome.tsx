/**
 * Welcome Screen
 * Dark glassmorphic design matching UI specifications
 * Full-screen hero image with gradient overlay and glass action card
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  ImageBackground,
  Pressable,
  Dimensions,
} from 'react-native';
import { Link, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SocialButton } from '@/components/ui/SocialButton';
import { DARK_THEME } from '@/constants/theme';
import { useTranslation } from '@/i18n';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase/client';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';

WebBrowser.maybeCompleteAuthSession();

const { width, height } = Dimensions.get('window');

/**
 * Validates that a token appears to be a valid JWT format
 * JWT tokens have 3 base64-encoded parts separated by dots
 */
function isValidJWTFormat(token: string): boolean {
  if (!token || typeof token !== 'string') return false;
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  // Check each part is non-empty and looks like base64
  return parts.every(part => part.length > 0 && /^[A-Za-z0-9_-]+$/.test(part));
}

export default function WelcomeScreen() {
  const [isLoading, setIsLoading] = React.useState<string | null>(null);
  const insets = useSafeAreaInsets();
  const setError = useAuthStore((state) => state.setError);
  const { t } = useTranslation();

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
            // Validate token format before setting session
            if (!isValidJWTFormat(accessToken)) {
              throw new Error('Invalid access token format received');
            }
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
            // Validate token format before setting session
            if (!isValidJWTFormat(accessToken)) {
              throw new Error('Invalid access token format received');
            }
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

  const handleGetStarted = () => {
    router.push('/(auth)/signup');
  };

  return (
    <View style={styles.container} testID="welcome-screen">
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Background Hero Image with Gradient Overlay */}
      <ImageBackground
        source={{
          uri: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&q=80',
        }}
        style={styles.heroImage}
        resizeMode="cover"
      >
        {/* Gradient Overlay */}
        <LinearGradient
          colors={['rgba(0,0,0,0.4)', 'transparent', DARK_THEME.background]}
          locations={[0, 0.4, 1]}
          style={styles.gradientOverlay}
        />

        {/* Content */}
        <View style={[styles.content, { paddingTop: insets.top }]}>
          {/* Top App Bar */}
          <View style={styles.topBar}>
            <View style={styles.logoBadge}>
              <Ionicons name="game-controller" size={20} color={DARK_THEME.primary} />
              <Text style={styles.logoText}>Game-Over.app</Text>
            </View>
          </View>

          {/* Spacer */}
          <View style={styles.spacer} />

          {/* Bottom Action Area */}
          <View style={[styles.bottomArea, { paddingBottom: insets.bottom + 16 }]}>
            {/* Glassmorphic Action Card */}
            <BlurView intensity={20} tint="dark" style={styles.glassCard}>
              <View style={styles.glassCardInner}>
                {/* Headlines */}
                <View style={styles.headlines}>
                  <Text style={styles.title}>
                    {t.auth.welcomeHeadline}
                  </Text>
                  <Text style={styles.subtitle}>
                    {t.auth.welcomeBody}
                  </Text>
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
                  <Text style={styles.dividerText}>{t.auth.or}</Text>
                  <View style={styles.dividerLine} />
                </View>

                {/* Primary CTA */}
                <Pressable
                  style={({ pressed }) => [
                    styles.primaryButton,
                    pressed && styles.primaryButtonPressed,
                  ]}
                  onPress={handleGetStarted}
                  testID="get-started-button"
                >
                  <Text style={styles.primaryButtonText}>{t.auth.getStarted}</Text>
                  <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                </Pressable>
              </View>
            </BlurView>

            {/* Login Link */}
            <Pressable
              style={styles.loginLink}
              onPress={() => router.push('/(auth)/login')}
              testID="login-link"
            >
              <Text style={styles.loginText}>{t.auth.hasAccount} </Text>
              <Text style={styles.loginLinkText}>{t.auth.logIn}</Text>
            </Pressable>

            {/* Terms */}
            <Text style={styles.terms}>
              {t.auth.termsPrefix}{' '}
              <Text style={styles.termsLink}>{t.auth.termsOfService}</Text> {t.auth.and}{' '}
              <Text style={styles.termsLink}>{t.auth.privacyPolicy}</Text>
            </Text>
          </View>
        </View>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DARK_THEME.background,
  },
  heroImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  gradientOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  content: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  logoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  logoText: {
    color: DARK_THEME.textPrimary,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  spacer: {
    flex: 1,
  },
  bottomArea: {
    paddingHorizontal: 16,
    gap: 16,
  },
  glassCard: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: DARK_THEME.glassBorder,
  },
  glassCardInner: {
    backgroundColor: DARK_THEME.glass,
    padding: 24,
    gap: 20,
  },
  headlines: {
    gap: 8,
  },
  title: {
    color: DARK_THEME.textPrimary,
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 34,
    letterSpacing: -0.5,
  },
  subtitle: {
    color: DARK_THEME.textSecondary,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400',
  },
  socialButtons: {
    gap: 12,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  dividerText: {
    color: DARK_THEME.textTertiary,
    fontSize: 12,
    fontWeight: '500',
    marginHorizontal: 16,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: DARK_THEME.primary,
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: DARK_THEME.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonPressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
  primaryButtonText: {
    color: DARK_THEME.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  loginLink: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  loginText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    fontWeight: '500',
  },
  loginLinkText: {
    color: DARK_THEME.primary,
    fontSize: 14,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  terms: {
    color: DARK_THEME.textTertiary,
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
  },
  termsLink: {
    color: DARK_THEME.primary,
  },
});
