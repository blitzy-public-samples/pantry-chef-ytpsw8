//
// CameraOverlayView.swift
// PantryChef
//
// HUMAN TASKS:
// 1. Test camera overlay UI on different device sizes
// 2. Verify accessibility labels and VoiceOver support
// 3. Review haptic feedback implementation for buttons
// 4. Test dark mode appearance of camera overlay elements

import UIKit // iOS 13.0+
import AVFoundation // iOS 13.0+

// MARK: - CameraOverlayView
// Requirement: Photographic ingredient recognition - Provides camera interface for capturing ingredient photos
@objc final class CameraOverlayView: UIView {
    
    // MARK: - UI Components
    private(set) var captureButton: UIButton!
    private(set) var flashButton: UIButton!
    private(set) var switchCameraButton: UIButton!
    private(set) var guidelineView: UIView!
    private(set) var instructionLabel: UILabel!
    
    // MARK: - Callbacks
    var onCapture: (() -> Void)?
    var onFlashToggle: (() -> Void)?
    var onCameraSwitch: (() -> Void)?
    
    // MARK: - Initialization
    override init(frame: CGRect) {
        super.init(frame: frame)
        setupButtons()
        setupGuidelineView()
        setupInstructionLabel()
        setupConstraints()
        
        // Apply theme styling
        Theme.shared.applyTheme(to: self)
        backgroundColor = .clear
    }
    
    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
    
    // MARK: - Setup Methods
    private func setupButtons() {
        // Configure capture button
        captureButton = UIButton(type: .custom)
        captureButton.translatesAutoresizingMaskIntoConstraints = false
        captureButton.backgroundColor = Theme.shared.color(.surface)
        captureButton.layer.borderWidth = 3
        captureButton.layer.borderColor = Theme.shared.color(.primary).cgColor
        captureButton.addTarget(self, action: #selector(handleCapture), for: .touchUpInside)
        captureButton.accessibilityLabel = "Take Photo"
        captureButton.roundCorners(.allCorners, radius: 35)
        addSubview(captureButton)
        
        // Configure flash button
        flashButton = UIButton(type: .system)
        flashButton.translatesAutoresizingMaskIntoConstraints = false
        flashButton.tintColor = Theme.shared.color(.surface)
        flashButton.setImage(UIImage(systemName: "bolt.slash.fill"), for: .normal)
        flashButton.addTarget(self, action: #selector(handleFlashToggle), for: .touchUpInside)
        flashButton.accessibilityLabel = "Toggle Flash"
        flashButton.roundCorners(.allCorners, radius: 20)
        addSubview(flashButton)
        
        // Configure camera switch button
        switchCameraButton = UIButton(type: .system)
        switchCameraButton.translatesAutoresizingMaskIntoConstraints = false
        switchCameraButton.tintColor = Theme.shared.color(.surface)
        switchCameraButton.setImage(UIImage(systemName: "camera.rotate.fill"), for: .normal)
        switchCameraButton.addTarget(self, action: #selector(handleCameraSwitch), for: .touchUpInside)
        switchCameraButton.accessibilityLabel = "Switch Camera"
        switchCameraButton.roundCorners(.allCorners, radius: 20)
        addSubview(switchCameraButton)
        
        // Apply fade in animation
        [captureButton, flashButton, switchCameraButton].forEach { button in
            button.fadeIn(duration: 0.3)
        }
    }
    
    private func setupGuidelineView() {
        guidelineView = UIView()
        guidelineView.translatesAutoresizingMaskIntoConstraints = false
        guidelineView.backgroundColor = .clear
        guidelineView.layer.borderWidth = 2
        guidelineView.layer.borderColor = Theme.shared.color(.surface).cgColor
        addSubview(guidelineView)
        
        // Add corner markers
        let corners = [
            CGPoint(x: 0, y: 0),
            CGPoint(x: 1, y: 0),
            CGPoint(x: 0, y: 1),
            CGPoint(x: 1, y: 1)
        ]
        
        corners.forEach { point in
            let marker = UIView()
            marker.backgroundColor = Theme.shared.color(.surface)
            marker.translatesAutoresizingMaskIntoConstraints = false
            guidelineView.addSubview(marker)
            
            NSLayoutConstraint.activate([
                marker.widthAnchor.constraint(equalToConstant: 20),
                marker.heightAnchor.constraint(equalToConstant: 3),
                marker.centerXAnchor.constraint(equalTo: guidelineView.leadingAnchor, constant: point.x * guidelineView.bounds.width),
                marker.centerYAnchor.constraint(equalTo: guidelineView.topAnchor, constant: point.y * guidelineView.bounds.height)
            ])
            
            marker.transform = CGAffineTransform(rotationAngle: point.x == point.y ? .pi / 4 : -.pi / 4)
        }
        
        guidelineView.fadeIn(duration: 0.5)
    }
    
    private func setupInstructionLabel() {
        instructionLabel = UILabel()
        instructionLabel.translatesAutoresizingMaskIntoConstraints = false
        instructionLabel.text = "Position ingredient in the frame"
        instructionLabel.textAlignment = .center
        instructionLabel.textColor = Theme.shared.color(.surface)
        instructionLabel.font = .systemFont(ofSize: 16, weight: .medium)
        instructionLabel.numberOfLines = 0
        addSubview(instructionLabel)
        
        instructionLabel.fadeIn(duration: 0.5)
    }
    
    private func setupConstraints() {
        NSLayoutConstraint.activate([
            // Capture button constraints
            captureButton.centerXAnchor.constraint(equalTo: centerXAnchor),
            captureButton.bottomAnchor.constraint(equalTo: safeAreaLayoutGuide.bottomAnchor, constant: -30),
            captureButton.widthAnchor.constraint(equalToConstant: 70),
            captureButton.heightAnchor.constraint(equalToConstant: 70),
            
            // Flash button constraints
            flashButton.leadingAnchor.constraint(equalTo: safeAreaLayoutGuide.leadingAnchor, constant: 20),
            flashButton.topAnchor.constraint(equalTo: safeAreaLayoutGuide.topAnchor, constant: 20),
            flashButton.widthAnchor.constraint(equalToConstant: 40),
            flashButton.heightAnchor.constraint(equalToConstant: 40),
            
            // Camera switch button constraints
            switchCameraButton.trailingAnchor.constraint(equalTo: safeAreaLayoutGuide.trailingAnchor, constant: -20),
            switchCameraButton.topAnchor.constraint(equalTo: safeAreaLayoutGuide.topAnchor, constant: 20),
            switchCameraButton.widthAnchor.constraint(equalToConstant: 40),
            switchCameraButton.heightAnchor.constraint(equalToConstant: 40),
            
            // Guideline view constraints
            guidelineView.centerXAnchor.constraint(equalTo: centerXAnchor),
            guidelineView.centerYAnchor.constraint(equalTo: centerYAnchor),
            guidelineView.widthAnchor.constraint(equalTo: widthAnchor, multiplier: 0.7),
            guidelineView.heightAnchor.constraint(equalTo: guidelineView.widthAnchor),
            
            // Instruction label constraints
            instructionLabel.centerXAnchor.constraint(equalTo: centerXAnchor),
            instructionLabel.bottomAnchor.constraint(equalTo: guidelineView.topAnchor, constant: -20),
            instructionLabel.leadingAnchor.constraint(equalTo: leadingAnchor, constant: 20),
            instructionLabel.trailingAnchor.constraint(equalTo: trailingAnchor, constant: -20)
        ])
    }
    
    // MARK: - Button Actions
    @objc private func handleCapture() {
        captureButton.fadeOut(duration: 0.1) { [weak self] in
            self?.captureButton.fadeIn(duration: 0.1)
        }
        onCapture?()
    }
    
    @objc private func handleFlashToggle() {
        onFlashToggle?()
    }
    
    @objc private func handleCameraSwitch() {
        onCameraSwitch?()
    }
    
    // MARK: - Public Methods
    func updateFlashButtonState(_ isEnabled: Bool) {
        let imageName = isEnabled ? "bolt.fill" : "bolt.slash.fill"
        flashButton.setImage(UIImage(systemName: imageName), for: .normal)
        flashButton.accessibilityLabel = isEnabled ? "Disable Flash" : "Enable Flash"
        
        flashButton.fadeOut(duration: 0.2) { [weak self] in
            self?.flashButton.fadeIn(duration: 0.2)
        }
    }
}