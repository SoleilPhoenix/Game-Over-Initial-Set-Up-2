/**
 * ProgressBar Component
 * Progress indicator with percentage display
 */

import React from 'react';
import { styled, XStack, YStack, Text, GetProps } from 'tamagui';

const StyledProgressContainer = styled(YStack, {
  name: 'ProgressContainer',
  width: '100%',
  gap: '$1',
});

const StyledProgressTrack = styled(XStack, {
  name: 'ProgressTrack',
  width: '100%',
  backgroundColor: '$backgroundHover',
  borderRadius: '$full',
  overflow: 'hidden',

  variants: {
    size: {
      sm: {
        height: 4,
      },
      md: {
        height: 8,
      },
      lg: {
        height: 12,
      },
    },
  } as const,

  defaultVariants: {
    size: 'md',
  },
});

const StyledProgressFill = styled(XStack, {
  name: 'ProgressFill',
  height: '100%',
  borderRadius: '$full',
  animation: 'medium',

  variants: {
    variant: {
      primary: {
        backgroundColor: '$primary',
      },
      success: {
        backgroundColor: '$success',
      },
      warning: {
        backgroundColor: '$warning',
      },
      error: {
        backgroundColor: '$error',
      },
      info: {
        backgroundColor: '$info',
      },
    },
    animated: {
      true: {
        // Animation will be handled by width transition
      },
    },
  } as const,

  defaultVariants: {
    variant: 'primary',
  },
});

const StyledProgressLabel = styled(XStack, {
  name: 'ProgressLabel',
  justifyContent: 'space-between',
  alignItems: 'center',
});

const StyledProgressText = styled(Text, {
  name: 'ProgressText',
  fontSize: '$2',
  color: '$textSecondary',
  fontWeight: '500',
});

type StyledProgressTrackProps = GetProps<typeof StyledProgressTrack>;

export interface ProgressBarProps extends Omit<StyledProgressTrackProps, 'children'> {
  value: number; // 0-100
  label?: string;
  showPercentage?: boolean;
  variant?: 'primary' | 'success' | 'warning' | 'error' | 'info';
  animated?: boolean;
  testID?: string;
}

export function ProgressBar({
  value,
  label,
  showPercentage = false,
  variant = 'primary',
  size = 'md',
  animated = true,
  testID,
  ...props
}: ProgressBarProps) {
  // Clamp value between 0 and 100
  const clampedValue = Math.min(100, Math.max(0, value));

  return (
    <StyledProgressContainer testID={testID}>
      {(label || showPercentage) && (
        <StyledProgressLabel>
          {label && <StyledProgressText>{label}</StyledProgressText>}
          {showPercentage && (
            <StyledProgressText>{Math.round(clampedValue)}%</StyledProgressText>
          )}
        </StyledProgressLabel>
      )}
      <StyledProgressTrack {...props} size={size}>
        <StyledProgressFill
          variant={variant}
          animated={animated}
          width={`${clampedValue}%`}
        />
      </StyledProgressTrack>
    </StyledProgressContainer>
  );
}

export default ProgressBar;
