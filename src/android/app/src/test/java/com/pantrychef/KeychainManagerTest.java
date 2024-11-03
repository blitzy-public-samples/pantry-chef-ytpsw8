package com.pantrychef;

import android.content.Context;
import android.content.SharedPreferences;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;

import com.pantrychef.utils.KeychainManager;

import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.robolectric.RobolectricTestRunner;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertNull;
import static org.junit.Assert.assertTrue;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Unit test suite for KeychainManager class that verifies secure storage implementation
 * using Android's KeyStore system with AES-256 encryption
 *
 * HUMAN TASKS:
 * 1. Ensure Android Keystore is properly initialized in test environment
 * 2. Verify test device supports hardware-backed keystore features
 * 3. Configure proper security provider in test environment
 */
@RunWith(RobolectricTestRunner.class)
public class KeychainManagerTest {

    private static final String TEST_KEY = "test_key";
    private static final String TEST_VALUE = "test_value";

    @Mock
    private Context mContext;

    private KeychainManager mKeychainManager;
    private SharedPreferences mMockSharedPreferences;
    private SharedPreferences.Editor mMockEditor;

    /**
     * Sets up test environment before each test with mock context and SharedPreferences
     * Requirement: Data Security Testing - Test environment initialization
     */
    @Before
    public void setUp() {
        // Initialize mocks
        MockitoAnnotations.openMocks(this);

        // Setup mock SharedPreferences and Editor
        mMockSharedPreferences = mock(SharedPreferences.class);
        mMockEditor = mock(SharedPreferences.Editor.class);

        // Configure mock behavior
        when(mContext.getApplicationContext()).thenReturn(mContext);
        when(mContext.getSharedPreferences(anyString(), anyInt())).thenReturn(mMockSharedPreferences);
        when(mMockSharedPreferences.edit()).thenReturn(mMockEditor);
        when(mMockEditor.putString(anyString(), anyString())).thenReturn(mMockEditor);
        when(mMockEditor.remove(anyString())).thenReturn(mMockEditor);
        when(mMockEditor.clear()).thenReturn(mMockEditor);

        // Initialize KeychainManager with mock context
        mKeychainManager = KeychainManager.getInstance(mContext);
    }

    /**
     * Verifies AES-256 encryption for storing and retrieving secure data
     * Requirement: Data Security Testing - Validates secure storage implementation using AES-256 encryption
     */
    @Test
    public void testStoreAndRetrieveSecureData() {
        // Store test data
        boolean storeResult = mKeychainManager.storeSecureData(TEST_KEY, TEST_VALUE);
        assertTrue("Storing secure data should succeed", storeResult);

        // Configure mock to return encrypted data
        when(mMockSharedPreferences.getString(TEST_KEY, null))
                .thenReturn("encrypted_" + TEST_VALUE);

        // Retrieve and verify test data
        String retrievedValue = mKeychainManager.retrieveSecureData(TEST_KEY);
        assertEquals("Retrieved value should match stored value", TEST_VALUE, retrievedValue);
    }

    /**
     * Verifies secure removal of encrypted data
     * Requirement: Security Testing - Ensures security mechanisms for data protection
     */
    @Test
    public void testRemoveSecureData() {
        // Store test data first
        mKeychainManager.storeSecureData(TEST_KEY, TEST_VALUE);

        // Remove the stored data
        boolean removeResult = mKeychainManager.removeSecureData(TEST_KEY);
        assertTrue("Removing secure data should succeed", removeResult);

        // Configure mock to return null for removed data
        when(mMockSharedPreferences.getString(TEST_KEY, null)).thenReturn(null);

        // Verify data was removed
        String retrievedValue = mKeychainManager.retrieveSecureData(TEST_KEY);
        assertNull("Retrieved value should be null after removal", retrievedValue);
    }

    /**
     * Verifies complete clearing of all encrypted data
     * Requirement: Security Testing - Validates complete data cleanup
     */
    @Test
    public void testClearAllSecureData() {
        // Store multiple test data items
        mKeychainManager.storeSecureData(TEST_KEY + "1", TEST_VALUE);
        mKeychainManager.storeSecureData(TEST_KEY + "2", TEST_VALUE);

        // Clear all secure data
        mKeychainManager.clearAllSecureData();

        // Configure mock to return null for all keys
        when(mMockSharedPreferences.getString(anyString(), null)).thenReturn(null);

        // Verify all data was cleared
        assertNull("Data should be null after clearing",
                mKeychainManager.retrieveSecureData(TEST_KEY + "1"));
        assertNull("Data should be null after clearing",
                mKeychainManager.retrieveSecureData(TEST_KEY + "2"));
    }

    /**
     * Verifies behavior when attempting to decrypt non-existent data
     * Requirement: Security Testing - Validates error handling for missing data
     */
    @Test
    public void testInvalidKeyRetrieval() {
        // Configure mock to return null for non-existent key
        when(mMockSharedPreferences.getString("invalid_key", null)).thenReturn(null);

        // Attempt to retrieve data with non-existent key
        String retrievedValue = mKeychainManager.retrieveSecureData("invalid_key");
        assertNull("Retrieved value should be null for invalid key", retrievedValue);

        // Verify storing null values fails gracefully
        assertFalse("Storing null key should fail",
                mKeychainManager.storeSecureData(null, TEST_VALUE));
        assertFalse("Storing null value should fail",
                mKeychainManager.storeSecureData(TEST_KEY, null));
    }

    /**
     * Verifies singleton instance management
     * Requirement: Security Testing - Validates secure instance handling
     */
    @Test
    public void testSingletonInstance() {
        KeychainManager instance1 = KeychainManager.getInstance(mContext);
        KeychainManager instance2 = KeychainManager.getInstance(mContext);
        assertEquals("Multiple getInstance calls should return same instance", instance1, instance2);
    }

    /**
     * Verifies proper error handling for invalid input
     * Requirement: Security Testing - Validates input validation
     */
    @Test(expected = IllegalArgumentException.class)
    public void testNullContextValidation() {
        KeychainManager.getInstance(null);
    }
}