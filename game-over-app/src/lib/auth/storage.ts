/**
 * Secure Token Storage
 * Uses expo-secure-store for sensitive data
 */

import * as SecureStore from 'expo-secure-store';

const TOKEN_KEYS = {
  accessToken: 'game_over_access_token',
  refreshToken: 'game_over_refresh_token',
  userId: 'game_over_user_id',
} as const;

export const tokenStorage = {
  /**
   * Store access token securely
   */
  async setAccessToken(token: string): Promise<void> {
    await SecureStore.setItemAsync(TOKEN_KEYS.accessToken, token);
  },

  /**
   * Get stored access token
   */
  async getAccessToken(): Promise<string | null> {
    return SecureStore.getItemAsync(TOKEN_KEYS.accessToken);
  },

  /**
   * Store refresh token securely
   */
  async setRefreshToken(token: string): Promise<void> {
    await SecureStore.setItemAsync(TOKEN_KEYS.refreshToken, token);
  },

  /**
   * Get stored refresh token
   */
  async getRefreshToken(): Promise<string | null> {
    return SecureStore.getItemAsync(TOKEN_KEYS.refreshToken);
  },

  /**
   * Store user ID
   */
  async setUserId(userId: string): Promise<void> {
    await SecureStore.setItemAsync(TOKEN_KEYS.userId, userId);
  },

  /**
   * Get stored user ID
   */
  async getUserId(): Promise<string | null> {
    return SecureStore.getItemAsync(TOKEN_KEYS.userId);
  },

  /**
   * Store a custom key-value pair securely
   */
  async set(key: string, value: string): Promise<void> {
    await SecureStore.setItemAsync(key, value);
  },

  /**
   * Get a custom stored value
   */
  async get(key: string): Promise<string | null> {
    return SecureStore.getItemAsync(key);
  },

  /**
   * Remove a stored value
   */
  async remove(key: string): Promise<void> {
    await SecureStore.deleteItemAsync(key);
  },

  /**
   * Clear all authentication tokens
   */
  async clearAll(): Promise<void> {
    await Promise.all([
      SecureStore.deleteItemAsync(TOKEN_KEYS.accessToken),
      SecureStore.deleteItemAsync(TOKEN_KEYS.refreshToken),
      SecureStore.deleteItemAsync(TOKEN_KEYS.userId),
    ]);
  },
};
