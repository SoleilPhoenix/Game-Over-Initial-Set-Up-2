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
  TextInput,
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
import { useTranslation } from '@/i18n';

export default function WelcomeScreen() {
  const [showCodeEntry, setShowCodeEntry] = React.useState(false);
  const [inviteCode, setInviteCode] = React.useState('');
  // Read once, before AnimatedLogo mounts - mounting it flips the session flag.
  // On a repeat visit the reveal is skipped, so nothing should be delayed either.
  const [revealPlays] = React.useState(() => willPlayLogoReveal());
  const claimEntrance = revealPlays ? FadeInDown.delay(2000).duration(600) : undefined;
  const actionsEntrance = revealPlays ? FadeInDown.delay(3000).duration(600) : undefined;
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  const handleJoinWithCode = () => {
    const code = inviteCode.trim().toUpperCase();
    if (!code) return;
    router.push(`/invite/${code}`);
  };

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
          <AnimatedLogo size={150} testID="welcome-logo" />

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
                "plan the party" first - kept here, but deliberately quiet. */}
            {showCodeEntry ? (
              <View style={styles.codeEntry}>
                <View style={styles.codeEntryRow}>
                  <TextInput
                    style={styles.codeInput}
                    value={inviteCode}
                    onChangeText={setInviteCode}
                    placeholder="e.g. 5H1D5U00"
                    placeholderTextColor={'rgba(255,255,255,0.42)'}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    returnKeyType="go"
                    onSubmitEditing={handleJoinWithCode}
                    autoFocus
                    testID="invite-code-input"
                  />
                  <Pressable
                    style={({ pressed }) => [
                      styles.codeJoinButton,
                      pressed && { opacity: 0.8 },
                      !inviteCode.trim() && { opacity: 0.5 },
                    ]}
                    onPress={handleJoinWithCode}
                    disabled={!inviteCode.trim()}
                    testID="invite-code-join"
                  >
                    <Text style={styles.codeJoinButtonText}>{t.auth.joinShort}</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <Pressable
                style={styles.inviteLink}
                onPress={() => setShowCodeEntry(true)}
                testID="invite-code-link"
              >
                <Ionicons name="ticket-outline" size={15} color={'rgba(198,167,94,0.85)'} />
                <Text style={styles.inviteLinkText}>{t.auth.gotInviteCode}</Text>
              </Pressable>
            )}

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
    color: 'rgba(255,255,255,0.62)',
    fontSize: 14,
  },
  loginLinkText: {
    color: '#C6A75E',
    fontSize: 14,
    fontWeight: '700',
  },
  inviteLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  inviteLinkText: {
    color: 'rgba(198,167,94,0.85)',
    fontSize: 13.5,
  },
  codeEntry: {
    gap: 8,
  },
  codeEntryRow: {
    flexDirection: 'row',
    gap: 10,
  },
  codeInput: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(198,167,94,0.35)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    color: '#FFFFFF',
    fontSize: 15,
    letterSpacing: 1.5,
  },
  codeJoinButton: {
    justifyContent: 'center',
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: 'rgba(198,167,94,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(198,167,94,0.5)',
  },
  codeJoinButtonText: {
    color: '#C6A75E',
    fontSize: 15,
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
