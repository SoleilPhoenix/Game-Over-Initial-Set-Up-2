/**
 * Social Sign-In Button Component
 * For Apple, Google, and Facebook authentication
 *
 * The marks are real vector logos. They used to be typed characters - an Apple
 * glyph borrowed from the system font, a blue letter "G" on a white circle and a
 * lowercase "f" - which rendered at whatever weight and baseline the platform
 * font happened to use, so the three buttons never lined up with one another.
 *
 * Each provider also dictates how its mark may appear, and a letter is not the
 * mark: Google requires the four-colour "G", Apple the solid logo. Getting this
 * wrong is a review risk, not only a cosmetic one.
 */

import React from 'react';
import {
  Pressable,
  Text,
  StyleSheet,
  View,
  ActivityIndicator,
  PressableProps,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { spacing, borderRadius } from '@/constants/spacing';
import { useTranslation } from '@/i18n';

type SocialProvider = 'apple' | 'google' | 'facebook';

interface SocialButtonProps extends Omit<PressableProps, 'style'> {
  provider: SocialProvider;
  loading?: boolean;
  disabled?: boolean;
  /**
   * Icon-only, sized to sit three-across in a row. The labelled full-width form
   * does not fit three abreast, and the provider marks are recognisable on their
   * own - so the compact welcome screen shows just the marks.
   */
  compact?: boolean;
}

const providerStyle: Record<SocialProvider, { backgroundColor: string; textColor: string }> = {
  apple: { backgroundColor: '#000000', textColor: '#FFFFFF' },
  google: { backgroundColor: '#FFFFFF', textColor: '#1F1F1F' },
  facebook: { backgroundColor: '#1877F2', textColor: '#FFFFFF' },
};

const MARK_SIZE = 20;

function AppleMark() {
  // Rendered a touch larger than the others: the Apple mark carries more empty
  // space inside its own bounding box, so matched box sizes look mismatched.
  return (
    <Svg width={MARK_SIZE + 2} height={MARK_SIZE + 2} viewBox="0 0 24 24">
      <Path
        fill="#FFFFFF"
        d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"
      />
    </Svg>
  );
}

/** The four-colour mark, as Google's branding guidelines require. */
function GoogleMark() {
  return (
    <Svg width={MARK_SIZE} height={MARK_SIZE} viewBox="0 0 48 48">
      <Path
        fill="#4285F4"
        d="M45.12 24.5c0-1.56-.14-3.06-.4-4.5H24v8.51h11.84c-.51 2.75-2.06 5.08-4.39 6.64v5.52h7.11c4.16-3.83 6.56-9.47 6.56-16.17z"
      />
      <Path
        fill="#34A853"
        d="M24 46c5.94 0 10.92-1.97 14.56-5.33l-7.11-5.52c-1.97 1.32-4.49 2.1-7.45 2.1-5.73 0-10.58-3.87-12.31-9.07H4.34v5.7C7.96 41.07 15.4 46 24 46z"
      />
      <Path
        fill="#FBBC05"
        d="M11.69 28.18C11.25 26.86 11 25.45 11 24s.25-2.86.69-4.18v-5.7H4.34C2.85 17.09 2 20.45 2 24s.85 6.91 2.34 9.88l7.35-5.7z"
      />
      <Path
        fill="#EA4335"
        d="M24 10.75c3.23 0 6.13 1.11 8.41 3.29l6.31-6.31C34.91 4.18 29.93 2 24 2 15.4 2 7.96 6.93 4.34 14.12l7.35 5.7c1.73-5.2 6.58-9.07 12.31-9.07z"
      />
    </Svg>
  );
}

function FacebookMark() {
  return (
    <Svg width={MARK_SIZE} height={MARK_SIZE} viewBox="0 0 320 512">
      <Path
        fill="#FFFFFF"
        d="M279.14 288l14.22-92.66h-88.91v-60.13c0-25.35 12.42-50.06 52.24-50.06h40.42V6.26S260.43 0 225.36 0c-73.22 0-121.08 44.38-121.08 124.72v70.62H22.89V288h81.39v224h100.17V288z"
      />
    </Svg>
  );
}

const MARKS: Record<SocialProvider, () => React.JSX.Element> = {
  apple: AppleMark,
  google: GoogleMark,
  facebook: FacebookMark,
};

export function SocialButton({
  provider,
  loading = false,
  disabled = false,
  compact = false,
  ...props
}: SocialButtonProps) {
  const { t } = useTranslation();
  const style = providerStyle[provider];
  const Mark = MARKS[provider];
  const isDisabled = disabled || loading;

  const label = {
    apple: t.auth.continueWithApple,
    google: t.auth.continueWithGoogle,
    facebook: t.auth.continueWithFacebook,
  }[provider];

  return (
    <Pressable
      {...props}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        compact ? styles.compactButton : styles.button,
        {
          backgroundColor: style.backgroundColor,
          borderColor: provider === 'google' ? 'rgba(13,27,42,0.14)' : style.backgroundColor,
        },
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={style.textColor} size="small" />
      ) : compact ? (
        <Mark />
      ) : (
        <>
          {/* Pinned to the left edge rather than laid out in a row, so the label
              stays centred in the button. The three marks have different aspect
              ratios; in a row each one would push its label by a different
              amount and the three labels would no longer align. */}
          <View style={styles.markSlot}>
            <Mark />
          </View>
          <Text style={[styles.label, { color: style.textColor }]} numberOfLines={1}>
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 58,
    borderRadius: borderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
  },
  compactButton: {
    flex: 1,
    height: 54,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  disabled: {
    opacity: 0.5,
  },
  markSlot: {
    position: 'absolute',
    left: spacing.lg,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 16.5,
    fontWeight: '600',
  },
});
