package com.pantrychef;

// React Native imports - version 0.70.0
import com.facebook.react.ReactActivity;
import com.facebook.react.ReactActivityDelegate;
import com.facebook.react.defaults.DefaultReactActivityDelegate;

// Android imports
import android.os.Bundle;
import android.content.pm.PackageManager;

// Internal imports
import com.pantrychef.utils.PermissionManager;

/**
 * HUMAN TASKS:
 * 1. Verify camera permissions are declared in AndroidManifest.xml
 * 2. Configure camera permission rationale strings in strings.xml
 * 3. Test camera permissions across different Android versions
 * 4. Verify proper camera initialization in React Native bridge
 */

/**
 * Main activity class for the PantryChef Android application
 * Requirement: Mobile Application Integration - Implements the main Android activity
 * Requirement: Native Module Integration - Integrates React Native with native functionality
 */
public class MainActivity extends ReactActivity {

    private PermissionManager permissionManager;

    /**
     * Default constructor
     * Requirement: Mobile Application Integration - Activity initialization
     */
    public MainActivity() {
        super();
    }

    /**
     * Returns the name of the main component registered from JavaScript
     * Requirement: Mobile Application Integration - React Native component registration
     */
    @Override
    protected String getMainComponentName() {
        return "PantryChef";
    }

    /**
     * Activity creation lifecycle callback
     * Requirement: Native Module Integration - Native Android initialization
     * Requirement: Image Recognition Component - Camera permissions handling
     */
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Initialize permission manager
        permissionManager = PermissionManager.getInstance(this);
        
        // Check and request camera permission if needed
        if (!permissionManager.checkCameraPermission()) {
            permissionManager.requestCameraPermission(new PermissionManager.PermissionCallback() {
                @Override
                public void onPermissionGranted(String permission) {
                    // Camera permission granted, React Native can now access camera
                }

                @Override
                public void onPermissionDenied(String permission) {
                    // Handle permission denial in React Native
                }
            });
        }
    }

    /**
     * Creates the React Native activity delegate
     * Requirement: Mobile Application Integration - React Native lifecycle management
     */
    @Override
    protected ReactActivityDelegate createReactActivityDelegate() {
        return new DefaultReactActivityDelegate(
            this,
            getMainComponentName(),
            // If you opted-in for the New Architecture, we enable the Fabric Renderer
            // Disabled by default as it's experimental
            false
        );
    }

    /**
     * Handles permission request results
     * Requirement: Image Recognition Component - Camera permission handling
     */
    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        // Forward permission results to PermissionManager
        permissionManager.onRequestPermissionsResult(requestCode, permissions, grantResults);
    }
}