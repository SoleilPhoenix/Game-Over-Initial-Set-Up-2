/**
 * Tamagui Type Declarations
 * Extends and fixes Tamagui types for the Game-Over app
 */

import type { config } from '../../tamagui.config';

type AppConfig = typeof config;

// Extend Tamagui with our custom config
declare module 'tamagui' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type -- required Tamagui type augmentation pattern
  interface TamaguiCustomConfig extends AppConfig {}
}

export {};
