package com.pantrychef.core;

import android.os.Build; // API 21+

/**
 * Core constants class that defines application-wide constant values for the PantryChef Android application.
 * 
 * HUMAN TASKS:
 * 1. Verify API endpoints match backend deployment configuration
 * 2. Update STAGING_URL if different environment is used for testing
 * 3. Confirm CACHE_SIZE_MB value is appropriate for target devices
 * 4. Review WebSocket connection parameters with backend team
 */
public final class Constants {

    // API Configuration
    // Requirement: Mobile Application Architecture - API Integration
    public static final String API_VERSION = "v1";
    public static final String BASE_URL = "https://api.pantrychef.com";
    public static final String STAGING_URL = "https://api-staging.pantrychef.com";
    public static final String WEBSOCKET_URL = "wss://ws.pantrychef.com";

    // Cache Configuration
    // Requirement: Mobile Application Architecture - Local Storage
    public static final int CACHE_SIZE_MB = 50;
    public static final int CACHE_EXPIRY_HOURS = 24;
    public static final int IMAGE_UPLOAD_MAX_SIZE = 10 * 1024 * 1024; // 10MB
    
    // Network Configuration
    // Requirement: Mobile Application Architecture - API Integration
    public static final int REQUEST_TIMEOUT_MS = 30000;
    public static final int MAX_RETRY_ATTEMPTS = 3;
    
    // Local Storage Configuration
    // Requirement: Mobile Application Architecture - Local Storage
    public static final String SHARED_PREFS_NAME = "PantryChefPrefs";
    
    // Security Configuration
    public static final int MIN_PASSWORD_LENGTH = 8;
    
    // Image Processing Configuration
    public static final int MAX_IMAGE_DIMENSION = 1920;

    /**
     * API endpoint constants for backend service routes
     * Requirement: System Components - Component Specifications
     */
    public static final class ApiEndpoints {
        public static final String AUTH = "/auth";
        public static final String RECIPES = "/recipes";
        public static final String PANTRY = "/pantry";
        public static final String INGREDIENTS = "/ingredients";
        public static final String RECOGNITION = "/recognition";
        public static final String USER = "/user";
        public static final String ANALYTICS = "/analytics";
        public static final String SHOPPING = "/shopping";

        private ApiEndpoints() {
            // Prevent instantiation
        }
    }

    /**
     * Shared preference key constants for persistent storage
     * Requirement: Mobile Application Architecture - Local Storage
     */
    public static final class PreferenceKeys {
        public static final String AUTH_TOKEN = "auth_token";
        public static final String USER_ID = "user_id";
        public static final String DARK_MODE = "dark_mode";
        public static final String NOTIFICATIONS_ENABLED = "notifications_enabled";
        public static final String LAST_SYNC = "last_sync";
        public static final String DEVICE_TOKEN = "device_token";

        private PreferenceKeys() {
            // Prevent instantiation
        }
    }

    /**
     * Cache key constants for Redis caching layer
     * Requirement: Mobile Application Architecture - State Management
     */
    public static final class CacheKeys {
        public static final String RECIPE_LIST = "recipe_list";
        public static final String PANTRY_ITEMS = "pantry_items";
        public static final String USER_PREFERENCES = "user_preferences";
        public static final String SHOPPING_LIST = "shopping_list";
        public static final String RECENT_SEARCHES = "recent_searches";

        private CacheKeys() {
            // Prevent instantiation
        }
    }

    /**
     * WebSocket event constants for real-time updates
     * Requirement: Real-time Communication - WebSocket Events
     */
    public static final class WebSocketEvents {
        public static final String PANTRY_UPDATE = "pantry_update";
        public static final String RECIPE_MATCH = "recipe_match";
        public static final String NOTIFICATION = "notification";

        private WebSocketEvents() {
            // Prevent instantiation
        }
    }

    /**
     * Analytics event tracking constants
     * Requirement: Analytics Integration - Event Tracking
     */
    public static final class AnalyticsEvents {
        public static final String RECIPE_VIEW = "recipe_view";
        public static final String INGREDIENT_SCAN = "ingredient_scan";
        public static final String SHOPPING_LIST_CREATE = "shopping_list_create";

        private AnalyticsEvents() {
            // Prevent instantiation
        }
    }

    private Constants() {
        // Prevent instantiation
    }
}