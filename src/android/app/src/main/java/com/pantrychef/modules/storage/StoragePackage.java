package com.pantrychef.modules.storage;

// react-native v0.64.0
import com.facebook.react.ReactPackage;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.uimanager.ViewManager;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * React Native package implementation for registering the StorageModule with React Native's native module system,
 * enabling secure storage functionality with AES-256 encryption in the PantryChef mobile application.
 *
 * HUMAN TASKS:
 * 1. Verify package registration in MainApplication.java's getPackages() method
 * 2. Ensure ProGuard/R8 rules preserve React Native package registration
 */
public class StoragePackage implements ReactPackage {

    /**
     * Creates and returns a list of native modules to register with React Native
     * Requirement: Local Storage - Enables registration of secure local storage functionality for mobile application data persistence
     * Requirement: Data Security - Registers secure storage module that implements AES-256 encryption for sensitive data
     *
     * @param reactContext The React Native application context
     * @return List containing StorageModule instance initialized with reactContext
     */
    @Override
    public List<NativeModule> createNativeModules(ReactApplicationContext reactContext) {
        List<NativeModule> modules = new ArrayList<>();
        modules.add(new StorageModule(reactContext));
        return modules;
    }

    /**
     * Creates and returns a list of view managers (empty as this package has no UI components)
     *
     * @param reactContext The React Native application context
     * @return Empty list as no view managers are needed for storage functionality
     */
    @Override
    public List<ViewManager> createViewManagers(ReactApplicationContext reactContext) {
        return Collections.emptyList();
    }
}