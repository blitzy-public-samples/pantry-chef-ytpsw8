//
// LoadingView.swift
// PantryChef
//
// HUMAN TASKS:
// 1. Verify loading indicator contrast ratio meets accessibility guidelines
// 2. Test loading view behavior with VoiceOver enabled
// 3. Validate loading view appearance on different screen sizes
// 4. Review animation performance on older devices

import UIKit // iOS 13.0+

/// A reusable loading view component that displays an activity indicator with optional text message
/// Requirement: UI Framework - Implements loading state UI component for iOS native implementation using UIKit components with support for dynamic theming
@objc final class LoadingView: UIView {
    
    // MARK: - Properties
    
    private let activityIndicator: UIActivityIndicatorView = {
        let indicator = UIActivityIndicatorView(style: .large)
        indicator.translatesAutoresizingMaskIntoConstraints = false
        return indicator
    }()
    
    private let messageLabel: UILabel = {
        let label = UILabel()
        label.translatesAutoresizingMaskIntoConstraints = false
        label.textAlignment = .center
        label.numberOfLines = 0
        return label
    }()
    
    private let stackView: UIStackView = {
        let stack = UIStackView()
        stack.translatesAutoresizingMaskIntoConstraints = false
        stack.axis = .vertical
        stack.alignment = .center
        stack.spacing = 16
        return stack
    }()
    
    private var message: String?
    
    // MARK: - Initialization
    
    /// Initializes the loading view with an optional message and applies theme styling
    /// - Parameter message: Optional text message to display below the activity indicator
    init(message: String? = nil) {
        self.message = message
        super.init(frame: .zero)
        setupUI()
    }
    
    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
    
    // MARK: - UI Setup
    
    /// Sets up the loading view UI components with proper theming
    /// Requirement: Mobile Applications - Provides loading state feedback for asynchronous operations with consistent UI/UX patterns
    private func setupUI() {
        // Configure background
        backgroundColor = Theme.shared.color(.surface).withAlphaComponent(0.95)
        layer.cornerRadius = 12
        
        // Configure activity indicator
        activityIndicator.color = Theme.shared.color(.primary)
        stackView.addArrangedSubview(activityIndicator)
        
        // Configure message label if present
        if let message = message {
            messageLabel.text = message
            messageLabel.font = .systemFont(ofSize: 16, weight: .medium)
            messageLabel.textColor = Theme.shared.color(.text)
            stackView.addArrangedSubview(messageLabel)
        }
        
        // Add stack view to hierarchy
        addSubview(stackView)
        
        // Configure layout constraints
        NSLayoutConstraint.activate([
            stackView.centerXAnchor.constraint(equalTo: centerXAnchor),
            stackView.centerYAnchor.constraint(equalTo: centerYAnchor),
            stackView.leadingAnchor.constraint(greaterThanOrEqualTo: leadingAnchor, constant: 24),
            stackView.trailingAnchor.constraint(lessThanOrEqualTo: trailingAnchor, constant: -24),
            
            widthAnchor.constraint(greaterThanOrEqualToConstant: 120),
            heightAnchor.constraint(greaterThanOrEqualToConstant: 120)
        ])
        
        // Apply theme styling
        Theme.shared.applyTheme(to: self)
        addShadow(opacity: 0.15, radius: 8, offset: 4)
    }
    
    // MARK: - Public Methods
    
    /// Shows the loading view with fade animation
    /// Requirement: Mobile Applications - Provides loading state feedback for asynchronous operations
    func show() {
        activityIndicator.startAnimating()
        fadeIn(duration: 0.2)
        isUserInteractionEnabled = true
        
        // Update theme for current trait collection
        if let window = window {
            Theme.shared.updateForCurrentTraitCollection(window.traitCollection)
        }
    }
    
    /// Hides the loading view with fade animation
    func hide() {
        fadeOut(duration: 0.2) { [weak self] in
            self?.activityIndicator.stopAnimating()
            self?.removeFromSuperview()
        }
        isUserInteractionEnabled = false
    }
    
    /// Updates the loading message text with proper theme styling
    /// - Parameter message: New message text to display
    func updateMessage(_ message: String?) {
        self.message = message
        messageLabel.text = message
        messageLabel.isHidden = message == nil
        
        // Update layout if needed
        setNeedsLayout()
        layoutIfNeeded()
    }
    
    // MARK: - Overrides
    
    override func traitCollectionDidChange(_ previousTraitCollection: UITraitCollection?) {
        super.traitCollectionDidChange(previousTraitCollection)
        
        // Update theme colors when trait collection changes
        backgroundColor = Theme.shared.color(.surface).withAlphaComponent(0.95)
        activityIndicator.color = Theme.shared.color(.primary)
        messageLabel.textColor = Theme.shared.color(.text)
    }
}