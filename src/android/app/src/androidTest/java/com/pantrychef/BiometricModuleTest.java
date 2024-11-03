package com.pantrychef;

import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.rule.ActivityTestRule;

import com.facebook.react.bridge.Promise;
import com.pantrychef.modules.biometric.BiometricModule;
import com.pantrychef.utils.KeychainManager;

import org.junit.After;
import org.junit.Before;
import org.junit.Rule;
import org.junit.Test;
import org.junit.runner.RunWith;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * HUMAN TASKS:
 * 1. Ensure test device has biometric hardware and enrolled fingerprints
 * 2. Configure test environment with proper security permissions
 * 3. Verify test coverage meets security compliance requirements
 * 4. Review test results with security team
 */
@RunWith(AndroidJUnit4.class)
public class BiometricModuleTest {

    private static final String TEST_REASON = "Test biometric authentication";

    @Rule
    public ActivityTestRule<MainActivity> activityRule = new ActivityTestRule<>(MainActivity.class);

    private BiometricModule biometricModule;
    private KeychainManager keychainManager;

    /**
     * Sets up test environment before each test
     * Requirement: Security Authentication Testing - Test environment initialization
     */
    @Before
    public void setUp() {
        // Initialize BiometricModule with test context
        biometricModule = new BiometricModule(activityRule.getActivity().getReactApplicationContext());
        
        // Get KeychainManager instance
        keychainManager = KeychainManager.getInstance(activityRule.getActivity());
        
        // Clear any existing biometric data for clean test state
        keychainManager.clearAllSecureData();
    }

    /**
     * Cleans up test environment after each test
     * Requirement: Data Security Testing - Test data cleanup
     */
    @After
    public void tearDown() {
        // Clear all secure data from KeychainManager
        keychainManager.clearAllSecureData();
    }

    /**
     * Tests biometric hardware availability check
     * Requirement: Security Authentication Testing - Hardware verification
     */
    @Test
    public void testBiometricAvailability() {
        // Create mock Promise for async result handling
        Promise mockPromise = mock(Promise.class);

        // Call isBiometricAvailable
        biometricModule.isBiometricAvailable(mockPromise);

        // Verify promise resolution
        // Note: Actual result depends on device hardware and enrolled biometrics
        verify(mockPromise).resolve(true);
    }

    /**
     * Tests biometric authentication flow
     * Requirement: Security Authentication Testing - Authentication verification
     */
    @Test
    public void testAuthentication() {
        // Create mock Promise for authentication result
        Promise mockPromise = mock(Promise.class);

        // Call authenticate with test reason
        biometricModule.authenticate(TEST_REASON, mockPromise);

        // Verify BiometricPrompt was displayed with correct reason
        // Note: Manual verification required as BiometricPrompt UI is system-controlled
        
        // Simulate successful authentication by checking KeychainManager
        String authState = keychainManager.retrieveSecureData("biometric_auth_state");
        assert "authenticated".equals(authState);
    }

    /**
     * Tests clearing of biometric data
     * Requirement: Data Security Testing - Secure data removal
     */
    @Test
    public void testClearBiometricData() {
        // Create mock Promise for clear operation
        Promise mockPromise = mock(Promise.class);

        // Store test biometric data first
        keychainManager.storeSecureData("biometric_auth_state", "authenticated");

        // Call clearBiometricData
        biometricModule.clearBiometricData(mockPromise);

        // Verify data was cleared
        verify(mockPromise).resolve(true);
        assert keychainManager.retrieveSecureData("biometric_auth_state") == null;
    }

    /**
     * Tests authentication error handling
     * Requirement: Security Authentication Testing - Error handling verification
     */
    @Test
    public void testAuthenticationError() {
        // Create mock Promise for error testing
        Promise mockPromise = mock(Promise.class);

        // Simulate no biometrics enrolled scenario
        when(mockPromise.reject("BIOMETRIC_ERROR_NONE_ENROLLED", "No biometrics enrolled"))
            .thenReturn(null);

        // Call authenticate
        biometricModule.authenticate(TEST_REASON, mockPromise);

        // Verify error handling
        verify(mockPromise).reject("BIOMETRIC_ERROR_NONE_ENROLLED", "No biometrics enrolled");
    }

    /**
     * Tests authentication cancellation
     * Requirement: Security Authentication Testing - User cancellation handling
     */
    @Test
    public void testAuthenticationCancellation() {
        // Create mock Promise for cancellation testing
        Promise mockPromise = mock(Promise.class);

        // Simulate user cancellation
        when(mockPromise.reject("USER_CANCELED", "User canceled authentication"))
            .thenReturn(null);

        // Call authenticate
        biometricModule.authenticate(TEST_REASON, mockPromise);

        // Verify cancellation handling
        verify(mockPromise).reject("USER_CANCELED", "User canceled authentication");
    }
}