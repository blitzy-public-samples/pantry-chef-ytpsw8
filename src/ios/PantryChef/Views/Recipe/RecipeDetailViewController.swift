//
// RecipeDetailViewController.swift
// PantryChef
//
// HUMAN TASKS:
// 1. Configure screen wake lock settings for cooking mode in device settings
// 2. Review accessibility labels and VoiceOver support
// 3. Test timer functionality with app in background state
// 4. Verify haptic feedback patterns with UX team

import UIKit // iOS 13.0+
import Combine // iOS 13.0+

// MARK: - RecipeDetailViewController
/// View controller responsible for displaying detailed recipe information and managing cooking mode
/// Requirements addressed:
/// - Recipe Detail View (8.1.2): Comprehensive recipe information display
/// - Cooking Mode (8.1.3): Interactive cooking mode with step-by-step instructions
final class RecipeDetailViewController: UIViewController {
    
    // MARK: - UI Components
    private lazy var scrollView: UIScrollView = {
        let scrollView = UIScrollView()
        scrollView.translatesAutoresizingMaskIntoConstraints = false
        scrollView.showsVerticalScrollIndicator = true
        scrollView.alwaysBounceVertical = true
        return scrollView
    }()
    
    private lazy var contentStack: UIStackView = {
        let stack = UIStackView()
        stack.translatesAutoresizingMaskIntoConstraints = false
        stack.axis = .vertical
        stack.spacing = 16
        stack.alignment = .fill
        stack.distribution = .fill
        return stack
    }()
    
    private lazy var recipeImageView: UIImageView = {
        let imageView = UIImageView()
        imageView.translatesAutoresizingMaskIntoConstraints = false
        imageView.contentMode = .scaleAspectFill
        imageView.clipsToBounds = true
        imageView.backgroundColor = .systemGray6
        return imageView
    }()
    
    private lazy var titleLabel: UILabel = {
        let label = UILabel()
        label.translatesAutoresizingMaskIntoConstraints = false
        label.font = .systemFont(ofSize: 24, weight: .bold)
        label.numberOfLines = 0
        return label
    }()
    
    private lazy var descriptionLabel: UILabel = {
        let label = UILabel()
        label.translatesAutoresizingMaskIntoConstraints = false
        label.font = .systemFont(ofSize: 16)
        label.textColor = .secondaryLabel
        label.numberOfLines = 0
        return label
    }()
    
    private lazy var ingredientsStack: UIStackView = {
        let stack = UIStackView()
        stack.translatesAutoresizingMaskIntoConstraints = false
        stack.axis = .vertical
        stack.spacing = 8
        return stack
    }()
    
    private lazy var stepsStack: UIStackView = {
        let stack = UIStackView()
        stack.translatesAutoresizingMaskIntoConstraints = false
        stack.axis = .vertical
        stack.spacing = 16
        return stack
    }()
    
    private lazy var startCookingButton: UIButton = {
        let button = UIButton(type: .system)
        button.translatesAutoresizingMaskIntoConstraints = false
        button.setTitle("Start Cooking", for: .normal)
        button.titleLabel?.font = .systemFont(ofSize: 18, weight: .semibold)
        button.backgroundColor = .systemBlue
        button.setTitleColor(.white, for: .normal)
        button.layer.cornerRadius = 12
        button.addTarget(self, action: #selector(startCookingMode), for: .touchUpInside)
        return button
    }()
    
    // MARK: - Properties
    private let viewModel: RecipeViewModel
    private var stepViews: [CookingStepView] = []
    private var cancellables = Set<AnyCancellable>()
    private var isCookingMode = false
    
    // MARK: - Initialization
    init(viewModel: RecipeViewModel) {
        self.viewModel = viewModel
        super.init(nibName: nil, bundle: nil)
    }
    
    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
    
    // MARK: - Lifecycle Methods
    override func viewDidLoad() {
        super.viewDidLoad()
        setupView()
        configureLayout()
        bindViewModel()
        
        // Configure navigation bar appearance
        navigationItem.largeTitleDisplayMode = .never
        view.backgroundColor = .systemBackground
    }
    
    // MARK: - Setup Methods
    private func setupView() {
        // Add scroll view and main content stack
        view.addSubview(scrollView)
        scrollView.addSubview(contentStack)
        
        // Add components to content stack
        contentStack.addArrangedSubview(recipeImageView)
        contentStack.addArrangedSubview(createPaddedContainer(for: titleLabel))
        contentStack.addArrangedSubview(createPaddedContainer(for: descriptionLabel))
        
        // Setup ingredients section
        let ingredientsSection = createSection(title: "Ingredients", content: ingredientsStack)
        contentStack.addArrangedSubview(ingredientsSection)
        
        // Setup steps section
        let stepsSection = createSection(title: "Instructions", content: stepsStack)
        contentStack.addArrangedSubview(stepsSection)
        
        // Add start cooking button
        let buttonContainer = UIView()
        buttonContainer.addSubview(startCookingButton)
        contentStack.addArrangedSubview(buttonContainer)
        
        // Configure accessibility
        configureAccessibility()
    }
    
    private func configureLayout() {
        NSLayoutConstraint.activate([
            // Scroll view constraints
            scrollView.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
            scrollView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            scrollView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            scrollView.bottomAnchor.constraint(equalTo: view.bottomAnchor),
            
            // Content stack constraints
            contentStack.topAnchor.constraint(equalTo: scrollView.topAnchor),
            contentStack.leadingAnchor.constraint(equalTo: scrollView.leadingAnchor),
            contentStack.trailingAnchor.constraint(equalTo: scrollView.trailingAnchor),
            contentStack.bottomAnchor.constraint(equalTo: scrollView.bottomAnchor),
            contentStack.widthAnchor.constraint(equalTo: scrollView.widthAnchor),
            
            // Recipe image constraints
            recipeImageView.heightAnchor.constraint(equalTo: recipeImageView.widthAnchor, multiplier: 0.75),
            
            // Start cooking button constraints
            startCookingButton.leadingAnchor.constraint(equalTo: buttonContainer.leadingAnchor, constant: 16),
            startCookingButton.trailingAnchor.constraint(equalTo: buttonContainer.trailingAnchor, constant: -16),
            startCookingButton.topAnchor.constraint(equalTo: buttonContainer.topAnchor, constant: 16),
            startCookingButton.bottomAnchor.constraint(equalTo: buttonContainer.bottomAnchor, constant: -16),
            startCookingButton.heightAnchor.constraint(equalToConstant: 50)
        ])
    }
    
    private func bindViewModel() {
        // Bind recipe state changes
        viewModel.state
            .receive(on: DispatchQueue.main)
            .sink { [weak self] state in
                if let recipe = state.recipes.first {
                    self?.updateRecipeDetails(recipe)
                }
            }
            .store(in: &cancellables)
    }
    
    // MARK: - UI Update Methods
    private func updateRecipeDetails(_ recipe: Recipe) {
        // Update recipe image
        if let imageUrl = recipe.imageUrl {
            // Load image asynchronously (implementation depends on image loading library)
            // For example, using SDWebImage or Kingfisher
        }
        
        // Update basic information
        titleLabel.text = recipe.name
        descriptionLabel.text = recipe.description
        
        // Update cooking time information
        let timeInfo = createTimeInfoView(prepTime: recipe.prepTime, cookTime: recipe.cookTime)
        contentStack.insertArrangedSubview(timeInfo, at: 3)
        
        // Update ingredients
        ingredientsStack.arrangedSubviews.forEach { $0.removeFromSuperview() }
        recipe.ingredients.forEach { ingredient in
            let ingredientView = createIngredientView(ingredient)
            ingredientsStack.addArrangedSubview(ingredientView)
        }
        
        // Update cooking steps
        stepsStack.arrangedSubviews.forEach { $0.removeFromSuperview() }
        stepViews.removeAll()
        
        recipe.steps.enumerated().forEach { index, step in
            let stepView = CookingStepView()
            stepView.delegate = self
            stepView.updateStep(number: index + 1, text: step)
            stepViews.append(stepView)
            stepsStack.addArrangedSubview(stepView)
        }
    }
    
    // MARK: - Helper Methods
    private func createSection(title: String, content: UIView) -> UIView {
        let container = UIView()
        let titleLabel = UILabel()
        titleLabel.text = title
        titleLabel.font = .systemFont(ofSize: 20, weight: .bold)
        
        container.addSubview(titleLabel)
        container.addSubview(content)
        
        titleLabel.translatesAutoresizingMaskIntoConstraints = false
        
        NSLayoutConstraint.activate([
            titleLabel.topAnchor.constraint(equalTo: container.topAnchor, constant: 16),
            titleLabel.leadingAnchor.constraint(equalTo: container.leadingAnchor, constant: 16),
            titleLabel.trailingAnchor.constraint(equalTo: container.trailingAnchor, constant: -16),
            
            content.topAnchor.constraint(equalTo: titleLabel.bottomAnchor, constant: 12),
            content.leadingAnchor.constraint(equalTo: container.leadingAnchor, constant: 16),
            content.trailingAnchor.constraint(equalTo: container.trailingAnchor, constant: -16),
            content.bottomAnchor.constraint(equalTo: container.bottomAnchor, constant: -16)
        ])
        
        return container
    }
    
    private func createPaddedContainer(for view: UIView) -> UIView {
        let container = UIView()
        container.addSubview(view)
        view.translatesAutoresizingMaskIntoConstraints = false
        
        NSLayoutConstraint.activate([
            view.topAnchor.constraint(equalTo: container.topAnchor, constant: 16),
            view.leadingAnchor.constraint(equalTo: container.leadingAnchor, constant: 16),
            view.trailingAnchor.constraint(equalTo: container.trailingAnchor, constant: -16),
            view.bottomAnchor.constraint(equalTo: container.bottomAnchor, constant: -16)
        ])
        
        return container
    }
    
    private func createTimeInfoView(prepTime: Int, cookTime: Int) -> UIView {
        let container = UIStackView()
        container.axis = .horizontal
        container.distribution = .equalSpacing
        container.alignment = .center
        container.spacing = 16
        
        let prepTimeView = createTimeView(title: "Prep Time", minutes: prepTime)
        let cookTimeView = createTimeView(title: "Cook Time", minutes: cookTime)
        let totalTimeView = createTimeView(title: "Total Time", minutes: prepTime + cookTime)
        
        container.addArrangedSubview(prepTimeView)
        container.addArrangedSubview(cookTimeView)
        container.addArrangedSubview(totalTimeView)
        
        return createPaddedContainer(for: container)
    }
    
    private func createTimeView(title: String, minutes: Int) -> UIView {
        let stack = UIStackView()
        stack.axis = .vertical
        stack.alignment = .center
        stack.spacing = 4
        
        let titleLabel = UILabel()
        titleLabel.text = title
        titleLabel.font = .systemFont(ofSize: 14)
        titleLabel.textColor = .secondaryLabel
        
        let timeLabel = UILabel()
        timeLabel.text = "\(minutes) min"
        timeLabel.font = .systemFont(ofSize: 16, weight: .medium)
        
        stack.addArrangedSubview(titleLabel)
        stack.addArrangedSubview(timeLabel)
        
        return stack
    }
    
    private func createIngredientView(_ ingredient: RecipeIngredient) -> UIView {
        let stack = UIStackView()
        stack.axis = .horizontal
        stack.spacing = 8
        stack.alignment = .center
        
        let quantityLabel = UILabel()
        quantityLabel.text = "\(ingredient.quantity) \(ingredient.unit)"
        quantityLabel.font = .systemFont(ofSize: 16)
        quantityLabel.setContentHuggingPriority(.required, for: .horizontal)
        
        let nameLabel = UILabel()
        nameLabel.text = ingredient.name
        nameLabel.font = .systemFont(ofSize: 16)
        nameLabel.numberOfLines = 0
        
        stack.addArrangedSubview(quantityLabel)
        stack.addArrangedSubview(nameLabel)
        
        return stack
    }
    
    private func configureAccessibility() {
        recipeImageView.isAccessibilityElement = true
        titleLabel.isAccessibilityElement = true
        descriptionLabel.isAccessibilityElement = true
        startCookingButton.isAccessibilityElement = true
        
        startCookingButton.accessibilityLabel = "Start cooking mode"
        startCookingButton.accessibilityHint = "Begins step-by-step cooking instructions"
    }
    
    // MARK: - Action Methods
    @objc private func startCookingMode() {
        isCookingMode = true
        
        // Configure UI for cooking mode
        UIApplication.shared.isIdleTimerDisabled = true
        navigationItem.rightBarButtonItem = UIBarButtonItem(
            title: "Exit",
            style: .done,
            target: self,
            action: #selector(exitCookingMode)
        )
        
        // Scroll to first uncompleted step
        if let firstUncompletedStep = stepViews.firstIndex(where: { !($0.value(forKey: "isCompleted") as? Bool ?? false) }),
           let stepView = stepViews[firstUncompletedStep].superview {
            scrollView.scrollRectToVisible(stepView.frame, animated: true)
        }
        
        // Update accessibility
        UIAccessibility.post(notification: .announcement, argument: "Cooking mode started")
    }
    
    @objc private func exitCookingMode() {
        isCookingMode = false
        UIApplication.shared.isIdleTimerDisabled = false
        navigationItem.rightBarButtonItem = nil
        
        // Update accessibility
        UIAccessibility.post(notification: .announcement, argument: "Cooking mode ended")
    }
}

// MARK: - CookingStepViewDelegate
extension RecipeDetailViewController: CookingStepViewDelegate {
    func stepDidComplete(_ stepView: CookingStepView) {
        // Check if all steps are completed
        let allCompleted = stepViews.allSatisfy { $0.value(forKey: "isCompleted") as? Bool ?? false }
        if allCompleted {
            // Show completion alert
            let alert = UIAlertController(
                title: "Recipe Completed!",
                message: "Congratulations on completing the recipe.",
                preferredStyle: .alert
            )
            alert.addAction(UIAlertAction(title: "OK", style: .default) { [weak self] _ in
                self?.exitCookingMode()
            })
            present(alert, animated: true)
        } else if let currentIndex = stepViews.firstIndex(of: stepView),
                  currentIndex + 1 < stepViews.count,
                  let nextStepView = stepViews[currentIndex + 1].superview {
            // Scroll to next step
            scrollView.scrollRectToVisible(nextStepView.frame, animated: true)
        }
    }
    
    func stepTimerDidStart(_ stepView: CookingStepView) {
        // Provide haptic feedback
        let generator = UIImpactFeedbackGenerator(style: .medium)
        generator.impactOccurred()
    }
    
    func stepTimerDidFinish(_ stepView: CookingStepView) {
        // Show timer completion notification if app is in background
        if UIApplication.shared.applicationState == .background {
            let content = UNMutableNotificationContent()
            content.title = "Timer Complete"
            content.body = "The timer for your cooking step has finished!"
            content.sound = .default
            
            let request = UNNotificationRequest(
                identifier: UUID().uuidString,
                content: content,
                trigger: nil
            )
            
            UNUserNotificationCenter.current().add(request)
        }
    }
}