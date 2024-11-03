//
// NotificationService.swift
// PantryChef
//
// HUMAN TASKS:
// 1. Configure push notification certificates in Apple Developer Portal
// 2. Add notification category identifiers to Info.plist
// 3. Configure notification sound files in project bundle
// 4. Set up notification service extension for rich notifications if needed
// 5. Review notification permission request timing in app flow

import Foundation // iOS 13.0+
import UserNotifications // iOS 13.0+
import UIKit // iOS 13.0+

// MARK: - NotificationType
// Requirement: User Notifications - Defines supported notification types for the application
enum NotificationType {
    case expiringIngredients
    case newRecipes
    case shoppingListReminder
    case mealPlanReminder
}

// MARK: - NotificationService
// Requirement: Push Notifications - Manages push notifications and user notification preferences
final class NotificationService: NSObject {
    
    // MARK: - Singleton
    static let shared = NotificationService()
    
    // MARK: - Properties
    private let notificationCenter: UNUserNotificationCenter
    private(set) var deviceToken: String?
    private(set) var isRegistered: Bool = false
    
    // MARK: - Initialization
    private override init() {
        self.notificationCenter = UNUserNotificationCenter.current()
        super.init()
        
        // Requirement: Real-time Communication - Set up notification handling
        setupNotificationCategories()
        notificationCenter.delegate = self
        
        Logger.shared.debug("NotificationService initialized")
    }
    
    // MARK: - Private Methods
    
    private func setupNotificationCategories() {
        // Requirement: User Notifications - Configure notification categories and actions
        
        // Expiring ingredients actions
        let markUsedAction = UNNotificationAction(
            identifier: "MARK_USED",
            title: "Mark as Used",
            options: .foreground
        )
        
        let extendExpirationAction = UNNotificationAction(
            identifier: "EXTEND_EXPIRATION",
            title: "Extend Expiration",
            options: .foreground
        )
        
        let expiringCategory = UNNotificationCategory(
            identifier: "EXPIRING_INGREDIENTS",
            actions: [markUsedAction, extendExpirationAction],
            intentIdentifiers: [],
            options: .customDismissAction
        )
        
        // Recipe suggestion actions
        let viewRecipeAction = UNNotificationAction(
            identifier: "VIEW_RECIPE",
            title: "View Recipe",
            options: .foreground
        )
        
        let saveRecipeAction = UNNotificationAction(
            identifier: "SAVE_RECIPE",
            title: "Save for Later",
            options: .foreground
        )
        
        let recipeCategory = UNNotificationCategory(
            identifier: "NEW_RECIPES",
            actions: [viewRecipeAction, saveRecipeAction],
            intentIdentifiers: [],
            options: .customDismissAction
        )
        
        // Register categories
        notificationCenter.setNotificationCategories([
            expiringCategory,
            recipeCategory
        ])
        
        Logger.shared.debug("Notification categories configured")
    }
    
    // MARK: - Public Methods
    
    /// Request notification permissions from the user
    /// Requirement: Push Notifications - Handle notification permission requests
    func requestPermissions(completion: @escaping (Bool, Error?) -> Void) {
        guard Features.pushNotificationsEnabled else {
            Logger.shared.warning("Push notifications are disabled in Features configuration")
            completion(false, nil)
            return
        }
        
        let options: UNAuthorizationOptions = [.alert, .sound, .badge]
        
        notificationCenter.requestAuthorization(options: options) { [weak self] granted, error in
            DispatchQueue.main.async {
                if let error = error {
                    Logger.shared.error("Failed to request notification permissions: \(error.localizedDescription)")
                    completion(false, error)
                    return
                }
                
                self?.isRegistered = granted
                Logger.shared.debug("Notification permissions \(granted ? "granted" : "denied")")
                completion(granted, nil)
                
                if granted {
                    self?.registerForPushNotifications()
                }
            }
        }
    }
    
    /// Register device for remote push notifications
    /// Requirement: Push Notifications - Handle APNS registration
    func registerForPushNotifications() {
        DispatchQueue.main.async {
            UIApplication.shared.registerForRemoteNotifications()
            Logger.shared.debug("Registering for remote notifications")
        }
    }
    
    /// Schedule a local notification
    /// Requirement: User Notifications - Manage local notification delivery
    func scheduleLocalNotification(
        title: String,
        body: String,
        type: NotificationType,
        date: Date
    ) {
        let content = UNMutableNotificationContent()
        content.title = title
        content.body = body
        content.sound = .default
        
        // Set category based on notification type
        switch type {
        case .expiringIngredients:
            content.categoryIdentifier = "EXPIRING_INGREDIENTS"
        case .newRecipes:
            content.categoryIdentifier = "NEW_RECIPES"
        case .shoppingListReminder:
            content.categoryIdentifier = "SHOPPING_LIST"
        case .mealPlanReminder:
            content.categoryIdentifier = "MEAL_PLAN"
        }
        
        // Create unique identifier for the notification
        let identifier = "\(type)-\(UUID().uuidString)"
        
        // Create date components trigger
        let calendar = Calendar.current
        let components = calendar.dateComponents([.year, .month, .day, .hour, .minute], from: date)
        let trigger = UNCalendarNotificationTrigger(dateMatching: components, repeats: false)
        
        // Create and add notification request
        let request = UNNotificationRequest(identifier: identifier, content: content, trigger: trigger)
        
        notificationCenter.add(request) { error in
            if let error = error {
                Logger.shared.error("Failed to schedule local notification: \(error.localizedDescription)")
            } else {
                Logger.shared.debug("Local notification scheduled for \(date) with ID: \(identifier)")
            }
        }
    }
    
    /// Handle incoming push notification payload
    /// Requirement: Real-time Communication - Process incoming notifications
    func handlePushNotification(_ userInfo: [AnyHashable: Any]) {
        Logger.shared.debug("Handling push notification: \(userInfo)")
        
        // Extract notification type and data
        guard let typeString = userInfo["type"] as? String,
              let type = mapNotificationType(typeString) else {
            Logger.shared.error("Invalid notification type received")
            return
        }
        
        // Process notification based on type
        switch type {
        case .expiringIngredients:
            if let ingredients = userInfo["ingredients"] as? [String] {
                Logger.shared.debug("Processing expiring ingredients notification: \(ingredients)")
                // Post notification for UI update
                NotificationCenter.default.post(
                    name: NSNotification.Name("ExpiringIngredientsReceived"),
                    object: nil,
                    userInfo: ["ingredients": ingredients]
                )
            }
            
        case .newRecipes:
            if let recipeIds = userInfo["recipeIds"] as? [String] {
                Logger.shared.debug("Processing new recipes notification: \(recipeIds)")
                // Post notification for UI update
                NotificationCenter.default.post(
                    name: NSNotification.Name("NewRecipesReceived"),
                    object: nil,
                    userInfo: ["recipeIds": recipeIds]
                )
            }
            
        case .shoppingListReminder:
            Logger.shared.debug("Processing shopping list reminder")
            NotificationCenter.default.post(
                name: NSNotification.Name("ShoppingListReminderReceived"),
                object: nil
            )
            
        case .mealPlanReminder:
            Logger.shared.debug("Processing meal plan reminder")
            NotificationCenter.default.post(
                name: NSNotification.Name("MealPlanReminderReceived"),
                object: nil
            )
        }
    }
    
    /// Cancel a pending notification by identifier
    /// Requirement: User Notifications - Manage notification cancellation
    func cancelNotification(identifier: String) {
        notificationCenter.removePendingNotificationRequests(withIdentifiers: [identifier])
        Logger.shared.debug("Cancelled notification with ID: \(identifier)")
    }
    
    // MARK: - Helper Methods
    
    private func mapNotificationType(_ string: String) -> NotificationType? {
        switch string {
        case "expiring_ingredients":
            return .expiringIngredients
        case "new_recipes":
            return .newRecipes
        case "shopping_list_reminder":
            return .shoppingListReminder
        case "meal_plan_reminder":
            return .mealPlanReminder
        default:
            return nil
        }
    }
}

// MARK: - UNUserNotificationCenterDelegate
extension NotificationService: UNUserNotificationCenterDelegate {
    
    // Requirement: Real-time Communication - Handle notification presentation
    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification,
        withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
    ) {
        Logger.shared.debug("Will present notification: \(notification.request.identifier)")
        
        // Show notification banner and play sound when app is in foreground
        completionHandler([.banner, .sound])
    }
    
    // Requirement: User Notifications - Handle notification response
    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse,
        withCompletionHandler completionHandler: @escaping () -> Void
    ) {
        Logger.shared.debug("Did receive notification response: \(response.actionIdentifier)")
        
        // Handle notification actions
        switch response.actionIdentifier {
        case "MARK_USED":
            NotificationCenter.default.post(
                name: NSNotification.Name("MarkIngredientUsed"),
                object: nil,
                userInfo: response.notification.request.content.userInfo
            )
            
        case "EXTEND_EXPIRATION":
            NotificationCenter.default.post(
                name: NSNotification.Name("ExtendIngredientExpiration"),
                object: nil,
                userInfo: response.notification.request.content.userInfo
            )
            
        case "VIEW_RECIPE":
            NotificationCenter.default.post(
                name: NSNotification.Name("ViewRecipeFromNotification"),
                object: nil,
                userInfo: response.notification.request.content.userInfo
            )
            
        case "SAVE_RECIPE":
            NotificationCenter.default.post(
                name: NSNotification.Name("SaveRecipeFromNotification"),
                object: nil,
                userInfo: response.notification.request.content.userInfo
            )
            
        default:
            break
        }
        
        completionHandler()
    }
}