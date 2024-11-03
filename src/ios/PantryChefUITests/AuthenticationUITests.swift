// HUMAN TASKS:
// 1. Configure test environment with mock OAuth2.0 credentials
// 2. Set up test data for valid/invalid authentication scenarios
// 3. Configure test analytics tracking
// 4. Review and update accessibility identifiers if needed
// 5. Set up test coverage reporting

import XCTest // iOS 13.0+

/// UI test suite for testing authentication flows including login, signup, and validation scenarios
/// Validates JWT-based authentication and OAuth2.0 integration
final class AuthenticationUITests: XCTestCase {
    
    // MARK: - Properties
    
    private var app: XCUIApplication!
    
    // Test credentials
    private let validEmail = "test@example.com"
    private let validPassword = "Test123!@#"
    private let validFirstName = "John"
    private let validLastName = "Doe"
    private let invalidEmail = "invalid.email"
    private let weakPassword = "123"
    
    // MARK: - Setup & Teardown
    
    /// Requirement: Authentication Flow - Setup test environment for authentication testing
    override func setUp() {
        super.setUp()
        
        // Initialize app instance
        app = XCUIApplication()
        
        // Configure test environment
        app.launchArguments = ["UI_TESTING"]
        app.launchEnvironment = [
            "IS_UI_TESTING": "1",
            "MOCK_AUTH_ENABLED": "1"
        ]
        
        // Launch app in test mode
        app.launch()
    }
    
    override func tearDown() {
        // Clean up test environment
        app.terminate()
        super.tearDown()
    }
    
    // MARK: - Login Tests
    
    /// Requirement: Authentication Flow - Tests successful JWT-based login flow
    func testSuccessfulLogin() throws {
        // Enter valid credentials
        let emailTextField = app.textFields["loginEmailTextField"]
        XCTAssertTrue(emailTextField.exists)
        emailTextField.tap()
        emailTextField.typeText(validEmail)
        
        let passwordTextField = app.secureTextFields["loginPasswordTextField"]
        XCTAssertTrue(passwordTextField.exists)
        passwordTextField.tap()
        passwordTextField.typeText(validPassword)
        
        // Tap login button
        let loginButton = app.buttons["loginButton"]
        XCTAssertTrue(loginButton.exists)
        loginButton.tap()
        
        // Verify successful login
        let homeScreen = app.otherElements["homeScreen"]
        XCTAssertTrue(homeScreen.waitForExistence(timeout: 5))
        
        // Verify user session established
        let userProfileButton = app.buttons["userProfileButton"]
        XCTAssertTrue(userProfileButton.exists)
    }
    
    /// Requirement: Authentication Flow - Tests input validation on login screen
    func testLoginValidation() throws {
        // Test email validation
        let emailTextField = app.textFields["loginEmailTextField"]
        emailTextField.tap()
        emailTextField.typeText(invalidEmail)
        
        // Verify email error message
        let emailError = app.staticTexts["Invalid email format"]
        XCTAssertTrue(emailError.exists)
        
        // Clear and enter valid email
        emailTextField.tap()
        emailTextField.clearText()
        emailTextField.typeText(validEmail)
        XCTAssertFalse(emailError.exists)
        
        // Test password validation
        let passwordTextField = app.secureTextFields["loginPasswordTextField"]
        passwordTextField.tap()
        passwordTextField.typeText(weakPassword)
        
        // Verify password error message
        let passwordError = app.staticTexts["Password must be at least 8 characters"]
        XCTAssertTrue(passwordError.exists)
        
        // Verify login button state
        let loginButton = app.buttons["loginButton"]
        XCTAssertFalse(loginButton.isEnabled)
        
        // Enter valid password
        passwordTextField.tap()
        passwordTextField.clearText()
        passwordTextField.typeText(validPassword)
        XCTAssertFalse(passwordError.exists)
        XCTAssertTrue(loginButton.isEnabled)
    }
    
    // MARK: - Signup Tests
    
    /// Requirement: Authentication Flow - Tests successful user registration flow
    func testSuccessfulSignup() throws {
        // Navigate to signup screen
        let signupButton = app.buttons["signupButton"]
        XCTAssertTrue(signupButton.exists)
        signupButton.tap()
        
        // Enter registration information
        let emailField = app.textFields["signup_email_field"]
        XCTAssertTrue(emailField.exists)
        emailField.tap()
        emailField.typeText(validEmail)
        
        let passwordField = app.secureTextFields["signup_password_field"]
        XCTAssertTrue(passwordField.exists)
        passwordField.tap()
        passwordField.typeText(validPassword)
        
        let firstNameField = app.textFields["signup_firstname_field"]
        XCTAssertTrue(firstNameField.exists)
        firstNameField.tap()
        firstNameField.typeText(validFirstName)
        
        let lastNameField = app.textFields["signup_lastname_field"]
        XCTAssertTrue(lastNameField.exists)
        lastNameField.tap()
        lastNameField.typeText(validLastName)
        
        // Submit registration
        let registerButton = app.buttons["signup_button"]
        XCTAssertTrue(registerButton.exists)
        registerButton.tap()
        
        // Verify successful registration
        let homeScreen = app.otherElements["homeScreen"]
        XCTAssertTrue(homeScreen.waitForExistence(timeout: 5))
        
        // Verify user profile created
        let userProfileButton = app.buttons["userProfileButton"]
        XCTAssertTrue(userProfileButton.exists)
    }
    
    /// Requirement: Authentication Flow - Tests input validation on signup screen
    func testSignupValidation() throws {
        // Navigate to signup
        app.buttons["signupButton"].tap()
        
        // Test email validation
        let emailField = app.textFields["signup_email_field"]
        emailField.tap()
        emailField.typeText(invalidEmail)
        
        // Verify email error
        let emailError = app.staticTexts["Invalid email format"]
        XCTAssertTrue(emailError.exists)
        
        // Test password validation
        let passwordField = app.secureTextFields["signup_password_field"]
        passwordField.tap()
        passwordField.typeText(weakPassword)
        
        // Verify password error
        let passwordError = app.staticTexts["Password must be at least 8 characters"]
        XCTAssertTrue(passwordError.exists)
        
        // Test required fields
        let registerButton = app.buttons["signup_button"]
        XCTAssertFalse(registerButton.isEnabled)
        
        // Fill required fields
        emailField.clearText()
        emailField.typeText(validEmail)
        
        passwordField.clearText()
        passwordField.typeText(validPassword)
        
        let firstNameField = app.textFields["signup_firstname_field"]
        firstNameField.tap()
        firstNameField.typeText(validFirstName)
        
        let lastNameField = app.textFields["signup_lastname_field"]
        lastNameField.tap()
        lastNameField.typeText(validLastName)
        
        // Verify button enabled
        XCTAssertTrue(registerButton.isEnabled)
    }
    
    /// Requirement: Mobile Applications - Tests navigation between authentication screens
    func testNavigationBetweenAuthScreens() throws {
        // Verify initial login screen
        let loginScreen = app.otherElements["loginScreen"]
        XCTAssertTrue(loginScreen.exists)
        
        // Navigate to signup
        let signupButton = app.buttons["signupButton"]
        signupButton.tap()
        
        // Verify signup screen
        let signupScreen = app.otherElements["signupScreen"]
        XCTAssertTrue(signupScreen.exists)
        
        // Navigate back to login
        let backButton = app.navigationBars.buttons.element(boundBy: 0)
        backButton.tap()
        
        // Verify back on login screen
        XCTAssertTrue(loginScreen.exists)
        
        // Test forgot password navigation
        let forgotPasswordButton = app.buttons["forgotPasswordButton"]
        forgotPasswordButton.tap()
        
        // Verify forgot password screen
        let forgotPasswordScreen = app.otherElements["forgotPasswordScreen"]
        XCTAssertTrue(forgotPasswordScreen.exists)
    }
}

// MARK: - Helper Extensions

extension XCUIElement {
    /// Clears text from a text field
    func clearText() {
        guard let stringValue = self.value as? String else {
            return
        }
        
        // First tap to position cursor
        self.tap()
        
        // Delete existing text
        let deleteString = String(repeating: XCUIKeyboardKey.delete.rawValue, count: stringValue.count)
        self.typeText(deleteString)
    }
}