//
// AppDelegate.swift
// PantryChef
//
// HUMAN TASKS:
// 1. Configure push notification certificates in Apple Developer Portal
// 2. Set up notification service extension for rich notifications
// 3. Configure analytics tracking ID in AppConfig for each environment
// 4. Review and adjust notification permission request timing
// 5. Verify proper SSL certificate pinning configuration

import UIKit // iOS 13.0+
import UserNotifications // iOS 13.0+

// MARK: - AppDelegate
// Requirement: Mobile Applications - Implements core iOS application lifecycle management
@main
class AppDelegate: UIResponder, UIApplicationDelegate, UNUserNotificationCenterDelegate {
    
    // MARK: - Properties
    var window: UIWindow?
    
    // MARK: - Application Lifecycle
    
    /// Called when application launches
    /// Requirement: Mobile Applications - Handles application initialization and service setup
    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
    ) -> Bool {
        // Configure app environment and settings
        // Requirement: System Architecture - Initializes application configuration
        AppConfig.shared.configure(environment: AppConfig.shared.currentEnvironment)
        
        // Setup window and root view controller
        window = UIWindow(frame: UIScreen.main.bounds)
        window?.makeKeyAndVisible()
        
        // Request notification permissions
        // Requirement: Push Notifications - Initializes notification handling
        NotificationService.shared.requestPermissions { granted, error in
            if let error = error {
                Analytics.shared.trackError(error, parameters: [
                    "context": "notification_permission_request",
                    "granted": granted
                ])
            }
        }
        
        // Register for push notifications
        // Requirement: Push Notifications - Registers device for remote notifications
        NotificationService.shared.registerForPushNotifications()
        
        // Initialize analytics
        // Requirement: System Monitoring - Sets up analytics tracking
        Analytics.shared.configure(userId: nil, properties: [
            "launch_type": launchOptions != nil ? "background" : "normal",
            "environment": String(describing: AppConfig.shared.currentEnvironment)
        ])
        
        // Track app launch event
        Analytics.shared.trackEvent(
            eventType: .userAction,
            name: "app_launch",
            parameters: [
                "os_version": UIDevice.current.systemVersion,
                "device_model": UIDevice.current.model
            ]
        )
        
        return true
    }
    
    /// Called when app successfully registers for remote notifications
    /// Requirement: Push Notifications - Handles successful push notification registration
    func application(
        _ application: UIApplication,
        didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data
    ) {
        // Convert token data to string
        let tokenParts = deviceToken.map { data in String(format: "%02.2hhx", data) }
        let token = tokenParts.joined()
        
        // Track successful registration
        Analytics.shared.trackEvent(
            eventType: .userAction,
            name: "push_notification_registration_success",
            parameters: ["token": token]
        )
        
        // Register token with notification service
        NotificationService.shared.deviceToken = token
    }
    
    /// Called when app fails to register for remote notifications
    /// Requirement: System Monitoring - Handles and tracks notification registration failures
    func application(
        _ application: UIApplication,
        didFailToRegisterForRemoteNotificationsWithError error: Error
    ) {
        // Log notification registration failure
        print("Failed to register for remote notifications: \(error.localizedDescription)")
        
        // Track registration failure
        Analytics.shared.trackError(error, parameters: [
            "context": "push_notification_registration",
            "error_type": String(describing: type(of: error))
        ])
    }
    
    /// Handles incoming remote notifications
    /// Requirement: Push Notifications - Processes incoming push notifications
    func application(
        _ application: UIApplication,
        didReceiveRemoteNotification userInfo: [AnyHashable: Any],
        fetchCompletionHandler completionHandler: @escaping (UIBackgroundFetchResult) -> Void
    ) {
        // Process notification payload
        NotificationService.shared.handlePushNotification(userInfo)
        
        // Track notification received
        Analytics.shared.trackEvent(
            eventType: .userAction,
            name: "push_notification_received",
            parameters: [
                "notification_type": userInfo["type"] as? String ?? "unknown",
                "app_state": application.applicationState == .active ? "foreground" : "background"
            ]
        )
        
        completionHandler(.newData)
    }
    
    // MARK: - UNUserNotificationCenterDelegate
    
    /// Handles notification presentation when app is in foreground
    /// Requirement: Push Notifications - Manages notification presentation in foreground
    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification,
        withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
    ) {
        // Track notification presentation
        Analytics.shared.trackEvent(
            eventType: .userAction,
            name: "push_notification_presented",
            parameters: [
                "notification_id": notification.request.identifier,
                "category": notification.request.content.categoryIdentifier
            ]
        )
        
        // Show notification banner and play sound
        completionHandler([.banner, .sound])
    }
    
    /// Handles notification response when user interacts with notification
    /// Requirement: Push Notifications - Processes user interaction with notifications
    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse,
        withCompletionHandler completionHandler: @escaping () -> Void
    ) {
        // Track notification interaction
        Analytics.shared.trackEvent(
            eventType: .userAction,
            name: "push_notification_interaction",
            parameters: [
                "notification_id": response.notification.request.identifier,
                "action_id": response.actionIdentifier,
                "category": response.notification.request.content.categoryIdentifier
            ]
        )
        
        // Handle notification action
        NotificationService.shared.handlePushNotification(
            response.notification.request.content.userInfo
        )
        
        completionHandler()
    }
}