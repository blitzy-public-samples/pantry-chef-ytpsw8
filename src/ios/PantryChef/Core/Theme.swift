//
// Theme.swift
// PantryChef
//
// HUMAN TASKS:
// 1. Review and adjust color values for accessibility compliance (WCAG 2.1)
// 2. Validate font sizes across different device sizes
// 3. Test dark mode appearance on all UI components
// 4. Verify dynamic type support for all text elements

import UIKit // iOS 13.0+

// MARK: - Color Assets
// Requirement: UI Framework - Implements consistent UI styling and theming for iOS native implementation
enum ColorAsset {
    case primary
    case secondary
    case accent
    case background
    case surface
    case error
    case text
    case textSecondary
}

// MARK: - Theme
// Requirement: Mobile Applications - Defines visual styling and UI components for mobile app with support for both light and dark modes
@objc final class Theme {
    // MARK: - Singleton
    static let shared = Theme()
    
    // MARK: - Colors
    private(set) var primaryColor: UIColor
    private(set) var secondaryColor: UIColor
    private(set) var accentColor: UIColor
    private(set) var backgroundColor: UIColor
    private(set) var surfaceColor: UIColor
    private(set) var errorColor: UIColor
    private(set) var textColor: UIColor
    private(set) var textSecondaryColor: UIColor
    
    // MARK: - Typography
    private(set) var titleFont: UIFont
    private(set) var headingFont: UIFont
    private(set) var bodyFont: UIFont
    private(set) var captionFont: UIFont
    
    // MARK: - Layout Metrics
    private(set) var buttonHeight: CGFloat
    private(set) var inputHeight: CGFloat
    private(set) var cardElevation: CGFloat
    
    // MARK: - Notification Names
    static let themeDidChangeNotification = NSNotification.Name("ThemeDidChangeNotification")
    
    // MARK: - Initialization
    private init() {
        // Initialize default colors
        primaryColor = UIColor { traitCollection in
            switch traitCollection.userInterfaceStyle {
            case .dark:
                return UIColor(red: 0.2, green: 0.6, blue: 1.0, alpha: 1.0)
            default:
                return UIColor(red: 0.0, green: 0.478, blue: 1.0, alpha: 1.0)
            }
        }
        
        secondaryColor = UIColor { traitCollection in
            switch traitCollection.userInterfaceStyle {
            case .dark:
                return UIColor(red: 0.3, green: 0.3, blue: 0.3, alpha: 1.0)
            default:
                return UIColor(red: 0.95, green: 0.95, blue: 0.95, alpha: 1.0)
            }
        }
        
        accentColor = UIColor { traitCollection in
            switch traitCollection.userInterfaceStyle {
            case .dark:
                return UIColor(red: 1.0, green: 0.6, blue: 0.0, alpha: 1.0)
            default:
                return UIColor(red: 1.0, green: 0.5, blue: 0.0, alpha: 1.0)
            }
        }
        
        backgroundColor = UIColor { traitCollection in
            switch traitCollection.userInterfaceStyle {
            case .dark:
                return UIColor(red: 0.11, green: 0.11, blue: 0.12, alpha: 1.0)
            default:
                return UIColor(red: 0.98, green: 0.98, blue: 0.98, alpha: 1.0)
            }
        }
        
        surfaceColor = UIColor { traitCollection in
            switch traitCollection.userInterfaceStyle {
            case .dark:
                return UIColor(red: 0.18, green: 0.18, blue: 0.2, alpha: 1.0)
            default:
                return UIColor.white
            }
        }
        
        errorColor = UIColor { traitCollection in
            switch traitCollection.userInterfaceStyle {
            case .dark:
                return UIColor(red: 1.0, green: 0.4, blue: 0.4, alpha: 1.0)
            default:
                return UIColor(red: 0.9, green: 0.2, blue: 0.2, alpha: 1.0)
            }
        }
        
        textColor = UIColor { traitCollection in
            switch traitCollection.userInterfaceStyle {
            case .dark:
                return UIColor(white: 1.0, alpha: 0.87)
            default:
                return UIColor(white: 0.0, alpha: 0.87)
            }
        }
        
        textSecondaryColor = UIColor { traitCollection in
            switch traitCollection.userInterfaceStyle {
            case .dark:
                return UIColor(white: 1.0, alpha: 0.6)
            default:
                return UIColor(white: 0.0, alpha: 0.6)
            }
        }
        
        // Configure typography
        titleFont = .systemFont(ofSize: 24, weight: .bold)
        headingFont = .systemFont(ofSize: 20, weight: .semibold)
        bodyFont = .systemFont(ofSize: 16, weight: .regular)
        captionFont = .systemFont(ofSize: 14, weight: .regular)
        
        // Configure layout metrics using Constants
        buttonHeight = 48.0
        inputHeight = 44.0
        cardElevation = 4.0
        
        // Register for trait collection changes
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleTraitCollectionChange),
            name: UITraitCollection.didChangeNotification,
            object: nil
        )
    }
    
    // MARK: - Color Management
    func color(for asset: ColorAsset) -> UIColor {
        switch asset {
        case .primary:
            return primaryColor
        case .secondary:
            return secondaryColor
        case .accent:
            return accentColor
        case .background:
            return backgroundColor
        case .surface:
            return surfaceColor
        case .error:
            return errorColor
        case .text:
            return textColor
        case .textSecondary:
            return textSecondaryColor
        }
    }
    
    // MARK: - Theme Application
    func applyTheme(to view: UIView) {
        // Apply background color based on view type
        if view is UIButton {
            view.backgroundColor = primaryColor
            view.layer.cornerRadius = Constants.Layout.cornerRadius
        } else if view is UITextField || view is UITextView {
            view.backgroundColor = surfaceColor
            view.layer.cornerRadius = Constants.Layout.cornerRadius
            view.layer.borderWidth = 1
            view.layer.borderColor = secondaryColor.cgColor
        } else if view is UITableViewCell || view is UICollectionViewCell {
            view.backgroundColor = surfaceColor
        }
        
        // Configure typography
        if let label = view as? UILabel {
            label.textColor = textColor
            if label.font.pointSize >= 20 {
                label.font = headingFont
            } else {
                label.font = bodyFont
            }
        } else if let textField = view as? UITextField {
            textField.textColor = textColor
            textField.font = bodyFont
        }
        
        // Apply corner radius using Constants
        if view is UIButton || view is UITextField || view is UITextView {
            view.layer.cornerRadius = Constants.Layout.cornerRadius
        }
        
        // Apply shadow if needed
        if view is UIButton || view.tag == 100 { // tag 100 for card views
            view.layer.shadowColor = UIColor.black.cgColor
            view.layer.shadowOffset = CGSize(width: 0, height: cardElevation)
            view.layer.shadowOpacity = 0.1
            view.layer.shadowRadius = cardElevation / 2
        }
        
        // Update layout constraints using Constants
        view.layoutMargins = UIEdgeInsets(
            top: Constants.Layout.spacing,
            left: Constants.Layout.spacing,
            bottom: Constants.Layout.spacing,
            right: Constants.Layout.spacing
        )
    }
    
    // MARK: - Trait Collection Updates
    func updateForCurrentTraitCollection(_ traitCollection: UITraitCollection) {
        // Update colors based on trait collection
        primaryColor = color(for: .primary)
        secondaryColor = color(for: .secondary)
        accentColor = color(for: .accent)
        backgroundColor = color(for: .background)
        surfaceColor = color(for: .surface)
        errorColor = color(for: .error)
        textColor = color(for: .text)
        textSecondaryColor = color(for: .textSecondary)
        
        // Post notification for theme change
        DispatchQueue.main.async {
            NotificationCenter.default.post(name: Theme.themeDidChangeNotification, object: nil)
        }
    }
    
    // MARK: - Notification Handling
    @objc private func handleTraitCollectionChange() {
        if let window = UIApplication.shared.windows.first,
           let traitCollection = window.windowScene?.traitCollection {
            updateForCurrentTraitCollection(traitCollection)
        }
    }
}