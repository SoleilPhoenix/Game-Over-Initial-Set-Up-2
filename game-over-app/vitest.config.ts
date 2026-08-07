import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./__tests__/setup.ts'],
    include: ['__tests__/**/*.test.{ts,tsx}'],
    server: {
      deps: {
        // Process @testing-library/react-native through Vite pipeline so that
        // the vi.mock('react-native', ...) in setup.ts intercepts before
        // the package tries to require('react-native') with its Flow syntax
        inline: [/@testing-library\/react-native/],
      },
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.d.ts',
        'src/lib/supabase/types.ts',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // Siehe __tests__/stubs/expo-modules-core.ts. Ohne diesen Eintrag scheitern
      // usePublicInvitePreview und useBookingFlow in jedem Worktree, waehrend derselbe Lauf im
      // Hauptbaum gruen ist - ein Unterschied, der schon einmal fuer echten Fehler gehalten wurde.
      'expo-modules-core': path.resolve(__dirname, './__tests__/stubs/expo-modules-core.ts'),
    },
  },
});
