package com.pantrychef.modules.storage;

import com.facebook.react.bridge.ReactContextBaseJavaModule; // react-native v0.64.0
import com.facebook.react.bridge.ReactApplicationContext; // react-native v0.64.0
import com.facebook.react.bridge.ReactMethod; // react-native v0.64.0
import com.facebook.react.bridge.Promise; // react-native v0.64.0
import com.pantrychef.utils.KeychainManager;

/**
 * React Native native module that provides secure storage functionality for the PantryChef mobile application,
 * bridging React Native with Android's native storage capabilities using AES-256 encryption.
 *
 * HUMAN TASKS:
 * 1. Verify React Native module registration in MainApplication.java
 * 2. Ensure ProGuard/R8 rules preserve React Native bridge methods
 * 3. Validate storage permissions in AndroidManifest.xml
 * 4. Review security configuration with security team
 */
public class StorageModule extends ReactContextBaseJavaModule {

    private static final String NAME = "StorageModule";
    private final KeychainManager mKeychainManager;

    /**
     * Constructor initializes the StorageModule with React Native context and sets up KeychainManager
     * Requirement: Local Storage - Implements secure local storage functionality initialization
     */
    public StorageModule(ReactApplicationContext reactContext) {
        super(reactContext);
        try {
            mKeychainManager = KeychainManager.getInstance(reactContext);
        } catch (Exception e) {
            throw new RuntimeException("Failed to initialize StorageModule: KeychainManager initialization failed", e);
        }
    }

    /**
     * Returns the name of the module for React Native registry
     * Required by ReactContextBaseJavaModule
     */
    @Override
    public String getName() {
        return NAME;
    }

    /**
     * Stores data securely using KeychainManager with AES-256 encryption
     * Requirement: Data Security - Implements secure storage using AES-256 encryption for sensitive data
     * Requirement: Local Storage - Implements secure local storage functionality for mobile application data persistence
     */
    @ReactMethod
    public void setItem(String key, String value, Promise promise) {
        try {
            if (key == null || key.isEmpty()) {
                promise.reject("ERR_INVALID_KEY", "Storage key cannot be null or empty");
                return;
            }

            if (value == null) {
                promise.reject("ERR_INVALID_VALUE", "Storage value cannot be null");
                return;
            }

            boolean success = mKeychainManager.storeSecureData(key, value);
            if (success) {
                promise.resolve(null);
            } else {
                promise.reject("ERR_STORAGE_WRITE", "Failed to store data securely");
            }
        } catch (Exception e) {
            promise.reject("ERR_STORAGE_WRITE", "Failed to store data securely: " + e.getMessage(), e);
        }
    }

    /**
     * Retrieves and decrypts securely stored data
     * Requirement: Data Security - Implements secure data retrieval with AES-256 decryption
     * Requirement: Local Storage - Implements secure data retrieval for mobile application
     */
    @ReactMethod
    public void getItem(String key, Promise promise) {
        try {
            if (key == null || key.isEmpty()) {
                promise.reject("ERR_INVALID_KEY", "Storage key cannot be null or empty");
                return;
            }

            String value = mKeychainManager.retrieveSecureData(key);
            if (value != null) {
                promise.resolve(value);
            } else {
                promise.resolve(null); // Return null for non-existent keys (React Native convention)
            }
        } catch (Exception e) {
            promise.reject("ERR_STORAGE_READ", "Failed to retrieve data securely: " + e.getMessage(), e);
        }
    }

    /**
     * Removes stored encrypted data for given key
     * Requirement: Local Storage - Implements secure data removal functionality
     * Requirement: Data Security - Implements secure deletion of encrypted data
     */
    @ReactMethod
    public void removeItem(String key, Promise promise) {
        try {
            if (key == null || key.isEmpty()) {
                promise.reject("ERR_INVALID_KEY", "Storage key cannot be null or empty");
                return;
            }

            boolean success = mKeychainManager.removeSecureData(key);
            if (success) {
                promise.resolve(null);
            } else {
                promise.reject("ERR_STORAGE_DELETE", "Failed to remove data securely");
            }
        } catch (Exception e) {
            promise.reject("ERR_STORAGE_DELETE", "Failed to remove data securely: " + e.getMessage(), e);
        }
    }
}