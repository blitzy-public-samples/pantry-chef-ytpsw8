//
// AppCoordinator.swift
// PantryChef
//
// HUMAN TASKS:
// 1. Configure OAuth2.0 client credentials in Info.plist
// 2. Set up deep linking URL schemes in Info.plist
// 3. Configure JWT token storage in Keychain
// 4. Review and test deep linking handlers
// 5. Verify biometric authentication integration if enabled
// 6. Set up analytics tracking for authentication events

import UIKit // iOS 13.0+

// MARK: - AppCoordinatorDelegate

/// Protocol for handling app coordinator lifecycle events and authentication state changes
/// Requirements addressed:
/// - Authentication Flow (9.1.1): Handles authentication state transitions
/// - Security Protocols (9.3.1): Manages secure session handling
protocol AppCoordinatorDelegate: AnyObject {
    /// Called when the app coordinator completes its lifecycle
    /// - Parameter coordinator: The app coordinator instance
    func appCoordinatorDidFinish(_ coordinator: AppCoordinator)
    
    /// Called when authentication is successful with a JWT token
    /// - Parameters:
    ///   - coordinator: The app coordinator instance
    ///   - jwtToken: The JWT token received after successful authentication
    func appCoordinatorDidAuthenticate(_ coordinator: AppCoordinator, jwtToken: String)
}

// MARK: - AppCoordinator

/// Root coordinator responsible for managing the entire application's navigation flow
/// Requirements addressed:
/// - Navigation Flow (8.1.3): Implements root navigation coordination
/// - Authentication Flow (9.1.1): Manages authentication state transitions
/// - Security Protocols (9.3.1): Implements secure navigation handling
final class AppCoordinator: Coordinator {
    
    // MARK: - Properties
    
    let window: UIWindow
    let navigationController: UINavigationController
    weak var parentCoordinator: Coordinator?
    var childCoordinators: [Coordinator] = []
    weak var delegate: AppCoordinatorDelegate?
    
    // MARK: - Initialization
    
    /// Initializes the app coordinator with the main window
    /// - Parameter window: The main window for the application
    init(window: UIWindow) {
        self.window = window
        self.navigationController = UINavigationController()
        configureNavigationBar()
    }
    
    // MARK: - Coordinator Methods
    
    /// Starts the application's navigation flow
    /// Requirements addressed:
    /// - Navigation Flow (8.1.3): Initiates root navigation
    /// - Authentication Flow (9.1.1): Checks authentication state
    func start() {
        // Set up root navigation controller
        window.rootViewController = navigationController
        window.makeKeyAndVisible()
        
        // Configure window appearance for iOS 13+
        if #available(iOS 13.0, *) {
            window.overrideUserInterfaceStyle = .light
        }
        
        // Check authentication state
        if let token = KeychainManager.shared.retrieveJWTToken() {
            // Valid token exists, start main flow
            startMainFlow()
        } else {
            // No valid token, start auth flow
            startAuthFlow()
        }
        
        // Set up deep linking handlers
        setupDeepLinkHandling()
    }
    
    /// Cleans up resources and ends the coordinator's flow
    func finish() {
        // Clean up child coordinators
        childCoordinators.forEach { coordinator in
            coordinator.finish()
            removeChildCoordinator(coordinator)
        }
        
        // Notify delegate
        delegate?.appCoordinatorDidFinish(self)
    }
    
    // MARK: - Navigation Methods
    
    /// Begins the authentication flow
    /// Requirements addressed:
    /// - Authentication Flow (9.1.1): Initiates secure authentication
    /// - Security Protocols (9.3.1): Implements OAuth2.0 flow
    private func startAuthFlow() {
        let authCoordinator = AuthCoordinator(navigationController: navigationController)
        authCoordinator.delegate = self
        addChildCoordinator(authCoordinator)
        authCoordinator.start()
        
        // Track analytics event
        Analytics.shared.trackEvent(.authFlowStarted)
    }
    
    /// Begins the main application flow
    /// Requirements addressed:
    /// - Navigation Flow (8.1.3): Manages main app navigation
    private func startMainFlow() {
        let mainCoordinator = MainCoordinator(navigationController: navigationController)
        addChildCoordinator(mainCoordinator)
        mainCoordinator.start()
        
        // Track analytics event
        Analytics.shared.trackEvent(.mainFlowStarted)
    }
    
    // MARK: - Setup Methods
    
    /// Configures the navigation bar appearance
    private func configureNavigationBar() {
        if #available(iOS 13.0, *) {
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
        
        navigationController.navigationBar.prefersLargeTitles = true
    }
    
    /// Sets up deep linking handlers
    private func setupDeepLinkHandling() {
        // Register for deep link notifications
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleDeepLink(_:)),
            name: .didReceiveDeepLink,
            object: nil
        )
        
        // Register for authentication state changes
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleAuthStateChange(_:)),
            name: .authStateDidChange,
            object: nil
        )
    }
    
    // MARK: - Notification Handlers
    
    /// Handles deep link navigation
    @objc private func handleDeepLink(_ notification: Notification) {
        guard let url = notification.object as? URL else { return }
        
        // Verify authentication state before handling deep links
        guard KeychainManager.shared.retrieveJWTToken() != nil else {
            // Store deep link for processing after authentication
            UserDefaults.standard.set(url, forKey: "pendingDeepLink")
            startAuthFlow()
            return
        }
        
        // Process deep link based on path
        switch url.path {
        case "/recipe":
            if let recipeId = url.queryParameters["id"],
               let mainCoordinator = childCoordinators.first(where: { $0 is MainCoordinator }) as? MainCoordinator {
                // Navigate to recipe detail
                mainCoordinator.showRecipeDetail(recipe: Recipe(id: recipeId))
            }
        case "/scan":
            if let mainCoordinator = childCoordinators.first(where: { $0 is MainCoordinator }) as? MainCoordinator {
                mainCoordinator.showCamera()
            }
        default:
            break
        }
    }
    
    /// Handles authentication state changes
    @objc private func handleAuthStateChange(_ notification: Notification) {
        if let isAuthenticated = notification.object as? Bool {
            if isAuthenticated {
                startMainFlow()
                
                // Process any pending deep links
                if let pendingURL = UserDefaults.standard.url(forKey: "pendingDeepLink") {
                    handleDeepLink(Notification(name: .didReceiveDeepLink, object: pendingURL))
                    UserDefaults.standard.removeObject(forKey: "pendingDeepLink")
                }
            } else {
                // Clean up main flow and show auth
                childCoordinators.forEach { coordinator in
                    coordinator.finish()
                    removeChildCoordinator(coordinator)
                }
                startAuthFlow()
            }
        }
    }
    
    // MARK: - Deinitialization
    
    deinit {
        NotificationCenter.default.removeObserver(self)
    }
}

// MARK: - AuthCoordinatorDelegate

extension AppCoordinator: AuthCoordinatorDelegate {
    /// Handles authentication completion
    /// Requirements addressed:
    /// - Authentication Flow (9.1.1): Manages authentication state transition
    /// - Security Protocols (9.3.1): Implements secure token handling
    func authCoordinatorDidFinish(_ coordinator: AuthCoordinator, jwtToken: String?) {
        if let token = jwtToken {
            // Store token securely
            KeychainManager.shared.storeJWTToken(token)
            
            // Notify delegate of successful authentication
            delegate?.appCoordinatorDidAuthenticate(self, jwtToken: token)
            
            // Remove auth coordinator
            removeChildCoordinator(coordinator)
            
            // Start main flow
            startMainFlow()
            
            // Track successful authentication
            Analytics.shared.trackEvent(.userAuthenticated)
        }
    }
}

// MARK: - URL Extension

private extension URL {
    /// Extracts query parameters from URL
    var queryParameters: [String: String] {
        guard let components = URLComponents(url: self, resolvingAgainstBaseURL: true),
              let queryItems = components.queryItems else {
            return [:]
        }
        
        var parameters = [String: String]()
        queryItems.forEach { item in
            parameters[item.name] = item.value
        }
        return parameters
    }
}

// MARK: - Notification Names

private extension Notification.Name {
    /// Notification for deep link reception
    static let didReceiveDeepLink = Notification.Name("didReceiveDeepLink")
    
    /// Notification for authentication state changes
    static let authStateDidChange = Notification.Name("authStateDidChange")
}