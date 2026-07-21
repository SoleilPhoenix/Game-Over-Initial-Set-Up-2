/**
 * Launch Intro
 *
 * The first thing the app shows on a cold start, in two phases:
 *
 *   1. the logo draws itself (~4 s, `AnimatedLogo`)
 *   2. the brand video plays (~11 s)
 *
 * then it hands over to the welcome screen. The video file is optional - see
 * `src/components/brand/introVideo.ts`. Until it exists, phase 2 is skipped and
 * the intro is just the logo reveal.
 *
 * Why the reveal lives here and not on the welcome screen: it can only play once
 * per session, and if both screens asked for it the user would either see it
 * twice or see it in the wrong place. Owning it here means the welcome screen
 * always renders fully formed - `AnimatedLogo` falls back to the static logo
 * once the reveal has run.
 */

import React from 'react';
import { View, Text, StyleSheet, StatusBar, Pressable } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useVideoPlayer, VideoView } from 'expo-video';
import { AnimatedLogo } from '@/components/brand/AnimatedLogo';
import { INTRO_VIDEO_SOURCE, INTRO_VIDEO_MAX_DURATION } from '@/components/brand/introVideo';
import { markIntroPlayed } from '@/lib/introSession';
import { useTranslation } from '@/i18n';

/** How long before the skip control fades in. Long enough not to invite a reflex tap. */
const SKIP_APPEARS_AFTER = 1800;

type Phase = 'logo' | 'video';

export default function IntroScreen() {
  const [phase, setPhase] = React.useState<Phase>('logo');
  const [showSkip, setShowSkip] = React.useState(false);
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  // Guards against the two paths into the welcome screen racing: the video can
  // report completion at almost the same moment the backstop timer fires.
  const finished = React.useRef(false);

  const finish = React.useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    markIntroPlayed();
    router.replace('/(auth)/welcome');
  }, []);

  React.useEffect(() => {
    const timer = setTimeout(() => setShowSkip(true), SKIP_APPEARS_AFTER);
    return () => clearTimeout(timer);
  }, []);

  const handleLogoComplete = React.useCallback(() => {
    if (INTRO_VIDEO_SOURCE === null) {
      finish();
      return;
    }
    setPhase('video');
  }, [finish]);

  return (
    <View style={styles.container} testID="intro-screen">
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {phase === 'logo' ? (
        <Animated.View exiting={FadeOut.duration(400)} style={styles.center}>
          {/* `force` because the reveal must play here even if something else
              mounted a logo first during startup. */}
          <AnimatedLogo size={220} force onComplete={handleLogoComplete} testID="intro-logo" />
        </Animated.View>
      ) : (
        <Animated.View entering={FadeIn.duration(400)} style={StyleSheet.absoluteFill}>
          <IntroVideo onDone={finish} />
        </Animated.View>
      )}

      {showSkip && (
        <Animated.View
          entering={FadeIn.duration(500)}
          style={[styles.skipWrap, { bottom: insets.bottom + 28 }]}
        >
          <Pressable onPress={finish} hitSlop={16} testID="intro-skip">
            <Text style={styles.skipText}>{t.auth.skipIntro}</Text>
          </Pressable>
        </Animated.View>
      )}
    </View>
  );
}

/**
 * Only mounted once there is a source to play, so the player hooks never have to
 * cope with a null source.
 */
function IntroVideo({ onDone }: { onDone: () => void }) {
  const player = useVideoPlayer(INTRO_VIDEO_SOURCE, (p) => {
    p.loop = false;
    p.muted = true;
    p.play();
  });

  React.useEffect(() => {
    const subscription = player.addListener('playToEnd', onDone);
    // Backstop: a codec the device refuses never fires 'playToEnd', and the user
    // would sit on a black screen with only the skip control to save them.
    const timer = setTimeout(onDone, INTRO_VIDEO_MAX_DURATION);
    return () => {
      subscription.remove();
      clearTimeout(timer);
    };
  }, [player, onDone]);

  return (
    <VideoView
      style={StyleSheet.absoluteFill}
      player={player}
      contentFit="cover"
      nativeControls={false}
      testID="intro-video"
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // Flat navy, no gradient: the logo asset carries its own #0D1B2A tile, and
    // any other shade behind it makes the logo read as a dark rectangle.
    backgroundColor: '#0D1B2A',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipWrap: {
    position: 'absolute',
    right: 24,
  },
  skipText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    fontWeight: '600',
  },
});
