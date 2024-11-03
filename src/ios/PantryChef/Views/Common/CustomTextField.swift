//
// CustomTextField.swift
// PantryChef
//
// HUMAN TASKS:
// 1. Verify accessibility labels and hints are properly set
// 2. Test VoiceOver interaction with error states
// 3. Validate keyboard handling and input restrictions
// 4. Review text field animations with reduced motion settings

import UIKit // iOS 13.0+

// MARK: - CustomTextField
// Requirement: UI Framework - Implements consistent UI styling and components for iOS native implementation
@IBDesignable
class CustomTextField: UITextField {
    
    // MARK: - Properties
    override var placeholder: String? {
        didSet {
            updatePlaceholder()
        }
    }
    
    var borderColor: UIColor = Theme.shared.color(.secondary) {
        didSet {
            layer.borderColor = borderColor.cgColor
        }
    }
    
    var borderWidth: CGFloat = 1.0 {
        didSet {
            layer.borderWidth = borderWidth
        }
    }
    
    var cornerRadius: CGFloat = 8.0 {
        didSet {
            layer.cornerRadius = cornerRadius
        }
    }
    
    var isValid: Bool = true {
        didSet {
            updateAppearance()
        }
    }
    
    var errorMessage: String?
    
    private lazy var errorLabel: UILabel = {
        let label = UILabel()
        label.font = Theme.shared.bodyFont
        label.textColor = Theme.shared.color(.error)
        label.numberOfLines = 0
        label.alpha = 0
        label.translatesAutoresizingMaskIntoConstraints = false
        return label
    }()
    
    let textPadding = UIEdgeInsets(top: 0, left: 12, bottom: 0, right: 12)
    
    // MARK: - Initialization
    // Requirement: Mobile Applications - Provides reusable UI components for mobile app text input with dynamic theming support
    override init(frame: CGRect) {
        super.init(frame: frame)
        setupTextField()
    }
    
    required init?(coder: NSCoder) {
        super.init(coder: coder)
        setupTextField()
    }
    
    // MARK: - Setup
    private func setupTextField() {
        // Apply theme styling
        applyThemeStyle()
        
        // Configure text field appearance
        borderColor = Theme.shared.color(.secondary)
        borderWidth = 1.0
        cornerRadius = 8.0
        font = Theme.shared.bodyFont
        textColor = Theme.shared.color(.text)
        backgroundColor = Theme.shared.color(.surface)
        
        // Set height constraint
        heightAnchor.constraint(equalToConstant: Theme.shared.inputHeight).isActive = true
        
        // Add error label
        addSubview(errorLabel)
        NSLayoutConstraint.activate([
            errorLabel.topAnchor.constraint(equalTo: bottomAnchor, constant: 4),
            errorLabel.leadingAnchor.constraint(equalTo: leadingAnchor),
            errorLabel.trailingAnchor.constraint(equalTo: trailingAnchor)
        ])
        
        // Register for theme updates
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(updateAppearance),
            name: Theme.themeDidChangeNotification,
            object: nil
        )
    }
    
    // MARK: - Text Rect
    override func textRect(forBounds bounds: CGRect) -> CGRect {
        return bounds.inset(by: textPadding)
    }
    
    override func editingRect(forBounds bounds: CGRect) -> CGRect {
        return bounds.inset(by: textPadding)
    }
    
    override func placeholderRect(forBounds bounds: CGRect) -> CGRect {
        return bounds.inset(by: textPadding)
    }
    
    // MARK: - Error Handling
    func setError(_ message: String) {
        errorMessage = message
        errorLabel.text = message
        isValid = false
        
        // Show error label with animation
        errorLabel.fadeIn()
        
        // Update border color
        UIView.animate(withDuration: 0.3) {
            self.borderColor = Theme.shared.color(.error)
            self.layer.borderWidth = 2.0
        }
    }
    
    func clearError() {
        isValid = true
        errorMessage = nil
        
        // Hide error label with animation
        errorLabel.fadeOut()
        
        // Reset border color
        UIView.animate(withDuration: 0.3) {
            self.borderColor = Theme.shared.color(.secondary)
            self.layer.borderWidth = 1.0
        }
    }
    
    // MARK: - Theme Updates
    @objc func updateAppearance() {
        // Update colors based on current theme
        textColor = Theme.shared.color(.text)
        backgroundColor = Theme.shared.color(.surface)
        
        // Update border color based on validation state
        if isValid {
            borderColor = Theme.shared.color(.secondary)
        } else {
            borderColor = Theme.shared.color(.error)
        }
        
        // Update placeholder
        updatePlaceholder()
        
        // Update error label color
        errorLabel.textColor = Theme.shared.color(.error)
    }
    
    // MARK: - Private Helpers
    private func updatePlaceholder() {
        if let placeholder = placeholder {
            attributedPlaceholder = NSAttributedString(
                string: placeholder,
                attributes: [
                    .foregroundColor: Theme.shared.color(.textSecondary),
                    .font: Theme.shared.bodyFont
                ]
            )
        }
    }
    
    // MARK: - Cleanup
    deinit {
        NotificationCenter.default.removeObserver(self)
    }
}