/**
 * Badge Component
 * Status badges for success, warning, error, and info states
 */

import React from 'react';
import { styled, XStack, Text, GetProps } from 'tamagui';

const StyledBadge = styled(XStack, {
  name: 'Badge',
  alignItems: 'center',
  justifyContent: 'center',
  paddingHorizontal: '$2',
  paddingVertical: '$1',
  borderRadius: '$full',
  gap: '$1',

  variants: {
    variant: {
      success: {
        backgroundColor: 'rgba(71, 184, 129, 0.15)',
      },
      warning: {
        backgroundColor: 'rgba(255, 133, 81, 0.15)',
      },
      error: {
        backgroundColor: 'rgba(225, 45, 57, 0.15)',
      },
      info: {
        backgroundColor: 'rgba(123, 104, 238, 0.15)',
      },
      neutral: {
        backgroundColor: '$backgroundHover',
      },
      primary: {
        backgroundColor: 'rgba(37, 140, 244, 0.15)',
      },
      bestMatch: {
        backgroundColor: 'rgba(255, 215, 0, 0.2)',
        borderWidth: 1,
        borderColor: 'rgba(255, 215, 0, 0.5)',
      },
    },
    size: {
      sm: {
        paddingHorizontal: '$1.5',
        paddingVertical: '$0.5',
      },
      md: {
        paddingHorizontal: '$2',
        paddingVertical: '$1',
      },
      lg: {
        paddingHorizontal: '$3',
        paddingVertical: '$1.5',
      },
    },
    outlined: {
      true: {
        backgroundColor: 'transparent',
        borderWidth: 1,
      },
    },
  } as const,

  defaultVariants: {
    variant: 'neutral',
    size: 'md',
  },
});

const StyledBadgeText = styled(Text, {
  name: 'BadgeText',
  fontWeight: '600',
  textTransform: 'capitalize',

  variants: {
    variant: {
      success: {
        color: '$success',
      },
      warning: {
        color: '$warning',
      },
      error: {
        color: '$error',
      },
      info: {
        color: '$info',
      },
      neutral: {
        color: '$textSecondary',
      },
      primary: {
        color: '$primary',
      },
      bestMatch: {
        color: '#B8860B',
        fontWeight: '700',
      },
    },
    size: {
      sm: {
        fontSize: 10,
      },
      md: {
        fontSize: 12,
      },
      lg: {
        fontSize: 14,
      },
    },
  } as const,

  defaultVariants: {
    variant: 'neutral',
    size: 'md',
  },
});

type StyledBadgeProps = GetProps<typeof StyledBadge>;

export interface BadgeProps extends Omit<StyledBadgeProps, 'children'> {
  label: string;
  icon?: React.ReactNode;
  testID?: string;
}

export function Badge({
  label,
  icon,
  variant = 'neutral',
  size = 'md',
  outlined,
  testID,
  ...props
}: BadgeProps) {
  return (
    <StyledBadge
      {...props}
      variant={variant}
      size={size}
      outlined={outlined}
      testID={testID}
      style={outlined ? { borderColor: getOutlineColor(variant) } : undefined}
    >
      {icon}
      <StyledBadgeText variant={variant} size={size}>
        {label}
      </StyledBadgeText>
    </StyledBadge>
  );
}

function getOutlineColor(variant: BadgeProps['variant']): string {
  const colors: Record<string, string> = {
    success: '#47B881',
    warning: '#FF8551',
    error: '#E12D39',
    info: '#7B68EE',
    neutral: '#64748B',
    primary: '#258CF4',
    bestMatch: '#FFD700',
  };
  return colors[variant || 'neutral'];
}

export default Badge;
