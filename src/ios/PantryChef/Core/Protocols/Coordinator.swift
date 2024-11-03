//
// Coordinator.swift
// PantryChef
//
// HUMAN TASKS:
// 1. Ensure UIKit is properly linked in the Xcode project settings
// 2. Verify minimum iOS deployment target is set to iOS 13.0 or higher

// UIKit import - iOS 13.0+
import UIKit

/// Protocol that defines the core functionality required for navigation coordination.
/// Implements the Coordinator pattern to manage view controller transitions and maintain the navigation stack.
/// Supports deep linking and complex navigation flows through a hierarchical coordinator structure.
///
/// Requirements addressed:
/// - Mobile Application Layout: Defines the base protocol for implementing the navigation hierarchy
/// - Navigation Flow: Establishes the foundation for managing state-based navigation transitions
/// - Screen Components: Supports navigation between different screen components and maintains their hierarchy
protocol Coordinator: AnyObject {
    /// The navigation controller responsible for managing the view hierarchy
    var navigationController: UINavigationController { get }
    
    /// Reference to the parent coordinator in the hierarchy
    /// Used for managing nested flows and proper deallocation
    var parentCoordinator: Coordinator? { get set }
    
    /// Array of child coordinators
    /// Maintains references to prevent deallocation while child flows are active
    var childCoordinators: [Coordinator] { get set }
    
    /// Initiates the coordinator and begins its navigation flow
    /// Sets up the initial view controller and configures any required dependencies
    func start()
    
    /// Optional method to clean up and end the coordinator's flow
    /// Removes child coordinators, cleans up subscriptions, and notifies parent coordinator of completion
    func finish()
}

// Default implementation for common coordinator functionality
extension Coordinator {
    /// Adds a child coordinator to the hierarchy
    /// - Parameter coordinator: The child coordinator to add
    func addChildCoordinator(_ coordinator: Coordinator) {
        childCoordinators.append(coordinator)
        coordinator.parentCoordinator = self
    }
    
    /// Removes a child coordinator from the hierarchy
    /// - Parameter coordinator: The child coordinator to remove
    func removeChildCoordinator(_ coordinator: Coordinator) {
        if let index = childCoordinators.firstIndex(where: { $0 === coordinator }) {
            childCoordinators.remove(at: index)
            coordinator.parentCoordinator = nil
        }
    }
    
    /// Default implementation of finish to ensure proper cleanup
    func finish() {
        // Clean up all child coordinators
        childCoordinators.forEach { coordinator in
            coordinator.finish()
            removeChildCoordinator(coordinator)
        }
        
        // Notify parent coordinator to remove self from hierarchy
        parentCoordinator?.removeChildCoordinator(self)
    }
    
    /// Removes all child coordinators
    func removeAllChildCoordinators() {
        childCoordinators.forEach { coordinator in
            coordinator.finish()
            coordinator.parentCoordinator = nil
        }
        childCoordinators.removeAll()
    }
}