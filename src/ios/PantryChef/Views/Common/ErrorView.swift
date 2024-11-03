//
// ErrorView.swift
// PantryChef
//
// HUMAN TASKS:
// 1. Verify accessibility labels and traits are properly set for VoiceOver support
// 2. Test color contrast ratios in both light and dark modes
// 3. Validate error view animations on different device sizes
// 4. Review error icon asset for proper resolution scaling

import UIKit // iOS 13.0+

/// A reusable error view component that displays error messages with customizable styling and animations
/// 
/// Requirement addressed: UI Framework (5.3.1)
/// - Implements custom UI components using native iOS UIKit
///
/// Requirement addressed: Screen Components (8.1.2)
/// - Provides reusable error view component for error state handling
///
/// Requirement addressed: Mobile Applications (5.2.1)
/// - Implements native iOS UI components with support for dynamic theming
@IBDesignable
final class ErrorView: UIView {
    
    // MARK: - UI Components
    
    private let iconImageView: UIImageView = {
        let imageView = UIImageView()
        imageView.contentMode = .scaleAspectFit
        imageView.tintColor = Theme.shared.color(for: .error)
        return imageView
    }()
    
    private let messageLabel: UILabel = {
        let label = UILabel()
        label.textAlignment = .center
        label.numberOfLines = 0
        label.textColor = Theme.shared.color(for: .text)
        label.font = .systemFont(ofSize: 16, weight: .medium)
        return label
    }()
    
    private lazy var retryButton: CustomButton = {
        let button = CustomButton(style: .secondary)
        button.setTitle("Retry", for: .normal)
        button.addTarget(self, action: #selector(retryButtonTapped), for: .touchUpInside)
        button.isHidden = true
        return button
    }()
    
    private let contentStack: UIStackView = {
        let stack = UIStackView()
        stack.axis = .vertical
        stack.alignment = .center
        stack.spacing = 16
        return stack
    }()
    
    // MARK: - Properties
    
    private var retryAction: (() -> Void)?
    
    // MARK: - Initialization
    
    override init(frame: CGRect) {
        super.init(frame: frame)
        setupView()
        configureLayout()
        
        // Register for theme changes
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleThemeChange),
            name: Theme.themeDidChangeNotification,
            object: nil
        )
    }
    
    required init?(coder: NSCoder) {
        super.init(coder: coder)
        setupView()
        configureLayout()
    }
    
    deinit {
        NotificationCenter.default.removeObserver(self)
    }
    
    // MARK: - Setup
    
    private func setupView() {
        // Configure error icon
        if let errorImage = UIImage(systemName: "exclamationmark.triangle.fill") {
            iconImageView.image = errorImage
        }
        
        // Set up view hierarchy
        addSubview(contentStack)
        contentStack.addArrangedSubview(iconImageView)
        contentStack.addArrangedSubview(messageLabel)
        contentStack.addArrangedSubview(retryButton)
        
        // Apply initial theme styling
        backgroundColor = Theme.shared.color(for: .background)
        applyThemeStyle()
        
        // Configure accessibility
        isAccessibilityElement = false
        messageLabel.isAccessibilityElement = true
        retryButton.isAccessibilityElement = true
    }
    
    private func configureLayout() {
        // Enable auto layout
        contentStack.translatesAutoresizingMaskIntoConstraints = false
        iconImageView.translatesAutoresizingMaskIntoConstraints = false
        
        // Set up constraints
        NSLayoutConstraint.activate([
            // Center stack view
            contentStack.centerXAnchor.constraint(equalTo: centerXAnchor),
            contentStack.centerYAnchor.constraint(equalTo: centerYAnchor),
            contentStack.leadingAnchor.constraint(greaterThanOrEqualTo: leadingAnchor, constant: 24),
            contentStack.trailingAnchor.constraint(lessThanOrEqualTo: trailingAnchor, constant: -24),
            
            // Configure icon size
            iconImageView.widthAnchor.constraint(equalToConstant: 48),
            iconImageView.heightAnchor.constraint(equalToConstant: 48),
            
            // Configure button width
            retryButton.widthAnchor.constraint(greaterThanOrEqualToConstant: 120)
        ])
        
        // Adjust spacing for different size classes
        if traitCollection.horizontalSizeClass == .regular {
            contentStack.spacing = 24
        }
    }
    
    // MARK: - Public Methods
    
    /// Shows the error view with the specified message and optional retry action
    /// - Parameters:
    ///   - message: The error message to display
    ///   - showRetry: Whether to show the retry button
    ///   - retryHandler: Optional closure to execute when retry is tapped
    func show(message: String, showRetry: Bool = false, retryHandler: (() -> Void)? = nil) {
        messageLabel.text = message
        retryButton.isHidden = !showRetry
        retryAction = retryHandler
        
        // Update accessibility
        messageLabel.accessibilityLabel = message
        retryButton.accessibilityLabel = "Retry \(message)"
        
        // Show with animation
        fadeIn(duration: 0.3)
    }
    
    /// Hides the error view with animation
    func hide() {
        fadeOut(duration: 0.3) { [weak self] in
            self?.retryAction = nil
            self?.messageLabel.text = nil
            self?.retryButton.isHidden = true
        }
    }
    
    // MARK: - Actions
    
    @objc private func retryButtonTapped() {
        hide()
        retryAction?()
    }
    
    // MARK: - Theme Handling
    
    @objc private func handleThemeChange() {
        // Update colors for theme change
        backgroundColor = Theme.shared.color(for: .background)
        iconImageView.tintColor = Theme.shared.color(for: .error)
        messageLabel.textColor = Theme.shared.color(for: .text)
    }
    
    // MARK: - Layout Updates
    
    override func traitCollectionDidChange(_ previousTraitCollection: UITraitCollection?) {
        super.traitCollectionDidChange(previousTraitCollection)
        
        if traitCollection.hasDifferentColorAppearance(comparedTo: previousTraitCollection) {
            handleThemeChange()
        }
        
        if traitCollection.horizontalSizeClass != previousTraitCollection?.horizontalSizeClass {
            contentStack.spacing = traitCollection.horizontalSizeClass == .regular ? 24 : 16
        }
    }
}