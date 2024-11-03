//
// RecipeCell.swift
// PantryChef
//
// HUMAN TASKS:
// 1. Verify image caching settings in SDWebImage configuration
// 2. Review accessibility labels and traits for VoiceOver support
// 3. Test dynamic type scaling for all labels
// 4. Validate color contrast ratios for accessibility compliance

import UIKit // iOS 13.0+
import SDWebImage // ~> 5.0

// MARK: - RecipeCell
// Requirements:
// - Recipe Management: Recipe discovery through visual recipe cards with comprehensive details
// - Smart Recipe Matching: Displays recipe match scores based on available ingredients
@objc
class RecipeCell: UICollectionViewCell {
    
    // MARK: - UI Components
    private let recipeImageView: UIImageView = {
        let imageView = UIImageView()
        imageView.contentMode = .scaleAspectFill
        imageView.clipsToBounds = true
        imageView.backgroundColor = Theme.shared.color(.secondary)
        return imageView
    }()
    
    private let titleLabel: UILabel = {
        let label = UILabel()
        label.font = Theme.shared.headingFont
        label.textColor = Theme.shared.color(.text)
        label.numberOfLines = 2
        return label
    }()
    
    private let cookingTimeLabel: UILabel = {
        let label = UILabel()
        label.font = Theme.shared.captionFont
        label.textColor = Theme.shared.color(.textSecondary)
        return label
    }()
    
    private let difficultyLabel: UILabel = {
        let label = UILabel()
        label.font = Theme.shared.captionFont
        label.textColor = Theme.shared.color(.textSecondary)
        return label
    }()
    
    private let matchScoreLabel: UILabel = {
        let label = UILabel()
        label.font = Theme.shared.bodyFont.withTraits(.bold)
        label.textColor = Theme.shared.color(.accent)
        return label
    }()
    
    // MARK: - Properties
    private weak var recipe: Recipe?
    
    // MARK: - Initialization
    required init?(coder: NSCoder) {
        super.init(coder: coder)
        setupUI()
    }
    
    override init(frame: CGRect) {
        super.init(frame: frame)
        setupUI()
    }
    
    // MARK: - UI Setup
    private func setupUI() {
        // Configure content view
        contentView.backgroundColor = Theme.shared.color(.surface)
        contentView.layer.cornerRadius = 12
        contentView.clipsToBounds = true
        
        // Add shadow to cell
        addShadow(opacity: 0.1, radius: 8, offset: 4)
        
        // Add subviews with auto layout
        [recipeImageView, titleLabel, cookingTimeLabel, difficultyLabel, matchScoreLabel].forEach {
            $0.translatesAutoresizingMaskIntoConstraints = false
            contentView.addSubview($0)
        }
        
        NSLayoutConstraint.activate([
            // Image view constraints
            recipeImageView.topAnchor.constraint(equalTo: contentView.topAnchor),
            recipeImageView.leadingAnchor.constraint(equalTo: contentView.leadingAnchor),
            recipeImageView.trailingAnchor.constraint(equalTo: contentView.trailingAnchor),
            recipeImageView.heightAnchor.constraint(equalTo: recipeImageView.widthAnchor, multiplier: 0.75),
            
            // Title label constraints
            titleLabel.topAnchor.constraint(equalTo: recipeImageView.bottomAnchor, constant: 12),
            titleLabel.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 12),
            titleLabel.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -12),
            
            // Cooking time label constraints
            cookingTimeLabel.topAnchor.constraint(equalTo: titleLabel.bottomAnchor, constant: 8),
            cookingTimeLabel.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 12),
            
            // Difficulty label constraints
            difficultyLabel.centerYAnchor.constraint(equalTo: cookingTimeLabel.centerYAnchor),
            difficultyLabel.leadingAnchor.constraint(equalTo: cookingTimeLabel.trailingAnchor, constant: 12),
            
            // Match score label constraints
            matchScoreLabel.centerYAnchor.constraint(equalTo: cookingTimeLabel.centerYAnchor),
            matchScoreLabel.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -12),
            matchScoreLabel.bottomAnchor.constraint(lessThanOrEqualTo: contentView.bottomAnchor, constant: -12)
        ])
        
        // Apply theme styling
        applyThemeStyle()
    }
    
    // MARK: - Configuration
    /// Configures the cell with recipe data and calculates match score
    /// - Parameters:
    ///   - recipe: Recipe model to display
    ///   - availableIngredients: List of ingredients to calculate match score
    func configure(with recipe: Recipe, availableIngredients: [Ingredient]) {
        self.recipe = recipe
        
        // Configure title
        titleLabel.text = recipe.name
        
        // Configure cooking time
        let totalTime = recipe.totalTime()
        cookingTimeLabel.text = "\(totalTime) min"
        
        // Configure difficulty
        difficultyLabel.text = recipe.difficulty
        
        // Calculate and display match score
        let score = recipe.matchScore(availableIngredients)
        let percentage = Int(score * 100)
        matchScoreLabel.text = "\(percentage)% match"
        
        // Load recipe image
        if let imageUrl = recipe.imageUrl {
            recipeImageView.sd_setImage(
                with: URL(string: imageUrl),
                placeholderImage: UIImage(named: "recipe_placeholder"),
                options: [.transitionCrossDissolve],
                completed: { [weak self] _, error, _, _ in
                    if error == nil {
                        self?.fadeIn(duration: 0.3)
                    }
                }
            )
        } else {
            recipeImageView.image = UIImage(named: "recipe_placeholder")
        }
    }
    
    // MARK: - Reuse
    override func prepareForReuse() {
        super.prepareForReuse()
        
        // Cancel any pending image downloads
        recipeImageView.sd_cancelCurrentImageLoad()
        
        // Reset image and labels
        recipeImageView.image = nil
        titleLabel.text = nil
        cookingTimeLabel.text = nil
        difficultyLabel.text = nil
        matchScoreLabel.text = nil
        
        // Reset recipe reference
        recipe = nil
        
        // Reset alpha
        alpha = 1
    }
    
    // MARK: - Theme Support
    override func traitCollectionDidChange(_ previousTraitCollection: UITraitCollection?) {
        super.traitCollectionDidChange(previousTraitCollection)
        
        // Update theme colors when trait collection changes
        if traitCollection.hasDifferentColorAppearance(comparedTo: previousTraitCollection) {
            applyThemeStyle()
        }
    }
}

// MARK: - UIFont Extension
private extension UIFont {
    func withTraits(_ traits: UIFontDescriptor.SymbolicTraits) -> UIFont {
        guard let descriptor = fontDescriptor.withSymbolicTraits(traits) else {
            return self
        }
        return UIFont(descriptor: descriptor, size: 0)
    }
}