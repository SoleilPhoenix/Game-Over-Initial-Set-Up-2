/**
 * IconCircle — shared 32px icon-in-circle component.
 * Used in Profile, Event Detail, Budget, Notifications, GlassPanel, etc.
 */
import React from 'react';
import { View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface IconCircleProps {
  /** Ionicons icon name */
  name: string;
  /** Icon size — defaults to 18 */
  iconSize?: number;
  /** Icon color */
  color: string;
  /** Circle background color (e.g. 'rgba(90,126,176,0.2)') */
  backgroundColor: string;
  /** Circle diameter — defaults to 32 */
  size?: number;
  style?: ViewStyle;
}

export function IconCircle({
  name,
  iconSize = 18,
  color,
  backgroundColor,
  size = 32,
  style,
}: IconCircleProps) {
  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor,
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
    >
      <Ionicons name={name as any} size={iconSize} color={color} />
    </View>
  );
}

export default IconCircle;
