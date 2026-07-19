/**
 * Game Over logo reveal.
 *
 * Choreography: the three rings draw themselves out of the top gap and close at
 * the bottom, the stem grows down to the centre, the gem is "set" on top with a
 * short pop, the wordmark rises in, a gold glow blooms, and finally the whole
 * thing cross-fades into the real vector asset so the resting frame is exactly
 * `assets/brand/logo.svg`.
 *
 * Only the rings and the stem are redrawn as strokes (see `logoGeometry.ts` for
 * why). The gem and the wordmark are the real asset, cropped to a horizontal
 * band, so they carry the brand's exact facet and letter shapes.
 */
import React, { useEffect, useState } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import { Logo } from './Logo';
import {
  GEM_BAND,
  GOLD,
  NAVY,
  RING_RADII,
  STEM_LENGTH,
  STEM_PATH,
  STROKE_W,
  VIEWBOX,
  WORD_BAND,
  ringHalfLength,
  ringHalfPath,
} from './logoGeometry';

const AnimatedPath = Animated.createAnimatedComponent(Path);

/**
 * Phase choreography, in milliseconds from the start of the reveal.
 *
 * The phases deliberately overlap: the stem starts while the rings are still
 * closing, and the gem lands just as they meet, so the reveal reads as one
 * continuous gesture rather than a checklist of steps. Total runtime ~1.9s.
 */
const T = {
  ringDuration: 900,
  /** Outer ring leads, inner rings follow - gives the draw a sense of depth. */
  ringStagger: 90,
  stemStart: 620,
  stemDuration: 420,
  gemStart: 1000,
  gemDuration: 300,
  wordStart: 1280,
  wordDuration: 420,
  /** Peaks as the wordmark arrives and is fully gone when the cross-fade lands. */
  glowStart: 1200,
  glowDuration: 700,
  settleStart: 1560,
  settleDuration: 340,
} as const;

/** Reveal runs once per app session; later mounts show the static logo instantly. */
let hasPlayedThisSession = false;

/** Test seam - lets a test (or a debug menu) replay the reveal. */
export function resetLogoRevealSession() {
  hasPlayedThisSession = false;
}

interface DrawnPathProps {
  d: string;
  length: number;
  progress: SharedValue<number>;
}

function DrawnPath({ d, length, progress }: DrawnPathProps) {
  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: length * (1 - progress.value),
  }));

  return (
    <AnimatedPath
      d={d}
      fill="none"
      stroke={GOLD}
      strokeWidth={STROKE_W}
      strokeLinecap="round"
      strokeDasharray={length}
      animatedProps={animatedProps}
    />
  );
}

interface RingProps {
  radius: number;
  progress: SharedValue<number>;
}

/** Both halves of one ring, drawn simultaneously from the top gap. */
function Ring({ radius, progress }: RingProps) {
  const length = ringHalfLength(radius);
  return (
    <>
      <DrawnPath d={ringHalfPath(radius, 'right')} length={length} progress={progress} />
      <DrawnPath d={ringHalfPath(radius, 'left')} length={length} progress={progress} />
    </>
  );
}

interface CropBandProps {
  size: number;
  band: { top: number; bottom: number };
  style: ViewStyle;
}

/**
 * Shows one horizontal slice of the real logo by rendering it full size inside a
 * clipped window and offsetting it upwards.
 */
function CropBand({ size, band, style }: CropBandProps) {
  const scale = size / VIEWBOX;
  const top = band.top * scale;
  const height = (band.bottom - band.top) * scale;

  return (
    <Animated.View
      pointerEvents="none"
      style={[{ position: 'absolute', left: 0, top, width: size, height, overflow: 'hidden' }, style]}
    >
      <View style={{ position: 'absolute', left: 0, top: -top }}>
        <Logo size={size} />
      </View>
    </Animated.View>
  );
}

export interface AnimatedLogoProps {
  size?: number;
  /** Fires once the reveal has settled (immediately when it is skipped). */
  onComplete?: () => void;
  /** Replay even if the reveal already ran in this session. */
  force?: boolean;
  testID?: string;
}

export function AnimatedLogo({ size = 150, onComplete, force = false, testID }: AnimatedLogoProps) {
  // Decided once on mount so a re-render mid-reveal cannot swap us to the static logo.
  const [skip] = useState(() => hasPlayedThisSession && !force);

  const rings = [useSharedValue(0), useSharedValue(0), useSharedValue(0)];
  const stem = useSharedValue(0);
  const gemOpacity = useSharedValue(0);
  const gemScale = useSharedValue(0.72);
  const wordOpacity = useSharedValue(0);
  const wordShift = useSharedValue(14);
  const glow = useSharedValue(0);
  const strokes = useSharedValue(1);
  const settled = useSharedValue(0);

  // All hooks run unconditionally - the `skip` branch returns further down.
  const strokeLayerStyle = useAnimatedStyle(() => ({ opacity: strokes.value }));
  const gemStyle = useAnimatedStyle(() => ({
    opacity: gemOpacity.value,
    transform: [{ scale: gemScale.value }],
  }));
  const wordStyle = useAnimatedStyle(() => ({
    opacity: wordOpacity.value,
    transform: [{ translateY: wordShift.value }],
  }));
  const settledStyle = useAnimatedStyle(() => ({ opacity: settled.value }));
  // Blooms to a peak, then fades out completely - the resting frame has to be the
  // untinted brand asset, so the glow must not leave a permanent haze over it.
  const glowStyle = useAnimatedStyle(() => ({
    opacity:
      glow.value <= 0.45
        ? glow.value * 1.15
        : 0.5175 * (1 - (glow.value - 0.45) / 0.55),
  }));

  useEffect(() => {
    if (skip) {
      onComplete?.();
      return;
    }

    const ease = Easing.inOut(Easing.cubic);

    rings.forEach((ring, i) => {
      ring.value = withDelay(
        i * T.ringStagger,
        withTiming(1, { duration: T.ringDuration, easing: ease })
      );
    });

    stem.value = withDelay(
      T.stemStart,
      withTiming(1, { duration: T.stemDuration, easing: Easing.out(Easing.cubic) })
    );

    gemOpacity.value = withDelay(
      T.gemStart,
      withTiming(1, { duration: T.gemDuration * 0.6, easing: Easing.out(Easing.quad) })
    );
    // Back easing overshoots slightly past 1 - the gem settles onto the stem.
    gemScale.value = withDelay(
      T.gemStart,
      withTiming(1, { duration: T.gemDuration, easing: Easing.out(Easing.back(2.2)) })
    );

    wordOpacity.value = withDelay(
      T.wordStart,
      withTiming(1, { duration: T.wordDuration, easing: Easing.out(Easing.quad) })
    );
    wordShift.value = withDelay(
      T.wordStart,
      withTiming(0, { duration: T.wordDuration, easing: Easing.out(Easing.cubic) })
    );

    glow.value = withDelay(
      T.glowStart,
      withTiming(1, { duration: T.glowDuration, easing: Easing.out(Easing.quad) })
    );

    strokes.value = withDelay(
      T.settleStart,
      withTiming(0, { duration: T.settleDuration, easing: Easing.inOut(Easing.quad) })
    );
    settled.value = withDelay(
      T.settleStart,
      withTiming(1, { duration: T.settleDuration, easing: Easing.inOut(Easing.quad) }, (done) => {
        if (done && onComplete) {
          runOnJS(onComplete)();
        }
      })
    );

    hasPlayedThisSession = true;
    // Shared values and callbacks are stable for the lifetime of the reveal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skip]);

  if (skip) {
    return <Logo size={size} testID={testID} />;
  }

  return (
    <View style={{ width: size, height: size }} testID={testID}>
      {/* Stroke layer: the parts that draw themselves. */}
      <Animated.View style={[StyleSheet.absoluteFill, strokeLayerStyle]}>
        <Svg width={size} height={size} viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}>
          <Rect x={0} y={0} width={VIEWBOX} height={VIEWBOX} fill={NAVY} />
          {RING_RADII.map((radius, i) => (
            <Ring key={radius} radius={radius} progress={rings[i]} />
          ))}
          <DrawnPath d={STEM_PATH} length={STEM_LENGTH} progress={stem} />
        </Svg>
      </Animated.View>

      {/* Gem is set on top of the stem. */}
      <CropBand size={size} band={GEM_BAND} style={gemStyle} />

      {/* Wordmark rises in. */}
      <CropBand size={size} band={WORD_BAND} style={wordStyle} />

      {/* Cross-fade to the real asset - the resting frame is the brand file itself. */}
      <Animated.View style={[StyleSheet.absoluteFill, settledStyle]} pointerEvents="none">
        <Logo size={size} />
      </Animated.View>

      {/* Gold bloom, above everything so the logo's navy tile cannot mask it. */}
      <Animated.View style={[StyleSheet.absoluteFill, glowStyle]} pointerEvents="none">
        <Svg width={size} height={size} viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}>
          <Defs>
            <RadialGradient id="logoGlow" cx="50%" cy="48%" r="52%">
              <Stop offset="0" stopColor={GOLD} stopOpacity="0.42" />
              <Stop offset="0.55" stopColor={GOLD} stopOpacity="0.13" />
              <Stop offset="1" stopColor={GOLD} stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Circle cx={VIEWBOX / 2} cy={VIEWBOX * 0.48} r={VIEWBOX / 2} fill="url(#logoGlow)" />
        </Svg>
      </Animated.View>
    </View>
  );
}

export default AnimatedLogo;
