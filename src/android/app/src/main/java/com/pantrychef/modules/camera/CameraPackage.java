// React Native version: 0.68.0
package com.pantrychef.modules.camera;

import com.facebook.react.ReactPackage;
import com.facebook.react.bridge.NativeModule;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.uimanager.ViewManager;

import java.util.ArrayList;
import java.util.List;

/**
 * React Native package implementation that registers the camera native module for ingredient recognition
 * 
 * HUMAN TASKS:
 * 1. Verify that CameraModule is properly initialized in the MainApplication.java
 * 2. Ensure camera permissions are declared in AndroidManifest.xml
 * 3. Test camera module registration across different React Native versions
 */
public class CameraPackage implements ReactPackage {

    /**
     * Creates and returns a list of native modules to register with React Native
     * Requirement: Mobile Application Architecture - Implements native camera module registration for React Native mobile app
     */
    @Override
    public List<NativeModule> createNativeModules(ReactApplicationContext reactContext) {
        List<NativeModule> modules = new ArrayList<>();
        modules.add(new CameraModule(reactContext));
        return modules;
    }

    /**
     * Creates and returns a list of view managers (empty for this package as no custom views are needed)
     * Requirement: Mobile Application Architecture - View manager registration
     */
    @Override
    public List<ViewManager> createViewManagers(ReactApplicationContext reactContext) {
        return new ArrayList<>();
    }
}