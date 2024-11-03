//
// Analytics.swift
// PantryChef
//
// HUMAN TASKS:
// 1. Configure AWS CloudWatch credentials in production environment
// 2. Set up proper error reporting destination for production
// 3. Configure analytics event batching thresholds for production load
// 4. Review and adjust offline storage limits based on device capabilities

import Foundation // iOS 13.0+

// MARK: - Analytics Event Types
// Requirement: Analytics Integration - Defines types of analytics events for consistent tracking
public enum AnalyticsEventType {
    case screenView
    case userAction
    case error
    case performance
}

// MARK: - Analytics User Properties
// Requirement: Analytics Integration - Defines user property types for analytics tracking
public enum AnalyticsUserProperty {
    case userId
    case deviceType
    case appVersion
    case preferences
}

// MARK: - Analytics Class
// Requirement: Analytics Integration - Core analytics utility class providing centralized tracking functionality
public final class Analytics {
    
    // MARK: - Properties
    private var isEnabled: Bool
    private var userId: String?
    private var userProperties: [String: Any]
    private let analyticsQueue: DispatchQueue
    
    // Constants
    private let offlineStorageKey = "com.pantrychef.analytics.offline"
    private let maxOfflineEvents = 1000
    private let batchSize = Analytics.batchSize
    
    // MARK: - Singleton
    // Requirement: Analytics Integration - Implements singleton pattern for global access
    public static let shared = Analytics()
    
    // MARK: - Initialization
    private init() {
        self.isEnabled = Features.analyticsEnabled
        self.userProperties = [:]
        self.analyticsQueue = DispatchQueue(label: "com.pantrychef.analytics", qos: .background)
        
        // Configure default system properties
        self.userProperties[Analytics.userProperties.deviceType] = "ios"
        self.userProperties[Analytics.userProperties.appVersion] = AppInfo.version
        self.userProperties[Analytics.userProperties.osVersion] = UIDevice.current.systemVersion
        
        // Setup offline storage
        setupOfflineStorage()
    }
    
    // MARK: - Public Methods
    
    /// Configures analytics settings and user identification
    /// Requirement: Analytics Integration - Manages user property tracking
    public func configure(userId: String?, properties: [String: Any]? = nil) {
        analyticsQueue.async { [weak self] in
            guard let self = self else { return }
            
            self.userId = userId
            if let properties = properties {
                self.userProperties.merge(properties) { (_, new) in new }
            }
            
            // Update backend configuration
            self.syncConfiguration()
            
            // Attempt to send cached offline events
            self.syncOfflineEvents()
        }
    }
    
    /// Tracks an analytics event with the specified parameters
    /// Requirement: Analytics Integration - Provides event tracking functionality
    public func trackEvent(eventType: AnalyticsEventType, name: String, parameters: [String: Any]? = nil) {
        guard isEnabled else { return }
        
        analyticsQueue.async { [weak self] in
            guard let self = self else { return }
            
            var eventData: [String: Any] = [
                "type": String(describing: eventType),
                "name": name,
                "timestamp": Date().timeIntervalSince1970,
                "session_id": self.generateSessionId()
            ]
            
            // Add user context
            if let userId = self.userId {
                eventData["user_id"] = userId
            }
            eventData["device_properties"] = self.deviceProperties()
            
            // Add custom parameters
            if let parameters = parameters {
                eventData["parameters"] = parameters
            }
            
            // Send event to analytics backend
            self.sendEvent(eventData) { success in
                if !success {
                    self.cacheOfflineEvent(eventData)
                }
            }
        }
    }
    
    /// Tracks a screen view event with navigation context
    /// Requirement: Analytics Integration - Tracks screen view events
    public func trackScreen(_ screenName: String, parameters: [String: Any]? = nil) {
        var screenParams = parameters ?? [:]
        screenParams["screen_name"] = screenName
        screenParams["navigation_path"] = self.currentNavigationPath()
        
        trackEvent(eventType: .screenView, name: "screen_view", parameters: screenParams)
    }
    
    /// Tracks an error event with stack trace and context
    /// Requirement: System Monitoring - Tracks application errors
    public func trackError(_ error: Error, parameters: [String: Any]? = nil) {
        var errorParams = parameters ?? [:]
        errorParams["error_description"] = error.localizedDescription
        errorParams["error_code"] = (error as NSError).code
        errorParams["stack_trace"] = Thread.callStackSymbols
        
        trackEvent(eventType: .error, name: "error", parameters: errorParams)
    }
    
    // MARK: - Private Methods
    
    private func setupOfflineStorage() {
        if !UserDefaults.standard.bool(forKey: "analytics_storage_initialized") {
            UserDefaults.standard.set([], forKey: offlineStorageKey)
            UserDefaults.standard.set(true, forKey: "analytics_storage_initialized")
        }
    }
    
    private func syncConfiguration() {
        let configData: [String: Any] = [
            "user_id": userId as Any,
            "properties": userProperties,
            "app_version": AppInfo.version,
            "device_type": "ios"
        ]
        
        let url = URL(string: "\(API.baseURL)/\(API.version)\(API.endpoints.analytics)/config")!
        // Implementation of network request to sync configuration
    }
    
    private func sendEvent(_ eventData: [String: Any], completion: @escaping (Bool) -> Void) {
        let url = URL(string: "\(API.baseURL)/\(API.version)\(API.endpoints.analytics)/events")!
        // Implementation of network request to send event
        // Requirement: Usage Metrics - Sends analytics data to backend
    }
    
    private func cacheOfflineEvent(_ eventData: [String: Any]) {
        var offlineEvents = UserDefaults.standard.array(forKey: offlineStorageKey) as? [[String: Any]] ?? []
        
        // Maintain maximum offline events limit
        if offlineEvents.count >= maxOfflineEvents {
            offlineEvents.removeFirst()
        }
        
        offlineEvents.append(eventData)
        UserDefaults.standard.set(offlineEvents, forKey: offlineStorageKey)
    }
    
    private func syncOfflineEvents() {
        guard let offlineEvents = UserDefaults.standard.array(forKey: offlineStorageKey) as? [[String: Any]] else {
            return
        }
        
        // Process events in batches
        for i in stride(from: 0, to: offlineEvents.count, by: batchSize) {
            let batchEnd = min(i + batchSize, offlineEvents.count)
            let batch = Array(offlineEvents[i..<batchEnd])
            
            // Send batch to analytics backend
            sendEventBatch(batch) { success in
                if success {
                    // Remove successfully sent events from offline storage
                    var remainingEvents = offlineEvents
                    remainingEvents.removeSubrange(i..<batchEnd)
                    UserDefaults.standard.set(remainingEvents, forKey: self.offlineStorageKey)
                }
            }
        }
    }
    
    private func sendEventBatch(_ events: [[String: Any]], completion: @escaping (Bool) -> Void) {
        let url = URL(string: "\(API.baseURL)/\(API.version)\(API.endpoints.analytics)/events/batch")!
        // Implementation of network request to send event batch
    }
    
    private func generateSessionId() -> String {
        // Implementation of session ID generation
        return UUID().uuidString
    }
    
    private func deviceProperties() -> [String: Any] {
        return [
            "model": UIDevice.current.model,
            "os_version": UIDevice.current.systemVersion,
            "app_version": AppInfo.version,
            "build_number": AppInfo.buildNumber
        ]
    }
    
    private func currentNavigationPath() -> String {
        // Implementation to get current navigation path
        return "" // Placeholder
    }
}