//
// Constants.swift
// PantryChef
//
// HUMAN TASKS:
// 1. Update API.baseURL with actual production/staging URLs before deployment
// 2. Configure analytics tracking ID in production environment
// 3. Review and adjust security timeouts based on production requirements
// 4. Enable/disable feature flags based on app capabilities in production

import Foundation // iOS 13.0+

// MARK: - App Information
struct AppInfo {
    static let version = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "1.0.0"
    static let buildNumber = Bundle.main.infoDictionary?["CFBundleVersion"] as? String ?? "1"
    static let bundleIdentifier = Bundle.main.bundleIdentifier ?? "com.pantrychef.app"
}

// MARK: - API Configuration
// Requirement: API Design - Defines API endpoint constants and configuration values
struct API {
    static let baseURL = "https://api.pantrychef.com"
    static let version = "v1"
    static let timeout: TimeInterval = 30.0
    
    struct endpoints {
        static let auth = "/auth"
        static let ingredients = "/ingredients"
        static let recipes = "/recipes"
        static let pantry = "/pantry"
        static let users = "/users"
        static let recognition = "/recognition"
        static let analytics = "/analytics"
    }
}

// MARK: - Feature Flags
// Requirement: System Architecture - Defines core configuration constants for iOS native implementation
struct Features {
    static let imageRecognitionEnabled = true
    static let webSocketEnabled = true
    static let analyticsEnabled = true
    static let pushNotificationsEnabled = true
    static let offlineModeEnabled = true
}

// MARK: - Layout Constants
// Requirement: System Architecture - Defines core configuration constants for iOS native implementation
struct Layout {
    static let spacing: CGFloat = 8.0
    static let cornerRadius: CGFloat = 12.0
    static let iconSize: CGFloat = 24.0
    static let margins: CGFloat = 16.0
}

// MARK: - Security Configuration
// Requirement: Security Architecture - Defines security-related constants and configuration values
struct Security {
    static let tokenExpirationTime: TimeInterval = 3600 // 1 hour
    static let maxLoginAttempts = 5
    static let minimumPasswordLength = 8
    static let requireBiometrics = true
    static let secureStorageKey = "com.pantrychef.securestorage"
}

// MARK: - Analytics Configuration
// Requirement: Analytics Integration - Defines analytics tracking constants and event names
struct Analytics {
    static let sessionTimeout: TimeInterval = 1800 // 30 minutes
    static let batchSize = 100
    
    struct eventNames {
        static let appLaunch = "app_launch"
        static let login = "user_login"
        static let signup = "user_signup"
        static let ingredientRecognition = "ingredient_recognition"
        static let recipeView = "recipe_view"
        static let recipeSave = "recipe_save"
        static let pantryUpdate = "pantry_update"
        static let shoppingListGenerate = "shopping_list_generate"
    }
    
    struct userProperties {
        static let userId = "user_id"
        static let deviceType = "ios"
        static let appVersion = "app_version"
        static let osVersion = "os_version"
        static let subscriptionStatus = "subscription_status"
        static let lastLoginDate = "last_login_date"
        static let totalRecognitions = "total_recognitions"
        static let savedRecipes = "saved_recipes"
    }
}