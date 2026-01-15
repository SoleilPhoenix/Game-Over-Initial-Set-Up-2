/**
 * Input Component
 * Tamagui-based text input with label, error state, and icon support
 */

import React, { useState, forwardRef } from 'react';
import { TextInput } from 'react-native';
import { styled, Input as TamaguiInput, YStack, XStack, Text, GetProps } from 'tamagui';

const StyledInputContainer = styled(XStack, {
  name: 'InputContainer',
  backgroundColor: '$surface',
  borderWidth: 1,
  borderColor: '$borderColor',
  borderRadius: '$lg',
  height: '$inputHeight',
  paddingHorizontal: '$4',
  alignItems: 'center',

  variants: {
    focused: {
      true: {
        borderWidth: 2,
        borderColor: '$primary',
      },
    },
    error: {
      true: {
        borderColor: '$error',
      },
    },
    disabled: {
      true: {
        opacity: 0.5,
        backgroundColor: '$backgroundHover',
      },
    },
  } as const,
});

const StyledInput = styled(TamaguiInput, {
  name: 'Input',
  flex: 1,
  backgroundColor: 'transparent',
  borderWidth: 0,
  fontSize: '$3',
  color: '$textPrimary',
  paddingVertical: 0,
  height: '100%',

  focusStyle: {
    borderWidth: 0,
    outlineWidth: 0,
  },
});

const StyledLabel = styled(Text, {
  name: 'InputLabel',
  fontSize: '$2',
  color: '$textSecondary',
  marginBottom: '$1',

  variants: {
    focused: {
      true: {
        color: '$primary',
      },
    },
    error: {
      true: {
        color: '$error',
      },
    },
  } as const,
});

const StyledHelperText = styled(Text, {
  name: 'InputHelperText',
  fontSize: '$1',
  marginTop: '$1',
  marginLeft: '$1',
  color: '$textSecondary',

  variants: {
    error: {
      true: {
        color: '$error',
      },
    },
  } as const,
});

export interface InputProps extends Omit<GetProps<typeof StyledInput>, 'ref'> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onRightIconPress?: () => void;
  testID?: string;
  containerTestID?: string;
  disabled?: boolean;
}

export const Input = forwardRef<TextInput, InputProps>(
  (
    {
      label,
      error,
      hint,
      leftIcon,
      rightIcon,
      onRightIconPress,
      testID,
      containerTestID,
      disabled = false,
      value,
      onFocus,
      onBlur,
      secureTextEntry,
      ...props
    },
    ref
  ) => {
    const [isFocused, setIsFocused] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const hasError = Boolean(error);

    const handleFocus = (e: any) => {
      setIsFocused(true);
      onFocus?.(e);
    };

    const handleBlur = (e: any) => {
      setIsFocused(false);
      onBlur?.(e);
    };

    const togglePasswordVisibility = () => {
      setShowPassword(!showPassword);
    };

    return (
      <YStack width="100%" testID={containerTestID}>
        {label && (
          <StyledLabel focused={isFocused} error={hasError}>
            {label}
          </StyledLabel>
        )}
        <StyledInputContainer
          focused={isFocused && !hasError}
          error={hasError}
          disabled={disabled}
        >
          {leftIcon && <XStack marginRight="$2">{leftIcon}</XStack>}
          <StyledInput
            ref={ref as any}
            {...props}
            value={value}
            onFocus={handleFocus}
            onBlur={handleBlur}
            secureTextEntry={secureTextEntry && !showPassword}
            editable={!disabled}
            placeholderTextColor="$textMuted"
            testID={testID}
          />
          {secureTextEntry && (
            <XStack
              onPress={togglePasswordVisibility}
              paddingLeft="$2"
              pressStyle={{ opacity: 0.7 }}
              testID={`${testID}-toggle-password`}
            >
              <Text color="$primary" fontWeight="600" fontSize="$2">
                {showPassword ? 'Hide' : 'Show'}
              </Text>
            </XStack>
          )}
          {rightIcon && !secureTextEntry && (
            <XStack
              onPress={onRightIconPress}
              paddingLeft="$2"
              pressStyle={{ opacity: 0.7 }}
            >
              {rightIcon}
            </XStack>
          )}
        </StyledInputContainer>
        {(error || hint) && (
          <StyledHelperText error={hasError}>{error || hint}</StyledHelperText>
        )}
      </YStack>
    );
  }
);

Input.displayName = 'Input';

export default Input;
