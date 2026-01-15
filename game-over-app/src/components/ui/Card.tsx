/**
 * Card Component
 * Tamagui-based pressable card with shadow and variants
 */

import React from 'react';
import { styled, YStack, GetProps } from 'tamagui';

const StyledCard = styled(YStack, {
  name: 'Card',
  backgroundColor: '$surface',
  borderRadius: '$lg',
  padding: '$4',
  borderWidth: 1,
  borderColor: '$borderColor',

  variants: {
    variant: {
      elevated: {
        shadowColor: '$shadowColor',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
        borderWidth: 0,
      },
      outlined: {
        borderWidth: 1,
        borderColor: '$borderColor',
      },
      filled: {
        backgroundColor: '$backgroundStrong',
        borderWidth: 0,
      },
      ghost: {
        backgroundColor: 'transparent',
        borderWidth: 0,
        padding: 0,
      },
    },
    pressable: {
      true: {
        cursor: 'pointer',
        pressStyle: {
          opacity: 0.9,
          scale: 0.99,
        },
        hoverStyle: {
          borderColor: '$primary',
        },
      },
    },
    selected: {
      true: {
        borderWidth: 2,
        borderColor: '$primary',
      },
    },
    size: {
      sm: {
        padding: '$3',
        borderRadius: '$md',
      },
      md: {
        padding: '$4',
        borderRadius: '$lg',
      },
      lg: {
        padding: '$5',
        borderRadius: '$xl',
      },
    },
  } as const,

  defaultVariants: {
    variant: 'elevated',
    size: 'md',
  },
});

type StyledCardProps = GetProps<typeof StyledCard>;

export interface CardProps extends StyledCardProps {
  testID?: string;
  children?: React.ReactNode;
  onPress?: () => void;
}

export function Card({
  children,
  testID,
  onPress,
  pressable,
  ...props
}: CardProps) {
  const isPressable = pressable || Boolean(onPress);

  return (
    <StyledCard
      {...props}
      pressable={isPressable}
      onPress={onPress}
      testID={testID}
      animation="quick"
    >
      {children}
    </StyledCard>
  );
}

// Card sub-components for composition
export const CardHeader = styled(YStack, {
  name: 'CardHeader',
  marginBottom: '$3',
});

export const CardContent = styled(YStack, {
  name: 'CardContent',
  gap: '$2',
});

export const CardFooter = styled(YStack, {
  name: 'CardFooter',
  marginTop: '$3',
  paddingTop: '$3',
  borderTopWidth: 1,
  borderTopColor: '$borderColor',
});

export default Card;
