package com.pantrychef.modules.biometric;

import android.app.Activity;
import android.content.pm.PackageManager;
import android.os.Build;

import androidx.annotation.NonNull;
import androidx.biometric.BiometricManager;
import androidx.biometric.BiometricPrompt;
import androidx.core.content.ContextCompat;
import androidx.fragment.app.FragmentActivity;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.pantrychef.utils.KeychainManager;

import java.util.concurrent.Executor;

/**
 * React Native native module that implements biometric authentication functionality
 * for the PantryChef Android application.
 *
 * HUMAN TASKS:
 * 1. Verify biometric hardware availability on target devices
 * 2. Test on various Android versions for compatibility
 * 3. Review biometric prompt UI strings with design team
 * 4. Validate error handling with QA team
 */
public class BiometricModule extends ReactContextBaseJavaModule {

    private static final String MODULE_NAME = "BiometricModule";
    private static final String BIOMETRIC_ERROR_NONE_ENROLLED = "BIOMETRIC_ERROR_NONE_ENROLLED";
    private static final String BIOMETRIC_ERROR_NOT_AVAILABLE = "BIOMETRIC_ERROR_NOT_AVAILABLE";
    private static final String BIOMETRIC_ERROR_HW_UNAVAILABLE = "BIOMETRIC_ERROR_HW_UNAVAILABLE";
    private static final String BIOMETRIC_STORAGE_KEY = "biometric_auth_state";

    private final ReactApplicationContext mReactContext;
    private final KeychainManager mKeychainManager;
    private final Executor mExecutor;

    /**
     * Initializes the BiometricModule with React Native context and sets up KeychainManager
     * Requirement: Security Authentication - Module initialization with secure storage
     */
    public BiometricModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.mReactContext = reactContext;
        this.mKeychainManager = KeychainManager.getInstance(reactContext);
        this.mExecutor = ContextCompat.getMainExecutor(reactContext);
    }

    /**
     * Returns the name of the native module for React Native bridge
     * Requirement: Security Authentication - Module registration
     */
    @Override
    public String getName() {
        return MODULE_NAME;
    }

    /**
     * Checks if biometric authentication is available and configured on the device
     * Requirement: Security Authentication - Biometric availability verification
     */
    @ReactMethod
    public void isBiometricAvailable(Promise promise) {
        try {
            BiometricManager biometricManager = BiometricManager.from(mReactContext);
            int result = biometricManager.canAuthenticate(BiometricManager.Authenticators.BIOMETRIC_STRONG);

            switch (result) {
                case BiometricManager.BIOMETRIC_SUCCESS:
                    promise.resolve(true);
                    break;
                case BiometricManager.BIOMETRIC_ERROR_NONE_ENROLLED:
                    promise.reject(BIOMETRIC_ERROR_NONE_ENROLLED, "No biometric credentials enrolled");
                    break;
                case BiometricManager.BIOMETRIC_ERROR_NO_HARDWARE:
                    promise.reject(BIOMETRIC_ERROR_NOT_AVAILABLE, "No biometric hardware");
                    break;
                case BiometricManager.BIOMETRIC_ERROR_HW_UNAVAILABLE:
                    promise.reject(BIOMETRIC_ERROR_HW_UNAVAILABLE, "Biometric hardware unavailable");
                    break;
                default:
                    promise.reject(BIOMETRIC_ERROR_NOT_AVAILABLE, "Biometric not available");
                    break;
            }
        } catch (Exception e) {
            promise.reject("ERROR", "Failed to check biometric availability: " + e.getMessage());
        }
    }

    /**
     * Initiates biometric authentication flow using BiometricPrompt
     * Requirement: Security Authentication - Biometric authentication implementation
     */
    @ReactMethod
    public void authenticate(String reason, Promise promise) {
        Activity activity = getCurrentActivity();
        if (activity == null || !(activity instanceof FragmentActivity)) {
            promise.reject("ERROR", "Activity unavailable");
            return;
        }

        FragmentActivity fragmentActivity = (FragmentActivity) activity;

        BiometricPrompt.PromptInfo promptInfo = new BiometricPrompt.PromptInfo.Builder()
                .setTitle("Biometric Authentication")
                .setSubtitle("Verify your identity")
                .setDescription(reason)
                .setNegativeButtonText("Cancel")
                .setConfirmationRequired(true)
                .build();

        BiometricPrompt biometricPrompt = new BiometricPrompt(fragmentActivity, mExecutor,
                new BiometricPrompt.AuthenticationCallback() {
                    @Override
                    public void onAuthenticationSucceeded(@NonNull BiometricPrompt.AuthenticationResult result) {
                        // Store successful authentication state
                        mKeychainManager.storeSecureData(BIOMETRIC_STORAGE_KEY, "authenticated");
                        promise.resolve(true);
                    }

                    @Override
                    public void onAuthenticationError(int errorCode, @NonNull CharSequence errString) {
                        switch (errorCode) {
                            case BiometricPrompt.ERROR_NEGATIVE_BUTTON:
                                promise.reject("USER_CANCELED", "User canceled authentication");
                                break;
                            case BiometricPrompt.ERROR_NO_BIOMETRICS:
                                promise.reject(BIOMETRIC_ERROR_NONE_ENROLLED, "No biometrics enrolled");
                                break;
                            default:
                                promise.reject("AUTH_ERROR", errString.toString());
                                break;
                        }
                    }

                    @Override
                    public void onAuthenticationFailed() {
                        // Authentication failed but not fatally - don't reject promise yet
                        // as user can retry
                    }
                });

        biometricPrompt.authenticate(promptInfo);
    }

    /**
     * Clears stored biometric authentication state
     * Requirement: Data Security - Secure state cleanup
     */
    @ReactMethod
    public void clearBiometricData(Promise promise) {
        try {
            boolean removed = mKeychainManager.removeSecureData(BIOMETRIC_STORAGE_KEY);
            if (removed) {
                promise.resolve(true);
            } else {
                promise.reject("ERROR", "Failed to clear biometric data");
            }
        } catch (Exception e) {
            promise.reject("ERROR", "Error clearing biometric data: " + e.getMessage());
        }
    }
}