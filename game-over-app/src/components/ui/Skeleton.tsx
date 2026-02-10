/**
 * Skeleton Component
 * Loading skeleton with shimmer effect
 */

import React, { useEffect } from 'react';
import { Animated, StyleSheet, View, DimensionValue } from 'react-native';
import { styled, YStack, XStack, GetProps, useTheme } from 'tamagui';

const StyledSkeletonBase = styled(YStack, {
  name: 'Skeleton',
  backgroundColor: '$backgroundHover',
  overflow: 'hidden',

  variants: {
    variant: {
      rectangular: {
        borderRadius: '$md',
      },
      circular: {
        borderRadius: '$full',
      },
      rounded: {
        borderRadius: '$lg',
      },
      text: {
        borderRadius: '$sm',
        height: 16,
      },
    },
    animation: {
      pulse: {},
      wave: {},
      none: {},
    },
  } as const,

  defaultVariants: {
    variant: 'rectangular',
    animation: 'pulse',
  },
});

type StyledSkeletonProps = GetProps<typeof StyledSkeletonBase>;

export interface SkeletonProps extends Omit<StyledSkeletonProps, 'children' | 'animation'> {
  width?: DimensionValue;
  height?: DimensionValue;
  animation?: 'pulse' | 'wave' | 'none';
  testID?: string;
}

export function Skeleton({
  width = '100%',
  height = 20,
  variant = 'rectangular',
  animation = 'pulse',
  testID,
  ...props
}: SkeletonProps) {
  const theme = useTheme();
  const animatedValue = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (animation === 'none') return;

    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );

    pulseAnimation.start();

    return () => {
      pulseAnimation.stop();
    };
  }, [animation, animatedValue]);

  const opacity = animation === 'pulse'
    ? animatedValue.interpolate({
        inputRange: [0, 1],
        outputRange: [0.4, 0.7],
      })
    : 1;

  return (
    <View testID={testID} style={[styles.container, { width, height }]}>
      <Animated.View
        style={[
          styles.skeleton,
          {
            opacity,
            backgroundColor: theme.backgroundHover?.val || '#2D3748',
            borderRadius: variant === 'circular' ? 9999 : variant === 'rounded' ? 12 : 8,
          },
        ]}
      />
      {animation === 'wave' && (
        <Animated.View
          style={[
            styles.shimmer,
            {
              transform: [
                {
                  translateX: animatedValue.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-100, 100],
                  }),
                },
              ],
            },
          ]}
        />
      )}
    </View>
  );
}

// Pre-composed skeleton components for common use cases
export function SkeletonText({
  lines = 3,
  lastLineWidth = '60%' as DimensionValue,
  testID,
}: {
  lines?: number;
  lastLineWidth?: DimensionValue;
  testID?: string;
}) {
  return (
    <YStack gap="$2" testID={testID}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          variant="text"
          width={index === lines - 1 ? lastLineWidth : '100%'}
          height={14}
        />
      ))}
    </YStack>
  );
}

export function SkeletonAvatar({
  size = 48,
  testID,
}: {
  size?: number;
  testID?: string;
}) {
  return (
    <Skeleton
      variant="circular"
      width={size}
      height={size}
      testID={testID}
    />
  );
}

export function SkeletonCard({ testID }: { testID?: string }) {
  return (
    <YStack
      backgroundColor="$surface"
      borderRadius="$lg"
      padding="$4"
      gap="$3"
      testID={testID}
    >
      <Skeleton variant="rounded" width="100%" height={120} />
      <Skeleton variant="text" width="70%" height={20} />
      <SkeletonText lines={2} />
      <XStack gap="$2">
        <Skeleton variant="rounded" width={80} height={32} />
        <Skeleton variant="rounded" width={80} height={32} />
      </XStack>
    </YStack>
  );
}

export function SkeletonEventCard({ testID }: { testID?: string }) {
  return (
    <YStack
      backgroundColor="$surface"
      borderRadius="$lg"
      overflow="hidden"
      borderWidth={1}
      borderColor="$borderColor"
      testID={testID}
    >
      <Skeleton variant="rectangular" width="100%" height={160} animation="wave" />
      <YStack padding="$4" gap="$3">
        <XStack justifyContent="space-between" alignItems="flex-start">
          <YStack flex={1} gap="$2">
            <Skeleton variant="text" width="80%" height={22} />
            <Skeleton variant="text" width="50%" height={14} />
          </YStack>
          <Skeleton variant="rounded" width={70} height={24} />
        </XStack>
        <XStack gap="$4">
          <Skeleton variant="text" width={100} height={14} />
          <Skeleton variant="text" width={80} height={14} />
        </XStack>
      </YStack>
    </YStack>
  );
}

export function SkeletonPackageCard({ testID }: { testID?: string }) {
  return (
    <YStack
      backgroundColor="$surface"
      borderRadius="$lg"
      overflow="hidden"
      borderWidth={1}
      borderColor="$borderColor"
      testID={testID}
    >
      <Skeleton variant="rectangular" width="100%" height={180} animation="wave" />
      <YStack padding="$4" gap="$3">
        <XStack justifyContent="space-between" alignItems="center">
          <Skeleton variant="text" width="50%" height={20} />
          <Skeleton variant="rounded" width={60} height={24} />
        </XStack>
        <SkeletonText lines={2} />
        <XStack justifyContent="space-between" alignItems="center" marginTop="$2">
          <Skeleton variant="text" width={100} height={28} />
          <Skeleton variant="text" width={80} height={14} />
        </XStack>
      </YStack>
    </YStack>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    position: 'relative',
  },
  skeleton: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    width: 100,
  },
});

export default Skeleton;
