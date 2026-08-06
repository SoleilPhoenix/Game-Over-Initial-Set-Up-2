import React, { memo, useState } from 'react';
import { Image as ExpoImage } from 'expo-image';
import { StyleSheet, View, type ImageStyle, type StyleProp } from 'react-native';

interface CachedAvatarImageProps {
  uri: string;
  style: StyleProp<ImageStyle>;
  fallback: React.ReactNode;
  testID?: string;
}

/**
 * A disk-cached avatar that keeps its initials visible until the remote image
 * has actually loaded. The fallback occupies the exact same box, so mounting
 * or fetching an avatar never changes the surrounding layout.
 */
export const CachedAvatarImage = memo(function CachedAvatarImage({
  uri,
  style,
  fallback,
  testID,
}: CachedAvatarImageProps) {
  const [loadedUri, setLoadedUri] = useState<string | null>(null);
  const [failedUri, setFailedUri] = useState<string | null>(null);
  const isLoaded = loadedUri === uri;
  const hasFailed = failedUri === uri;

  return (
    <View style={[style, styles.container]} testID={testID}>
      <View style={styles.fallback}>{fallback}</View>
      {!hasFailed && (
        <ExpoImage
          source={{ uri }}
          style={[styles.image, { opacity: isLoaded ? 1 : 0 }]}
          contentFit="cover"
          cachePolicy="memory-disk"
          transition={0}
          onLoad={() => setLoadedUri(uri)}
          onError={() => setFailedUri(uri)}
        />
      )}
    </View>
  );
});

/** Warm the same memory+disk cache used by CachedAvatarImage. */
export async function prefetchAvatarUris(uris: (string | null | undefined)[]): Promise<boolean> {
  const uniqueUris = [...new Set(uris.filter((uri): uri is string => Boolean(uri)))];
  if (uniqueUris.length === 0) return true;
  return ExpoImage.prefetch(uniqueUris, { cachePolicy: 'memory-disk' });
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  fallback: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    ...StyleSheet.absoluteFillObject,
  },
});
