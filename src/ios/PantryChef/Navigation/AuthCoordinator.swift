//
// AuthCoordinator.swift
// PantryChef
//
// HUMAN TASKS:
// 1. Configure OAuth2.0 client credentials in build configuration
// 2. Set up analytics tracking for authentication events
// 3. Configure JWT token storage in Keychain
// 4. Review and test deep linking handling
// 5. Verify biometric authentication integration if enabled

import UIKit // iOS 13.0+

// MARK: - AuthCoordinatorDelegate

/// Protocol for handling auth coordinator completion with JWT token management
/// Requirement addressed: Authentication Flow (9.1.1)
protocol AuthCoordinatorDelegate: AnyObject {
    /// Called when authentication flow completes with optional JWT token
    /// - Parameters:
    ///   - coordinator: The auth coordinator instance
    ///   - jwtToken: Optional JWT token if authentication was successful
    func authCoordinatorDidFinish(_ coordinator: AuthCoordinator, jwtToken: String?)
}

// MARK: - AuthCoordinator

/// Coordinator responsible for managing the authentication flow navigation
/// Requirement addressed: Authentication Flow (9.1.1), Navigation Flow (8.1.3), Security Protocols (9.3.1)
final class AuthCoordinator: Coordinator {
    
    // MARK: - Properties
    
    /// Navigation controller for managing view hierarchy
    let navigationController: UINavigationController
    
    /// Parent coordinator reference
    weak var parentCoordinator: Coordinator?
    
    /// Child coordinators array
    var childCoordinators: [Coordinator] = []
    
    /// Delegate to handle authentication completion
    weak var delegate: AuthCoordinatorDelegate?
    
    /// JWT token storage
    private(set) var jwtToken: String?
    
    // MARK: - Initialization
    
    /// Initializes the auth coordinator with a navigation controller
    /// - Parameter navigationController: The navigation controller to use for view management
    init(navigationController: UINavigationController) {
        self.navigationController = navigationController
        configureNavigationBar()
    }
    
    // MARK: - Coordinator Methods
    
    /// Starts the authentication flow with the login screen
    /// Requirement addressed: Authentication Flow (9.1.1)
    func start() {
        showLogin()
    }
    
    /// Completes the authentication flow and cleans up resources
    /// Requirement addressed: Security Protocols (9.3.1)
    func finish() {
        // Clean up any child coordinators
        childCoordinators.forEach { coordinator in
            coordinator.finish()
            removeChildCoordinator(coordinator)
        }
        
        // Notify delegate of completion with final token state
        delegate?.authCoordinatorDidFinish(self, jwtToken: jwtToken)
        
        // Clean up parent coordinator reference
        parentCoordinator?.removeChildCoordinator(self)
    }
    
    // MARK: - Navigation Methods
    
    /// Shows the login screen with proper configuration
    /// Requirement addressed: Authentication Flow (9.1.1), Security Protocols (9.3.1)
    private func showLogin() {
        let loginVC = LoginViewController()
        
        // Configure view controller
        loginVC.viewModel = AuthViewModel()
        
        // Set up notification observers for navigation
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleLoginSuccess(_:)),
            name: .userDidLogin,
            object: nil
        )
        
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleShowSignup(_:)),
            name: .showSignup,
            object: nil
        )
        
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleShowForgotPassword(_:)),
            name: .showForgotPassword,
            object: nil
        )
        
        // Set as root with fade transition
        navigationController.setViewControllers([loginVC], animated: true)
        
        // Configure navigation bar
        loginVC.navigationItem.title = "Sign In"
        loginVC.navigationItem.largeTitleDisplayMode = .always
    }
    
    /// Shows the signup screen with proper configuration
    /// Requirement addressed: Authentication Flow (9.1.1), Security Protocols (9.3.1)
    private func showSignup() {
        let signupVC = SignupViewController()
        
        // Configure view controller
        signupVC.viewModel = AuthViewModel()
        
        // Set up notification observer for successful signup
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleSignupSuccess(_:)),
            name: .userDidSignUp,
            object: nil
        )
        
        // Push with slide animation
        navigationController.pushViewController(signupVC, animated: true)
    }
    
    /// Shows the forgot password screen with secure token handling
    /// Requirement addressed: Security Protocols (9.3.1)
    private func showForgotPassword() {
        // Create and configure forgot password view controller
        let forgotPasswordVC = ForgotPasswordViewController()
        forgotPasswordVC.viewModel = AuthViewModel()
        
        // Push with slide animation
        navigationController.pushViewController(forgotPasswordVC, animated: true)
    }
    
    // MARK: - Notification Handlers
    
    /// Handles successful login with JWT token
    /// Requirement addressed: Authentication Flow (9.1.1), Security Protocols (9.3.1)
    @objc private func handleLoginSuccess(_ notification: Notification) {
        if let user = notification.object as? User {
            // Store JWT token
            self.jwtToken = user.token
            
            // Complete authentication flow
            finish()
        }
    }
    
    /// Handles navigation to signup screen
    @objc private func handleShowSignup(_ notification: Notification) {
        showSignup()
    }
    
    /// Handles navigation to forgot password screen
    @objc private func handleShowForgotPassword(_ notification: Notification) {
        showForgotPassword()
    }
    
    /// Handles successful signup with JWT token
    /// Requirement addressed: Authentication Flow (9.1.1), Security Protocols (9.3.1)
    @objc private func handleSignupSuccess(_ notification: Notification) {
        if let user = notification.object as? User {
            // Store JWT token
            self.jwtToken = user.token
            
            // Complete authentication flow
            finish()
        }
    }
    
    // MARK: - Private Methods
    
    /// Configures the navigation bar appearance
    private func configureNavigationBar() {
        navigationController.navigationBar.prefersLargeTitles = true
        
        // Configure appearance
        let appearance = UINavigationBarAppearance()
        appearance.configureWithOpaqueBackground()
        appearance.backgroundColor = Theme.shared.color(.surface)
        appearance.titleTextAttributes = [
            .foregroundColor: Theme.shared.color(.onSurface)
        ]
        appearance.largeTitleTextAttributes = [
            .foregroundColor: Theme.shared.color(.onSurface)
        ]
        
        navigationController.navigationBar.standardAppearance = appearance
        navigationController.navigationBar.scrollEdgeAppearance = appearance
        navigationController.navigationBar.compactAppearance = appearance
    }
    
    // MARK: - Deinitialization
    
    deinit {
        // Remove all notification observers
        NotificationCenter.default.removeObserver(self)
    }
}

// MARK: - Notification Name Extensions

private extension Notification.Name {
    /// Notification sent when user successfully logs in
    static let userDidLogin = Notification.Name("userDidLogin")
    
    /// Notification sent when user requests signup screen
    static let showSignup = Notification.Name("showSignup")
    
    /// Notification sent when user requests forgot password screen
    static let showForgotPassword = Notification.Name("showForgotPassword")
    
    /// Notification sent when user successfully signs up
    static let userDidSignUp = Notification.Name("userDidSignUp")
}