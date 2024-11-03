//
// RecipeSuggestionCell.swift
// PantryChef
//
// HUMAN TASKS:
// 1. Verify accessibility labels and hints are descriptive enough
// 2. Test dynamic type scaling for all text elements
// 3. Review match percentage color thresholds with design team
// 4. Validate image loading performance with slow network conditions

import UIKit // iOS 13.0+
import SDWebImage // ~> 5.0

// MARK: - RecipeSuggestionCell
// Requirements:
// - Recipe Matching: Smart recipe matching based on available ingredients
// - Recipe Discovery: Personalized recipe recommendations
@IBDesignable
final class RecipeSuggestionCell: UICollectionViewCell {
    
    // MARK: - UI Components
    private lazy var containerView: UIView = {
        let view = UIView()
        view.translatesAutoresizingMaskIntoConstraints = false
        view.backgroundColor = Theme.shared.color(.surface)
        return view
    }()
    
    private lazy var recipeImageView: UIImageView = {
        let imageView = UIImageView()
        imageView.translatesAutoresizingMaskIntoConstraints = false
        imageView.contentMode = .scaleAspectFill
        imageView.clipsToBounds = true
        imageView.backgroundColor = Theme.shared.color(.secondary)
        return imageView
    }()
    
    private lazy var titleLabel: UILabel = {
        let label = UILabel()
        label.translatesAutoresizingMaskIntoConstraints = false
        label.font = .systemFont(ofSize: 16, weight: .semibold)
        label.textColor = Theme.shared.color(.text)
        label.numberOfLines = 2
        return label
    }()
    
    private lazy var cookingTimeLabel: UILabel = {
        let label = UILabel()
        label.translatesAutoresizingMaskIntoConstraints = false
        label.font = .systemFont(ofSize: 14, weight: .regular)
        label.textColor = Theme.shared.color(.textSecondary)
        return label
    }()
    
    private lazy var matchPercentageLabel: UILabel = {
        let label = UILabel()
        label.translatesAutoresizingMaskIntoConstraints = false
        label.font = .systemFont(ofSize: 14, weight: .bold)
        return label
    }()
    
    // MARK: - Properties
    private var recipe: Recipe?
    private var availableIngredients: [Ingredient] = []
    
    // MARK: - Initialization
    override init(frame: CGRect) {
        super.init(frame: frame)
        setupUI()
        registerForThemeUpdates()
    }
    
    required init?(coder: NSCoder) {
        super.init(coder: coder)
        setupUI()
        registerForThemeUpdates()
    }
    
    // MARK: - UI Setup
    private func setupUI() {
        // Add container view
        contentView.addSubview(containerView)
        containerView.addShadow(opacity: 0.1, radius: 8, offset: 4)
        containerView.roundCorners(.allCorners, radius: 12)
        
        // Add subviews
        containerView.addSubview(recipeImageView)
        containerView.addSubview(titleLabel)
        containerView.addSubview(cookingTimeLabel)
        containerView.addSubview(matchPercentageLabel)
        
        // Apply theme styling
        applyThemeStyle()
        
        // Setup constraints
        NSLayoutConstraint.activate([
            // Container view
            containerView.topAnchor.constraint(equalTo: contentView.topAnchor, constant: 8),
            containerView.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 8),
            containerView.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -8),
            containerView.bottomAnchor.constraint(equalTo: contentView.bottomAnchor, constant: -8),
            
            // Recipe image view
            recipeImageView.topAnchor.constraint(equalTo: containerView.topAnchor),
            recipeImageView.leadingAnchor.constraint(equalTo: containerView.leadingAnchor),
            recipeImageView.trailingAnchor.constraint(equalTo: containerView.trailingAnchor),
            recipeImageView.heightAnchor.constraint(equalTo: recipeImageView.widthAnchor, multiplier: 0.75),
            
            // Title label
            titleLabel.topAnchor.constraint(equalTo: recipeImageView.bottomAnchor, constant: 12),
            titleLabel.leadingAnchor.constraint(equalTo: containerView.leadingAnchor, constant: 12),
            titleLabel.trailingAnchor.constraint(equalTo: containerView.trailingAnchor, constant: -12),
            
            // Cooking time label
            cookingTimeLabel.topAnchor.constraint(equalTo: titleLabel.bottomAnchor, constant: 8),
            cookingTimeLabel.leadingAnchor.constraint(equalTo: containerView.leadingAnchor, constant: 12),
            cookingTimeLabel.bottomAnchor.constraint(equalTo: containerView.bottomAnchor, constant: -12),
            
            // Match percentage label
            matchPercentageLabel.centerYAnchor.constraint(equalTo: cookingTimeLabel.centerY),
            matchPercentageLabel.trailingAnchor.constraint(equalTo: containerView.trailingAnchor, constant: -12),
            matchPercentageLabel.leadingAnchor.constraint(greaterThanOrEqualTo: cookingTimeLabel.trailingAnchor, constant: 8)
        ])
    }
    
    // MARK: - Theme Management
    private func registerForThemeUpdates() {
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleThemeChange),
            name: Theme.themeDidChangeNotification,
            object: nil
        )
    }
    
    @objc private func handleThemeChange() {
        applyThemeStyle()
    }
    
    // MARK: - Configuration
    /// Configures the cell with recipe data and available ingredients
    /// - Parameters:
    ///   - recipe: Recipe to display
    ///   - availableIngredients: Current available ingredients for match calculation
    func configure(with recipe: Recipe, availableIngredients: [Ingredient]) {
        self.recipe = recipe
        self.availableIngredients = availableIngredients
        
        // Configure title
        titleLabel.text = recipe.name
        
        // Configure cooking time
        let totalTime = recipe.totalTime()
        cookingTimeLabel.text = "\(totalTime) min"
        
        // Calculate and configure match percentage
        let matchScore = recipe.matchScore(availableIngredients)
        let percentage = Int(matchScore * 100)
        matchPercentageLabel.text = "\(percentage)%"
        
        // Set match percentage color based on score
        matchPercentageLabel.textColor = matchScoreColor(for: matchScore)
        
        // Load recipe image
        if let imageUrl = recipe.imageUrl {
            recipeImageView.sd_setImage(
                with: URL(string: imageUrl),
                placeholderImage: UIImage(named: "recipe_placeholder"),
                options: [.transitionCrossDissolve],
                completed: nil
            )
        } else {
            recipeImageView.image = UIImage(named: "recipe_placeholder")
        }
        
        // Configure accessibility
        setupAccessibility(with: recipe, matchPercentage: percentage)
    }
    
    // MARK: - Helper Methods
    private func matchScoreColor(for score: Double) -> UIColor {
        switch score {
        case 0.8...1.0:
            return Theme.shared.color(.accent)
        case 0.5..<0.8:
            return UIColor.systemYellow
        default:
            return Theme.shared.color(.textSecondary)
        }
    }
    
    private func setupAccessibility(with recipe: Recipe, matchPercentage: Int) {
        isAccessibilityElement = true
        accessibilityLabel = recipe.name
        accessibilityHint = "Recipe with \(matchPercentage)% ingredient match. Takes \(recipe.totalTime()) minutes to prepare."
        accessibilityTraits = .button
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
        matchPercentageLabel.text = nil
        
        // Reset data
        recipe = nil
        availableIngredients.removeAll()
    }
    
    // MARK: - Deinitialization
    deinit {
        NotificationCenter.default.removeObserver(self)
    }
}