/**
 * Game Over logo reveal.
 *
 * Choreography, in order:
 *   1. one unbroken line traces all three rings - innermost clockwise, middle
 *      counter-clockwise, outer clockwise - hopping outward at the top gap so the
 *      ring ends run into each other and close a single circuit,
 *   2. the drawn line hands over to the real vector asset,
 *   3. the stem drops from the gem down to the centre,
 *   4. the wordmark rises in and a light sweeps across it,
 *   5. the gem comes down from above and seats flush on the stem,
 *   with a gold bloom that fades out over the finale.
 *
 * Only the rings are rebuilt as strokes, and only while they are being drawn
 * (see `logoGeometry.ts` for why they cannot be drawn from the asset directly).
 * Everything else is the real `assets/brand/logo.svg`, uncovered piece by piece:
 * the gem and the wordmark are rectangular cuts of it, and the stem is revealed
 * by a navy shade retreating downwards. So each element is brand-exact the
 * moment it appears - the cuts tile the artwork, so the resting frame is the
 * asset itself.
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
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle, Defs, Path, RadialGradient, Stop } from 'react-native-svg';
import { Logo } from './Logo';
import {
  GEM_BAND,
  GOLD,
  NAVY,
  RINGS_BAND,
  STEM_STRIP,
  STROKE_W,
  VIEWBOX,
  WORD_BAND,
  buildRingCircuit,
} from './logoGeometry';

const AnimatedPath = Animated.createAnimatedComponent(Path);

/** Fixed for the lifetime of the module - the geometry never changes. */
const CIRCUIT = buildRingCircuit();

/**
 * Phase choreography, in milliseconds from the start of the reveal.
 *
 * Budget: 2s for the rings, 0.5s for the stem, 1s for the wordmark, 0.5s for the
 * gem. Each phase starts as its predecessor eases out, so the reveal reads as one
 * continuous gesture rather than a checklist. Total runtime 4.0s.
 */
const T = {
  /** One pass over all three rings and both hops between them. */
  circuitDuration: 2000,
  /** The drawn line hands over to the real asset. */
  settleStart: 1950,
  settleDuration: 200,
  stemStart: 2150,
  stemDuration: 500,
  wordStart: 2650,
  wordDuration: 1000,
  /** Light sweeping across the wordmark, once it is mostly in. */
  shineStart: 2950,
  shineDuration: 700,
  gemStart: 3500,
  gemDuration: 500,
  /** Peaks as the gem seats, and is fully gone by the end. */
  glowStart: 3600,
  glowDuration: 400,
} as const;

/** How far above its resting place the gem starts, as a fraction of the logo size. */
const GEM_RISE = 0.09;
/** How far below its resting place the wordmark starts, same units. */
const WORD_RISE = 0.055;

/** Reveal runs once per app session; later mounts show the static logo instantly. */
let hasPlayedThisSession = false;

/** Test seam - lets a test (or a debug menu) replay the reveal. */
export function resetLogoRevealSession() {
  hasPlayedThisSession = false;
}

function DrawnCircuit({ progress }: { progress: SharedValue<number> }) {
  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: CIRCUIT.length * (1 - progress.value),
  }));

  return (
    <AnimatedPath
      d={CIRCUIT.d}
      fill="none"
      stroke={GOLD}
      strokeWidth={STROKE_W}
      // Butt caps and mitre joins keep the radial hops flush against the arcs;
      // it also matches the real asset, whose line ends are square, and keeps the
      // top gap exactly as wide as measured.
      strokeLinecap="butt"
      strokeLinejoin="miter"
      strokeDasharray={CIRCUIT.length}
      animatedProps={animatedProps}
    />
  );
}

interface CutoutProps {
  size: number;
  region: { top: number; bottom: number };
  style?: ViewStyle;
  children?: React.ReactNode;
}

/**
 * Shows one horizontal slice of the real logo by rendering it full size inside a
 * clipped window and offsetting it back up by the same amount.
 */
function Cutout({ size, region, style, children }: CutoutProps) {
  const scale = size / VIEWBOX;
  const top = region.top * scale;
  const height = (region.bottom - region.top) * scale;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        { position: 'absolute', left: 0, top, width: size, height, overflow: 'hidden' },
        style,
      ]}
    >
      <View style={{ position: 'absolute', left: 0, top: -top }}>
        <Logo size={size} />
      </View>
      {children}
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

  const circuit = useSharedValue(0);
  const settled = useSharedValue(0);
  /** 1 = stem fully covered, 0 = fully uncovered. */
  const stemCover = useSharedValue(1);
  const wordOpacity = useSharedValue(0);
  const wordShift = useSharedValue(1);
  const shine = useSharedValue(0);
  const gemOpacity = useSharedValue(0);
  /** 1 = gem held above the stem, 0 = seated on it. */
  const gemDrop = useSharedValue(1);
  const glow = useSharedValue(0);

  const scale = size / VIEWBOX;
  const stripHeight = (STEM_STRIP.bottom - STEM_STRIP.top) * scale;
  const shineWidth = size * 0.42;

  // All hooks run unconditionally - the `skip` branch returns further down.
  const strokeLayerStyle = useAnimatedStyle(() => ({ opacity: 1 - settled.value }));
  const ringsStyle = useAnimatedStyle(() => ({ opacity: settled.value }));
  const stemCoverStyle = useAnimatedStyle(() => ({ height: stripHeight * stemCover.value }));
  const wordStyle = useAnimatedStyle(() => ({
    opacity: wordOpacity.value,
    transform: [{ translateY: size * WORD_RISE * wordShift.value }],
  }));
  // Travels from just off the left edge to just off the right; the band's own
  // clipping hides it at both ends, so it needs no opacity ramp.
  const shineStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -shineWidth + shine.value * (size + shineWidth) }],
  }));
  const gemStyle = useAnimatedStyle(() => ({
    opacity: gemOpacity.value,
    transform: [{ translateY: -size * GEM_RISE * gemDrop.value }],
  }));
  // Blooms to a peak, then fades out completely - the resting frame has to be the
  // untinted brand asset, so the glow must not leave a permanent haze over it.
  const glowStyle = useAnimatedStyle(() => ({
    opacity:
      glow.value <= 0.45 ? glow.value * 1.15 : 0.5175 * (1 - (glow.value - 0.45) / 0.55),
  }));

  useEffect(() => {
    if (skip) {
      onComplete?.();
      return;
    }

    // Gentle S-curve: eases in and out but stays close to constant speed in
    // between, so the line does not race through the middle ring.
    circuit.value = withTiming(1, {
      duration: T.circuitDuration,
      easing: Easing.inOut(Easing.sin),
    });

    settled.value = withDelay(
      T.settleStart,
      withTiming(1, { duration: T.settleDuration, easing: Easing.inOut(Easing.quad) })
    );

    // Accelerating, like something falling: the stem drops rather than glides.
    stemCover.value = withDelay(
      T.stemStart,
      withTiming(0, { duration: T.stemDuration, easing: Easing.in(Easing.quad) })
    );

    wordOpacity.value = withDelay(
      T.wordStart,
      withTiming(1, { duration: T.wordDuration * 0.55, easing: Easing.out(Easing.quad) })
    );
    wordShift.value = withDelay(
      T.wordStart,
      withTiming(0, { duration: T.wordDuration, easing: Easing.out(Easing.cubic) })
    );
    shine.value = withDelay(
      T.shineStart,
      withTiming(1, { duration: T.shineDuration, easing: Easing.inOut(Easing.quad) })
    );

    gemOpacity.value = withDelay(
      T.gemStart,
      withTiming(1, { duration: T.gemDuration * 0.55, easing: Easing.out(Easing.quad) })
    );
    // Decelerating, with no overshoot: the gem comes down and seats flush on the
    // stem rather than bouncing onto it.
    gemDrop.value = withDelay(
      T.gemStart,
      withTiming(0, { duration: T.gemDuration, easing: Easing.out(Easing.cubic) })
    );

    // Last phase to finish, so it owns the completion callback.
    glow.value = withDelay(
      T.glowStart,
      withTiming(1, { duration: T.glowDuration, easing: Easing.out(Easing.quad) }, (done) => {
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
    <View style={{ width: size, height: size, backgroundColor: NAVY }} testID={testID}>
      {/* The circuit while it draws itself. */}
      <Animated.View style={[StyleSheet.absoluteFill, strokeLayerStyle]} pointerEvents="none">
        <Svg width={size} height={size} viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}>
          <DrawnCircuit progress={circuit} />
        </Svg>
      </Animated.View>

      {/* Handover: the same rings, now from the real asset. Carries the stem too,
          which the shade below keeps hidden until its turn. */}
      <Cutout size={size} region={RINGS_BAND} style={ringsStyle} />

      {/* Navy shade over the stem, retreating downwards to uncover it. */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          left: STEM_STRIP.left * scale,
          top: STEM_STRIP.top * scale,
          width: (STEM_STRIP.right - STEM_STRIP.left) * scale,
          height: stripHeight,
          overflow: 'hidden',
          justifyContent: 'flex-end',
        }}
      >
        <Animated.View style={[{ backgroundColor: NAVY }, stemCoverStyle]} />
      </View>

      <Cutout size={size} region={WORD_BAND} style={wordStyle}>
        {/* Light sweeping across the wordmark, clipped to its band. */}
        <Animated.View
          style={[
            { position: 'absolute', top: 0, bottom: 0, left: 0, width: shineWidth },
            shineStyle,
          ]}
          pointerEvents="none"
        >
          <LinearGradient
            colors={['rgba(255,255,255,0)', 'rgba(255,245,220,0.22)', 'rgba(255,255,255,0)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      </Cutout>

      <Cutout size={size} region={GEM_BAND} style={gemStyle} />

      {/* Gold bloom, above everything so the asset's navy tile cannot mask it. */}
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
