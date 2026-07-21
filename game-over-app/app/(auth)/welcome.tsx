/**
 * Welcome Screen
 *
 * The first screen a user sees after the launch intro. It carries the brand and
 * exactly one call to action - picking *how* to sign in happens on the next
 * screen (`continue.tsx`).
 *
 * It used to hold the claim, three provider buttons, an invite field and the
 * login link all at once. That needed ~927pt of height on a viewport of ~852pt,
 * so the claim - the only block with flex - was squeezed until its text ran over
 * the logo above and behind the card below.
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
import { InviteCodeEntry } from '@/components/auth/InviteCodeEntry';
import { useTranslation } from '@/i18n';

export default function WelcomeScreen() {
  // Read once, before AnimatedLogo mounts - mounting it flips the session flag.
  // On a repeat visit the reveal is skipped, so nothing should be delayed either.
  const [revealPlays] = React.useState(() => willPlayLogoReveal());
  const claimEntrance = revealPlays ? FadeInDown.delay(2000).duration(600) : undefined;
  const actionsEntrance = revealPlays ? FadeInDown.delay(3000).duration(600) : undefined;
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  return (
    <View style={styles.container} testID="welcome-screen">
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* The top 45% stays exactly #0D1B2A because the logo asset carries its own
          navy tile of that colour - any lighter shade behind it makes the logo
          read as a dark rectangle. Depth builds towards the bottom instead. */}
      <LinearGradient
        colors={['#0D1B2A', '#132539']}
        locations={[0.45, 1]}
        style={StyleSheet.absoluteFillObject}
      />

      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === 'android' ? 'height' : undefined}
      >
        {/* Everything scrolls together, and the spacer below absorbs the slack:
            it expands on tall screens and collapses to nothing on short ones, so
            the page scrolls instead of anything overlapping. */}
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 20 },
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          automaticallyAdjustKeyboardInsets={true}
          showsVerticalScrollIndicator={false}
        >
          {/* AnimatedLogo is a fixed-size box, so without a centring parent it
              sat flush against the left padding edge. */}
          <View style={styles.logoRow}>
            <AnimatedLogo size={190} testID="welcome-logo" />
          </View>

          <Animated.View style={styles.claimBlock} entering={claimEntrance}>
            <Text style={styles.claimLine}>{t.auth.claim1}</Text>
            <Text style={styles.claimLine}>{t.auth.claim2}</Text>
            <Text style={[styles.claimLine, styles.claimAccent]}>{t.auth.claim3}</Text>
            <Text style={styles.claimSub}>{t.auth.claimSub}</Text>
          </Animated.View>

          <View style={styles.flexSpacer} />

          {/* Comes in after the logo reveal, so the brand builds up first. */}
          <Animated.View style={styles.actions} entering={actionsEntrance}>
            <Pressable
              style={({ pressed }) => [styles.primaryButton, pressed && styles.primaryButtonPressed]}
              onPress={() => router.push('/(auth)/continue')}
              testID="get-started-button"
            >
              <Text style={styles.primaryButtonText}>{t.auth.planParty}</Text>
              <Ionicons name="arrow-forward" size={18} color="#0D1B2A" />
            </Pressable>

            <Pressable
              style={styles.loginLink}
              onPress={() => router.push('/(auth)/login')}
              testID="login-link"
            >
              <Text style={styles.loginText}>{t.auth.hasAccount} </Text>
              <Text style={styles.loginLinkText}>{t.auth.logIn}</Text>
            </Pressable>

            {/* Guests arrive with a code and should not have to go through
                "plan the party" first - offered here, but deliberately quiet. */}
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
    // Lets the spacer expand on tall screens while still allowing the content to
    // grow past the viewport and scroll on short ones.
    flexGrow: 1,
    paddingHorizontal: 28,
  },
  logoRow: {
    alignItems: 'center',
  },
  claimBlock: {
    // Deliberately no flex: the claim keeps its natural height. Giving it flex
    // made it the only shrinkable block, and text does not shrink with it.
    paddingTop: 32,
    gap: 2,
  },
  claimLine: {
    color: '#FFFFFF',
    fontSize: 34,
    fontWeight: '800',
    lineHeight: 41,
    letterSpacing: -0.8,
  },
  claimAccent: {
    color: '#C6A75E',
  },
  claimSub: {
    color: 'rgba(255,255,255,0.62)',
    fontSize: 15,
    lineHeight: 22,
    marginTop: 18,
  },
  flexSpacer: {
    flex: 1,
    minHeight: 32,
  },
  actions: {
    gap: 18,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#C6A75E',
    borderRadius: 14,
    paddingVertical: 18,
  },
  primaryButtonPressed: {
    opacity: 0.85,
  },
  primaryButtonText: {
    color: '#0D1B2A',
    fontSize: 17,
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
