//
// QuickActionView.swift
// PantryChef
//
// HUMAN TASKS:
// 1. Verify SF Symbols availability for iOS 13+ (scan.viewfinder, book.fill, basket.fill)
// 2. Test VoiceOver accessibility with localized strings
// 3. Verify color contrast ratios meet WCAG guidelines
// 4. Test dynamic type support for button labels

import UIKit // iOS 13.0+

/// A custom UIView component that displays quick action buttons for frequently used features
/// on the home screen with consistent styling and layout.
///
/// Requirement addressed: Home Screen Quick Actions (8.1.1)
/// - Implements Quick Actions component in Home screen for immediate access to key functionality
///
/// Requirement addressed: Screen Components (8.1.2)
/// - Implements Home screen Quick Action Bar component with consistent styling
final class QuickActionView: UIView, ViewConfigurable {
    
    // MARK: - UI Components
    private lazy var actionStackView: UIStackView = {
        let stackView = UIStackView()
        stackView.axis = .horizontal
        stackView.distribution = .fillEqually
        stackView.alignment = .fill
        stackView.spacing = Layout.spacing
        stackView.translatesAutoresizingMaskIntoConstraints = false
        return stackView
    }()
    
    private lazy var scanButton: UIButton = {
        let button = UIButton(type: .system)
        button.translatesAutoresizingMaskIntoConstraints = false
        button.setImage(UIImage(systemName: "scan.viewfinder"), for: .normal)
        button.setTitle(NSLocalizedString("Scan", comment: "Scan ingredients button"), for: .normal)
        button.titleLabel?.font = .systemFont(ofSize: 14, weight: .medium)
        button.imageEdgeInsets = UIEdgeInsets(top: 0, left: 0, bottom: 20, right: 0)
        button.titleEdgeInsets = UIEdgeInsets(top: 30, left: -25, bottom: 0, right: 0)
        button.addTarget(self, action: #selector(scanButtonTapped), for: .touchUpInside)
        return button
    }()
    
    private lazy var recipesButton: UIButton = {
        let button = UIButton(type: .system)
        button.translatesAutoresizingMaskIntoConstraints = false
        button.setImage(UIImage(systemName: "book.fill"), for: .normal)
        button.setTitle(NSLocalizedString("Recipes", comment: "View recipes button"), for: .normal)
        button.titleLabel?.font = .systemFont(ofSize: 14, weight: .medium)
        button.imageEdgeInsets = UIEdgeInsets(top: 0, left: 0, bottom: 20, right: 0)
        button.titleEdgeInsets = UIEdgeInsets(top: 30, left: -25, bottom: 0, right: 0)
        button.addTarget(self, action: #selector(recipesButtonTapped), for: .touchUpInside)
        return button
    }()
    
    private lazy var pantryButton: UIButton = {
        let button = UIButton(type: .system)
        button.translatesAutoresizingMaskIntoConstraints = false
        button.setImage(UIImage(systemName: "basket.fill"), for: .normal)
        button.setTitle(NSLocalizedString("Pantry", comment: "Manage pantry button"), for: .normal)
        button.titleLabel?.font = .systemFont(ofSize: 14, weight: .medium)
        button.imageEdgeInsets = UIEdgeInsets(top: 0, left: 0, bottom: 20, right: 0)
        button.titleEdgeInsets = UIEdgeInsets(top: 30, left: -25, bottom: 0, right: 0)
        button.addTarget(self, action: #selector(pantryButtonTapped), for: .touchUpInside)
        return button
    }()
    
    // MARK: - Action Handlers
    private let onScanTapped: (UIButton) -> Void
    private let onRecipesTapped: (UIButton) -> Void
    private let onPantryTapped: (UIButton) -> Void
    
    // MARK: - Initialization
    init(scanAction: @escaping (UIButton) -> Void,
         recipesAction: @escaping (UIButton) -> Void,
         pantryAction: @escaping (UIButton) -> Void) {
        self.onScanTapped = scanAction
        self.onRecipesTapped = recipesAction
        self.onPantryTapped = pantryAction
        super.init(frame: .zero)
        configure()
    }
    
    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
    
    // MARK: - ViewConfigurable Implementation
    func setupView() {
        // Add stack view to view hierarchy
        addSubview(actionStackView)
        
        // Add buttons to stack view
        actionStackView.addArrangedSubview(scanButton)
        actionStackView.addArrangedSubview(recipesButton)
        actionStackView.addArrangedSubview(pantryButton)
        
        // Configure accessibility
        scanButton.accessibilityLabel = NSLocalizedString("Scan Ingredients", comment: "Accessibility label for scan button")
        scanButton.accessibilityHint = NSLocalizedString("Double tap to scan ingredients using camera", comment: "Accessibility hint for scan button")
        
        recipesButton.accessibilityLabel = NSLocalizedString("View Recipes", comment: "Accessibility label for recipes button")
        recipesButton.accessibilityHint = NSLocalizedString("Double tap to browse recipes", comment: "Accessibility hint for recipes button")
        
        pantryButton.accessibilityLabel = NSLocalizedString("Manage Pantry", comment: "Accessibility label for pantry button")
        pantryButton.accessibilityHint = NSLocalizedString("Double tap to manage pantry inventory", comment: "Accessibility hint for pantry button")
    }
    
    func configureLayout() {
        NSLayoutConstraint.activate([
            // Stack view constraints
            actionStackView.topAnchor.constraint(equalTo: topAnchor, constant: Layout.margins),
            actionStackView.leadingAnchor.constraint(equalTo: leadingAnchor, constant: Layout.margins),
            actionStackView.trailingAnchor.constraint(equalTo: trailingAnchor, constant: -Layout.margins),
            actionStackView.bottomAnchor.constraint(equalTo: bottomAnchor, constant: -Layout.margins),
            
            // Button size constraints
            scanButton.heightAnchor.constraint(equalToConstant: Layout.iconSize * 3),
            recipesButton.heightAnchor.constraint(equalToConstant: Layout.iconSize * 3),
            pantryButton.heightAnchor.constraint(equalToConstant: Layout.iconSize * 3)
        ])
        
        // Configure content hugging and compression resistance
        [scanButton, recipesButton, pantryButton].forEach { button in
            button.setContentHuggingPriority(.required, for: .horizontal)
            button.setContentCompressionResistancePriority(.required, for: .horizontal)
        }
    }
    
    func configureAppearance() {
        // Apply theme colors
        backgroundColor = Theme.shared.color(for: .surface)
        layer.cornerRadius = Layout.cornerRadius
        
        // Configure button appearance
        [scanButton, recipesButton, pantryButton].forEach { button in
            button.tintColor = Theme.shared.color(for: .primary)
            button.backgroundColor = Theme.shared.color(for: .background)
            button.layer.cornerRadius = Layout.cornerRadius
            
            // Add subtle shadow
            button.layer.shadowColor = UIColor.black.cgColor
            button.layer.shadowOffset = CGSize(width: 0, height: 2)
            button.layer.shadowRadius = 4
            button.layer.shadowOpacity = 0.1
            
            // Configure image size
            button.imageView?.contentMode = .scaleAspectFit
            button.imageView?.preferredSymbolConfiguration = UIImage.SymbolConfiguration(pointSize: Layout.iconSize)
        }
    }
    
    // MARK: - Button Actions
    @objc private func scanButtonTapped(_ sender: UIButton) {
        onScanTapped(sender)
    }
    
    @objc private func recipesButtonTapped(_ sender: UIButton) {
        onRecipesTapped(sender)
    }
    
    @objc private func pantryButtonTapped(_ sender: UIButton) {
        onPantryTapped(sender)
    }
}