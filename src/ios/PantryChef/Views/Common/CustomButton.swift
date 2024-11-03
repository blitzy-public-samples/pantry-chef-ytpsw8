//
// CustomButton.swift
// PantryChef
//
// HUMAN TASKS:
// 1. Verify button accessibility labels are properly localized
// 2. Test VoiceOver interaction with loading state
// 3. Validate color contrast ratios meet WCAG guidelines
// 4. Test button touch targets on different device sizes

import UIKit // iOS 13.0+

/// Defines available button styles with appropriate color schemes
enum ButtonStyle {
    case primary
    case secondary
    case text
}

/// Custom UIButton subclass implementing the application's design system with support for
/// different styles, loading states, and touch feedback animations
///
/// Requirement addressed: UI Framework (5.3.1)
/// - Implements custom UI components using native iOS UIKit
///
/// Requirement addressed: Screen Components (8.1.2)
/// - Provides reusable button component across all screens with consistent styling and behavior
@IBDesignable
final class CustomButton: UIButton, ViewConfigurable {
    
    // MARK: - Properties
    
    private var style: ButtonStyle
    private var isLoading: Bool = false
    private lazy var activityIndicator: UIActivityIndicatorView = {
        let indicator = UIActivityIndicatorView(style: .medium)
        indicator.hidesWhenStopped = true
        indicator.color = .white
        return indicator
    }()
    
    private var cornerRadius: CGFloat = 8.0
    
    // MARK: - Initialization
    
    init(style: ButtonStyle) {
        self.style = style
        super.init(frame: .zero)
        configure()
        
        // Register for trait collection changes for dark mode support
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleTraitCollectionDidChange),
            name: UITraitCollection.didChangeNotification,
            object: nil
        )
    }
    
    required init?(coder: NSCoder) {
        self.style = .primary
        super.init(coder: coder)
        configure()
    }
    
    deinit {
        NotificationCenter.default.removeObserver(self)
    }
    
    // MARK: - ViewConfigurable Implementation
    
    func setupView() {
        // Add and configure activity indicator
        addSubview(activityIndicator)
        
        // Configure button properties
        adjustsImageWhenHighlighted = false
        clipsToBounds = true
        
        // Set up touch handlers
        addTarget(self, action: #selector(touchDown), for: .touchDown)
        addTarget(self, action: #selector(touchUp), for: [.touchUpInside, .touchUpOutside, .touchCancel])
        
        // Configure accessibility
        isAccessibilityElement = true
        accessibilityTraits = .button
    }
    
    func configureLayout() {
        // Set button height constraint
        heightAnchor.constraint(equalToConstant: Theme.shared.buttonHeight).isActive = true
        
        // Configure activity indicator constraints
        activityIndicator.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            activityIndicator.centerXAnchor.constraint(equalTo: centerXAnchor),
            activityIndicator.centerYAnchor.constraint(equalTo: centerYAnchor)
        ])
        
        // Set content edge insets based on style
        switch style {
        case .primary, .secondary:
            contentEdgeInsets = UIEdgeInsets(top: 12, left: 24, bottom: 12, right: 24)
        case .text:
            contentEdgeInsets = UIEdgeInsets(top: 8, left: 16, bottom: 8, right: 16)
        }
        
        // Configure dynamic constraints for different size classes
        if traitCollection.horizontalSizeClass == .regular {
            // Add additional padding for larger screens
            contentEdgeInsets = UIEdgeInsets(
                top: contentEdgeInsets.top,
                left: contentEdgeInsets.left + 8,
                bottom: contentEdgeInsets.bottom,
                right: contentEdgeInsets.right + 8
            )
        }
    }
    
    func configureAppearance() {
        // Apply theme colors based on style
        switch style {
        case .primary:
            backgroundColor = Theme.shared.color(for: .primary)
            setTitleColor(Theme.shared.color(for: .surface), for: .normal)
            activityIndicator.color = Theme.shared.color(for: .surface)
            layer.shadowOpacity = 0.2
            
        case .secondary:
            backgroundColor = Theme.shared.color(for: .secondary)
            setTitleColor(Theme.shared.color(for: .text), for: .normal)
            activityIndicator.color = Theme.shared.color(for: .text)
            layer.shadowOpacity = 0.1
            
        case .text:
            backgroundColor = .clear
            setTitleColor(Theme.shared.color(for: .primary), for: .normal)
            activityIndicator.color = Theme.shared.color(for: .primary)
            layer.shadowOpacity = 0
        }
        
        // Configure font and text attributes
        titleLabel?.font = .systemFont(ofSize: 16, weight: .semibold)
        
        // Set corner radius and shadow properties
        layer.cornerRadius = cornerRadius
        layer.shadowColor = UIColor.black.cgColor
        layer.shadowOffset = CGSize(width: 0, height: 2)
        layer.shadowRadius = 4
        
        // Configure dark mode color adaptations
        if traitCollection.userInterfaceStyle == .dark {
            layer.shadowOpacity = layer.shadowOpacity * 0.5
        }
    }
    
    // MARK: - Public Methods
    
    /// Shows or hides loading indicator with animation
    /// - Parameter loading: Boolean indicating whether to show or hide the loading state
    func setLoading(_ loading: Bool) {
        isLoading = loading
        isUserInteractionEnabled = !loading
        
        UIView.animate(withDuration: 0.2) {
            self.titleLabel?.alpha = loading ? 0 : 1
            if loading {
                self.activityIndicator.startAnimating()
            } else {
                self.activityIndicator.stopAnimating()
            }
        }
    }
    
    // MARK: - Private Methods
    
    @objc private func touchDown() {
        UIView.animate(withDuration: 0.2, delay: 0, options: .curveEaseInOut) {
            self.transform = CGAffineTransform(scaleX: 0.95, y: 0.95)
            self.alpha = 0.9
            
            // Update background color for pressed state
            switch self.style {
            case .primary:
                self.backgroundColor = Theme.shared.color(for: .primary).withAlphaComponent(0.8)
            case .secondary:
                self.backgroundColor = Theme.shared.color(for: .secondary).withAlphaComponent(0.8)
            case .text:
                self.backgroundColor = Theme.shared.color(for: .primary).withAlphaComponent(0.1)
            }
        }
    }
    
    @objc private func touchUp() {
        UIView.animate(withDuration: 0.2, delay: 0, options: .curveEaseInOut) {
            self.transform = .identity
            self.alpha = 1.0
            
            // Restore original background color
            switch self.style {
            case .primary:
                self.backgroundColor = Theme.shared.color(for: .primary)
            case .secondary:
                self.backgroundColor = Theme.shared.color(for: .secondary)
            case .text:
                self.backgroundColor = .clear
            }
        }
    }
    
    @objc private func handleTraitCollectionDidChange() {
        configureAppearance()
    }
    
    // MARK: - Layout Updates
    
    override func traitCollectionDidChange(_ previousTraitCollection: UITraitCollection?) {
        super.traitCollectionDidChange(previousTraitCollection)
        
        if traitCollection.hasDifferentColorAppearance(comparedTo: previousTraitCollection) {
            configureAppearance()
        }
        
        if traitCollection.horizontalSizeClass != previousTraitCollection?.horizontalSizeClass {
            configureLayout()
        }
    }
}