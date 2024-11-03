package com.pantrychef;

// React Native imports - version 0.70.0
import com.facebook.react.ReactApplication;
import com.facebook.react.ReactNativeHost;
import com.facebook.react.ReactPackage;
import com.facebook.react.PackageList;
import com.facebook.soloader.SoLoader; // version 0.10.4

// Android imports - API 21+
import android.app.Application;

// Internal imports
import com.pantrychef.core.Constants;
import com.pantrychef.modules.biometric.BiometricPackage;
import com.pantrychef.modules.camera.CameraPackage;
import com.pantrychef.modules.notification.NotificationPackage;

// Java imports
import java.util.List;
import java.util.ArrayList;

/**
 * HUMAN TASKS:
 * 1. Verify that all required permissions are declared in AndroidManifest.xml
 * 2. Ensure proper initialization of native modules in getPackages()
 * 3. Configure build variants for proper API endpoints in Constants
 * 4. Set up notification channels in Android 8.0+ (API 26+)
 * 5. Test biometric authentication initialization across different Android versions
 */

/**
 * Main Android application class that initializes React Native and native modules
 * Requirement: Mobile Application Architecture - Implements core mobile application initialization
 * Requirement: System Components - Configures and initializes mobile application components
 */
public class MainApplication extends Application implements ReactApplication {

    private final ReactNativeHost mReactNativeHost = createReactNativeHost();

    /**
     * Creates and configures the ReactNativeHost instance
     * Requirement: Mobile Application Architecture - React Native runtime configuration
     */
    private ReactNativeHost createReactNativeHost() {
        return new ReactNativeHost(this) {
            @Override
            public boolean getUseDeveloperSupport() {
                // Enable dev support for debug builds
                return BuildConfig.DEBUG;
            }

            /**
             * Configures React Native packages including custom native modules
             * Requirement: System Components - Native module registration
             */
            @Override
            protected List<ReactPackage> getPackages() {
                List<ReactPackage> packages = new PackageList(this).getPackages();
                // Add custom packages
                packages.add(new BiometricPackage()); // Requirement: Client Layer Security - Biometric authentication
                packages.add(new CameraPackage()); // Requirement: System Components - Camera integration
                packages.add(new NotificationPackage()); // Requirement: System Components - Push notifications
                return packages;
            }

            @Override
            protected String getJSMainModuleName() {
                return "index";
            }
        };
    }

    /**
     * Returns the configured ReactNativeHost instance
     * Requirement: Mobile Application Architecture - React Native host access
     */
    @Override
    public ReactNativeHost getReactNativeHost() {
        return mReactNativeHost;
    }

    /**
     * Application initialization callback
     * Requirement: System Components - Application-wide service initialization
     */
    @Override
    public void onCreate() {
        super.onCreate();

        // Initialize SoLoader for native code loading
        SoLoader.init(this, /* native exopackage */ false);

        // Initialize application-wide configurations
        initializeAppConfig();

        // Configure notification channels for Android 8.0+
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
            initializeNotificationChannels();
        }

        // Set up biometric authentication
        initializeBiometricAuth();
    }

    /**
     * Initializes application-wide configurations
     * Requirement: System Components - Application configuration
     */
    private void initializeAppConfig() {
        // Configure API endpoints based on build type
        String baseUrl = BuildConfig.DEBUG ? Constants.STAGING_URL : Constants.BASE_URL;
        
        // Initialize crash reporting and analytics
        // Note: Implementation depends on chosen analytics/crash reporting service
    }

    /**
     * Initializes notification channels for Android 8.0+
     * Requirement: System Components - Push notification configuration
     */
    private void initializeNotificationChannels() {
        // Implementation note: Create notification channels using NotificationManager
        // This is required for Android 8.0+ to show notifications
    }

    /**
     * Initializes biometric authentication capabilities
     * Requirement: Client Layer Security - Biometric authentication setup
     */
    private void initializeBiometricAuth() {
        // Implementation note: Set up biometric authentication prerequisites
        // This includes checking hardware capabilities and security requirements
    }
}