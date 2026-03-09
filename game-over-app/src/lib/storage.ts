/**
 * Storage Abstraction Layer
 *
 * Provides a unified storage interface that works in both:
 * - Expo Go (uses AsyncStorage)
 * - Development/Production builds (uses MMKV for better performance)
 *
 * This abstraction automatically detects the environment and uses
 * the appropriate storage backend.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants, { ExecutionEnvironment } from 'expo-constants';

// Detect if we're running in Expo Go (StoreClient = Expo Go app)
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

// Storage interface that matches what Supabase and Zustand expect
export interface StorageAdapter {
  getItem: (key: string) => string | null | Promise<string | null>;
  setItem: (key: string, value: string) => void | Promise<void>;
  removeItem: (key: string) => void | Promise<void>;
}

// Async storage interface for Supabase (requires async methods)
export interface AsyncStorageAdapter {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
}

/**
 * Create a storage instance for the given namespace
 * Returns an async-compatible storage adapter
 */
export function createStorage(namespace: string): AsyncStorageAdapter {
  if (isExpoGo) {
    // Use AsyncStorage for Expo Go
    return {
      getItem: async (key: string) => {
        try {
          return await AsyncStorage.getItem(`${namespace}:${key}`);
        } catch {
          return null;
        }
      },
      setItem: async (key: string, value: string) => {
        try {
          await AsyncStorage.setItem(`${namespace}:${key}`, value);
        } catch (error) {
          console.warn(`[Storage] Failed to set ${key}:`, error);
        }
      },
      removeItem: async (key: string) => {
        try {
          await AsyncStorage.removeItem(`${namespace}:${key}`);
        } catch (error) {
          console.warn(`[Storage] Failed to remove ${key}:`, error);
        }
      },
    };
  }

  // Use MMKV for development/production builds
  // Wrap initialization in try-catch: MMKV can fail to write manifest in Expo Go sandbox
  let storage: any;
  try {
    const { MMKV } = require('react-native-mmkv');
    storage = new MMKV({ id: namespace });
    // Verify it works with a probe read — throws if manifest write failed
    storage.getString('__probe__');
  } catch {
    // MMKV unavailable (Expo Go sandbox or filesystem restriction) — fall back to AsyncStorage
    console.warn(`[Storage] MMKV init failed for "${namespace}", falling back to AsyncStorage`);
    return {
      getItem: async (key: string) => AsyncStorage.getItem(`${namespace}:${key}`).catch(() => null),
      setItem: async (key: string, value: string) => { AsyncStorage.setItem(`${namespace}:${key}`, value).catch(() => {}); },
      removeItem: async (key: string) => { AsyncStorage.removeItem(`${namespace}:${key}`).catch(() => {}); },
    };
  }

  return {
    getItem: async (key: string) => {
      try {
        const value = storage.getString(key);
        return value ?? null;
      } catch {
        return null;
      }
    },
    setItem: async (key: string, value: string) => {
      try {
        storage.set(key, value);
      } catch (error) {
        console.warn(`[Storage] MMKV write failed for ${key}:`, error);
      }
    },
    removeItem: async (key: string) => {
      try {
        storage.delete(key);
      } catch (error) {
        console.warn(`[Storage] MMKV delete failed for ${key}:`, error);
      }
    },
  };
}

/**
 * Create a synchronous storage instance (for Zustand persist)
 * Note: In Expo Go, this will use AsyncStorage which is async,
 * but Zustand's persist middleware handles this gracefully
 */
export function createSyncStorage(namespace: string) {
  if (isExpoGo) {
    // AsyncStorage adapter for Zustand (Zustand handles async storage)
    return {
      getItem: (key: string) => {
        return AsyncStorage.getItem(`${namespace}:${key}`);
      },
      setItem: (key: string, value: string) => {
        AsyncStorage.setItem(`${namespace}:${key}`, value);
      },
      removeItem: (key: string) => {
        AsyncStorage.removeItem(`${namespace}:${key}`);
      },
    };
  }

  // Use MMKV for development/production builds
  let storage: any;
  try {
    const { MMKV } = require('react-native-mmkv');
    storage = new MMKV({ id: namespace });
    storage.getString('__probe__');
  } catch {
    console.warn(`[Storage] MMKV init failed for "${namespace}", falling back to AsyncStorage`);
    return {
      getItem: (key: string) => AsyncStorage.getItem(`${namespace}:${key}`).catch(() => null),
      setItem: (key: string, value: string) => { AsyncStorage.setItem(`${namespace}:${key}`, value).catch(() => {}); },
      removeItem: (key: string) => { AsyncStorage.removeItem(`${namespace}:${key}`).catch(() => {}); },
    };
  }

  return {
    getItem: (key: string): string | null => {
      try {
        const value = storage.getString(key);
        return value ?? null;
      } catch {
        return null;
      }
    },
    setItem: (key: string, value: string): void => {
      try {
        storage.set(key, value);
      } catch (error) {
        console.warn(`[Storage] MMKV write failed for ${key}:`, error);
      }
    },
    removeItem: (key: string): void => {
      try {
        storage.delete(key);
      } catch (error) {
        console.warn(`[Storage] MMKV delete failed for ${key}:`, error);
      }
    },
  };
}

/**
 * Direct delete for a namespace (used by wizardStore.clearDraft)
 */
export function deleteFromStorage(namespace: string, key: string): void {
  if (isExpoGo) {
    AsyncStorage.removeItem(`${namespace}:${key}`);
  } else {
    const { MMKV } = require('react-native-mmkv');
    const storage = new MMKV({ id: namespace });
    storage.delete(key);
  }
}

// Export environment detection for debugging
export { isExpoGo };
