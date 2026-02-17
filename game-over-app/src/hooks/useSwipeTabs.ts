/**
 * useSwipeTabs — Horizontal swipe navigation between sub-tabs with slide animation.
 *
 * Returns:
 * - `handlers`: onTouchStart/onTouchEnd to spread on the swipeable container
 * - `animatedStyle`: { transform, opacity } to apply to an Animated.View wrapping tab content
 * - `switchTab`: animated tab setter — use instead of raw setActiveTab for pill taps
 */

import { useRef, useMemo, useCallback } from 'react';
import { Animated, Dimensions, type GestureResponderEvent } from 'react-native';

const SWIPE_THRESHOLD = 60;   // min horizontal px to trigger tab switch
const MAX_VERTICAL = 80;       // ignore swipe if vertical movement exceeds this
const SCREEN_WIDTH = Dimensions.get('window').width;
const ANIM_DURATION = 200;     // ms per half (out + in)

export function useSwipeTabs<T extends string>(
  tabs: readonly T[],
  activeTab: T,
  setActiveTab: (tab: T) => void,
) {
  const start = useRef({ x: 0, y: 0 });
  const slideX = useRef(new Animated.Value(0)).current;
  const fadeVal = useRef(new Animated.Value(1)).current;
  const isAnimating = useRef(false);

  const animateSwitch = useCallback((newTab: T, direction: 'left' | 'right') => {
    if (isAnimating.current) return;
    isAnimating.current = true;

    const exitX = direction === 'left' ? -SCREEN_WIDTH * 0.25 : SCREEN_WIDTH * 0.25;
    const enterX = direction === 'left' ? SCREEN_WIDTH * 0.25 : -SCREEN_WIDTH * 0.25;

    // Slide + fade out
    Animated.parallel([
      Animated.timing(slideX, {
        toValue: exitX,
        duration: ANIM_DURATION,
        useNativeDriver: true,
      }),
      Animated.timing(fadeVal, {
        toValue: 0.3,
        duration: ANIM_DURATION,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Switch tab content
      setActiveTab(newTab);

      // Reposition for entrance
      slideX.setValue(enterX);

      // Slide + fade in
      Animated.parallel([
        Animated.timing(slideX, {
          toValue: 0,
          duration: ANIM_DURATION,
          useNativeDriver: true,
        }),
        Animated.timing(fadeVal, {
          toValue: 1,
          duration: ANIM_DURATION,
          useNativeDriver: true,
        }),
      ]).start(() => {
        isAnimating.current = false;
      });
    });
  }, [slideX, fadeVal, setActiveTab]);

  /** Animated tab switch — use for pill taps and programmatic changes */
  const switchTab = useCallback((tab: T) => {
    const oldIndex = tabs.indexOf(activeTab);
    const newIndex = tabs.indexOf(tab);
    if (oldIndex === newIndex || isAnimating.current) return;
    animateSwitch(tab, newIndex > oldIndex ? 'left' : 'right');
  }, [tabs, activeTab, animateSwitch]);

  const handlers = useMemo(() => ({
    onTouchStart: (e: GestureResponderEvent) => {
      const touch = e.nativeEvent;
      start.current = { x: touch.pageX, y: touch.pageY };
    },
    onTouchEnd: (e: GestureResponderEvent) => {
      if (isAnimating.current) return;
      const touch = e.nativeEvent;
      const dx = touch.pageX - start.current.x;
      const dy = touch.pageY - start.current.y;

      if (Math.abs(dx) < SWIPE_THRESHOLD || Math.abs(dy) > MAX_VERTICAL) return;

      const currentIndex = tabs.indexOf(activeTab);
      if (dx < 0 && currentIndex < tabs.length - 1) {
        animateSwitch(tabs[currentIndex + 1], 'left');
      } else if (dx > 0 && currentIndex > 0) {
        animateSwitch(tabs[currentIndex - 1], 'right');
      }
    },
  }), [tabs, activeTab, animateSwitch]);

  const animatedStyle = useMemo(() => ({
    transform: [{ translateX: slideX }],
    opacity: fadeVal,
  }), [slideX, fadeVal]);

  return { handlers, animatedStyle, switchTab };
}
