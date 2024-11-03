//
// AuthenticationServiceTests.swift
// PantryChefTests
//
// HUMAN TASKS:
// 1. Configure test environment variables for OAuth2.0 credentials
// 2. Set up test keychain access groups in project capabilities
// 3. Configure test-specific rate limiting parameters
// 4. Set up test analytics tracking configuration

import XCTest // iOS 13.0+
import Combine // iOS 13.0+
@testable import PantryChef

// Requirement: Authentication Flow Testing - Test suite for verifying secure authentication flows
final class AuthenticationServiceTests: XCTestCase {
    // MARK: - Properties
    private var sut: AuthenticationService!
    private var mockService: MockAuthenticationService!
    private var cancellables: Set<AnyCancellable>!
    
    // MARK: - Setup & Teardown
    override func setUp() {
        super.setUp()
        sut = AuthenticationService.shared
        mockService = MockAuthenticationService()
        cancellables = Set<AnyCancellable>()
    }
    
    override func tearDown() {
        cancellables.forEach { $0.cancel() }
        cancellables = nil
        mockService.reset()
        // Ensure clean authentication state
        try? sut.logout().sink(
            receiveCompletion: { _ in },
            receiveValue: { }
        ).store(in: &cancellables)
        super.tearDown()
    }
    
    // MARK: - Login Tests
    
    // Requirement: Authentication Flow Testing - Verify successful login flow with valid credentials
    func testLoginSuccess() {
        // Given
        let expectation = XCTestExpectation(description: "Login success")
        let testEmail = "test@example.com"
        let testPassword = "SecurePass123!"
        
        // When
        sut.login(email: testEmail, password: testPassword)
            .sink(
                receiveCompletion: { completion in
                    if case .failure(let error) = completion {
                        XCTFail("Login should succeed but failed with error: \(error)")
                    }
                },
                receiveValue: { success in
                    // Then
                    XCTAssertTrue(success, "Login should return true")
                    XCTAssertTrue(self.sut.isAuthenticated, "User should be authenticated")
                    expectation.fulfill()
                }
            )
            .store(in: &cancellables)
        
        wait(for: [expectation], timeout: 5.0)
    }
    
    // Requirement: Security Testing - Verify login failure handling with invalid credentials
    func testLoginFailure() {
        // Given
        let expectation = XCTestExpectation(description: "Login failure")
        let invalidEmail = "invalid@example.com"
        let invalidPassword = "wrong"
        mockService.setMockError(.invalidCredentials)
        
        // When
        mockService.login(email: invalidEmail, password: invalidPassword)
            .sink(
                receiveCompletion: { completion in
                    if case .failure(let error) = completion {
                        // Then
                        XCTAssertEqual(error, AuthenticationError.invalidCredentials)
                        XCTAssertFalse(self.mockService.isUserAuthenticated)
                        expectation.fulfill()
                    }
                },
                receiveValue: { _ in
                    XCTFail("Login should fail with invalid credentials")
                }
            )
            .store(in: &cancellables)
        
        wait(for: [expectation], timeout: 5.0)
    }
    
    // MARK: - Logout Tests
    
    // Requirement: Authentication Flow Testing - Verify secure logout process
    func testLogout() {
        // Given
        let loginExpectation = XCTestExpectation(description: "Login before logout")
        let logoutExpectation = XCTestExpectation(description: "Logout success")
        
        // First login
        mockService.login(email: "test@example.com", password: "SecurePass123!")
            .sink(
                receiveCompletion: { _ in },
                receiveValue: { _ in
                    loginExpectation.fulfill()
                    
                    // When
                    self.mockService.logout()
                        .sink(
                            receiveCompletion: { completion in
                                if case .failure(let error) = completion {
                                    XCTFail("Logout failed with error: \(error)")
                                }
                            },
                            receiveValue: {
                                // Then
                                XCTAssertFalse(self.mockService.isUserAuthenticated)
                                logoutExpectation.fulfill()
                            }
                        )
                        .store(in: &self.cancellables)
                }
            )
            .store(in: &cancellables)
        
        wait(for: [loginExpectation, logoutExpectation], timeout: 5.0)
    }
    
    // MARK: - Token Tests
    
    // Requirement: Authentication Flow Testing - Verify token refresh mechanism
    func testTokenRefresh() {
        // Given
        let expectation = XCTestExpectation(description: "Token refresh")
        
        // Login first to get initial token
        mockService.login(email: "test@example.com", password: "SecurePass123!")
            .flatMap { _ -> AnyPublisher<Void, AuthenticationError> in
                // When
                return self.mockService.refreshToken()
            }
            .sink(
                receiveCompletion: { completion in
                    if case .failure(let error) = completion {
                        XCTFail("Token refresh failed with error: \(error)")
                    }
                },
                receiveValue: {
                    // Then
                    XCTAssertTrue(self.mockService.isUserAuthenticated)
                    expectation.fulfill()
                }
            )
            .store(in: &cancellables)
        
        wait(for: [expectation], timeout: 5.0)
    }
    
    // Requirement: Security Testing - Verify token validation process
    func testTokenValidation() {
        // Given
        let expectation = XCTestExpectation(description: "Token validation")
        
        // Login first to get a valid token
        mockService.login(email: "test@example.com", password: "SecurePass123!")
            .flatMap { _ -> AnyPublisher<Bool, AuthenticationError> in
                // When
                return self.mockService.validateToken()
            }
            .sink(
                receiveCompletion: { completion in
                    if case .failure(let error) = completion {
                        XCTFail("Token validation failed with error: \(error)")
                    }
                },
                receiveValue: { isValid in
                    // Then
                    XCTAssertTrue(isValid)
                    XCTAssertTrue(self.mockService.isUserAuthenticated)
                    expectation.fulfill()
                }
            )
            .store(in: &cancellables)
        
        wait(for: [expectation], timeout: 5.0)
    }
    
    // MARK: - Security Tests
    
    // Requirement: Access Control Testing - Verify maximum login attempts handling
    func testMaxLoginAttempts() {
        // Given
        let expectation = XCTestExpectation(description: "Max login attempts")
        mockService.setMockError(.invalidCredentials)
        
        // When - Attempt multiple logins
        var attempts = 0
        func attemptLogin() {
            mockService.login(email: "test@example.com", password: "wrong")
                .sink(
                    receiveCompletion: { completion in
                        if case .failure(let error) = completion {
                            attempts += 1
                            if attempts < 5 {
                                attemptLogin()
                            } else {
                                // Then
                                XCTAssertEqual(error, AuthenticationError.maxAttemptsReached)
                                XCTAssertFalse(self.mockService.isUserAuthenticated)
                                expectation.fulfill()
                            }
                        }
                    },
                    receiveValue: { _ in
                        XCTFail("Login should fail with invalid credentials")
                    }
                )
                .store(in: &cancellables)
        }
        
        attemptLogin()
        wait(for: [expectation], timeout: 5.0)
    }
    
    // Requirement: Security Testing - Verify token expiration handling
    func testTokenExpiration() {
        // Given
        let expectation = XCTestExpectation(description: "Token expiration")
        mockService.setMockError(.tokenExpired)
        
        // When
        mockService.validateToken()
            .sink(
                receiveCompletion: { completion in
                    if case .failure(let error) = completion {
                        // Then
                        XCTAssertEqual(error, AuthenticationError.tokenExpired)
                        XCTAssertFalse(self.mockService.isUserAuthenticated)
                        expectation.fulfill()
                    }
                },
                receiveValue: { _ in
                    XCTFail("Validation should fail with expired token")
                }
            )
            .store(in: &cancellables)
        
        wait(for: [expectation], timeout: 5.0)
    }
    
    // Requirement: Security Testing - Verify network error handling
    func testNetworkError() {
        // Given
        let expectation = XCTestExpectation(description: "Network error")
        mockService.setMockError(.networkError)
        
        // When
        mockService.login(email: "test@example.com", password: "SecurePass123!")
            .sink(
                receiveCompletion: { completion in
                    if case .failure(let error) = completion {
                        // Then
                        XCTAssertEqual(error, AuthenticationError.networkError)
                        XCTAssertFalse(self.mockService.isUserAuthenticated)
                        expectation.fulfill()
                    }
                },
                receiveValue: { _ in
                    XCTFail("Login should fail with network error")
                }
            )
            .store(in: &cancellables)
        
        wait(for: [expectation], timeout: 5.0)
    }
    
    // MARK: - State Management Tests
    
    // Requirement: Authentication Flow Testing - Verify authentication state management
    func testAuthenticationState() {
        // Given
        let expectation = XCTestExpectation(description: "Authentication state")
        
        // When - Test state transitions
        mockService.login(email: "test@example.com", password: "SecurePass123!")
            .flatMap { _ -> AnyPublisher<Void, AuthenticationError> in
                XCTAssertTrue(self.mockService.isUserAuthenticated)
                return self.mockService.logout()
            }
            .sink(
                receiveCompletion: { completion in
                    if case .failure(let error) = completion {
                        XCTFail("State transition failed with error: \(error)")
                    }
                },
                receiveValue: {
                    // Then
                    XCTAssertFalse(self.mockService.isUserAuthenticated)
                    expectation.fulfill()
                }
            )
            .store(in: &cancellables)
        
        wait(for: [expectation], timeout: 5.0)
    }
}