//
// KeychainManager.swift
// PantryChef
//
// HUMAN TASKS:
// 1. Verify keychain access group configuration in Xcode capabilities
// 2. Configure biometric authentication settings in production environment
// 3. Review and adjust token expiration times for production use
// 4. Ensure proper keychain sharing setup for app extensions if needed

import Foundation // iOS 13.0+
import Security // iOS 13.0+

// MARK: - KeychainError
// Requirement: Security Protocols - Define possible keychain operation errors for error handling
public enum KeychainError: Error {
    case itemNotFound
    case duplicateItem
    case invalidItemFormat
    case unhandledError(OSStatus)
}

// MARK: - KeychainManager
// Requirement: Data Security - Implements AES-256 encryption for sensitive data storage in iOS Keychain
public final class KeychainManager {
    // MARK: - Properties
    private let serviceIdentifier: String
    private let accessGroup: String
    
    // MARK: - Singleton
    // Requirement: Security Protocols - Implements secure credential storage with device-level encryption
    public static let shared = KeychainManager()
    
    // MARK: - Initialization
    private init() {
        // Initialize service identifier with bundle identifier for keychain access
        self.serviceIdentifier = AppInfo.bundleIdentifier
        
        // Configure access group for keychain sharing if needed
        #if DEBUG
        self.accessGroup = "\(AppInfo.bundleIdentifier).debug"
        #else
        self.accessGroup = AppInfo.bundleIdentifier
        #endif
        
        Logger.shared.debug("KeychainManager initialized with service: \(serviceIdentifier)")
    }
    
    // MARK: - Public Methods
    
    /// Securely stores authentication token in keychain with AES-256 encryption
    /// - Parameters:
    ///   - token: The token string to store
    ///   - type: The type of token (e.g., "access", "refresh")
    /// - Returns: Result indicating success or specific error
    public func saveToken(_ token: String, type: String) -> Result<Void, KeychainError> {
        Logger.shared.info("Attempting to save token of type: \(type)")
        
        // Create query dictionary with security attributes
        var query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: serviceIdentifier,
            kSecAttrAccount as String: type,
            kSecAttrAccessGroup as String: accessGroup,
            kSecValueData as String: token.data(using: .utf8)!,
            
            // Configure AES-256 encryption
            kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly,
            kSecUseDataProtectionKeychain as String: true,
            
            // Add access control for biometric protection if enabled
            kSecAttrAccessControl as String: Security.requireBiometrics ? 
                SecAccessControlCreateWithFlags(
                    nil,
                    kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly,
                    .biometryAny,
                    nil
                )! : nil
        ]
        
        // Set token expiration based on security settings
        let expirationDate = Date().addingTimeInterval(Security.tokenExpirationTime)
        query[kSecAttrCreationDate as String] = expirationDate
        
        // Attempt to save token to keychain
        let status = SecItemAdd(query as CFDictionary, nil)
        
        switch status {
        case errSecSuccess:
            Logger.shared.info("Successfully saved token of type: \(type)")
            return .success(())
            
        case errSecDuplicateItem:
            Logger.shared.warning("Token already exists, attempting update for type: \(type)")
            // Update existing token
            let updateQuery: [String: Any] = [
                kSecClass as String: kSecClassGenericPassword,
                kSecAttrService as String: serviceIdentifier,
                kSecAttrAccount as String: type
            ]
            
            let updateAttributes: [String: Any] = [
                kSecValueData as String: token.data(using: .utf8)!,
                kSecAttrCreationDate as String: expirationDate
            ]
            
            let updateStatus = SecItemUpdate(
                updateQuery as CFDictionary,
                updateAttributes as CFDictionary
            )
            
            guard updateStatus == errSecSuccess else {
                Logger.shared.error("Failed to update token: \(updateStatus)")
                return .failure(.unhandledError(updateStatus))
            }
            
            Logger.shared.info("Successfully updated token of type: \(type)")
            return .success(())
            
        default:
            Logger.shared.error("Failed to save token: \(status)")
            return .failure(.unhandledError(status))
        }
    }
    
    /// Retrieves stored authentication token from keychain with validation
    /// - Parameter type: The type of token to retrieve
    /// - Returns: Result containing token string or error
    public func retrieveToken(_ type: String) -> Result<String, KeychainError> {
        Logger.shared.info("Attempting to retrieve token of type: \(type)")
        
        // Create query dictionary with security attributes
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: serviceIdentifier,
            kSecAttrAccount as String: type,
            kSecAttrAccessGroup as String: accessGroup,
            kSecMatchLimit as String: kSecMatchLimitOne,
            kSecReturnData as String: true,
            kSecReturnAttributes as String: true
        ]
        
        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        
        guard status == errSecSuccess,
              let itemDictionary = result as? [String: Any],
              let tokenData = itemDictionary[kSecValueData as String] as? Data,
              let token = String(data: tokenData, encoding: .utf8)
        else {
            if status == errSecItemNotFound {
                Logger.shared.warning("Token not found for type: \(type)")
                return .failure(.itemNotFound)
            }
            Logger.shared.error("Failed to retrieve token: \(status)")
            return .failure(.unhandledError(status))
        }
        
        // Validate token expiration
        if let creationDate = itemDictionary[kSecAttrCreationDate as String] as? Date {
            let expirationDate = creationDate.addingTimeInterval(Security.tokenExpirationTime)
            if Date() > expirationDate {
                Logger.shared.warning("Token expired for type: \(type)")
                // Delete expired token
                _ = deleteToken(type)
                return .failure(.itemNotFound)
            }
        }
        
        Logger.shared.info("Successfully retrieved token of type: \(type)")
        return .success(token)
    }
    
    /// Removes stored authentication token from keychain securely
    /// - Parameter type: The type of token to delete
    /// - Returns: Result indicating success or specific error
    public func deleteToken(_ type: String) -> Result<Void, KeychainError> {
        Logger.shared.info("Attempting to delete token of type: \(type)")
        
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: serviceIdentifier,
            kSecAttrAccount as String: type,
            kSecAttrAccessGroup as String: accessGroup
        ]
        
        let status = SecItemDelete(query as CFDictionary)
        
        guard status == errSecSuccess || status == errSecItemNotFound else {
            Logger.shared.error("Failed to delete token: \(status)")
            return .failure(.unhandledError(status))
        }
        
        Logger.shared.info("Successfully deleted token of type: \(type)")
        return .success(())
    }
    
    /// Removes all stored keychain items for the application securely
    /// - Returns: Result indicating success or specific error
    public func clearAll() -> Result<Void, KeychainError> {
        Logger.shared.info("Attempting to clear all keychain items")
        
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: serviceIdentifier,
            kSecAttrAccessGroup as String: accessGroup
        ]
        
        let status = SecItemDelete(query as CFDictionary)
        
        guard status == errSecSuccess || status == errSecItemNotFound else {
            Logger.shared.error("Failed to clear keychain items: \(status)")
            return .failure(.unhandledError(status))
        }
        
        Logger.shared.info("Successfully cleared all keychain items")
        return .success(())
    }
}