//
// CategoryHeaderView.swift
// PantryChef
//
// HUMAN TASKS:
// 1. Verify accessibility labels and traits are properly set for VoiceOver support
// 2. Test dynamic type scaling behavior with different text size settings
// 3. Validate color contrast ratios meet WCAG guidelines

import UIKit // iOS 13.0+

/// A custom UIView component that displays a category header in the pantry view,
/// showing the category name and optional item count with consistent styling and layout.
///
/// Requirements addressed:
/// - Pantry Management (1.2 Scope/Core Capabilities):
///   Digital pantry management with categorized view of ingredients
/// - Screen Components (8.1 User Interface Design/8.1.2 Screen Components):
///   Pantry screen with Category Tabs and Item List components
@objc final class CategoryHeaderView: UIView, ViewConfigurable {
    
    // MARK: - Properties
    private let titleLabel: UILabel = {
        let label = UILabel()
        label.translatesAutoresizingMaskIntoConstraints = false
        label.adjustsFontForContentSizeCategory = true
        label.accessibilityTraits = .header
        return label
    }()
    
    private let countLabel: UILabel = {
        let label = UILabel()
        label.translatesAutoresizingMaskIntoConstraints = false
        label.adjustsFontForContentSizeCategory = true
        label.textAlignment = .right
        return label
    }()
    
    private var category: String = ""
    private var itemCount: Int = 0
    
    // MARK: - Initialization
    override init(frame: CGRect) {
        super.init(frame: frame)
        configure()
        setupThemeNotifications()
    }
    
    required init?(coder: NSCoder) {
        super.init(coder: coder)
        configure()
        setupThemeNotifications()
    }
    
    deinit {
        NotificationCenter.default.removeObserver(self)
    }
    
    // MARK: - ViewConfigurable Implementation
    func setupView() {
        addSubview(titleLabel)
        addSubview(countLabel)
        
        titleLabel.font = Theme.shared.titleFont
        countLabel.font = Theme.shared.captionFont
        
        // Set initial accessibility
        isAccessibilityElement = false
        titleLabel.isAccessibilityElement = true
        countLabel.isAccessibilityElement = true
    }
    
    func configureLayout() {
        NSLayoutConstraint.activate([
            // Title label constraints
            titleLabel.leadingAnchor.constraint(
                equalTo: leadingAnchor,
                constant: 16
            ),
            titleLabel.centerYAnchor.constraint(
                equalTo: centerYAnchor
            ),
            titleLabel.trailingAnchor.constraint(
                lessThanOrEqualTo: countLabel.leadingAnchor,
                constant: -8
            ),
            
            // Count label constraints
            countLabel.trailingAnchor.constraint(
                equalTo: trailingAnchor,
                constant: -16
            ),
            countLabel.centerYAnchor.constraint(
                equalTo: centerYAnchor
            ),
            countLabel.widthAnchor.constraint(
                greaterThanOrEqualToConstant: 40
            ),
            
            // Height constraint for the header view
            heightAnchor.constraint(
                greaterThanOrEqualToConstant: 44
            )
        ])
    }
    
    func configureAppearance() {
        backgroundColor = Theme.shared.color(.surface)
        titleLabel.textColor = Theme.shared.color(.text)
        countLabel.textColor = Theme.shared.color(.textSecondary)
        
        layer.shadowColor = UIColor.black.cgColor
        layer.shadowOffset = CGSize(width: 0, height: 1)
        layer.shadowOpacity = 0.1
        layer.shadowRadius = 2
    }
    
    // MARK: - Public Methods
    
    /// Updates the category name and item count displayed in the header
    /// - Parameters:
    ///   - category: The name of the category to display
    ///   - count: The number of items in this category
    func updateCategory(_ category: String, count: Int) {
        self.category = category
        self.itemCount = count
        
        titleLabel.text = category
        countLabel.text = "(\(count))"
        
        // Update accessibility labels
        titleLabel.accessibilityLabel = category
        countLabel.accessibilityLabel = "\(count) items"
        
        setNeedsLayout()
    }
    
    // MARK: - Private Methods
    private func setupThemeNotifications() {
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleThemeChange),
            name: Theme.themeDidChangeNotification,
            object: nil
        )
    }
    
    @objc private func handleThemeChange() {
        configureAppearance()
    }
}