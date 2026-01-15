/**
 * Social Sign-In Button Component
 * For Apple, Google, and Facebook authentication
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
import { colors } from '@/constants/colors';
import { spacing, borderRadius, layout } from '@/constants/spacing';

type SocialProvider = 'apple' | 'google' | 'facebook';

interface SocialButtonProps extends Omit<PressableProps, 'style'> {
  provider: SocialProvider;
  loading?: boolean;
  disabled?: boolean;
}

const providerConfig = {
  apple: {
    label: 'Continue with Apple',
    backgroundColor: '#000000',
    textColor: '#FFFFFF',
    icon: '', // Apple logo would go here
  },
  google: {
    label: 'Continue with Google',
    backgroundColor: '#FFFFFF',
    textColor: '#1F1F1F',
    icon: 'G', // Google logo would go here
  },
  facebook: {
    label: 'Continue with Facebook',
    backgroundColor: '#1877F2',
    textColor: '#FFFFFF',
    icon: 'f', // Facebook logo would go here
  },
};

export function SocialButton({
  provider,
  loading = false,
  disabled = false,
  ...props
}: SocialButtonProps) {
  const config = providerConfig[provider];
  const isDisabled = disabled || loading;

  return (
    <Pressable
      {...props}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: config.backgroundColor,
          borderColor: provider === 'google' ? colors.light.border : config.backgroundColor,
        },
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={config.textColor} size="small" />
      ) : (
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            {provider === 'apple' && <AppleIcon />}
            {provider === 'google' && <GoogleIcon />}
            {provider === 'facebook' && <FacebookIcon />}
          </View>
          <Text style={[styles.label, { color: config.textColor }]}>
            {config.label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

// Simple icon components (would normally use SVG icons)
function AppleIcon() {
  return (
    <View style={styles.icon}>
      <Text style={[styles.iconText, { color: '#FFFFFF', fontSize: 20 }]}></Text>
    </View>
  );
}

function GoogleIcon() {
  return (
    <View style={[styles.icon, styles.googleIcon]}>
      <Text style={[styles.iconText, { color: '#4285F4', fontWeight: '700' }]}>
        G
      </Text>
    </View>
  );
}

function FacebookIcon() {
  return (
    <View style={styles.icon}>
      <Text style={[styles.iconText, { color: '#FFFFFF', fontWeight: '700' }]}>
        f
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    height: layout.buttonHeight,
    borderRadius: borderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  disabled: {
    opacity: 0.5,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    width: 24,
    height: 24,
    marginRight: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleIcon: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },
  iconText: {
    fontSize: 16,
    fontWeight: '600',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
  },
});
