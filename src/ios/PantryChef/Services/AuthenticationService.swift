//
// AuthenticationService.swift
// PantryChef
//
// HUMAN TASKS:
// 1. Configure OAuth2.0 client ID and secret in build configuration
// 2. Set up biometric authentication settings in production environment
// 3. Configure token refresh timing based on production requirements
// 4. Set up analytics tracking for authentication events
// 5. Review and adjust login attempt limits for production

import Foundation // iOS 13.0+
import Combine // iOS 13.0+

// MARK: - AuthenticationError
// Requirement: Security Protocols - Define comprehensive set of authentication operation errors
public enum AuthenticationError: Error {
    case invalidCredentials
    case tokenExpired
    case networkError
    case biometricsFailed
    case maxAttemptsReached
    case unknown
}

// MARK: - AuthenticationService
// Requirement: Authentication Flow - Implements secure authentication flow with JWT tokens and OAuth2.0
public final class AuthenticationService {
    // MARK: - Properties
    private var currentToken: String?
    private var loginAttempts: Int = 0
    private var isAuthenticated: Bool = false
    
    private var tokenRefreshTask: AnyCancellable?
    private var tokenValidationTimer: Timer?
    
    // MARK: - Singleton
    public static let shared = AuthenticationService()
    
    // MARK: - Initialization
    private init() {
        // Initialize properties with secure defaults
        self.loginAttempts = 0
        self.isAuthenticated = false
        
        // Set up notification observers for token expiration
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleAppDidBecomeActive),
            name: UIApplication.didBecomeActiveNotification,
            object: nil
        )
        
        // Configure initial authentication state
        validateStoredToken()
        
        Logger.shared.debug("AuthenticationService initialized")
    }
    
    // MARK: - Public Methods
    
    /// Authenticates user with email and password using JWT tokens
    /// - Parameters:
    ///   - email: User's email address
    ///   - password: User's password
    /// - Returns: Publisher emitting authentication result or error
    public func login(email: String, password: String) -> AnyPublisher<Bool, AuthenticationError> {
        Logger.shared.info("Attempting login for user: \(email)")
        
        // Validate login attempts
        guard loginAttempts < Security.maxLoginAttempts else {
            Logger.shared.warning("Maximum login attempts reached for: \(email)")
            return Fail(error: .maxAttemptsReached).eraseToAnyPublisher()
        }
        
        // Increment login attempts
        loginAttempts += 1
        
        // Prepare login request
        let credentials = [
            "email": email,
            "password": password
        ]
        
        // Make authentication request
        return NetworkService.shared.request(
            API.endpoints.auth + "/login",
            method: .post,
            body: credentials
        )
        .mapError { error -> AuthenticationError in
            Logger.shared.error("Login failed: \(error)")
            switch error {
            case .unauthorized:
                return .invalidCredentials
            case .noConnection:
                return .networkError
            default:
                return .unknown
            }
        }
        .flatMap { (response: [String: Any]) -> AnyPublisher<Bool, AuthenticationError> in
            // Extract and validate token
            guard let token = response["token"] as? String else {
                Logger.shared.error("Invalid token format received")
                return Fail(error: .invalidCredentials).eraseToAnyPublisher()
            }
            
            // Store token securely
            return self.handleAuthenticationSuccess(token: token)
        }
        .eraseToAnyPublisher()
    }
    
    /// Logs out current user and cleans up authentication state securely
    /// - Returns: Publisher indicating logout completion
    public func logout() -> AnyPublisher<Void, AuthenticationError> {
        Logger.shared.info("Initiating user logout")
        
        return Future<Void, AuthenticationError> { promise in
            // Clear stored token
            switch KeychainManager.shared.deleteToken("access") {
            case .success:
                // Reset authentication state
                self.currentToken = nil
                self.isAuthenticated = false
                self.loginAttempts = 0
                
                // Clear token from network service
                NetworkService.shared.clearAuthToken()
                
                // Stop token refresh and validation
                self.tokenRefreshTask?.cancel()
                self.tokenValidationTimer?.invalidate()
                
                Logger.shared.info("User logged out successfully")
                promise(.success(()))
                
            case .failure(let error):
                Logger.shared.error("Logout failed: \(error)")
                promise(.failure(.unknown))
            }
        }
        .eraseToAnyPublisher()
    }
    
    /// Refreshes the JWT authentication token before expiration
    /// - Returns: Publisher indicating refresh result
    public func refreshToken() -> AnyPublisher<Void, AuthenticationError> {
        Logger.shared.info("Attempting token refresh")
        
        return NetworkService.shared.request(
            API.endpoints.auth + "/refresh",
            method: .post
        )
        .mapError { error -> AuthenticationError in
            Logger.shared.error("Token refresh failed: \(error)")
            switch error {
            case .unauthorized:
                return .tokenExpired
            case .noConnection:
                return .networkError
            default:
                return .unknown
            }
        }
        .flatMap { (response: [String: Any]) -> AnyPublisher<Void, AuthenticationError> in
            // Extract and validate new token
            guard let newToken = response["token"] as? String else {
                Logger.shared.error("Invalid refresh token format")
                return Fail(error: .tokenExpired).eraseToAnyPublisher()
            }
            
            // Store refreshed token
            return self.handleTokenRefresh(newToken: newToken)
        }
        .eraseToAnyPublisher()
    }
    
    /// Validates the current JWT authentication token
    /// - Returns: Publisher indicating token validity
    public func validateToken() -> AnyPublisher<Bool, AuthenticationError> {
        Logger.shared.info("Validating current token")
        
        return Future<Bool, AuthenticationError> { promise in
            // Retrieve stored token
            switch KeychainManager.shared.retrieveToken("access") {
            case .success(let token):
                // Validate token with API
                NetworkService.shared.request(
                    API.endpoints.auth + "/validate",
                    method: .post
                )
                .sink(
                    receiveCompletion: { completion in
                        if case .failure(let error) = completion {
                            Logger.shared.error("Token validation failed: \(error)")
                            promise(.failure(.tokenExpired))
                        }
                    },
                    receiveValue: { (response: [String: Bool]) in
                        let isValid = response["valid"] ?? false
                        self.isAuthenticated = isValid
                        Logger.shared.info("Token validation result: \(isValid)")
                        promise(.success(isValid))
                    }
                )
                .store(in: &self.tokenRefreshTask)
                
            case .failure:
                Logger.shared.warning("No token found for validation")
                promise(.failure(.tokenExpired))
            }
        }
        .eraseToAnyPublisher()
    }
    
    // MARK: - Private Methods
    
    private func handleAuthenticationSuccess(token: String) -> AnyPublisher<Bool, AuthenticationError> {
        return Future<Bool, AuthenticationError> { promise in
            // Store token securely
            switch KeychainManager.shared.saveToken(token, type: "access") {
            case .success:
                // Update authentication state
                self.currentToken = token
                self.isAuthenticated = true
                self.loginAttempts = 0
                
                // Configure network service with token
                NetworkService.shared.setAuthToken(token)
                
                // Set up token refresh schedule
                self.scheduleTokenRefresh()
                
                // Start token validation timer
                self.startTokenValidationTimer()
                
                Logger.shared.info("Authentication successful")
                promise(.success(true))
                
            case .failure(let error):
                Logger.shared.error("Failed to store token: \(error)")
                promise(.failure(.unknown))
            }
        }
        .eraseToAnyPublisher()
    }
    
    private func handleTokenRefresh(newToken: String) -> AnyPublisher<Void, AuthenticationError> {
        return Future<Void, AuthenticationError> { promise in
            // Store new token
            switch KeychainManager.shared.saveToken(newToken, type: "access") {
            case .success:
                // Update current token
                self.currentToken = newToken
                NetworkService.shared.setAuthToken(newToken)
                
                // Reschedule refresh
                self.scheduleTokenRefresh()
                
                Logger.shared.info("Token refresh successful")
                promise(.success(()))
                
            case .failure(let error):
                Logger.shared.error("Failed to store refreshed token: \(error)")
                promise(.failure(.unknown))
            }
        }
        .eraseToAnyPublisher()
    }
    
    private func scheduleTokenRefresh() {
        // Cancel existing refresh task
        tokenRefreshTask?.cancel()
        
        // Schedule new refresh before token expiration
        let refreshTime = Security.tokenExpirationTime * 0.8 // Refresh at 80% of expiration time
        tokenRefreshTask = Just(())
            .delay(for: .seconds(refreshTime), scheduler: DispatchQueue.main)
            .flatMap { _ in self.refreshToken() }
            .sink(
                receiveCompletion: { completion in
                    if case .failure(let error) = completion {
                        Logger.shared.error("Scheduled token refresh failed: \(error)")
                    }
                },
                receiveValue: { _ in
                    Logger.shared.info("Scheduled token refresh completed")
                }
            )
    }
    
    private func startTokenValidationTimer() {
        // Invalidate existing timer
        tokenValidationTimer?.invalidate()
        
        // Create new validation timer
        tokenValidationTimer = Timer.scheduledTimer(
            withTimeInterval: 60, // Validate every minute
            repeats: true
        ) { [weak self] _ in
            self?.validateToken()
                .sink(
                    receiveCompletion: { _ in },
                    receiveValue: { _ in }
                )
                .store(in: &self?.tokenRefreshTask)
        }
    }
    
    private func validateStoredToken() {
        validateToken()
            .sink(
                receiveCompletion: { _ in },
                receiveValue: { isValid in
                    self.isAuthenticated = isValid
                }
            )
            .store(in: &tokenRefreshTask)
    }
    
    @objc private func handleAppDidBecomeActive() {
        validateStoredToken()
    }
    
    // MARK: - Deinitializer
    deinit {
        // Clean up observers and timers
        NotificationCenter.default.removeObserver(self)
        tokenValidationTimer?.invalidate()
        tokenRefreshTask?.cancel()
    }
}