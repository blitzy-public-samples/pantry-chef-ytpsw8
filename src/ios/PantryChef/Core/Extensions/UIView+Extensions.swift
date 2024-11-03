//
// UIView+Extensions.swift
// PantryChef
//
// HUMAN TASKS:
// 1. Verify shadow rendering performance on older devices
// 2. Test dynamic color updates when switching between light/dark mode
// 3. Validate corner radius calculations for different view sizes
// 4. Review animation durations for accessibility settings compliance

import UIKit // iOS 13.0+

// MARK: - UIView Extension
// Requirement: UI Framework - Implements UI component extensions for consistent styling and behavior
extension UIView {
    
    /// Applies standard theme styling to the view with support for dynamic colors
    /// Requirement: Mobile Applications - Provides reusable UI extensions with dynamic theming support
    @objc func applyThemeStyle() {
        // Apply dynamic background color from Theme
        backgroundColor = Theme.shared.color(.background)
        
        // Set corner radius using Layout constants
        layer.cornerRadius = Layout.cornerRadius
        
        // Apply theme-specific styling based on view type
        Theme.shared.applyTheme(to: self)
        
        // Update for current trait collection to ensure proper color adaptation
        if let window = window {
            Theme.shared.updateForCurrentTraitCollection(window.traitCollection)
        }
    }
    
    /// Adds a themed shadow to the view with customizable parameters
    /// Requirement: UI Framework - Implements consistent shadow styling across the application
    func addShadow(opacity: CGFloat = 0.1, radius: CGFloat = 4.0, offset: CGFloat = 2.0) {
        // Configure layer shadow properties
        layer.shadowOpacity = Float(opacity)
        layer.shadowRadius = radius
        layer.shadowOffset = CGSize(width: 0, height: offset)
        
        // Set shadow color from theme
        layer.shadowColor = Theme.shared.color(.surface).cgColor
        
        // Enable rasterization for better performance
        layer.shouldRasterize = true
        layer.rasterizationScale = UIScreen.main.scale
    }
    
    /// Rounds specific corners of the view with custom radius
    /// Requirement: UI Framework - Provides flexible corner styling options
    func roundCorners(_ corners: UIRectCorner, radius: CGFloat) {
        let path = UIBezierPath(
            roundedRect: bounds,
            byRoundingCorners: corners,
            cornerRadii: CGSize(width: radius, height: radius)
        )
        
        // Create shape layer for masked corners
        let maskLayer = CAShapeLayer()
        maskLayer.path = path.cgPath
        layer.mask = maskLayer
        
        // Ensure layout is updated
        setNeedsLayout()
    }
    
    /// Animates the view's opacity to fade in with completion handler
    /// Requirement: Mobile Applications - Implements smooth UI transitions
    func fadeIn(duration: TimeInterval = 0.3, completion: (() -> Void)? = nil) {
        // Set initial state
        alpha = 0
        
        // Perform fade animation
        UIView.animate(
            withDuration: duration,
            delay: 0,
            options: .curveEaseInOut,
            animations: {
                self.alpha = 1
            },
            completion: { _ in
                completion?()
            }
        )
    }
    
    /// Animates the view's opacity to fade out with completion handler
    /// Requirement: Mobile Applications - Implements smooth UI transitions
    func fadeOut(duration: TimeInterval = 0.3, completion: (() -> Void)? = nil) {
        // Perform fade animation
        UIView.animate(
            withDuration: duration,
            delay: 0,
            options: .curveEaseInOut,
            animations: {
                self.alpha = 0
            },
            completion: { _ in
                completion?()
            }
        )
    }
}