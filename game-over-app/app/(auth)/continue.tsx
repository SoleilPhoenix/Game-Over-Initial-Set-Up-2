/**
 * Continue Screen
 *
 * Sits between the welcome screen and the actual sign-up form. The welcome
 * screen carries the brand and a single call to action; this is where the user
 * picks *how* to continue. Splitting it this way keeps the first screen quiet -
 * it used to show the claim and three provider buttons and an invite field all
 * at once, which is what pushed it past the height of the viewport.
 */
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  Pressable,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SocialButton } from '@/components/ui/SocialButton';
import { InviteCodeEntry } from '@/components/auth/InviteCodeEntry';
import { Logo } from '@/components/brand/Logo';
import { useSocialAuth } from '@/hooks/useSocialAuth';
import { useTranslation } from '@/i18n';

export default function ContinueScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { loading, signInWithApple, signInWithGoogle, signInWithFacebook } = useSocialAuth();

  return (
    <View style={styles.container} testID="continue-screen">
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Same backdrop as the welcome screen: flat navy where the logo sits, so
          the asset's own navy tile stays invisible. */}
      <LinearGradient
        colors={['#0D1B2A', '#132539']}
        locations={[0.45, 1]}
        style={StyleSheet.absoluteFillObject}
      />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
          hitSlop={12}
          testID="continue-back"
        >
          <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
        </Pressable>

        <View style={styles.header}>
          <Logo size={150} />
          <Text style={styles.title}>{t.auth.continueTitle}</Text>
          <Text style={styles.subtitle}>{t.auth.continueSubtitle}</Text>
        </View>

        <View style={styles.spacer} />

        <View style={styles.actions}>
          <View style={styles.socialButtons}>
            <SocialButton
              provider="apple"
              onPress={signInWithApple}
              loading={loading === 'apple'}
              disabled={loading !== null}
              testID="social-button-apple"
            />
            <SocialButton
              provider="google"
              onPress={signInWithGoogle}
              loading={loading === 'google'}
              disabled={loading !== null}
              testID="social-button-google"
            />
            <SocialButton
              provider="facebook"
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

          <Pressable
            style={({ pressed }) => [styles.emailButton, pressed && styles.emailButtonPressed]}
            onPress={() => router.push('/(auth)/signup')}
            disabled={loading !== null}
            testID="continue-with-email"
          >
            <Text style={styles.emailButtonText}>{t.auth.continueWithEmail}</Text>
            <Ionicons name="arrow-forward" size={18} color="#0D1B2A" />
          </Pressable>

          <Pressable
            style={styles.loginLink}
            onPress={() => router.push('/(auth)/login')}
            testID="continue-login-link"
          >
            <Text style={styles.loginText}>{t.auth.hasAccount} </Text>
            <Text style={styles.loginLinkText}>{t.auth.logIn}</Text>
          </Pressable>

          {/* Same escape hatch as on the welcome screen. A guest who did not
              notice it there lands here facing three sign-in providers they do
              not need, so the way out has to be offered a second time. */}
          <InviteCodeEntry testIDPrefix="continue-invite-code" />

          <Text style={styles.terms}>
            {t.auth.termsPrefix}{' '}
            <Text style={styles.termsLink}>{t.auth.termsOfService}</Text> {t.auth.and}{' '}
            <Text style={styles.termsLink}>{t.auth.privacyPolicy}</Text>
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D1B2A',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    gap: 12,
    paddingTop: 8,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.4,
    textAlign: 'center',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.62)',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  spacer: {
    flex: 1,
    minHeight: 32,
  },
  actions: {
    gap: 20,
  },
  socialButtons: {
    gap: 12,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
    backgroundColor: '#C6A75E',
    borderRadius: 14,
    paddingVertical: 17,
  },
  emailButtonPressed: {
    opacity: 0.85,
  },
  emailButtonText: {
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
