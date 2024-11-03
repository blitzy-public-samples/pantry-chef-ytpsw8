//
// AppConfig.swift
// PantryChef
//
// HUMAN TASKS:
// 1. Update environment-specific API URLs in production deployment
// 2. Configure analytics tracking ID for each environment
// 3. Review and adjust timeout values for production use
// 4. Verify WebSocket URLs for each environment
// 5. Enable/disable appropriate feature flags per environment

import Foundation // iOS 13.0+

// MARK: - Environment Enumeration
// Requirement: System Architecture - Implements client-side configuration management
@objc public enum Environment: Int {
    case development
    case staging
    case production
}

// MARK: - AppConfig
// Requirement: Mobile Applications - Manages mobile app configuration and environment settings
@objc public final class AppConfig: NSObject {
    // MARK: - Singleton
    public static let shared = AppConfig()
    
    // MARK: - Properties
    public private(set) var currentEnvironment: Environment
    public private(set) var apiBaseURL: String
    public private(set) var webSocketURL: String
    public private(set) var apiTimeout: TimeInterval
    public private(set) var debugLoggingEnabled: Bool
    public private(set) var analyticsEnabled: Bool
    public private(set) var pushNotificationsEnabled: Bool
    
    // MARK: - Initialization
    private override init() {
        // Set default environment to development
        self.currentEnvironment = .development
        
        // Initialize API configuration
        self.apiBaseURL = Constants.API.baseURL
        self.apiTimeout = Constants.API.timeout
        
        // Initialize WebSocket URL based on environment
        self.webSocketURL = "\(Constants.API.baseURL.replacingOccurrences(of: "http", with: "ws"))/ws"
        
        // Enable debug logging for development
        self.debugLoggingEnabled = true
        
        // Initialize feature flags
        self.analyticsEnabled = Constants.Features.analyticsEnabled
        self.pushNotificationsEnabled = Constants.Features.pushNotificationsEnabled
        
        super.init()
        
        // Configure default environment
        configure(environment: .development)
    }
    
    // MARK: - Configuration
    // Requirement: Security Protocols - Manages security configuration and API access settings
    public func configure(environment: Environment) {
        self.currentEnvironment = environment
        
        // Configure API endpoints based on environment
        switch environment {
        case .development:
            apiBaseURL = "https://dev-api.pantrychef.com"
            webSocketURL = "wss://dev-api.pantrychef.com/ws"
            debugLoggingEnabled = true
            
        case .staging:
            apiBaseURL = "https://staging-api.pantrychef.com"
            webSocketURL = "wss://staging-api.pantrychef.com/ws"
            debugLoggingEnabled = true
            
        case .production:
            apiBaseURL = Constants.API.baseURL
            webSocketURL = "wss://api.pantrychef.com/ws"
            debugLoggingEnabled = false
        }
        
        // Configure analytics based on environment and feature flags
        analyticsEnabled = Constants.Features.analyticsEnabled && (environment == .production)
        
        // Configure push notifications based on environment and feature flags
        pushNotificationsEnabled = Constants.Features.pushNotificationsEnabled && (environment != .development)
        
        // Set up debug logging for development environment
        debugLoggingEnabled = environment != .production
        
        // Apply theme configuration
        Theme.shared.applyTheme(to: UIApplication.shared.windows.first ?? UIView())
    }
    
    // MARK: - API Endpoint Management
    // Requirement: System Architecture - Implements client-side configuration management
    public func getAPIEndpoint(path: String) -> URL? {
        // Validate path parameter
        guard !path.isEmpty else {
            return nil
        }
        
        // Construct the full URL
        var components = URLComponents(string: apiBaseURL)
        
        // Add API version
        var fullPath = "/\(Constants.API.version)"
        
        // Add the path (ensure it starts with /)
        if !path.hasPrefix("/") {
            fullPath += "/"
        }
        fullPath += path
        
        components?.path = fullPath
        
        return components?.url
    }
}