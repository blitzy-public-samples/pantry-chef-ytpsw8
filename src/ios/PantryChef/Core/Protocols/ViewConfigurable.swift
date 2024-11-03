//
// ViewConfigurable.swift
// PantryChef
//
// HUMAN TASKS:
// 1. Ensure UIKit is properly linked in the Xcode project settings
// 2. Verify minimum iOS deployment target is set to iOS 13.0 or higher

// UIKit import - iOS 13.0+
import UIKit

/// Protocol that defines required methods for configuring view components in a standardized way
/// across the application. Ensures consistent initialization, layout, and styling of UI components.
///
/// Requirement addressed: Frontend Stack (5.3.1)
/// - Implements UI Components using native iOS UIKit components
///
/// Requirement addressed: Screen Components (8.1.2)
/// - Provides standardized component configuration across all screens
protocol ViewConfigurable: AnyObject {
    
    /// Main configuration method that calls all required setup methods in the correct order
    /// to ensure proper view initialization.
    ///
    /// This method should be called during view initialization, typically in init() or viewDidLoad().
    /// The method orchestrates the view setup process by calling the following methods in order:
    /// 1. setupView()
    /// 2. configureLayout()
    /// 3. configureAppearance()
    func configure()
    
    /// Sets up the initial view hierarchy and properties. Must be called before layout and appearance configuration.
    ///
    /// This method is responsible for:
    /// - Initializing and adding subviews to view hierarchy
    /// - Setting up initial view properties and configurations
    /// - Configuring delegates and action targets
    /// - Initializing gesture recognizers if needed
    func setupView()
    
    /// Configures Auto Layout constraints for the view and its subviews to ensure proper positioning and sizing.
    ///
    /// This method is responsible for:
    /// - Setting up view constraints using Auto Layout
    /// - Configuring subview layout constraints
    /// - Setting up margins and padding
    /// - Configuring layout priorities if needed
    /// - Setting up dynamic constraints for different size classes
    func configureLayout()
    
    /// Applies styling and visual configuration to the view according to the app's design system.
    ///
    /// This method is responsible for:
    /// - Applying theme styling from design system
    /// - Configuring colors and fonts according to brand guidelines
    /// - Setting up visual properties like corner radius and shadows
    /// - Configuring accessibility properties
    /// - Setting up dark mode adaptations
    func configureAppearance()
}

// MARK: - Default Implementation
extension ViewConfigurable {
    
    /// Default implementation of the main configuration method.
    /// Calls the required setup methods in the correct order.
    func configure() {
        setupView()
        configureLayout()
        configureAppearance()
    }
}