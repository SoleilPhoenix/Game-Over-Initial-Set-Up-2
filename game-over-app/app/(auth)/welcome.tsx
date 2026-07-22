/**
 * Welcome Screen - the single entry screen
 *
 * Brand and every way in, on one screen. It used to hand off to a separate
 * `continue` screen to pick a sign-in method; that extra tap cost sign-ups for
 * no benefit, so the choice moved here. The screen stays uncrowded by keeping
 * the three providers as a compact icon row rather than three stacked buttons -
 * which is what had overflowed the viewport the first time everything shared one
 * screen.
 *
 * Order is deliberate: the fastest path (one-tap social) sits highest, the email
 * route ("Party planen") is a quieter button below it, and the guest code - the
 * exception, not the rule - stays quietest of all.
 *
 * The logo asset carries its own #0D1B2A tile; the backdrop is flat navy in its
 * top half so the logo never reads as a dark rectangle on a lighter gradient.
 */
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AnimatedLogo, willPlayLogoReveal } from '@/components/brand/AnimatedLogo';
import { SocialButton } from '@/components/ui/SocialButton';
import { InviteCodeEntry } from '@/components/auth/InviteCodeEntry';
import { useSocialAuth } from '@/hooks/useSocialAuth';
import { useTranslation } from '@/i18n';

export default function WelcomeScreen() {
  // Read once, before AnimatedLogo mounts - mounting it flips the session flag.
  // The reveal normally plays on the intro screen, so here it usually resolves
  // to the static logo; the delayed entrances only apply on the rare path where
  // the welcome screen is the first to show the reveal.
  const [revealPlays] = React.useState(() => willPlayLogoReveal());
  const claimEntrance = revealPlays ? FadeInDown.delay(2000).duration(600) : undefined;
  const actionsEntrance = revealPlays ? FadeInDown.delay(3000).duration(600) : undefined;
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { loading, signInWithApple, signInWithGoogle, signInWithFacebook } = useSocialAuth();

  return (
    <View style={styles.container} testID="welcome-screen">
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <LinearGradient
        colors={['#0D1B2A', '#132539']}
        locations={[0.45, 1]}
        style={StyleSheet.absoluteFillObject}
      />

      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === 'android' ? 'height' : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 16 },
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          automaticallyAdjustKeyboardInsets={true}
          showsVerticalScrollIndicator={false}
        >
          {/* Brand block, pulled towards the top. AnimatedLogo is a fixed-size
              box, so the centring parent is what keeps it off the left edge. */}
          <View style={styles.brand}>
            <AnimatedLogo size={150} testID="welcome-logo" />

            <Animated.View style={styles.claimBlock} entering={claimEntrance}>
              <Text style={styles.claimLine}>{t.auth.claim1}</Text>
              <Text style={styles.claimLine}>{t.auth.claim2}</Text>
              <Text style={[styles.claimLine, styles.claimAccent]}>{t.auth.claim3}</Text>
              <Text style={styles.claimSub}>{t.auth.claimSub}</Text>
            </Animated.View>
          </View>

          <View style={styles.flexSpacer} />

          <Animated.View style={styles.actions} entering={actionsEntrance}>
            {/* Fastest path first: one tap, no form. */}
            <View style={styles.socialRow}>
              <SocialButton
                provider="apple"
                compact
                onPress={signInWithApple}
                loading={loading === 'apple'}
                disabled={loading !== null}
                testID="social-button-apple"
              />
              <SocialButton
                provider="google"
                compact
                onPress={signInWithGoogle}
                loading={loading === 'google'}
                disabled={loading !== null}
                testID="social-button-google"
              />
              <SocialButton
                provider="facebook"
                compact
                onPress={signInWithFacebook}
                loading={loading === 'facebook'}
                disabled={loading !== null}
                testID="social-button-facebook"
              />
            </View>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>{t.auth.or}</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Email route, deliberately the quieter, outlined button. */}
            <Pressable
              style={({ pressed }) => [styles.emailButton, pressed && styles.emailButtonPressed]}
              onPress={() => router.push('/(auth)/signup')}
              disabled={loading !== null}
              testID="get-started-button"
            >
              <Text style={styles.emailButtonText}>{t.auth.planParty}</Text>
              <Ionicons name="arrow-forward" size={17} color="#C6A75E" />
            </Pressable>

            <Pressable
              style={styles.loginLink}
              onPress={() => router.push('/(auth)/login')}
              testID="login-link"
            >
              <Text style={styles.loginText}>{t.auth.hasAccount} </Text>
              <Text style={styles.loginLinkText}>{t.auth.logIn}</Text>
            </Pressable>

            {/* Guests arrive with a code and should not have to sign up first -
                offered here, but deliberately the quietest thing on the screen. */}
            <InviteCodeEntry testIDPrefix="invite-code" />

            <Text style={styles.terms}>
              {t.auth.termsPrefix}{' '}
              <Text style={styles.termsLink}>{t.auth.termsOfService}</Text> {t.auth.and}{' '}
              <Text style={styles.termsLink}>{t.auth.privacyPolicy}</Text>
            </Text>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D1B2A',
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 28,
  },
  brand: {
    alignItems: 'center',
    paddingTop: 8,
  },
  claimBlock: {
    paddingTop: 22,
    gap: 2,
    alignItems: 'center',
  },
  claimLine: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '800',
    lineHeight: 38,
    letterSpacing: -0.8,
    textAlign: 'center',
  },
  claimAccent: {
    color: '#C6A75E',
  },
  claimSub: {
    color: 'rgba(255,255,255,0.62)',
    fontSize: 15,
    lineHeight: 22,
    marginTop: 14,
    textAlign: 'center',
  },
  flexSpacer: {
    flex: 1,
    minHeight: 24,
  },
  actions: {
    gap: 16,
  },
  socialRow: {
    flexDirection: 'row',
    gap: 12,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: -2,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  dividerText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
  },
  emailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    paddingVertical: 15,
    borderWidth: 1.5,
    borderColor: 'rgba(198,167,94,0.55)',
  },
  emailButtonPressed: {
    opacity: 0.7,
  },
  emailButtonText: {
    color: '#C6A75E',
    fontSize: 16,
    fontWeight: '700',
  },
  loginLink: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  loginText: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 16,
  },
  loginLinkText: {
    color: '#C6A75E',
    fontSize: 16,
    fontWeight: '700',
  },
  terms: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
  termsLink: {
    color: 'rgba(198,167,94,0.9)',
  },
});
