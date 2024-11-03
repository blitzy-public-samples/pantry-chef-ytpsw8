package com.pantrychef.modules.biometric;

import com.facebook.react.ReactPackage;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.uimanager.ViewManager;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * React Native package class that registers the BiometricModule with the React Native bridge
 * for secure biometric authentication using device fingerprint and face recognition sensors.
 *
 * HUMAN TASKS:
 * 1. Verify BiometricModule is properly initialized in MainApplication.java
 * 2. Ensure proper permissions are set in AndroidManifest.xml for biometric hardware access
 */
public class BiometricPackage implements ReactPackage {

    /**
     * Creates and returns a list containing the BiometricModule instance for React Native bridge registration
     * Requirement: Security Authentication - Registers biometric authentication module for secure user verification
     * on Android devices using hardware-backed BiometricPrompt API
     */
    @Override
    public List<NativeModule> createNativeModules(ReactApplicationContext reactContext) {
        List<NativeModule> modules = new ArrayList<>();
        modules.add(new BiometricModule(reactContext));
        return modules;
    }

    /**
     * Returns an empty list since this package doesn't provide any UI components
     * Requirement: Data Security - Package focuses only on biometric authentication functionality
     * without exposing any UI components
     */
    @Override
    public List<ViewManager> createViewManagers(ReactApplicationContext reactContext) {
        return Collections.emptyList();
    }
}