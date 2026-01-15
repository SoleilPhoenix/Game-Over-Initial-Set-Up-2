/**
 * Tamagui Type Declarations
 * Extends and fixes Tamagui types for the Game-Over app
 */

import type { config } from '../../tamagui.config';

type AppConfig = typeof config;

// Extend Tamagui with our custom config
declare module 'tamagui' {
  interface TamaguiCustomConfig extends AppConfig {}
}

export {};
