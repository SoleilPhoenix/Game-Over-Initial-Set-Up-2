/**
 * Button Component
 * Tamagui-based button with primary, secondary, outline, and ghost variants
 * Includes loading state and icon support
 */

import React from 'react';
import { styled, Button as TamaguiButton, Spinner, XStack, Text, GetProps } from 'tamagui';

const StyledButton = styled(TamaguiButton, {
  name: 'Button',
  borderRadius: '$lg',
  fontWeight: '600',
  pressStyle: {
    opacity: 0.9,
    scale: 0.98,
  },
  animation: 'quick',

  variants: {
    variant: {
      primary: {
        backgroundColor: '$primary',
        color: 'white',
        hoverStyle: {
          backgroundColor: '$primaryHover',
        },
        pressStyle: {
          backgroundColor: '$primaryPress',
        },
      },
      secondary: {
        backgroundColor: 'transparent',
        borderWidth: 2,
        borderColor: '$primary',
        color: '$primary',
        hoverStyle: {
          backgroundColor: '$primary',
          color: 'white',
        },
      },
      outline: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: '$borderColor',
        color: '$textPrimary',
        hoverStyle: {
          borderColor: '$primary',
          backgroundColor: '$backgroundHover',
        },
      },
      ghost: {
        backgroundColor: 'transparent',
        color: '$primary',
        hoverStyle: {
          backgroundColor: '$backgroundHover',
        },
      },
    },
    size: {
      sm: {
        height: 40,
        paddingHorizontal: '$4',
        fontSize: '$2',
      },
      md: {
        height: '$buttonHeight',
        paddingHorizontal: '$5',
        fontSize: '$3',
      },
      lg: {
        height: 56,
        paddingHorizontal: '$6',
        fontSize: '$4',
      },
    },
    fullWidth: {
      true: {
        width: '100%',
      },
    },
    disabled: {
      true: {
        opacity: 0.5,
        pointerEvents: 'none',
      },
    },
  } as const,

  defaultVariants: {
    variant: 'primary',
    size: 'md',
  },
});

type StyledButtonProps = GetProps<typeof StyledButton>;

export interface ButtonProps extends Omit<StyledButtonProps, 'disabled' | 'icon'> {
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  testID?: string;
  children?: React.ReactNode;
}

export function Button({
  children,
  loading = false,
  disabled = false,
  icon,
  iconPosition = 'left',
  variant = 'primary',
  testID,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const spinnerColor = variant === 'primary' ? 'white' : '$primary';

  return (
    <StyledButton
      {...props}
      variant={variant}
      disabled={isDisabled}
      testID={testID}
      aria-busy={loading}
      aria-disabled={isDisabled}
    >
      {loading ? (
        <Spinner size="small" color={spinnerColor} />
      ) : (
        <XStack alignItems="center" justifyContent="center" gap="$2">
          {icon && iconPosition === 'left' && icon}
          {typeof children === 'string' ? (
            <Text
              color={variant === 'primary' ? 'white' : variant === 'ghost' || variant === 'secondary' ? '$primary' : '$textPrimary'}
              fontWeight="600"
              fontSize={props.size === 'sm' ? '$2' : props.size === 'lg' ? '$4' : '$3'}
            >
              {children}
            </Text>
          ) : (
            children
          )}
          {icon && iconPosition === 'right' && icon}
        </XStack>
      )}
    </StyledButton>
  );
}

export default Button;
