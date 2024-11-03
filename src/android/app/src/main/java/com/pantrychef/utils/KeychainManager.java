package com.pantrychef.utils;

import android.content.Context;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;

import com.pantrychef.core.Constants;

import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

/**
 * Utility class that provides secure storage and retrieval of sensitive data using Android's KeyStore
 * system for the PantryChef application, implementing AES-256 encryption for data at rest.
 *
 * HUMAN TASKS:
 * 1. Verify Android Keystore is properly initialized on device
 * 2. Ensure proper ProGuard/R8 rules to prevent obfuscation of cryptographic classes
 * 3. Review security configuration with security team
 * 4. Validate hardware-backed keystore availability on target devices
 */
public class KeychainManager {

    private static final String KEYSTORE_PROVIDER = "AndroidKeyStore";
    private static final String TRANSFORMATION = "AES/GCM/NoPadding";
    private static final String TAG = "KeychainManager";
    
    private static final int GCM_IV_LENGTH = 12;
    private static final int GCM_TAG_LENGTH = 128;
    
    private final Context mContext;
    private static volatile KeychainManager instance;
    private final KeyStore keyStore;

    /**
     * Private constructor for singleton pattern with thread-safety
     * Requirement: Data Security - Implements secure storage initialization
     */
    private KeychainManager(Context context) {
        try {
            this.mContext = context.getApplicationContext();
            this.keyStore = KeyStore.getInstance(KEYSTORE_PROVIDER);
            this.keyStore.load(null);
            Logger.d(TAG, "KeychainManager initialized successfully");
        } catch (Exception e) {
            Logger.e(TAG, "Failed to initialize KeychainManager", e);
            throw new RuntimeException("KeychainManager initialization failed", e);
        }
    }

    /**
     * Returns singleton instance of KeychainManager with double-checked locking
     * Requirement: Data Security - Thread-safe instance management
     */
    public static KeychainManager getInstance(Context context) {
        if (context == null) {
            throw new IllegalArgumentException("Context cannot be null");
        }
        
        if (instance == null) {
            synchronized (KeychainManager.class) {
                if (instance == null) {
                    instance = new KeychainManager(context);
                }
            }
        }
        return instance;
    }

    /**
     * Securely stores sensitive data using AES-256 encryption
     * Requirement: Data Security - AES-256 encryption for data at rest
     */
    public boolean storeSecureData(String key, String data) {
        try {
            if (key == null || data == null) {
                Logger.e(TAG, "Key or data is null", null);
                return false;
            }

            // Generate or retrieve encryption key
            SecretKey secretKey = getOrCreateSecretKey(key);
            
            // Initialize cipher for encryption
            Cipher cipher = Cipher.getInstance(TRANSFORMATION);
            cipher.init(Cipher.ENCRYPT_MODE, secretKey);
            
            // Perform encryption
            byte[] iv = cipher.getIV();
            byte[] encryptedData = cipher.doFinal(data.getBytes(StandardCharsets.UTF_8));
            
            // Combine IV and encrypted data
            byte[] combined = new byte[iv.length + encryptedData.length];
            System.arraycopy(iv, 0, combined, 0, iv.length);
            System.arraycopy(encryptedData, 0, combined, iv.length, encryptedData.length);
            
            // Store encrypted data in SharedPreferences
            String encryptedString = Base64.encodeToString(combined, Base64.DEFAULT);
            mContext.getSharedPreferences(KEYSTORE_PROVIDER, Context.MODE_PRIVATE)
                    .edit()
                    .putString(key, encryptedString)
                    .apply();
            
            Logger.d(TAG, "Data encrypted and stored successfully for key: " + key);
            return true;
        } catch (Exception e) {
            Logger.e(TAG, "Failed to store secure data for key: " + key, e);
            return false;
        }
    }

    /**
     * Retrieves and decrypts secure data using AES-256
     * Requirement: Data Security - Secure data retrieval with decryption
     */
    public String retrieveSecureData(String key) {
        try {
            if (key == null) {
                Logger.e(TAG, "Key is null", null);
                return null;
            }

            // Retrieve encrypted data from SharedPreferences
            String encryptedString = mContext.getSharedPreferences(KEYSTORE_PROVIDER, Context.MODE_PRIVATE)
                    .getString(key, null);
            
            if (encryptedString == null) {
                Logger.d(TAG, "No data found for key: " + key);
                return null;
            }

            // Decode from Base64
            byte[] combined = Base64.decode(encryptedString, Base64.DEFAULT);
            if (combined.length < GCM_IV_LENGTH) {
                throw new IllegalArgumentException("Invalid encrypted data format");
            }

            // Extract IV and encrypted data
            byte[] iv = new byte[GCM_IV_LENGTH];
            byte[] encryptedData = new byte[combined.length - GCM_IV_LENGTH];
            System.arraycopy(combined, 0, iv, 0, GCM_IV_LENGTH);
            System.arraycopy(combined, GCM_IV_LENGTH, encryptedData, 0, encryptedData.length);

            // Initialize cipher for decryption
            Cipher cipher = Cipher.getInstance(TRANSFORMATION);
            SecretKey secretKey = getOrCreateSecretKey(key);
            GCMParameterSpec spec = new GCMParameterSpec(GCM_TAG_LENGTH, iv);
            cipher.init(Cipher.DECRYPT_MODE, secretKey, spec);

            // Perform decryption
            byte[] decryptedData = cipher.doFinal(encryptedData);
            String result = new String(decryptedData, StandardCharsets.UTF_8);
            
            Logger.d(TAG, "Data retrieved and decrypted successfully for key: " + key);
            return result;
        } catch (Exception e) {
            Logger.e(TAG, "Failed to retrieve secure data for key: " + key, e);
            return null;
        }
    }

    /**
     * Removes secure data from SharedPreferences storage
     * Requirement: Data Security - Secure data removal
     */
    public boolean removeSecureData(String key) {
        try {
            if (key == null) {
                Logger.e(TAG, "Key is null", null);
                return false;
            }

            mContext.getSharedPreferences(KEYSTORE_PROVIDER, Context.MODE_PRIVATE)
                    .edit()
                    .remove(key)
                    .apply();
            
            Logger.d(TAG, "Data removed successfully for key: " + key);
            return true;
        } catch (Exception e) {
            Logger.e(TAG, "Failed to remove secure data for key: " + key, e);
            return false;
        }
    }

    /**
     * Clears all secure data from SharedPreferences storage
     * Requirement: Data Security - Complete secure data cleanup
     */
    public void clearAllSecureData() {
        try {
            mContext.getSharedPreferences(KEYSTORE_PROVIDER, Context.MODE_PRIVATE)
                    .edit()
                    .clear()
                    .apply();
            Logger.d(TAG, "All secure data cleared successfully");
        } catch (Exception e) {
            Logger.e(TAG, "Failed to clear all secure data", e);
        }
    }

    /**
     * Creates or retrieves a secret key for encryption/decryption
     * Requirement: Data Security - AES-256 key management
     */
    private SecretKey getOrCreateSecretKey(String alias) throws Exception {
        try {
            // Try to retrieve existing key
            if (keyStore.containsAlias(alias)) {
                return ((KeyStore.SecretKeyEntry) keyStore.getEntry(alias, null)).getSecretKey();
            }

            // Generate new key if it doesn't exist
            KeyGenerator keyGenerator = KeyGenerator.getInstance(
                    KeyProperties.KEY_ALGORITHM_AES,
                    KEYSTORE_PROVIDER);
            
            KeyGenParameterSpec keySpec = new KeyGenParameterSpec.Builder(
                    alias,
                    KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT)
                    .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
                    .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                    .setKeySize(256)
                    .setUserAuthenticationRequired(false)
                    .build();

            keyGenerator.init(keySpec);
            return keyGenerator.generateKey();
        } catch (Exception e) {
            Logger.e(TAG, "Failed to get or create secret key for alias: " + alias, e);
            throw e;
        }
    }
}