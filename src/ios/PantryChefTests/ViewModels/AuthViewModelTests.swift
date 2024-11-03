//
// AuthViewModelTests.swift
// PantryChefTests
//
// HUMAN TASKS:
// 1. Configure test-specific token validation timing
// 2. Set up test environment variables for authentication timeouts
// 3. Configure test coverage thresholds in CI/CD pipeline
// 4. Review and update test cases when security requirements change

import XCTest // iOS 13.0+
import Combine // iOS 13.0+
@testable import PantryChef

// Requirement: Authentication Flow Testing - Comprehensive test suite for AuthViewModel
final class AuthViewModelTests: XCTestCase {
    // MARK: - Properties
    private var sut: AuthViewModel!
    private var mockAuthService: MockAuthenticationService!
    private var cancellables: Set<AnyCancellable>!
    private let testTimeout: TimeInterval = 5.0
    
    // MARK: - Setup & Teardown
    override func setUp() {
        super.setUp()
        mockAuthService = MockAuthenticationService()
        sut = AuthViewModel()
        cancellables = Set<AnyCancellable>()
    }
    
    override func tearDown() {
        mockAuthService.reset()
        cancellables.forEach { $0.cancel() }
        cancellables = nil
        sut = nil
        mockAuthService = nil
        super.tearDown()
    }
    
    // MARK: - Login Tests
    
    // Requirement: Authentication Flow Testing - Verify successful login flow
    func testLoginSuccess() {
        // Given
        let expectation = XCTestExpectation(description: "Login success")
        let email = "test@example.com"
        let password = "Test@123"
        var output: AuthViewModelOutput?
        
        // When
        let input = Just(AuthViewModelInput.login(email: email, password: password))
            .eraseToAnyPublisher()
        
        sut.transform(input: input)
            .sink { result in
                output = result
                expectation.fulfill()
            }
            .store(in: &cancellables)
        
        // Then
        wait(for: [expectation], timeout: testTimeout)
        
        if case .loginSuccess(let user) = output {
            XCTAssertEqual(user.email, email)
            XCTAssertTrue(sut.state.value.isAuthenticated)
            XCTAssertNotNil(sut.state.value.currentUser)
            XCTAssertEqual(sut.state.value.loginAttempts, 0)
        } else {
            XCTFail("Expected login success but got \(String(describing: output))")
        }
    }
    
    // Requirement: Security Testing - Verify login failure handling
    func testLoginFailure() {
        // Given
        let expectation = XCTestExpectation(description: "Login failure")
        mockAuthService.setMockError(.invalidCredentials)
        let email = "test@example.com"
        let password = "invalid"
        var output: AuthViewModelOutput?
        
        // When
        let input = Just(AuthViewModelInput.login(email: email, password: password))
            .eraseToAnyPublisher()
        
        sut.transform(input: input)
            .sink { result in
                output = result
                expectation.fulfill()
            }
            .store(in: &cancellables)
        
        // Then
        wait(for: [expectation], timeout: testTimeout)
        
        if case .loginFailure(let error) = output {
            XCTAssertEqual(error, .invalidCredentials)
            XCTAssertFalse(sut.state.value.isAuthenticated)
            XCTAssertNil(sut.state.value.currentUser)
            XCTAssertGreaterThan(sut.state.value.loginAttempts, 0)
        } else {
            XCTFail("Expected login failure but got \(String(describing: output))")
        }
    }
    
    // MARK: - Token Tests
    
    // Requirement: Authentication Flow Testing - Verify token refresh mechanism
    func testTokenRefresh() {
        // Given
        let expectation = XCTestExpectation(description: "Token refresh")
        var output: AuthViewModelOutput?
        
        // When
        let input = Just(AuthViewModelInput.refreshToken)
            .eraseToAnyPublisher()
        
        sut.transform(input: input)
            .sink { result in
                output = result
                expectation.fulfill()
            }
            .store(in: &cancellables)
        
        // Then
        wait(for: [expectation], timeout: testTimeout)
        
        if case .tokenRefreshSuccess = output {
            XCTAssertTrue(sut.state.value.isTokenValid)
        } else {
            XCTFail("Expected token refresh success but got \(String(describing: output))")
        }
    }
    
    // Requirement: Security Testing - Verify token validation
    func testTokenValidation() {
        // Given
        let expectation = XCTestExpectation(description: "Token validation")
        var output: AuthViewModelOutput?
        
        // When
        let input = Just(AuthViewModelInput.validateToken)
            .eraseToAnyPublisher()
        
        sut.transform(input: input)
            .sink { result in
                output = result
                expectation.fulfill()
            }
            .store(in: &cancellables)
        
        // Then
        wait(for: [expectation], timeout: testTimeout)
        
        if case .tokenValidationSuccess(let isValid) = output {
            XCTAssertTrue(isValid)
            XCTAssertTrue(sut.state.value.isTokenValid)
        } else {
            XCTFail("Expected token validation success but got \(String(describing: output))")
        }
    }
    
    // MARK: - Logout Tests
    
    // Requirement: Security Testing - Verify logout and token cleanup
    func testLogoutSuccess() {
        // Given
        let expectation = XCTestExpectation(description: "Logout success")
        var output: AuthViewModelOutput?
        
        // When
        let input = Just(AuthViewModelInput.logout)
            .eraseToAnyPublisher()
        
        sut.transform(input: input)
            .sink { result in
                output = result
                expectation.fulfill()
            }
            .store(in: &cancellables)
        
        // Then
        wait(for: [expectation], timeout: testTimeout)
        
        if case .logoutSuccess = output {
            XCTAssertFalse(sut.state.value.isAuthenticated)
            XCTAssertNil(sut.state.value.currentUser)
            XCTAssertFalse(sut.state.value.isTokenValid)
            XCTAssertEqual(sut.state.value.loginAttempts, 0)
        } else {
            XCTFail("Expected logout success but got \(String(describing: output))")
        }
    }
    
    // MARK: - Validation Tests
    
    // Requirement: Security Testing - Verify email validation
    func testEmailValidation() {
        // Given
        let expectation = XCTestExpectation(description: "Email validation")
        let invalidEmails = [
            "test", // Missing @ and domain
            "test@", // Missing domain
            "@example.com", // Missing local part
            "test@example", // Missing TLD
            "test@@example.com", // Double @
            "'; DROP TABLE users;--" // SQL injection attempt
        ]
        
        for email in invalidEmails {
            var output: AuthViewModelOutput?
            
            // When
            let input = Just(AuthViewModelInput.validateEmail(email))
                .eraseToAnyPublisher()
            
            sut.transform(input: input)
                .sink { result in
                    output = result
                    expectation.fulfill()
                }
                .store(in: &cancellables)
            
            // Then
            wait(for: [expectation], timeout: testTimeout)
            
            if case .validationError(let field, _) = output {
                XCTAssertEqual(field, "email")
                XCTAssertNotNil(sut.state.value.emailValidationError)
            } else {
                XCTFail("Expected validation error for invalid email: \(email)")
            }
        }
        
        // Test valid email
        let validEmail = "test@example.com"
        let input = Just(AuthViewModelInput.validateEmail(validEmail))
            .eraseToAnyPublisher()
        
        sut.transform(input: input)
            .sink { _ in }
            .store(in: &cancellables)
        
        XCTAssertNil(sut.state.value.emailValidationError)
    }
    
    // Requirement: Security Testing - Verify password validation
    func testPasswordValidation() {
        // Given
        let expectation = XCTestExpectation(description: "Password validation")
        let invalidPasswords = [
            "short", // Too short
            "nouppercaseornumber", // Missing uppercase and number
            "NOLOWERCASEORNUMBER", // Missing lowercase and number
            "NoSpecialChar123", // Missing special character
            "No@Spaces Allowed", // Contains spaces
            "WeakPass123" // Meets some but not all requirements
        ]
        
        for password in invalidPasswords {
            var output: AuthViewModelOutput?
            
            // When
            let input = Just(AuthViewModelInput.validatePassword(password))
                .eraseToAnyPublisher()
            
            sut.transform(input: input)
                .sink { result in
                    output = result
                    expectation.fulfill()
                }
                .store(in: &cancellables)
            
            // Then
            wait(for: [expectation], timeout: testTimeout)
            
            if case .validationError(let field, _) = output {
                XCTAssertEqual(field, "password")
                XCTAssertNotNil(sut.state.value.passwordValidationError)
            } else {
                XCTFail("Expected validation error for invalid password: \(password)")
            }
        }
        
        // Test valid password
        let validPassword = "Test@123"
        let input = Just(AuthViewModelInput.validatePassword(validPassword))
            .eraseToAnyPublisher()
        
        sut.transform(input: input)
            .sink { _ in }
            .store(in: &cancellables)
        
        XCTAssertNil(sut.state.value.passwordValidationError)
    }
    
    // Requirement: Security Testing - Verify login attempt limiting
    func testLoginAttemptLimiting() {
        // Given
        let expectation = XCTestExpectation(description: "Login attempts")
        mockAuthService.setMockError(.invalidCredentials)
        let maxAttempts = 3
        var attempts = 0
        
        // When
        for _ in 0..<maxAttempts + 1 {
            let input = Just(AuthViewModelInput.login(email: "test@example.com", password: "wrong"))
                .eraseToAnyPublisher()
            
            sut.transform(input: input)
                .sink { result in
                    if case .loginFailure = result {
                        attempts += 1
                    }
                    if attempts == maxAttempts + 1 {
                        expectation.fulfill()
                    }
                }
                .store(in: &cancellables)
        }
        
        // Then
        wait(for: [expectation], timeout: testTimeout)
        XCTAssertGreaterThanOrEqual(sut.state.value.loginAttempts, maxAttempts)
        XCTAssertFalse(sut.state.value.isAuthenticated)
    }
}