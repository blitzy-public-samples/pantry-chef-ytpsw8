// External dependency: TypeScript (^4.9.0)

import { AUTH_CONSTANTS } from '../config/constants';

// Requirement: Session Management (9.3 Security Protocols/9.3.1 Access Control Measures)
// Type definition for valid storage types
export type StorageType = 'localStorage' | 'sessionStorage';

// Requirement: Data Protection (9.2 Data Security/9.2.1 Encryption Standards)
// Interface for stored data with expiration handling
export interface StorageData<T = any> {
  value: T;
  expiresAt: number | null;
}

// Requirement: Cache Management (5.2 Component Architecture/5.2.1 Client Applications)
// Storage utility object with type-safe methods
export const storage = {
  /**
   * Stores a value in browser storage with optional expiration
   * @param key Storage key
   * @param value Value to store
   * @param type Storage type (localStorage or sessionStorage)
   * @param expiresIn Optional expiration time in seconds
   */
  setItem: <T>(
    key: string,
    value: T,
    type: StorageType,
    expiresIn?: number
  ): void => {
    try {
      const storage = window[type];
      if (!storage) {
        throw new Error(`Invalid storage type: ${type}`);
      }

      const data: StorageData<T> = {
        value,
        expiresAt: expiresIn ? Date.now() + expiresIn * 1000 : null,
      };

      storage.setItem(key, JSON.stringify(data));
    } catch (error) {
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        console.error('Storage quota exceeded. Clearing expired items...');
        // Attempt to clear expired items and retry
        storage.clear(type);
        throw new Error('Storage quota exceeded');
      }
      throw error;
    }
  },

  /**
   * Retrieves a typed value from browser storage
   * @param key Storage key
   * @param type Storage type (localStorage or sessionStorage)
   * @returns Retrieved value or null if expired/not found
   */
  getItem: <T>(key: string, type: StorageType): T | null => {
    try {
      const storage = window[type];
      if (!storage) {
        throw new Error(`Invalid storage type: ${type}`);
      }

      const item = storage.getItem(key);
      if (!item) return null;

      const data: StorageData<T> = JSON.parse(item);
      
      if (storage.isExpired(data)) {
        storage.removeItem(key, type);
        return null;
      }

      return data.value;
    } catch (error) {
      if (error instanceof SyntaxError) {
        console.error('Invalid storage data format:', error);
        storage.removeItem(key, type);
        return null;
      }
      throw error;
    }
  },

  /**
   * Removes an item from browser storage
   * @param key Storage key
   * @param type Storage type (localStorage or sessionStorage)
   */
  removeItem: (key: string, type: StorageType): void => {
    try {
      const storage = window[type];
      if (!storage) {
        throw new Error(`Invalid storage type: ${type}`);
      }

      storage.removeItem(key);
    } catch (error) {
      console.error('Error removing item from storage:', error);
      throw error;
    }
  },

  /**
   * Clears all items from specified storage type
   * @param type Storage type (localStorage or sessionStorage)
   */
  clear: (type: StorageType): void => {
    try {
      const storage = window[type];
      if (!storage) {
        throw new Error(`Invalid storage type: ${type}`);
      }

      storage.clear();
    } catch (error) {
      console.error('Error clearing storage:', error);
      throw error;
    }
  },

  /**
   * Internal helper to check if stored data has expired
   * @param data StorageData object to check
   * @returns true if data has expired, false otherwise
   */
  isExpired: <T>(data: StorageData<T>): boolean => {
    if (!data.expiresAt) return false;
    return Date.now() > data.expiresAt;
  },

  /**
   * Helper method to get auth token from storage
   * @returns Stored auth token or null
   */
  getAuthToken: (): string | null => {
    return storage.getItem<string>(
      AUTH_CONSTANTS.TOKEN_KEY,
      'localStorage'
    );
  },

  /**
   * Helper method to get refresh token from storage
   * @returns Stored refresh token or null
   */
  getRefreshToken: (): string | null => {
    return storage.getItem<string>(
      AUTH_CONSTANTS.REFRESH_TOKEN_KEY,
      'localStorage'
    );
  },

  /**
   * Helper method to clear all auth-related storage
   */
  clearAuth: (): void => {
    storage.removeItem(AUTH_CONSTANTS.TOKEN_KEY, 'localStorage');
    storage.removeItem(AUTH_CONSTANTS.REFRESH_TOKEN_KEY, 'localStorage');
  }
};