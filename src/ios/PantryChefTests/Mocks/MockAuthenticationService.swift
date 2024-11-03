//
// MockAuthenticationService.swift
// PantryChefTests
//
// HUMAN TASKS:
// 1. Configure test-specific token validation timing if needed
// 2. Set up test-specific error scenarios in test suites
// 3. Configure test-specific login attempt limits

import Foundation // iOS 13.0+
import Combine // iOS 13.0+
import XCTest // iOS 13.0+

// Requirement: Authentication Flow Testing - Mock implementation for testing JWT-based authentication flows
@testable import PantryChef

final class MockAuthenticationService {
    // MARK: - Properties
    private var currentToken: String?
    private var loginAttempts: Int = 0
    private var isAuthenticated: Bool = false
    private var shouldSucceed: Bool
    private var mockError: AuthenticationError?
    
    // MARK: - Initialization
    
    /// Initializes mock service with configurable behavior for testing different authentication scenarios
    /// - Parameter shouldSucceed: Flag to control success/failure of authentication operations
    init(shouldSucceed: Bool = true) {
        self.shouldSucceed = shouldSucceed
        reset()
    }
    
    // MARK: - Public Methods
    
    /// Mocks user authentication with email and password
    /// - Parameters:
    ///   - email: User's email address
    ///   - password: User's password
    /// - Returns: Publisher emitting mock authentication result or configured error
    func login(email: String, password: String) -> AnyPublisher<Bool, AuthenticationError> {
        // Requirement: Security Testing - Test login attempt limits
        loginAttempts += 1
        
        if let error = mockError {
            return Fail(error: error).eraseToAnyPublisher()
        }
        
        return Future<Bool, AuthenticationError> { promise in
            if self.shouldSucceed {
                self.isAuthenticated = true
                self.currentToken = "mock_jwt_token_\(UUID().uuidString)"
                promise(.success(true))
            } else {
                promise(.failure(.invalidCredentials))
            }
        }
        .eraseToAnyPublisher()
    }
    
    /// Mocks user logout process
    /// - Returns: Publisher indicating mock logout completion
    func logout() -> AnyPublisher<Void, AuthenticationError> {
        return Future<Void, AuthenticationError> { promise in
            self.currentToken = nil
            self.isAuthenticated = false
            self.loginAttempts = 0
            promise(.success(()))
        }
        .eraseToAnyPublisher()
    }
    
    /// Mocks token refresh process
    /// - Returns: Publisher indicating mock refresh result
    func refreshToken() -> AnyPublisher<Void, AuthenticationError> {
        if let error = mockError {
            return Fail(error: error).eraseToAnyPublisher()
        }
        
        return Future<Void, AuthenticationError> { promise in
            if self.shouldSucceed {
                self.currentToken = "mock_refreshed_token_\(UUID().uuidString)"
                promise(.success(()))
            } else {
                promise(.failure(.tokenExpired))
            }
        }
        .eraseToAnyPublisher()
    }
    
    /// Mocks token validation process
    /// - Returns: Publisher indicating mock token validity
    func validateToken() -> AnyPublisher<Bool, AuthenticationError> {
        if let error = mockError {
            return Fail(error: error).eraseToAnyPublisher()
        }
        
        return Future<Bool, AuthenticationError> { promise in
            if self.shouldSucceed && self.currentToken != nil {
                promise(.success(true))
            } else {
                promise(.failure(.tokenExpired))
            }
        }
        .eraseToAnyPublisher()
    }
    
    /// Sets specific authentication error for testing error scenarios
    /// - Parameter error: The authentication error to simulate
    func setMockError(_ error: AuthenticationError) {
        self.mockError = error
    }
    
    /// Resets mock service to initial state for test isolation
    func reset() {
        currentToken = nil
        loginAttempts = 0
        isAuthenticated = false
        mockError = nil
    }
}

// MARK: - AuthenticationService Protocol Conformance
extension MockAuthenticationService: AuthenticationServiceProtocol {
    var isUserAuthenticated: Bool {
        return isAuthenticated
    }
}