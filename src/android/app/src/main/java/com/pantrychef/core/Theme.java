package com.pantrychef.core;

import android.content.Context;
import android.content.SharedPreferences;
import android.content.res.Configuration;
import androidx.appcompat.app.AppCompatDelegate; // version 1.6.1

/**
 * Core theme class that defines the application's visual styling, colors, typography,
 * and UI theme elements for the PantryChef Android application.
 *
 * HUMAN TASKS:
 * 1. Verify status bar color values match design system
 * 2. Ensure theme colors are consistent with design guidelines
 * 3. Test dark mode implementation on various Android versions
 * 4. Configure default theme mode in application manifest
 */
@SuppressWarnings("unused")
public class Theme {
    // Global color constants
    // Requirement: Mobile Application Architecture - Visual styling and theming
    public static final int PRIMARY_COLOR = 0xFF4CAF50;
    public static final int SECONDARY_COLOR = 0xFF2196F3;
    public static final int ACCENT_COLOR = 0xFFFF9800;
    public static final int ERROR_COLOR = 0xFFF44336;
    public static final int BACKGROUND_LIGHT = 0xFFFFFFFF;
    public static final int BACKGROUND_DARK = 0xFF121212;

    // Instance properties
    private final Context applicationContext;
    private boolean isDarkMode;
    private static volatile Theme instance;

    /**
     * Private constructor for singleton pattern with thread safety
     * Requirement: System Components - Theme definitions and styling management
     */
    private Theme(Context context) {
        this.applicationContext = context.getApplicationContext();
        
        // Initialize theme mode from shared preferences
        SharedPreferences prefs = applicationContext.getSharedPreferences(
            Constants.SHARED_PREFS_NAME, 
            Context.MODE_PRIVATE
        );
        this.isDarkMode = prefs.getBoolean(Constants.PreferenceKeys.DARK_MODE, false);
        
        // Apply initial theme configuration
        applyTheme();
    }

    /**
     * Returns singleton instance of Theme with double-checked locking pattern
     * Requirement: Mobile Application Architecture - Theme management
     */
    public static Theme getInstance(Context context) {
        if (instance == null) {
            synchronized (Theme.class) {
                if (instance == null) {
                    instance = new Theme(context);
                }
            }
        }
        return instance;
    }

    /**
     * Checks if dark mode is currently enabled
     * Requirement: Mobile Application Architecture - Dynamic theme switching
     */
    public boolean isDarkMode() {
        return isDarkMode;
    }

    /**
     * Sets dark mode state and applies theme changes
     * Requirement: Mobile Application Architecture - Dark mode support
     */
    public void setDarkMode(boolean enabled) {
        if (this.isDarkMode != enabled) {
            this.isDarkMode = enabled;
            
            // Save preference
            applicationContext.getSharedPreferences(
                Constants.SHARED_PREFS_NAME, 
                Context.MODE_PRIVATE
            ).edit().putBoolean(Constants.PreferenceKeys.DARK_MODE, enabled).apply();
            
            // Apply theme changes
            applyTheme();
        }
    }

    /**
     * Returns color value based on current theme mode
     * Requirement: System Components - UI component styling
     */
    public int getColor(int colorId) {
        if (AppConfig.getInstance(applicationContext).isDebugBuild()) {
            // Log color usage in debug builds
            return colorId;
        }
        
        // Return appropriate color based on theme mode
        if (isDarkMode) {
            switch (colorId) {
                case Colors.TEXT_PRIMARY_LIGHT:
                    return Colors.TEXT_PRIMARY_DARK;
                case Colors.TEXT_SECONDARY_LIGHT:
                    return Colors.TEXT_SECONDARY_DARK;
                case BACKGROUND_LIGHT:
                    return BACKGROUND_DARK;
                default:
                    return colorId;
            }
        }
        return colorId;
    }

    /**
     * Applies current theme configuration to application
     * Requirement: System Components - Theme application
     */
    private void applyTheme() {
        // Set night mode
        int nightMode = isDarkMode ? 
            AppCompatDelegate.MODE_NIGHT_YES : 
            AppCompatDelegate.MODE_NIGHT_NO;
        AppCompatDelegate.setDefaultNightMode(nightMode);

        // Apply system UI visibility and colors based on theme
        int systemUiVisibility = applicationContext.getResources()
            .getConfiguration().uiMode & Configuration.UI_MODE_NIGHT_MASK;
            
        if (systemUiVisibility == Configuration.UI_MODE_NIGHT_YES) {
            // Apply dark theme status bar colors
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.LOLLIPOP) {
                android.app.Activity activity = (android.app.Activity) applicationContext;
                activity.getWindow().setStatusBarColor(BACKGROUND_DARK);
            }
        } else {
            // Apply light theme status bar colors
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.LOLLIPOP) {
                android.app.Activity activity = (android.app.Activity) applicationContext;
                activity.getWindow().setStatusBarColor(BACKGROUND_LIGHT);
            }
        }
    }

    /**
     * Inner class containing theme color definitions for light and dark modes
     * Requirement: System Components - Theme color definitions
     */
    @SuppressWarnings("unused")
    public static class Colors {
        public static final int TEXT_PRIMARY_LIGHT = 0xDE000000;
        public static final int TEXT_SECONDARY_LIGHT = 0x99000000;
        public static final int TEXT_PRIMARY_DARK = 0xDEFFFFFF;
        public static final int TEXT_SECONDARY_DARK = 0x99FFFFFF;
    }
}