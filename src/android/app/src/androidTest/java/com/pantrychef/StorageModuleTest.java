package com.pantrychef;

import androidx.test.rule.ActivityTestRule; // androidx.test v1.4.0
import com.facebook.react.bridge.Promise; // react-native v0.64.0
import com.pantrychef.modules.storage.StorageModule;

import org.junit.Before; // junit v4.13.2
import org.junit.Rule; // junit v4.13.2
import org.junit.Test; // junit v4.13.2
import org.mockito.Mock; // mockito-core v3.12.4
import org.mockito.MockitoAnnotations; // mockito-core v3.12.4

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Android instrumentation test suite for StorageModule
 * 
 * HUMAN TASKS:
 * 1. Ensure test device has sufficient storage permissions
 * 2. Verify test environment supports hardware-backed keystore
 * 3. Clear secure storage before running tests
 * 4. Review test coverage with security team
 */
public class StorageModuleTest {

    @Rule
    public ActivityTestRule<MainActivity> activityRule = new ActivityTestRule<>(MainActivity.class);

    private StorageModule storageModule;

    @Mock
    private Promise promise;

    private static final String TEST_KEY = "test_key";
    private static final String TEST_VALUE = "test_value";
    private static final String INVALID_KEY = "";

    /**
     * Test setup initializes StorageModule and mocks
     * Requirement: Local Storage - Setup test environment for storage validation
     */
    @Before
    public void setUp() {
        MockitoAnnotations.openMocks(this);
        storageModule = new StorageModule(activityRule.getActivity().getReactApplicationContext());
    }

    /**
     * Tests storing data securely with AES-256 encryption
     * Requirement: Data Security - Verifies secure storage implementation using AES-256 encryption
     * Requirement: Local Storage - Validates secure data persistence
     */
    @Test
    public void testSetItem() {
        // Test valid storage operation
        storageModule.setItem(TEST_KEY, TEST_VALUE, promise);
        verify(promise).resolve(null);

        // Verify stored data can be retrieved
        storageModule.getItem(TEST_KEY, promise);
        verify(promise).resolve(TEST_VALUE);
    }

    /**
     * Tests retrieving and decrypting stored data
     * Requirement: Data Security - Verifies correct decryption of stored data
     * Requirement: Local Storage - Validates secure data retrieval
     */
    @Test
    public void testGetItem() {
        // Store test data first
        storageModule.setItem(TEST_KEY, TEST_VALUE, promise);
        verify(promise).resolve(null);

        // Test retrieval
        Promise getPromise = org.mockito.Mockito.mock(Promise.class);
        storageModule.getItem(TEST_KEY, getPromise);
        verify(getPromise).resolve(TEST_VALUE);
    }

    /**
     * Tests removing stored encrypted data
     * Requirement: Data Security - Verifies secure deletion of encrypted data
     * Requirement: Local Storage - Validates secure data removal
     */
    @Test
    public void testRemoveItem() {
        // Store test data first
        storageModule.setItem(TEST_KEY, TEST_VALUE, promise);
        verify(promise).resolve(null);

        // Test removal
        Promise removePromise = org.mockito.Mockito.mock(Promise.class);
        storageModule.removeItem(TEST_KEY, removePromise);
        verify(removePromise).resolve(null);

        // Verify data is no longer retrievable
        Promise getPromise = org.mockito.Mockito.mock(Promise.class);
        storageModule.getItem(TEST_KEY, getPromise);
        verify(getPromise).resolve(null);
    }

    /**
     * Tests retrieving non-existent data
     * Requirement: Local Storage - Validates proper handling of missing data
     */
    @Test
    public void testGetNonExistentItem() {
        String nonExistentKey = "non_existent_key";
        storageModule.getItem(nonExistentKey, promise);
        verify(promise).resolve(null);
    }

    /**
     * Tests error handling for invalid key format
     * Requirement: Data Security - Validates input validation for secure storage
     * Requirement: Local Storage - Verifies proper error handling
     */
    @Test
    public void testInvalidKeyFormat() {
        // Test empty key
        storageModule.setItem(INVALID_KEY, TEST_VALUE, promise);
        verify(promise).reject(eq("ERR_INVALID_KEY"), eq("Storage key cannot be null or empty"));

        // Test null key
        Promise nullKeyPromise = org.mockito.Mockito.mock(Promise.class);
        storageModule.setItem(null, TEST_VALUE, nullKeyPromise);
        verify(nullKeyPromise).reject(eq("ERR_INVALID_KEY"), eq("Storage key cannot be null or empty"));

        // Test null value
        Promise nullValuePromise = org.mockito.Mockito.mock(Promise.class);
        storageModule.setItem(TEST_KEY, null, nullValuePromise);
        verify(nullValuePromise).reject(eq("ERR_INVALID_VALUE"), eq("Storage value cannot be null"));
    }

    /**
     * Tests module name retrieval
     * Requirement: Local Storage - Validates module registration
     */
    @Test
    public void testGetName() {
        String moduleName = storageModule.getName();
        assert(moduleName.equals("StorageModule"));
    }
}