//
// CameraViewController.swift
// PantryChef
//
// HUMAN TASKS:
// 1. Configure camera usage description in Info.plist
// 2. Test camera performance on different iOS devices
// 3. Verify accessibility features and VoiceOver support
// 4. Review memory usage during image processing
// 5. Test recognition flow with various lighting conditions

// Third-party imports
import UIKit // iOS 13.0+
import AVFoundation // iOS 13.0+
import Combine // iOS 13.0+

/// View controller responsible for managing camera interface and ingredient recognition
/// Requirements addressed:
/// - Photographic ingredient recognition (1.2 Scope/Core Capabilities)
/// - Image Recognition Component (6.1.2)
/// - Performance Metrics (Appendix C)
final class CameraViewController: UIViewController, ViewConfigurable, RecognitionResultViewDelegate {
    
    // MARK: - Properties
    
    private let viewModel: CameraViewModel
    private let overlayView: CameraOverlayView
    private let resultView: RecognitionResultView
    private var previewLayer: AVCaptureVideoPreviewLayer!
    private var cancellables = Set<AnyCancellable>()
    
    private let loadingIndicator: UIActivityIndicatorView = {
        let indicator = UIActivityIndicatorView(style: .large)
        indicator.hidesWhenStopped = true
        indicator.color = .white
        return indicator
    }()
    
    // MARK: - Initialization
    
    init() {
        self.viewModel = CameraViewModel()
        self.overlayView = CameraOverlayView()
        self.resultView = RecognitionResultView()
        super.init(nibName: nil, bundle: nil)
    }
    
    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
    
    // MARK: - Lifecycle Methods
    
    override func viewDidLoad() {
        super.viewDidLoad()
        configure()
        bindViewModel()
        
        // Request camera permissions
        AVCaptureDevice.requestAccess(for: .video) { [weak self] granted in
            guard granted else {
                DispatchQueue.main.async {
                    self?.handleCameraPermissionDenied()
                }
                return
            }
        }
    }
    
    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        
        // Configure navigation bar for camera interface
        navigationController?.setNavigationBarHidden(true, animated: animated)
        
        // Start camera session
        viewModel.transform(input: Just(.startCamera).eraseToAnyPublisher())
            .sink { [weak self] _ in
                self?.updatePreviewLayerOrientation()
            }
            .store(in: &cancellables)
    }
    
    override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)
        
        // Stop camera session and restore navigation bar
        navigationController?.setNavigationBarHidden(false, animated: animated)
        viewModel.transform(input: Just(.stopCamera).eraseToAnyPublisher())
            .sink { _ in }
            .store(in: &cancellables)
    }
    
    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        previewLayer?.frame = view.bounds
    }
    
    // MARK: - ViewConfigurable Implementation
    
    func setupView() {
        // Configure preview layer
        previewLayer = AVCaptureVideoPreviewLayer()
        previewLayer.videoGravity = .resizeAspectFill
        view.layer.addSublayer(previewLayer)
        
        // Add overlay view
        overlayView.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(overlayView)
        
        // Configure overlay callbacks
        overlayView.onCapture = { [weak self] in
            self?.handleCapture()
        }
        overlayView.onFlashToggle = { [weak self] in
            self?.handleFlashToggle()
        }
        overlayView.onCameraSwitch = { [weak self] in
            self?.handleCameraSwitch()
        }
        
        // Add result view
        resultView.translatesAutoresizingMaskIntoConstraints = false
        resultView.delegate = self
        resultView.isHidden = true
        view.addSubview(resultView)
        
        // Add loading indicator
        loadingIndicator.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(loadingIndicator)
        
        // Configure accessibility
        view.accessibilityLabel = "Camera View"
        view.accessibilityHint = "Take a photo of ingredients to recognize them"
    }
    
    func configureLayout() {
        NSLayoutConstraint.activate([
            // Overlay view constraints
            overlayView.topAnchor.constraint(equalTo: view.topAnchor),
            overlayView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            overlayView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            overlayView.bottomAnchor.constraint(equalTo: view.bottomAnchor),
            
            // Result view constraints
            resultView.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            resultView.centerYAnchor.constraint(equalTo: view.centerYAnchor),
            resultView.widthAnchor.constraint(equalTo: view.widthAnchor, multiplier: 0.9),
            resultView.heightAnchor.constraint(lessThanOrEqualTo: view.heightAnchor, multiplier: 0.8),
            
            // Loading indicator constraints
            loadingIndicator.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            loadingIndicator.centerYAnchor.constraint(equalTo: view.centerYAnchor)
        ])
    }
    
    func configureAppearance() {
        view.backgroundColor = .black
        
        // Configure result view appearance
        resultView.layer.cornerRadius = 12
        resultView.clipsToBounds = true
        
        if traitCollection.userInterfaceStyle == .dark {
            resultView.layer.borderColor = UIColor.separator.cgColor
            resultView.layer.borderWidth = 0.5
        }
    }
    
    // MARK: - View Model Binding
    
    private func bindViewModel() {
        // Create input subject for view model events
        let input = PassthroughSubject<CameraViewModelInput, Never>()
        
        // Bind view model state changes
        viewModel.state
            .receive(on: DispatchQueue.main)
            .sink { [weak self] state in
                self?.updateUI(with: state)
            }
            .store(in: &cancellables)
        
        // Transform view model inputs to outputs
        viewModel.transform(input: input.eraseToAnyPublisher())
            .receive(on: DispatchQueue.main)
            .sink { [weak self] output in
                self?.handleViewModelOutput(output)
            }
            .store(in: &cancellables)
    }
    
    // MARK: - UI Updates
    
    private func updateUI(with state: CameraViewState) {
        // Update loading state
        state.isProcessing ? loadingIndicator.startAnimating() : loadingIndicator.stopAnimating()
        
        // Update views visibility
        overlayView.isHidden = state.isProcessing || state.recognitionResult != nil
        resultView.isHidden = state.recognitionResult == nil
        
        // Update result view if available
        if let result = state.recognitionResult {
            resultView.updateWithResult(result)
        }
        
        // Handle errors
        if let error = state.error {
            presentError(error)
        }
    }
    
    private func handleViewModelOutput(_ output: CameraViewModelOutput) {
        switch output {
        case .cameraStarted:
            overlayView.isHidden = false
            resultView.isHidden = true
            
        case .cameraStopped:
            overlayView.isHidden = true
            
        case .imageCaptured:
            // Provide haptic feedback
            let feedback = UINotificationFeedbackGenerator()
            feedback.notificationOccurred(.success)
            
        case .recognitionStarted:
            loadingIndicator.startAnimating()
            overlayView.isHidden = true
            
        case .recognitionCompleted(let result):
            loadingIndicator.stopAnimating()
            resultView.isHidden = false
            resultView.updateWithResult(result)
            
        case .recognitionFailed(let error):
            loadingIndicator.stopAnimating()
            presentError(error)
            
        case .recognitionCancelled:
            loadingIndicator.stopAnimating()
            overlayView.isHidden = false
            resultView.isHidden = true
        }
    }
    
    // MARK: - Camera Controls
    
    private func handleCapture() {
        let input = Just(CameraViewModelInput.captureImage)
        viewModel.transform(input: input.eraseToAnyPublisher())
            .sink { _ in }
            .store(in: &cancellables)
    }
    
    private func handleFlashToggle() {
        // Update flash button state
        let currentState = UserDefaults.standard.bool(forKey: "FlashEnabled")
        UserDefaults.standard.set(!currentState, forKey: "FlashEnabled")
        overlayView.updateFlashButtonState(!currentState)
    }
    
    private func handleCameraSwitch() {
        // Implement camera position switching
        // Note: This is a placeholder for future implementation
    }
    
    // MARK: - RecognitionResultViewDelegate
    
    func didConfirmIngredients(_ ingredients: [DetectedIngredient]) {
        // Verify 3s performance requirement
        guard let result = viewModel.state.value.recognitionResult,
              result.processingTime <= 3.0 else {
            Logger.shared.error("Recognition exceeded 3s performance requirement")
            presentError(NSError(domain: "Recognition", code: -1, userInfo: [
                NSLocalizedDescriptionKey: "Recognition took too long. Please try again."
            ]))
            return
        }
        
        // Handle confirmed ingredients
        let input = Just(CameraViewModelInput.confirmRecognition)
        viewModel.transform(input: input.eraseToAnyPublisher())
            .sink { [weak self] _ in
                self?.dismiss(animated: true)
            }
            .store(in: &cancellables)
    }
    
    func didRequestRetry() {
        let input = Just(CameraViewModelInput.retakePhoto)
        viewModel.transform(input: input.eraseToAnyPublisher())
            .sink { _ in }
            .store(in: &cancellables)
    }
    
    // MARK: - Helper Methods
    
    private func updatePreviewLayerOrientation() {
        guard let connection = previewLayer?.connection,
              connection.isVideoOrientationSupported else {
            return
        }
        
        let orientation = UIDevice.current.orientation
        let videoOrientation: AVCaptureVideoOrientation
        
        switch orientation {
        case .portrait:
            videoOrientation = .portrait
        case .portraitUpsideDown:
            videoOrientation = .portraitUpsideDown
        case .landscapeLeft:
            videoOrientation = .landscapeRight
        case .landscapeRight:
            videoOrientation = .landscapeLeft
        default:
            videoOrientation = .portrait
        }
        
        connection.videoOrientation = videoOrientation
    }
    
    private func handleCameraPermissionDenied() {
        let alert = UIAlertController(
            title: "Camera Access Required",
            message: "Please enable camera access in Settings to use this feature.",
            preferredStyle: .alert
        )
        
        alert.addAction(UIAlertAction(title: "Settings", style: .default) { _ in
            if let settingsURL = URL(string: UIApplication.openSettingsURLString) {
                UIApplication.shared.open(settingsURL)
            }
        })
        
        alert.addAction(UIAlertAction(title: "Cancel", style: .cancel) { [weak self] _ in
            self?.dismiss(animated: true)
        })
        
        present(alert, animated: true)
    }
    
    private func presentError(_ error: Error) {
        let alert = UIAlertController(
            title: "Error",
            message: error.localizedDescription,
            preferredStyle: .alert
        )
        
        alert.addAction(UIAlertAction(title: "OK", style: .default))
        present(alert, animated: true)
    }
}