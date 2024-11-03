package com.pantrychef.modules.notification;

// React Native imports - version 0.70.0
import com.facebook.react.ReactPackage;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.uimanager.ViewManager;

// Java imports
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * HUMAN TASKS:
 * 1. Verify NotificationModule is properly registered in MainApplication.java's getPackages() method
 * 2. Ensure notification permissions are configured in AndroidManifest.xml
 */

/**
 * React Native package implementation for registering the notification native module
 * Requirement: Push Notifications - Enables push notifications and real-time updates
 * Requirement: Real-time Communication - Integrates with React Native WebSocket client
 */
public class NotificationPackage implements ReactPackage {

    /**
     * Creates and returns a list of native modules to register with the React Native bridge
     * Requirement: Push Notifications - Native module registration
     * @param reactContext The React Native application context
     * @return List containing the NotificationModule instance
     */
    @Override
    public List<NativeModule> createNativeModules(ReactApplicationContext reactContext) {
        List<NativeModule> modules = new ArrayList<>();
        modules.add(new NotificationModule(reactContext));
        return modules;
    }

    /**
     * Creates and returns a list of view managers (empty as this package doesn't include custom views)
     * @param reactContext The React Native application context
     * @return Empty list as no custom view managers are needed for notifications
     */
    @Override
    public List<ViewManager> createViewManagers(ReactApplicationContext reactContext) {
        return Collections.emptyList();
    }
}