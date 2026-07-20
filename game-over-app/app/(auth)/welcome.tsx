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
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SocialButton } from '@/components/ui/SocialButton';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AnimatedLogo, willPlayLogoReveal } from '@/components/brand/AnimatedLogo';
import { useTranslation } from '@/i18n';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase/client';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';

WebBrowser.maybeCompleteAuthSession();

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
  const [showCodeEntry, setShowCodeEntry] = React.useState(false);
  const [inviteCode, setInviteCode] = React.useState('');
  // Read once, before AnimatedLogo mounts - mounting it flips the session flag.
  // On a repeat visit the reveal is skipped, so nothing should be delayed either.
  const [revealPlays] = React.useState(() => willPlayLogoReveal());
  const claimEntrance = revealPlays ? FadeInDown.delay(2000).duration(600) : undefined;
  const cardEntrance = revealPlays ? FadeInDown.delay(3000).duration(600) : undefined;
  const insets = useSafeAreaInsets();
  const setError = useAuthStore((state) => state.setError);
  const { t } = useTranslation();

  const handleJoinWithCode = () => {
    const code = inviteCode.trim().toUpperCase();
    if (!code) return;
    router.push(`/invite/${code}`);
  };

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

      {/* Solid navy backdrop (concept 3). The launch intro video is a separate screen. */}
      <View style={styles.heroImage}>
        {/* Subtle depth gradient. The top 45% stays exactly #0D1B2A because the
            logo asset carries its own navy tile of that colour - any lighter
            shade behind it makes the logo read as a dark rectangle. */}
        <LinearGradient
          colors={['#0D1B2A', '#132539']}
          locations={[0.45, 1]}
          style={styles.gradientOverlay}
        />

        {/* Content */}
        <KeyboardAvoidingView
          style={styles.content}
          behavior={Platform.OS === 'android' ? 'height' : undefined}
          keyboardVerticalOffset={0}
        >
          {/* Logo, claim and action area all scroll together. They used to be
              siblings of fixed height, and the claim block was the only one with
              flex - so on shorter screens it was the only thing that could give,
              got squeezed to half its height, and its text spilled over the logo
              above and behind the card below. */}
          <ScrollView
            contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 16 }]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            automaticallyAdjustKeyboardInsets={true}
            showsVerticalScrollIndicator={false}
          >
            {/* Top: brand logo */}
            <View style={[styles.topBar, { paddingTop: insets.top + 24 }]}>
              <AnimatedLogo size={150} testID="welcome-logo" />
            </View>

            {/* Bold claim (concept 3) */}
            <Animated.View style={styles.claimBlock} entering={claimEntrance}>
              <Text style={styles.claimLine}>{t.auth.claim1}</Text>
              <Text style={styles.claimLine}>{t.auth.claim2}</Text>
              <Text style={[styles.claimLine, styles.claimAccent]}>{t.auth.claim3}</Text>
              <Text style={styles.claimSub}>{t.auth.claimSub}</Text>
            </Animated.View>

            {/* Pushes the action area down when there is room and collapses to
                nothing when there is not, so the page scrolls instead of
                anything overlapping. */}
            <View style={styles.flexSpacer} />

            {/* Bottom Action Area - waits for the logo reveal so the brand can
                build up first, then the card comes in underneath it. */}
            <Animated.View style={styles.bottomArea} entering={cardEntrance}>
            {/* Glassmorphic Action Card */}
            <BlurView intensity={20} tint="dark" style={styles.glassCard}>
              <View style={styles.glassCardInner}>
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
                  <Text style={styles.primaryButtonText}>{t.auth.planParty}</Text>
                  <Ionicons name="arrow-forward" size={18} color="#0D1B2A" />
                </Pressable>

                {/* Invite Code Section — inside glass card */}
                <View style={styles.inviteDivider}>
                  <View style={styles.dividerLine} />
                  <View style={styles.inviteDividerLine} />
                </View>

                {showCodeEntry ? (
                  <View style={styles.codeEntrySection}>
                    <Text style={styles.codeEntryLabel}>{t.auth.enterInviteCode}</Text>
                    <View style={styles.codeEntryRow}>
                      <TextInput
                        style={styles.codeInput}
                        value={inviteCode}
                        onChangeText={setInviteCode}
                        placeholder="e.g. 5H1D5U00"
                        placeholderTextColor={'rgba(255,255,255,0.48)'}
                        autoCapitalize="characters"
                        autoCorrect={false}
                        returnKeyType="go"
                        onSubmitEditing={handleJoinWithCode}
                        autoFocus
                      />
                      <Pressable
                        style={({ pressed }) => [
                          styles.codeJoinButton,
                          pressed && { opacity: 0.8 },
                          !inviteCode.trim() && { opacity: 0.5 },
                        ]}
                        onPress={handleJoinWithCode}
                        disabled={!inviteCode.trim()}
                      >
                        <Text style={styles.codeJoinButtonText}>{t.auth.joinShort} →</Text>
                      </Pressable>
                    </View>
                  </View>
                ) : (
                  <Pressable
                    style={({ pressed }) => [
                      styles.inviteCodeButton,
                      pressed && { opacity: 0.7 },
                    ]}
                    onPress={() => setShowCodeEntry(true)}
                    testID="invite-code-link"
                  >
                    <Ionicons name="ticket-outline" size={16} color={'#C6A75E'} />
                    <Text style={styles.inviteCodeButtonText}>{t.auth.gotInviteCode}</Text>
                    <Ionicons name="chevron-forward" size={14} color={'#C6A75E'} />
                  </Pressable>
                )}
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
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D1B2A',
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
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  scrollContent: {
    // Lets the spacer below expand on tall screens while still allowing the
    // content to grow past the viewport and scroll on short ones.
    flexGrow: 1,
  },
  claimBlock: {
    // Deliberately no flex: the claim must keep its natural height. Giving it
    // flex made it the only shrinkable block, and text does not shrink with it.
    paddingHorizontal: 30,
    paddingTop: 28,
    gap: 2,
  },
  flexSpacer: {
    flex: 1,
    minHeight: 24,
  },
  claimLine: {
    color: '#FFFFFF',
    fontSize: 34,
    fontWeight: '800',
    lineHeight: 40,
    letterSpacing: -0.8,
  },
  claimAccent: {
    color: '#C6A75E',
  },
  claimSub: {
    color: 'rgba(255,255,255,0.62)',
    fontSize: 15,
    lineHeight: 22,
    marginTop: 16,
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
    color: '#FFFFFF',
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
    borderColor: 'rgba(230,220,200,0.15)',
  },
  glassCardInner: {
    backgroundColor: 'rgba(26,47,71,0.8)',
    padding: 24,
    gap: 20,
  },
  headlines: {
    gap: 8,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 34,
    letterSpacing: -0.5,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.72)',
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
    color: 'rgba(255,255,255,0.48)',
    fontSize: 12,
    fontWeight: '500',
    marginHorizontal: 16,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#C6A75E',
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: '#C6A75E',
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
    color: '#0D1B2A', // textOnPrimary — navy on gold per design tokens
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
    color: '#C6A75E',
    fontSize: 14,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  terms: {
    color: 'rgba(255,255,255,0.48)',
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
  },
  termsLink: {
    color: '#C6A75E',
  },
  inviteDivider: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inviteDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  inviteCodeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(198, 167, 94, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(198, 167, 94, 0.3)',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  inviteCodeButtonText: {
    color: '#C6A75E',
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  codeEntrySection: {
    gap: 12,
  },
  codeEntryLabel: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  codeEntryRow: {
    flexDirection: 'row',
    gap: 10,
  },
  codeInput: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(198, 167, 94, 0.4)',
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 3,
    textAlign: 'center',
  },
  codeJoinButton: {
    backgroundColor: '#C6A75E',
    borderRadius: 10,
    paddingHorizontal: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  codeJoinButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
