package com.pantrychef.core;

import android.content.Context;
import android.content.pm.PackageManager;
import android.os.Build;

/**
 * Core configuration class that manages environment-specific settings, feature flags,
 * and application configuration for the PantryChef Android application.
 *
 * HUMAN TASKS:
 * 1. Verify BuildConfig.DEBUG flag is properly set in build.gradle
 * 2. Ensure proper environment variables are set in build variants
 * 3. Configure analytics and crash reporting services in respective environments
 * 4. Review cache size limits for different device types
 */
public class AppConfig {
    // Global configuration flags from BuildConfig
    public static final boolean DEBUG = BuildConfig.DEBUG;
    public static final String ENVIRONMENT = BuildConfig.BUILD_TYPE;
    public static final int VERSION_CODE = BuildConfig.VERSION_CODE;
    public static final String VERSION_NAME = BuildConfig.VERSION_NAME;

    // Singleton instance with volatile for thread-safety
    private static volatile AppConfig instance;

    // Instance properties
    private final String apiBaseUrl;
    private final boolean analyticsEnabled;
    private final boolean crashReportingEnabled;
    private final int cacheSizeLimit;
    private final Context applicationContext;

    /**
     * Private constructor for singleton pattern
     * Requirement: Mobile Application Architecture - Configuration management
     */
    private AppConfig(Context context) {
        this.applicationContext = context.getApplicationContext();
        
        // Initialize API base URL based on environment
        this.apiBaseUrl = ENVIRONMENT.equals("staging") ? Constants.STAGING_URL : Constants.BASE_URL;
        
        // Configure analytics and crash reporting based on environment
        // Requirement: Security Protocols - Environment-specific parameters
        this.analyticsEnabled = !DEBUG && !ENVIRONMENT.equals("staging");
        this.crashReportingEnabled = !DEBUG && !ENVIRONMENT.equals("staging");
        
        // Set cache size limit from constants
        // Requirement: System Components - Cache management
        this.cacheSizeLimit = Constants.CACHE_SIZE_MB;
    }

    /**
     * Returns singleton instance with double-checked locking pattern
     * Requirement: Mobile Application Architecture - Thread-safe configuration access
     */
    public static AppConfig getInstance(Context context) {
        if (instance == null) {
            synchronized (AppConfig.class) {
                if (instance == null) {
                    instance = new AppConfig(context);
                }
            }
        }
        return instance;
    }

    /**
     * Returns the environment-specific API base URL
     * Requirement: Mobile Application Architecture - API integration settings
     */
    public String getApiBaseUrl() {
        return apiBaseUrl;
    }

    /**
     * Checks if analytics tracking is enabled for current environment
     * Requirement: System Components - Analytics configuration
     */
    public boolean isAnalyticsEnabled() {
        return analyticsEnabled;
    }

    /**
     * Checks if crash reporting is enabled for current environment
     * Requirement: System Components - Analytics configuration
     */
    public boolean isCrashReportingEnabled() {
        return crashReportingEnabled;
    }

    /**
     * Returns the maximum cache size limit in megabytes
     * Requirement: System Components - Cache management
     */
    public int getCacheSizeLimit() {
        return cacheSizeLimit;
    }

    /**
     * Checks if application is running in debug mode
     * Requirement: Mobile Application Architecture - Environment settings
     */
    public boolean isDebugBuild() {
        return DEBUG;
    }
}