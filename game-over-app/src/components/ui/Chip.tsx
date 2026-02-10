/**
 * Chip Component
 * Selectable chips for multi-select functionality
 */

import React from 'react';
import { styled, XStack, Text, GetProps } from 'tamagui';
import { Ionicons } from '@expo/vector-icons';

const StyledChip = styled(XStack, {
  name: 'Chip',
  alignItems: 'center',
  justifyContent: 'center',
  paddingHorizontal: '$3',
  paddingVertical: '$2',
  borderRadius: '$full',
  borderWidth: 1,
  borderColor: '$borderColor',
  backgroundColor: '$surface',
  cursor: 'pointer',
  animation: 'quick',

  pressStyle: {
    opacity: 0.9,
    scale: 0.98,
  },

  hoverStyle: {
    borderColor: '$primary',
  },

  variants: {
    selected: {
      true: {
        backgroundColor: '$primary',
        borderColor: '$primary',
      },
    },
    disabled: {
      true: {
        opacity: 0.5,
        pointerEvents: 'none',
      },
    },
    size: {
      sm: {
        paddingHorizontal: '$2',
        paddingVertical: '$1',
      },
      md: {
        paddingHorizontal: '$3',
        paddingVertical: '$2',
      },
      lg: {
        paddingHorizontal: '$4',
        paddingVertical: '$2.5',
      },
    },
  } as const,

  defaultVariants: {
    size: 'md',
  },
});

const StyledChipText = styled(Text, {
  name: 'ChipText',
  fontWeight: '500',
  color: '$textPrimary',

  variants: {
    selected: {
      true: {
        color: 'white',
      },
    },
    size: {
      sm: {
        fontSize: 12,
      },
      md: {
        fontSize: 14,
      },
      lg: {
        fontSize: 16,
      },
    },
  } as const,

  defaultVariants: {
    size: 'md',
  },
});

type StyledChipProps = GetProps<typeof StyledChip>;

export interface ChipProps extends Omit<StyledChipProps, 'children'> {
  label: string;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  showCheckmark?: boolean; // Show checkmark icon when selected
  onPress?: () => void;
  testID?: string;
}

export function Chip({
  label,
  icon,
  iconPosition = 'left',
  showCheckmark = true,
  selected = false,
  disabled = false,
  size = 'md',
  onPress,
  testID,
  ...props
}: ChipProps) {
  // Icon size based on chip size
  const iconSize = size === 'sm' ? 14 : size === 'lg' ? 18 : 16;

  return (
    <StyledChip
      {...props}
      selected={selected}
      disabled={disabled}
      size={size}
      onPress={onPress}
      testID={testID}
      aria-selected={selected}
      aria-disabled={disabled}
      gap="$1.5"
    >
      {icon && iconPosition === 'left' && icon}
      <StyledChipText selected={selected} size={size}>
        {label}
      </StyledChipText>
      {icon && iconPosition === 'right' && icon}
      {showCheckmark && (
        <Ionicons
          name="checkmark-circle"
          size={iconSize}
          color={selected ? 'white' : 'transparent'}
          style={{ marginLeft: 2 }}
        />
      )}
    </StyledChip>
  );
}

// ChipGroup for managing multiple chips
export interface ChipGroupProps {
  children: React.ReactNode;
  testID?: string;
}

export function ChipGroup({ children, testID }: ChipGroupProps) {
  return (
    <XStack flexWrap="wrap" gap="$2" testID={testID}>
      {children}
    </XStack>
  );
}

export default Chip;
