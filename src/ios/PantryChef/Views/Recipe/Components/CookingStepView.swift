//
// CookingStepView.swift
// PantryChef
//
// HUMAN TASKS:
// 1. Verify accessibility labels and traits are properly configured for VoiceOver support
// 2. Test timer functionality with background app state
// 3. Validate haptic feedback implementation on timer completion
// 4. Review color contrast ratios for accessibility compliance

import UIKit // iOS 13.0+

// MARK: - CookingStepViewDelegate Protocol
/// Protocol defining the interface for step completion and timer events
protocol CookingStepViewDelegate: AnyObject {
    /// Called when a step is marked as complete
    func stepDidComplete(_ stepView: CookingStepView)
    
    /// Called when the step timer is started
    func stepTimerDidStart(_ stepView: CookingStepView)
    
    /// Called when the step timer completes
    func stepTimerDidFinish(_ stepView: CookingStepView)
}

// MARK: - CookingStepView
/// A custom UIView component that displays and manages individual cooking steps
/// Requirement addressed: Recipe Detail View (8.1.2)
/// - Implements recipe step visualization and interaction in the Recipe Details screen
@IBDesignable
final class CookingStepView: UIView {
    
    // MARK: - UI Components
    private lazy var stepNumberLabel: UILabel = {
        let label = UILabel()
        label.translatesAutoresizingMaskIntoConstraints = false
        label.textAlignment = .center
        label.layer.cornerRadius = 20
        label.clipsToBounds = true
        return label
    }()
    
    private lazy var instructionLabel: UILabel = {
        let label = UILabel()
        label.translatesAutoresizingMaskIntoConstraints = false
        label.numberOfLines = 0
        return label
    }()
    
    private lazy var timerButton: UIButton = {
        let button = UIButton(type: .system)
        button.translatesAutoresizingMaskIntoConstraints = false
        button.addTarget(self, action: #selector(timerButtonTapped), for: .touchUpInside)
        return button
    }()
    
    private lazy var completeButton: UIButton = {
        let button = UIButton(type: .system)
        button.translatesAutoresizingMaskIntoConstraints = false
        button.addTarget(self, action: #selector(completeButtonTapped), for: .touchUpInside)
        return button
    }()
    
    // MARK: - Properties
    private var stepNumber: Int = 0
    private var instruction: String = ""
    private var timerDuration: TimeInterval?
    private var isCompleted: Bool = false
    private var activeTimer: Timer?
    private var remainingTime: TimeInterval = 0
    
    weak var delegate: CookingStepViewDelegate?
    
    // MARK: - Initialization
    override init(frame: CGRect) {
        super.init(frame: frame)
        configure()
    }
    
    required init?(coder: NSCoder) {
        super.init(coder: coder)
        configure()
    }
    
    deinit {
        activeTimer?.invalidate()
    }
}

// MARK: - ViewConfigurable Implementation
extension CookingStepView: ViewConfigurable {
    func configure() {
        setupView()
        configureLayout()
        configureAppearance()
    }
    
    func setupView() {
        // Requirement addressed: Cooking Mode (8.1.3)
        // Setup view hierarchy for step-by-step cooking instructions
        addSubview(stepNumberLabel)
        addSubview(instructionLabel)
        addSubview(timerButton)
        addSubview(completeButton)
        
        // Configure initial button states
        timerButton.isHidden = true
        completeButton.setImage(UIImage(systemName: "checkmark.circle"), for: .normal)
        
        // Setup accessibility
        isAccessibilityElement = false
        stepNumberLabel.accessibilityTraits = .header
        instructionLabel.accessibilityTraits = .staticText
        timerButton.accessibilityTraits = .button
        completeButton.accessibilityTraits = .button
    }
    
    func configureLayout() {
        NSLayoutConstraint.activate([
            // Step number label constraints
            stepNumberLabel.leadingAnchor.constraint(equalTo: leadingAnchor, constant: 16),
            stepNumberLabel.topAnchor.constraint(equalTo: topAnchor, constant: 16),
            stepNumberLabel.widthAnchor.constraint(equalToConstant: 40),
            stepNumberLabel.heightAnchor.constraint(equalToConstant: 40),
            
            // Instruction label constraints
            instructionLabel.leadingAnchor.constraint(equalTo: stepNumberLabel.trailingAnchor, constant: 16),
            instructionLabel.topAnchor.constraint(equalTo: topAnchor, constant: 16),
            instructionLabel.trailingAnchor.constraint(equalTo: completeButton.leadingAnchor, constant: -16),
            
            // Timer button constraints
            timerButton.topAnchor.constraint(equalTo: instructionLabel.bottomAnchor, constant: 8),
            timerButton.leadingAnchor.constraint(equalTo: instructionLabel.leadingAnchor),
            timerButton.bottomAnchor.constraint(equalTo: bottomAnchor, constant: -16),
            timerButton.heightAnchor.constraint(equalToConstant: 36),
            
            // Complete button constraints
            completeButton.centerYAnchor.constraint(equalTo: stepNumberLabel.centerYAnchor),
            completeButton.trailingAnchor.constraint(equalTo: trailingAnchor, constant: -16),
            completeButton.widthAnchor.constraint(equalToConstant: 44),
            completeButton.heightAnchor.constraint(equalToConstant: 44)
        ])
    }
    
    func configureAppearance() {
        // Apply theme styling
        backgroundColor = Theme.shared.color(for: .surface)
        layer.cornerRadius = 8
        layer.shadowColor = UIColor.black.cgColor
        layer.shadowOffset = CGSize(width: 0, height: 2)
        layer.shadowOpacity = 0.1
        layer.shadowRadius = 4
        
        // Configure step number label appearance
        stepNumberLabel.backgroundColor = Theme.shared.color(for: .primary)
        stepNumberLabel.textColor = .white
        stepNumberLabel.font = .systemFont(ofSize: 18, weight: .bold)
        
        // Configure instruction label appearance
        instructionLabel.textColor = Theme.shared.color(for: .text)
        instructionLabel.font = .systemFont(ofSize: 16)
        
        // Configure button appearances
        timerButton.tintColor = Theme.shared.color(for: .primary)
        timerButton.titleLabel?.font = .systemFont(ofSize: 14, weight: .medium)
        
        completeButton.tintColor = isCompleted ? Theme.shared.color(for: .accent) : Theme.shared.color(for: .textSecondary)
    }
}

// MARK: - Public Interface
extension CookingStepView {
    /// Updates the step information displayed in the view
    func updateStep(number: Int, text: String, duration: TimeInterval? = nil) {
        stepNumber = number
        instruction = text
        timerDuration = duration
        
        stepNumberLabel.text = "\(number)"
        instructionLabel.text = text
        
        if let duration = duration {
            remainingTime = duration
            timerButton.isHidden = false
            updateTimerButtonTitle()
        } else {
            timerButton.isHidden = true
        }
        
        // Update accessibility labels
        stepNumberLabel.accessibilityLabel = "Step \(number)"
        instructionLabel.accessibilityLabel = text
        timerButton.accessibilityLabel = duration != nil ? "Start timer for \(Int(duration)) seconds" : nil
        
        setNeedsLayout()
    }
    
    /// Marks the step as completed and updates the UI
    func setCompleted(_ completed: Bool) {
        isCompleted = completed
        
        // Update button appearance
        let imageName = completed ? "checkmark.circle.fill" : "checkmark.circle"
        completeButton.setImage(UIImage(systemName: imageName), for: .normal)
        completeButton.tintColor = completed ? Theme.shared.color(for: .accent) : Theme.shared.color(for: .textSecondary)
        
        // Stop timer if active
        if completed {
            activeTimer?.invalidate()
            activeTimer = nil
        }
        
        // Update accessibility
        completeButton.accessibilityLabel = completed ? "Step completed" : "Mark step as complete"
        
        delegate?.stepDidComplete(self)
    }
    
    /// Starts the step timer if duration is set
    func startTimer() {
        guard let duration = timerDuration, activeTimer == nil else { return }
        
        remainingTime = duration
        updateTimerButtonTitle()
        
        activeTimer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { [weak self] timer in
            guard let self = self else {
                timer.invalidate()
                return
            }
            
            self.remainingTime -= 1
            
            if self.remainingTime <= 0 {
                timer.invalidate()
                self.activeTimer = nil
                self.timerComplete()
            } else {
                self.updateTimerButtonTitle()
            }
        }
        
        delegate?.stepTimerDidStart(self)
    }
}

// MARK: - Private Methods
private extension CookingStepView {
    @objc func timerButtonTapped() {
        if activeTimer == nil {
            startTimer()
        } else {
            activeTimer?.invalidate()
            activeTimer = nil
            remainingTime = timerDuration ?? 0
            updateTimerButtonTitle()
        }
    }
    
    @objc func completeButtonTapped() {
        setCompleted(!isCompleted)
    }
    
    func updateTimerButtonTitle() {
        let minutes = Int(remainingTime) / 60
        let seconds = Int(remainingTime) % 60
        let title = String(format: "%02d:%02d", minutes, seconds)
        
        timerButton.setTitle(activeTimer == nil ? "Start Timer (\(title))" : title, for: .normal)
        timerButton.accessibilityLabel = activeTimer == nil ? "Start timer for \(title)" : "Timer remaining: \(title)"
    }
    
    func timerComplete() {
        // Provide haptic feedback
        let generator = UINotificationFeedbackGenerator()
        generator.notificationOccurred(.success)
        
        // Update UI
        timerButton.setTitle("Timer Complete!", for: .normal)
        timerButton.accessibilityLabel = "Timer completed"
        
        delegate?.stepTimerDidFinish(self)
    }
}