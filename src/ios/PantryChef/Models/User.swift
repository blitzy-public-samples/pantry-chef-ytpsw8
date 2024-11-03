//
// User.swift
// PantryChef
//
// HUMAN TASKS:
// 1. Configure keychain access groups in project capabilities for secure credential storage
// 2. Review and adjust password validation rules based on security requirements
// 3. Set up push notification entitlements for user notifications
// 4. Configure biometric authentication capabilities in project settings

import Foundation // iOS 13.0+
import Combine // iOS 13.0+

// MARK: - User Model
// Requirement: User Authentication - User authentication and profile management for iOS client with secure data handling
@objc
@objcMembers
class User: NSObject, Codable, Equatable, ObservableObject {
    // MARK: - Properties
    let id: String
    var email: String
    var firstName: String
    var lastName: String
    var profileImage: String?
    var preferences: UserPreferences
    var dietaryRestrictions: [DietaryRestriction]
    var savedRecipeIds: [String]
    var pantryIds: [String]
    var lastLogin: Date
    var createdAt: Date
    var updatedAt: Date
    @Published var isAuthenticated: Bool
    
    // MARK: - Initialization
    // Requirement: User Authentication - Secure initialization of user data
    init(id: String, email: String, firstName: String, lastName: String) {
        self.id = id
        self.email = email
        self.firstName = firstName
        self.lastName = lastName
        
        // Initialize with default values
        self.preferences = UserPreferences(
            theme: .system,
            language: Locale.current.languageCode ?? "en",
            measurementSystem: .metric,
            notificationSettings: NotificationSettings(
                expirationAlerts: true,
                lowStockAlerts: true,
                recipeRecommendations: true,
                emailNotifications: true,
                pushNotifications: true
            ),
            cuisinePreferences: [],
            skillLevel: .beginner
        )
        
        self.dietaryRestrictions = []
        self.savedRecipeIds = []
        self.pantryIds = []
        self.lastLogin = Date()
        self.createdAt = Date()
        self.updatedAt = Date()
        self.isAuthenticated = false
        
        super.init()
    }
    
    // MARK: - Profile Management
    // Requirement: User Preference Management - Management of user preferences and settings
    func updateProfile(firstName: String? = nil, lastName: String? = nil, profileImage: String? = nil) {
        // Validate input parameters
        if let newFirstName = firstName {
            guard !newFirstName.isEmpty && newFirstName.count <= 50 else { return }
            self.firstName = newFirstName
        }
        
        if let newLastName = lastName {
            guard !newLastName.isEmpty && newLastName.count <= 50 else { return }
            self.lastName = newLastName
        }
        
        if let newProfileImage = profileImage {
            guard !newProfileImage.isEmpty else { return }
            self.profileImage = newProfileImage
        }
        
        self.updatedAt = Date()
        
        // Post notification for profile update
        NotificationCenter.default.post(
            name: NSNotification.Name("UserProfileUpdated"),
            object: self
        )
    }
    
    // Requirement: User Preference Management - Updates user preferences with validation
    func updatePreferences(_ newPreferences: UserPreferences) {
        // Validate preference values
        guard newPreferences.language.count == 2 else { return } // ISO 639-1 language code
        guard !newPreferences.cuisinePreferences.contains(where: { $0.isEmpty }) else { return }
        
        self.preferences = newPreferences
        self.updatedAt = Date()
        
        // Post notification for preferences update
        NotificationCenter.default.post(
            name: NSNotification.Name("UserPreferencesUpdated"),
            object: self
        )
    }
    
    // Requirement: User Preference Management - Management of dietary restrictions
    func addDietaryRestriction(_ restriction: DietaryRestriction) -> Bool {
        // Check if restriction already exists
        guard !dietaryRestrictions.contains(restriction) else {
            return false
        }
        
        dietaryRestrictions.append(restriction)
        updatedAt = Date()
        
        // Post notification for dietary restrictions update
        NotificationCenter.default.post(
            name: NSNotification.Name("UserDietaryRestrictionsUpdated"),
            object: self
        )
        
        return true
    }
    
    // MARK: - Equatable
    static func == (lhs: User, rhs: User) -> Bool {
        return lhs.id == rhs.id
    }
}

// MARK: - Theme Enum
// Requirement: User Preference Management - Theme management for personalized experience
enum Theme: String, Codable {
    case light
    case dark
    case system
}

// MARK: - MeasurementSystem Enum
// Requirement: User Preference Management - Measurement system preferences
enum MeasurementSystem: String, Codable {
    case metric
    case imperial
}

// MARK: - SkillLevel Enum
// Requirement: User Preference Management - Cooking skill level tracking
enum SkillLevel: String, Codable {
    case beginner
    case intermediate
    case advanced
}

// MARK: - DietaryRestriction Enum
// Requirement: User Preference Management - Dietary restriction management
enum DietaryRestriction: String, Codable {
    case vegetarian
    case vegan
    case glutenFree
    case dairyFree
    case nutFree
    case halal
    case kosher
}

// MARK: - UserPreferences Struct
// Requirement: User Preference Management - Comprehensive user preferences management
struct UserPreferences: Codable, Equatable {
    var theme: Theme
    var language: String
    var measurementSystem: MeasurementSystem
    var notificationSettings: NotificationSettings
    var cuisinePreferences: [String]
    var skillLevel: SkillLevel
}

// MARK: - NotificationSettings Struct
// Requirement: User Preference Management - Notification preferences management
struct NotificationSettings: Codable, Equatable {
    var expirationAlerts: Bool
    var lowStockAlerts: Bool
    var recipeRecommendations: Bool
    var emailNotifications: Bool
    var pushNotifications: Bool
}