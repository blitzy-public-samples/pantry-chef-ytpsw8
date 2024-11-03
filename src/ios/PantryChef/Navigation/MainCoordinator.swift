//
// MainCoordinator.swift
// PantryChef
//
// HUMAN TASKS:
// 1. Verify tab bar icons are included in Assets.xcassets
// 2. Configure deep linking URL schemes in Info.plist
// 3. Review accessibility labels for tab bar items
// 4. Test theme-based color adaptation in dark mode
// 5. Verify view controller memory management and deallocation

import UIKit // iOS 13.0+

/// Main coordinator responsible for managing the primary navigation flow in the PantryChef application
/// Implements the Coordinator pattern for hierarchical navigation management
///
/// Requirements addressed:
/// - Mobile Application Layout: Implements bottom navigation-based app structure
/// - Navigation Flow: Manages state-based navigation transitions
/// - Screen Components: Manages navigation between different screen components
final class MainCoordinator: Coordinator {
    
    // MARK: - Properties
    
    var navigationController: UINavigationController
    var parentCoordinator: Coordinator?
    var childCoordinators: [Coordinator] = []
    
    private let tabBarController: UITabBarController = {
        let tabBar = UITabBarController()
        // Configure tab bar appearance for iOS 13+ with theme-aware colors
        if #available(iOS 13.0, *) {
            let appearance = UITabBarAppearance()
            appearance.configureWithDefaultBackground()
            tabBar.tabBar.standardAppearance = appearance
            if #available(iOS 15.0, *) {
                tabBar.tabBar.scrollEdgeAppearance = appearance
            }
        }
        return tabBar
    }()
    
    // MARK: - Initialization
    
    init(navigationController: UINavigationController) {
        self.navigationController = navigationController
        setupTabBarAppearance()
    }
    
    // MARK: - Coordinator Methods
    
    func start() {
        // Create view controllers for each tab
        let homeVC = createHomeViewController()
        let cameraVC = createCameraViewController()
        let pantryVC = createPantryViewController()
        let recipesVC = createRecipesViewController()
        let profileVC = createProfileViewController()
        
        // Configure tab bar items with SF Symbols
        if #available(iOS 13.0, *) {
            homeVC.tabBarItem = UITabBarItem(
                title: "Home",
                image: UIImage(systemName: "house"),
                selectedImage: UIImage(systemName: "house.fill")
            )
            
            cameraVC.tabBarItem = UITabBarItem(
                title: "Camera",
                image: UIImage(systemName: "camera"),
                selectedImage: UIImage(systemName: "camera.fill")
            )
            
            pantryVC.tabBarItem = UITabBarItem(
                title: "Pantry",
                image: UIImage(systemName: "square.grid.2x2"),
                selectedImage: UIImage(systemName: "square.grid.2x2.fill")
            )
            
            recipesVC.tabBarItem = UITabBarItem(
                title: "Recipes",
                image: UIImage(systemName: "book"),
                selectedImage: UIImage(systemName: "book.fill")
            )
            
            profileVC.tabBarItem = UITabBarItem(
                title: "Profile",
                image: UIImage(systemName: "person"),
                selectedImage: UIImage(systemName: "person.fill")
            )
        }
        
        // Configure accessibility
        configureTabBarAccessibility()
        
        // Set up view controllers in tab bar
        tabBarController.viewControllers = [
            UINavigationController(rootViewController: homeVC),
            UINavigationController(rootViewController: cameraVC),
            UINavigationController(rootViewController: pantryVC),
            UINavigationController(rootViewController: recipesVC),
            UINavigationController(rootViewController: profileVC)
        ]
        
        // Configure navigation bars with theme
        tabBarController.viewControllers?.forEach { viewController in
            if let navController = viewController as? UINavigationController {
                configureNavigationBar(navController.navigationBar)
            }
        }
        
        // Set tab bar as root view controller
        navigationController.setViewControllers([tabBarController], animated: false)
        navigationController.setNavigationBarHidden(true, animated: false)
        
        // Configure deep linking handlers
        setupDeepLinkHandling()
    }
    
    // MARK: - View Controller Creation
    
    private func createHomeViewController() -> UIViewController {
        let viewModel = HomeViewModel()
        let homeVC = HomeViewController(viewModel: viewModel)
        
        // Add observers for navigation events
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleHomeNavigation(_:)),
            name: .didSelectScanAction,
            object: nil
        )
        
        return homeVC
    }
    
    private func createCameraViewController() -> UIViewController {
        let cameraVC = CameraViewController()
        return cameraVC
    }
    
    private func createPantryViewController() -> UIViewController {
        let pantryVC = UIViewController() // Placeholder for PantryViewController
        return pantryVC
    }
    
    private func createRecipesViewController() -> UIViewController {
        let recipesVC = UIViewController() // Placeholder for RecipesViewController
        return recipesVC
    }
    
    private func createProfileViewController() -> UIViewController {
        let profileVC = UIViewController() // Placeholder for ProfileViewController
        return profileVC
    }
    
    // MARK: - Navigation Methods
    
    func showCamera() {
        // Present camera view controller modally with fade transition
        if let cameraVC = tabBarController.viewControllers?[1] as? UINavigationController {
            cameraVC.modalPresentationStyle = .fullScreen
            cameraVC.modalTransitionStyle = .crossDissolve
            
            // Configure camera permissions and access
            AVCaptureDevice.requestAccess(for: .video) { [weak self] granted in
                DispatchQueue.main.async {
                    if granted {
                        self?.navigationController.present(cameraVC, animated: true)
                    } else {
                        self?.showCameraPermissionAlert()
                    }
                }
            }
        }
    }
    
    func showRecipeDetail(recipe: Recipe) {
        // Push recipe detail view controller onto the recipes tab
        if let recipesNav = tabBarController.viewControllers?[3] as? UINavigationController {
            let detailVC = UIViewController() // Placeholder for RecipeDetailViewController
            detailVC.title = recipe.name
            recipesNav.pushViewController(detailVC, animated: true)
        }
    }
    
    // MARK: - Setup Methods
    
    private func setupTabBarAppearance() {
        if #available(iOS 13.0, *) {
            let appearance = UITabBarAppearance()
            appearance.configureWithDefaultBackground()
            
            // Configure colors based on theme
            appearance.backgroundColor = .systemBackground
            appearance.selectionIndicatorTintColor = .systemBlue
            
            tabBarController.tabBar.standardAppearance = appearance
            if #available(iOS 15.0, *) {
                tabBarController.tabBar.scrollEdgeAppearance = appearance
            }
        }
    }
    
    private func configureNavigationBar(_ navigationBar: UINavigationBar) {
        if #available(iOS 13.0, *) {
            let appearance = UINavigationBarAppearance()
            appearance.configureWithDefaultBackground()
            
            navigationBar.standardAppearance = appearance
            navigationBar.compactAppearance = appearance
            if #available(iOS 15.0, *) {
                navigationBar.scrollEdgeAppearance = appearance
            }
        }
    }
    
    private func configureTabBarAccessibility() {
        tabBarController.tabBar.items?.forEach { item in
            switch item.title {
            case "Home":
                item.accessibilityLabel = "Home Dashboard"
                item.accessibilityHint = "View your dashboard with quick actions and suggestions"
            case "Camera":
                item.accessibilityLabel = "Ingredient Scanner"
                item.accessibilityHint = "Scan and recognize ingredients using your camera"
            case "Pantry":
                item.accessibilityLabel = "Digital Pantry"
                item.accessibilityHint = "Manage your pantry inventory and expiration dates"
            case "Recipes":
                item.accessibilityLabel = "Recipe Collection"
                item.accessibilityHint = "Browse and search for recipes"
            case "Profile":
                item.accessibilityLabel = "User Profile"
                item.accessibilityHint = "View and edit your profile settings"
            default:
                break
            }
        }
    }
    
    private func setupDeepLinkHandling() {
        // Register for deep link notifications
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleDeepLink(_:)),
            name: .didReceiveDeepLink,
            object: nil
        )
    }
    
    // MARK: - Helper Methods
    
    private func showCameraPermissionAlert() {
        let alert = UIAlertController(
            title: "Camera Access Required",
            message: "Please enable camera access in Settings to use this feature.",
            preferredStyle: .alert
        )
        
        alert.addAction(UIAlertAction(title: "Settings", style: .default) { _ in
            if let settingsURL = URL(string: UIApplication.openSettingsURLString) {
                UIApplication.shared.open(settingsURL)
            }
        })
        
        alert.addAction(UIAlertAction(title: "Cancel", style: .cancel))
        
        navigationController.present(alert, animated: true)
    }
    
    // MARK: - Notification Handlers
    
    @objc private func handleHomeNavigation(_ notification: Notification) {
        switch notification.name {
        case .didSelectScanAction:
            showCamera()
        case .didSelectRecipe:
            if let recipe = notification.object as? Recipe {
                showRecipeDetail(recipe: recipe)
            }
        default:
            break
        }
    }
    
    @objc private func handleDeepLink(_ notification: Notification) {
        guard let deepLink = notification.object as? URL else { return }
        
        // Handle different deep link paths
        switch deepLink.path {
        case "/recipe":
            if let recipeId = deepLink.queryParameters["id"] {
                // Navigate to recipe detail
                // Implementation pending recipe service integration
            }
        case "/pantry":
            // Switch to pantry tab
            tabBarController.selectedIndex = 2
        case "/camera":
            showCamera()
        default:
            break
        }
    }
}

// MARK: - URL Extension for Deep Linking

private extension URL {
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
    static let didReceiveDeepLink = Notification.Name("didReceiveDeepLink")
}