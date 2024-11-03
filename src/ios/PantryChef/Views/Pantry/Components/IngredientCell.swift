//
// IngredientCell.swift
// PantryChef
//
// HUMAN TASKS:
// 1. Verify image caching configuration for optimal performance
// 2. Test dynamic type scaling for accessibility compliance
// 3. Review expiration status color contrast for WCAG compliance
// 4. Validate auto layout constraints on different device sizes

import UIKit // iOS 13.0+

// MARK: - IngredientCell
// Requirements:
// - Digital Pantry Management: Displays ingredient details with expiration tracking
// - Expiration Tracking: Visual representation of ingredient status
@IBDesignable
final class IngredientCell: UITableViewCell {
    
    // MARK: - UI Components
    private let nameLabel: UILabel = {
        let label = UILabel()
        label.font = Theme.shared.headingFont
        label.translatesAutoresizingMaskIntoConstraints = false
        return label
    }()
    
    private let quantityLabel: UILabel = {
        let label = UILabel()
        label.font = Theme.shared.bodyFont
        label.textColor = Theme.shared.color(.textSecondary)
        label.translatesAutoresizingMaskIntoConstraints = false
        return label
    }()
    
    private let locationLabel: UILabel = {
        let label = UILabel()
        label.font = Theme.shared.captionFont
        label.textColor = Theme.shared.color(.textSecondary)
        label.translatesAutoresizingMaskIntoConstraints = false
        return label
    }()
    
    private let expirationLabel: UILabel = {
        let label = UILabel()
        label.font = Theme.shared.captionFont
        label.translatesAutoresizingMaskIntoConstraints = false
        return label
    }()
    
    private let ingredientImageView: UIImageView = {
        let imageView = UIImageView()
        imageView.contentMode = .scaleAspectFill
        imageView.clipsToBounds = true
        imageView.layer.cornerRadius = 8
        imageView.translatesAutoresizingMaskIntoConstraints = false
        return imageView
    }()
    
    private let contentStackView: UIStackView = {
        let stackView = UIStackView()
        stackView.axis = .vertical
        stackView.spacing = 4
        stackView.alignment = .leading
        stackView.translatesAutoresizingMaskIntoConstraints = false
        return stackView
    }()
    
    // MARK: - Properties
    private var ingredient: Ingredient?
    
    // MARK: - Initialization
    override init(style: UITableViewCell.CellStyle, reuseIdentifier: String?) {
        super.init(style: style, reuseIdentifier: reuseIdentifier)
        setupUI()
    }
    
    required init?(coder: NSCoder) {
        super.init(coder: coder)
        setupUI()
    }
    
    // MARK: - UI Setup
    private func setupUI() {
        // Configure cell appearance
        selectionStyle = .none
        backgroundColor = Theme.shared.color(.surface)
        
        // Add shadow and corner rounding
        contentView.addShadow(opacity: 0.1, radius: 4, offset: 2)
        contentView.layer.cornerRadius = 12
        contentView.clipsToBounds = true
        
        // Add image view
        contentView.addSubview(ingredientImageView)
        
        // Configure content stack view
        contentStackView.addArrangedSubview(nameLabel)
        contentStackView.addArrangedSubview(quantityLabel)
        
        // Create horizontal stack for location and expiration
        let infoStackView = UIStackView()
        infoStackView.axis = .horizontal
        infoStackView.spacing = 8
        infoStackView.addArrangedSubview(locationLabel)
        infoStackView.addArrangedSubview(expirationLabel)
        contentStackView.addArrangedSubview(infoStackView)
        
        // Add content stack view
        contentView.addSubview(contentStackView)
        
        // Setup constraints
        NSLayoutConstraint.activate([
            // Image view constraints
            ingredientImageView.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 16),
            ingredientImageView.centerYAnchor.constraint(equalTo: contentView.centerYAnchor),
            ingredientImageView.widthAnchor.constraint(equalToConstant: 60),
            ingredientImageView.heightAnchor.constraint(equalToConstant: 60),
            
            // Content stack view constraints
            contentStackView.leadingAnchor.constraint(equalTo: ingredientImageView.trailingAnchor, constant: 12),
            contentStackView.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -16),
            contentStackView.topAnchor.constraint(equalTo: contentView.topAnchor, constant: 12),
            contentStackView.bottomAnchor.constraint(equalTo: contentView.bottomAnchor, constant: -12)
        ])
        
        // Apply theme styling
        Theme.shared.applyTheme(to: self)
    }
    
    // MARK: - Configuration
    /// Configures the cell with ingredient data
    /// Requirement: Digital Pantry Management - Display ingredient details
    func configure(with ingredient: Ingredient) {
        self.ingredient = ingredient
        
        // Update labels
        nameLabel.text = ingredient.name
        quantityLabel.text = String(format: "%.1f %@", ingredient.quantity, ingredient.unit)
        locationLabel.text = ingredient.location
        
        // Update expiration status
        updateExpirationStatus()
        
        // Load image if available
        if let imageUrl = ingredient.imageUrl {
            // TODO: Implement image loading with caching
            ingredientImageView.image = UIImage(named: "placeholder_ingredient")
        } else {
            ingredientImageView.image = UIImage(named: "placeholder_ingredient")
        }
    }
    
    // MARK: - Private Methods
    /// Updates the expiration label styling based on ingredient status
    /// Requirement: Expiration Tracking - Visual indicators for expiration status
    private func updateExpirationStatus() {
        guard let ingredient = ingredient else { return }
        
        if ingredient.isExpired {
            // Expired state
            expirationLabel.text = "Expired"
            expirationLabel.textColor = Theme.shared.color(.error)
            contentView.backgroundColor = Theme.shared.color(.error).withAlphaComponent(0.1)
        } else if let daysUntil = ingredient.daysUntilExpiration {
            if daysUntil <= 7 {
                // Warning state (expires within a week)
                expirationLabel.text = "Expires in \(daysUntil) days"
                expirationLabel.textColor = Theme.shared.color(.accent)
                contentView.backgroundColor = Theme.shared.color(.accent).withAlphaComponent(0.1)
            } else {
                // Normal state
                expirationLabel.text = "Expires in \(daysUntil) days"
                expirationLabel.textColor = Theme.shared.color(.textSecondary)
                contentView.backgroundColor = Theme.shared.color(.surface)
            }
        } else {
            // No expiration date
            expirationLabel.text = "No expiration"
            expirationLabel.textColor = Theme.shared.color(.textSecondary)
            contentView.backgroundColor = Theme.shared.color(.surface)
        }
    }
    
    // MARK: - Layout
    override func layoutSubviews() {
        super.layoutSubviews()
        
        // Add padding around the cell content
        contentView.frame = contentView.frame.inset(by: UIEdgeInsets(top: 6, left: 12, bottom: 6, right: 12))
    }
    
    // MARK: - Theme Updates
    override func traitCollectionDidChange(_ previousTraitCollection: UITraitCollection?) {
        super.traitCollectionDidChange(previousTraitCollection)
        
        // Update theme colors when trait collection changes (e.g., dark mode)
        if traitCollection.hasDifferentColorAppearance(comparedTo: previousTraitCollection) {
            Theme.shared.applyTheme(to: self)
            updateExpirationStatus()
        }
    }
    
    // MARK: - Reuse
    override func prepareForReuse() {
        super.prepareForReuse()
        
        // Reset cell state
        ingredient = nil
        nameLabel.text = nil
        quantityLabel.text = nil
        locationLabel.text = nil
        expirationLabel.text = nil
        ingredientImageView.image = nil
        contentView.backgroundColor = Theme.shared.color(.surface)
    }
}