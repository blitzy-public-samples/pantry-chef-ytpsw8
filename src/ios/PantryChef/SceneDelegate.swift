//
// SceneDelegate.swift
// PantryChef
//
// HUMAN TASKS:
// 1. Configure scene lifecycle event tracking in analytics
// 2. Review and adjust memory cleanup thresholds for scene state transitions
// 3. Verify proper window hierarchy setup in Interface Builder
// 4. Configure scene-specific appearance settings in Info.plist
// 5. Test scene state transitions with different iOS versions

import UIKit // iOS 13.0+

/// Scene delegate responsible for managing the app's window and scene lifecycle
/// Requirements addressed:
/// - Mobile Applications (5.2.1): Implements iOS application scene lifecycle management
/// - Navigation Flow (8.1.3): Establishes root navigation structure
/// - Security Architecture (5.6): Ensures secure scene transitions
@available(iOS 13.0, *)
class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    
    // MARK: - Properties
    
    var window: UIWindow?
    var appCoordinator: AppCoordinator?
    
    // MARK: - Scene Lifecycle
    
    /// Configures the scene when it's being created
    /// Requirements addressed:
    /// - Mobile Applications (5.2.1): Initializes iOS scene-based architecture
    /// - Navigation Flow (8.1.3): Sets up root navigation using AppCoordinator
    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = (scene as? UIWindowScene) else { return }
        
        // Configure app environment based on launch configuration
        #if DEBUG
        AppConfig.shared.configure(environment: .development)
        #else
        AppConfig.shared.configure(environment: .production)
        #endif
        
        // Create window with proper bounds
        let window = UIWindow(windowScene: windowScene)
        self.window = window
        
        // Initialize AppCoordinator with created window
        let coordinator = AppCoordinator(window: window)
        self.appCoordinator = coordinator
        
        // Start the coordinator to begin navigation flow
        coordinator.start()
    }
    
    /// Handles scene disconnection
    /// Requirements addressed:
    /// - Security Architecture (5.6): Ensures secure cleanup of resources
    func sceneDidDisconnect(_ scene: UIScene) {
        // Clean up resources and cancel pending operations
        appCoordinator?.finish()
        
        // Clear sensitive data from memory
        window?.rootViewController?.view.layer.removeAllAnimations()
        window?.rootViewController = nil
        
        // Notify system of cleanup completion
        NotificationCenter.default.post(name: UIScene.didDisconnectNotification, object: scene)
    }
    
    /// Handles scene becoming active
    /// Requirements addressed:
    /// - Mobile Applications (5.2.1): Manages active scene state
    /// - Security Architecture (5.6): Ensures secure state transitions
    func sceneDidBecomeActive(_ scene: UIScene) {
        // Resume any paused activities or animations
        window?.rootViewController?.view.layer.resumeAnimations()
        
        // Update UI state for active scene
        window?.windowScene?.title = "PantryChef"
        
        // Notify AppCoordinator of active state
        if let coordinator = appCoordinator {
            NotificationCenter.default.post(
                name: .init("appDidBecomeActive"),
                object: coordinator
            )
        }
        
        // Re-enable user interaction if previously disabled
        window?.isUserInteractionEnabled = true
    }
    
    /// Handles scene resigning active state
    /// Requirements addressed:
    /// - Security Architecture (5.6): Implements secure state transitions
    /// - Mobile Applications (5.2.1): Manages inactive scene state
    func sceneWillResignActive(_ scene: UIScene) {
        // Pause ongoing tasks and animations
        window?.rootViewController?.view.layer.pauseAnimations()
        
        // Disable UI updates
        window?.isUserInteractionEnabled = false
        
        // Secure sensitive UI content
        if let topViewController = window?.rootViewController?.topMostViewController() {
            topViewController.view.secureContent()
        }
        
        // Notify AppCoordinator of inactive state
        if let coordinator = appCoordinator {
            NotificationCenter.default.post(
                name: .init("appWillResignActive"),
                object: coordinator
            )
        }
    }
}

// MARK: - UIViewController Extension

private extension UIViewController {
    /// Returns the topmost view controller in the hierarchy
    func topMostViewController() -> UIViewController {
        if let presented = presentedViewController {
            return presented.topMostViewController()
        }
        if let navigation = self as? UINavigationController {
            return navigation.visibleViewController?.topMostViewController() ?? navigation
        }
        if let tab = self as? UITabBarController {
            return tab.selectedViewController?.topMostViewController() ?? tab
        }
        return self
    }
}

// MARK: - UIView Extension

private extension UIView {
    /// Secures sensitive content when app becomes inactive
    func secureContent() {
        // Add blur effect to sensitive views
        let blurEffect = UIBlurEffect(style: .regular)
        let blurView = UIVisualEffectView(effect: blurEffect)
        blurView.frame = bounds
        blurView.tag = 999 // Tag for later removal
        
        // Remove existing blur if any
        viewWithTag(999)?.removeFromSuperview()
        
        // Add new blur
        addSubview(blurView)
    }
    
    /// Removes security blur when app becomes active
    func removeSecureContent() {
        viewWithTag(999)?.removeFromSuperview()
    }
}

// MARK: - CALayer Extension

private extension CALayer {
    /// Pauses all animations in the layer
    func pauseAnimations() {
        let pausedTime = convertTime(CACurrentMediaTime(), from: nil)
        speed = 0.0
        timeOffset = pausedTime
    }
    
    /// Resumes all animations in the layer
    func resumeAnimations() {
        let pausedTime = timeOffset
        speed = 1.0
        timeOffset = 0.0
        beginTime = 0.0
        let timeSincePause = convertTime(CACurrentMediaTime(), from: nil) - pausedTime
        beginTime = timeSincePause
    }
}