/**
 * OptimizedImage Component
 * Performance-optimized image with blurhash placeholder and transitions
 * Uses expo-image for better caching and memory management
 */

import React, { memo } from 'react';
import { Image, ImageContentFit, ImageSource } from 'expo-image';
import { StyleSheet, ImageStyle } from 'react-native';

// Default blurhash for loading placeholder (neutral gray gradient)
const DEFAULT_BLURHASH = 'L6PZfSi_.AyE_3t7t7R**0o#DgR4';

interface OptimizedImageProps {
  source: ImageSource;
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
  contentFit?: ImageContentFit;
  blurhash?: string;
  style?: ImageStyle;
  testID?: string;
}

export const OptimizedImage = memo(function OptimizedImage({
  source,
  width = '100%',
  height = 160,
  borderRadius = 8,
  contentFit = 'cover',
  blurhash = DEFAULT_BLURHASH,
  style,
  testID,
}: OptimizedImageProps) {
  return (
    <Image
      source={source}
      style={[
        styles.image,
        {
          width: width as ImageStyle['width'],
          height: height as ImageStyle['height'],
          borderRadius,
        },
        style,
      ]}
      contentFit={contentFit}
      placeholder={{ blurhash }}
      transition={200}
      cachePolicy="memory-disk"
      testID={testID}
    />
  );
});

const styles = StyleSheet.create({
  image: {
    backgroundColor: '#1E2329',
  },
});

export default OptimizedImage;
