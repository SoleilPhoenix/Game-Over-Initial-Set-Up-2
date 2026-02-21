/**
 * KenBurnsImage
 * Wraps a static image with a looping Ken Burns animation.
 * Scale continuously alternates between 1.0 and 1.08 every 2500ms, using the native driver.
 */
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View, ViewStyle } from 'react-native';
import type { ImageSourcePropType } from 'react-native';

interface KenBurnsImageProps {
  source: ImageSourcePropType;
  style?: ViewStyle;
  /** Default: 'cover' */
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'center';
  children?: React.ReactNode;
}

export function KenBurnsImage({ source, style, resizeMode = 'cover', children }: KenBurnsImageProps) {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.08,
          duration: 2500,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1.0,
          duration: 2500,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  return (
    <View style={[styles.container, style, { overflow: 'hidden' }]}>
      <Animated.Image
        source={source}
        style={[styles.image, { transform: [{ scale }] }]}
        resizeMode={resizeMode}
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  image: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
});
