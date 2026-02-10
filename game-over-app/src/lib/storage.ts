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

// Detect if we're running in Expo Go
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
  // Dynamic import to avoid loading MMKV in Expo Go
  const { MMKV } = require('react-native-mmkv');
  const storage = new MMKV({ id: namespace });

  return {
    getItem: async (key: string) => {
      const value = storage.getString(key);
      return value ?? null;
    },
    setItem: async (key: string, value: string) => {
      storage.set(key, value);
    },
    removeItem: async (key: string) => {
      storage.delete(key);
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
  const { MMKV } = require('react-native-mmkv');
  const storage = new MMKV({ id: namespace });

  return {
    getItem: (key: string): string | null => {
      const value = storage.getString(key);
      return value ?? null;
    },
    setItem: (key: string, value: string): void => {
      storage.set(key, value);
    },
    removeItem: (key: string): void => {
      storage.delete(key);
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
