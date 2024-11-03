//
// RecognitionResultView.swift
// PantryChef
//
// HUMAN TASKS:
// 1. Verify accessibility labels are properly localized
// 2. Test VoiceOver interaction with table view cells
// 3. Validate color contrast ratios for confidence scores
// 4. Review table view cell reuse performance with large datasets

import UIKit // iOS 13.0+

// MARK: - RecognitionResultViewDelegate Protocol

/// Protocol for handling user interactions with recognition results
protocol RecognitionResultViewDelegate: AnyObject {
    /// Called when user confirms the recognized ingredients
    /// - Parameter ingredients: Array of confirmed ingredients
    func didConfirmIngredients(_ ingredients: [DetectedIngredient])
    
    /// Called when user requests to retry recognition
    func didRequestRetry()
}

// MARK: - RecognitionResultView

/// View component displaying ingredient recognition results with confidence scores and verification options
/// Requirements addressed:
/// - Photographic Ingredient Recognition (1.2 Scope/Core Capabilities)
/// - Image Recognition Component (6. SYSTEM COMPONENTS/6.1.2)
final class RecognitionResultView: UIView, ViewConfigurable {
    
    // MARK: - Properties
    
    private let containerStack: UIStackView = {
        let stack = UIStackView()
        stack.axis = .vertical
        stack.spacing = 16
        stack.alignment = .fill
        stack.distribution = .fill
        return stack
    }()
    
    private let ingredientsTable: UITableView = {
        let table = UITableView(frame: .zero, style: .plain)
        table.estimatedRowHeight = 60
        table.rowHeight = UITableView.automaticDimension
        table.separatorInset = UIEdgeInsets(top: 0, left: 16, bottom: 0, right: 16)
        table.backgroundColor = .clear
        return table
    }()
    
    private let titleLabel: UILabel = {
        let label = UILabel()
        label.font = .systemFont(ofSize: 20, weight: .semibold)
        label.textAlignment = .left
        label.text = "Detected Ingredients"
        return label
    }()
    
    private let noResultsLabel: UILabel = {
        let label = UILabel()
        label.font = .systemFont(ofSize: 16)
        label.textAlignment = .center
        label.textColor = .secondaryLabel
        label.text = "No ingredients detected. Please try again."
        label.isHidden = true
        return label
    }()
    
    private let confirmButton: CustomButton
    private let retryButton: CustomButton
    
    private var recognitionResult: RecognitionResult?
    weak var delegate: RecognitionResultViewDelegate?
    
    // MARK: - Initialization
    
    override init(frame: CGRect) {
        self.confirmButton = CustomButton(style: .primary)
        self.retryButton = CustomButton(style: .secondary)
        super.init(frame: frame)
        configure()
    }
    
    required init?(coder: NSCoder) {
        self.confirmButton = CustomButton(style: .primary)
        self.retryButton = CustomButton(style: .secondary)
        super.init(coder: coder)
        configure()
    }
    
    // MARK: - ViewConfigurable Implementation
    
    func setupView() {
        // Configure container stack
        addSubview(containerStack)
        containerStack.translatesAutoresizingMaskIntoConstraints = false
        
        // Add components to stack
        containerStack.addArrangedSubview(titleLabel)
        containerStack.addArrangedSubview(ingredientsTable)
        containerStack.addArrangedSubview(noResultsLabel)
        containerStack.addArrangedSubview(confirmButton)
        containerStack.addArrangedSubview(retryButton)
        
        // Configure table view
        ingredientsTable.delegate = self
        ingredientsTable.dataSource = self
        ingredientsTable.register(UITableViewCell.self, forCellReuseIdentifier: "IngredientCell")
        
        // Configure buttons
        confirmButton.setTitle("Confirm Ingredients", for: .normal)
        confirmButton.addTarget(self, action: #selector(handleConfirmTapped), for: .touchUpInside)
        
        retryButton.setTitle("Try Again", for: .normal)
        retryButton.addTarget(self, action: #selector(handleRetryTapped), for: .touchUpInside)
        
        // Configure accessibility
        titleLabel.accessibilityTraits = .header
        ingredientsTable.accessibilityLabel = "Detected ingredients list"
        confirmButton.accessibilityLabel = "Confirm detected ingredients"
        retryButton.accessibilityLabel = "Try ingredient detection again"
    }
    
    func configureLayout() {
        NSLayoutConstraint.activate([
            // Container stack constraints
            containerStack.topAnchor.constraint(equalTo: topAnchor, constant: 16),
            containerStack.leadingAnchor.constraint(equalTo: leadingAnchor, constant: 16),
            containerStack.trailingAnchor.constraint(equalTo: trailingAnchor, constant: -16),
            containerStack.bottomAnchor.constraint(equalTo: bottomAnchor, constant: -16),
            
            // Table view constraints
            ingredientsTable.heightAnchor.constraint(greaterThanOrEqualToConstant: 100),
            
            // Button height constraints
            confirmButton.heightAnchor.constraint(equalToConstant: 50),
            retryButton.heightAnchor.constraint(equalToConstant: 50)
        ])
        
        // Configure stack spacing for different size classes
        if traitCollection.horizontalSizeClass == .regular {
            containerStack.spacing = 24
        }
    }
    
    func configureAppearance() {
        // Configure view appearance
        backgroundColor = .systemBackground
        layer.cornerRadius = 12
        layer.masksToBounds = true
        
        // Configure title label appearance
        titleLabel.textColor = .label
        
        // Configure table view appearance
        ingredientsTable.separatorStyle = .singleLine
        ingredientsTable.separatorColor = .separator
        
        // Configure button states
        confirmButton.isEnabled = false
        
        // Configure dark mode adaptations
        if traitCollection.userInterfaceStyle == .dark {
            layer.borderColor = UIColor.separator.cgColor
            layer.borderWidth = 0.5
        }
    }
    
    // MARK: - Public Methods
    
    /// Updates the view with new recognition results
    /// - Parameter result: The recognition result to display
    func updateWithResult(_ result: RecognitionResult) {
        recognitionResult = result
        
        // Update UI state
        noResultsLabel.isHidden = !result.detectedIngredients.isEmpty
        confirmButton.isEnabled = !result.detectedIngredients.isEmpty
        
        // Check if manual verification is needed
        if result.needsManualVerification(minimumConfidence: 0.7) {
            titleLabel.text = "Please Verify Ingredients"
        } else {
            titleLabel.text = "Detected Ingredients"
        }
        
        // Reload table data
        ingredientsTable.reloadData()
    }
    
    // MARK: - Private Methods
    
    @objc private func handleConfirmTapped() {
        guard let result = recognitionResult else { return }
        
        // Show loading state
        confirmButton.setLoading(true)
        
        // Get high confidence ingredients
        let ingredients = result.getHighConfidenceIngredients(confidenceThreshold: 0.7)
        
        // Notify delegate
        delegate?.didConfirmIngredients(ingredients)
        
        // Reset loading state after a short delay
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
            self.confirmButton.setLoading(false)
        }
    }
    
    @objc private func handleRetryTapped() {
        // Clear current result
        recognitionResult = nil
        noResultsLabel.isHidden = false
        confirmButton.isEnabled = false
        ingredientsTable.reloadData()
        
        // Notify delegate
        delegate?.didRequestRetry()
    }
}

// MARK: - UITableViewDataSource

extension RecognitionResultView: UITableViewDataSource {
    func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
        return recognitionResult?.detectedIngredients.count ?? 0
    }
    
    func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        let cell = tableView.dequeueReusableCell(withIdentifier: "IngredientCell", for: indexPath)
        
        guard let ingredient = recognitionResult?.detectedIngredients[indexPath.row] else {
            return cell
        }
        
        // Configure cell
        var content = cell.defaultContentConfiguration()
        content.text = ingredient.name
        
        // Format confidence score
        let confidencePercentage = Int(ingredient.confidenceScore * 100)
        content.secondaryText = "Confidence: \(confidencePercentage)%"
        
        // Style based on confidence
        if ingredient.confidenceScore >= 0.7 {
            content.secondaryTextProperties.color = .systemGreen
        } else {
            content.secondaryTextProperties.color = .systemOrange
        }
        
        cell.contentConfiguration = content
        cell.accessoryType = .none
        cell.selectionStyle = .none
        
        return cell
    }
}

// MARK: - UITableViewDelegate

extension RecognitionResultView: UITableViewDelegate {
    func tableView(_ tableView: UITableView, didSelectRowAt indexPath: IndexPath) {
        tableView.deselectRow(at: indexPath, animated: true)
    }
}