//
// CameraViewModel.swift
// PantryChef
//
// HUMAN TASKS:
// 1. Configure AVCaptureSession permissions in Info.plist
// 2. Set up performance monitoring for 3s processing requirement
// 3. Review camera quality settings with product team
// 4. Verify error handling scenarios with QA team

import Foundation // iOS 13.0+
import Combine // iOS 13.0+
import AVFoundation // iOS 13.0+
import UIKit // iOS 13.0+

// MARK: - Camera View Model Input
enum CameraViewModelInput {
    case startCamera
    case stopCamera
    case captureImage
    case cancelRecognition
    case retakePhoto
    case confirmRecognition
}

// MARK: - Camera View Model Output
enum CameraViewModelOutput {
    case cameraStarted
    case cameraStopped
    case imageCaptured(UIImage)
    case recognitionStarted
    case recognitionCompleted(RecognitionResult)
    case recognitionFailed(Error)
    case recognitionCancelled
}

// MARK: - Camera View State
struct CameraViewState {
    var isCapturing: Bool
    var isProcessing: Bool
    var capturedImage: UIImage?
    var recognitionResult: RecognitionResult?
    var error: Error?
    
    init() {
        isCapturing = false
        isProcessing = false
        capturedImage = nil
        recognitionResult = nil
        error = nil
    }
}

// MARK: - Camera View Model
/// ViewModel responsible for managing camera functionality and ingredient recognition workflow
/// Requirements addressed:
/// - Photographic Ingredient Recognition (1.2 Scope/Core Capabilities)
/// - Image Recognition Component (6.1.2)
/// - Performance Metrics (Appendix C)
final class CameraViewModel: ViewModelType {
    // MARK: - Properties
    let state: CurrentValueSubject<CameraViewState, Never>
    private let captureSession: AVCaptureSession
    private let recognitionService: ImageRecognitionService
    private var cancellables: Set<AnyCancellable>
    
    // MARK: - Initialization
    init() {
        // Initialize state
        self.state = CurrentValueSubject<CameraViewState, Never>(CameraViewState())
        
        // Configure capture session with high quality preset
        self.captureSession = AVCaptureSession()
        self.captureSession.sessionPreset = .photo
        
        // Initialize recognition service
        self.recognitionService = ImageRecognitionService.shared
        
        // Initialize cancellables set
        self.cancellables = Set<AnyCancellable>()
    }
    
    // MARK: - ViewModelType Implementation
    func transform(input: AnyPublisher<CameraViewModelInput, Never>) -> AnyPublisher<CameraViewModelOutput, Never> {
        // Create subject for outputs
        let outputSubject = PassthroughSubject<CameraViewModelOutput, Never>()
        
        // Process input events
        input
            .receive(on: DispatchQueue.main)
            .sink { [weak self] event in
                guard let self = self else { return }
                
                switch event {
                case .startCamera:
                    self.handleStartCamera(outputSubject)
                case .stopCamera:
                    self.handleStopCamera(outputSubject)
                case .captureImage:
                    self.handleCaptureImage(outputSubject)
                case .cancelRecognition:
                    self.handleCancelRecognition(outputSubject)
                case .retakePhoto:
                    self.handleRetakePhoto(outputSubject)
                case .confirmRecognition:
                    self.handleConfirmRecognition(outputSubject)
                }
            }
            .store(in: &cancellables)
        
        return outputSubject.eraseToAnyPublisher()
    }
    
    // MARK: - Private Methods - Camera Handling
    
    /// Sets up and starts the camera capture session
    private func handleStartCamera(_ output: PassthroughSubject<CameraViewModelOutput, Never>) {
        let setupResult = setupCamera()
        
        switch setupResult {
        case .success:
            state.value.isCapturing = true
            output.send(.cameraStarted)
            
        case .failure(let error):
            state.value.error = error
            output.send(.recognitionFailed(error))
        }
    }
    
    /// Stops the camera capture session
    private func handleStopCamera(_ output: PassthroughSubject<CameraViewModelOutput, Never>) {
        captureSession.stopRunning()
        state.value.isCapturing = false
        output.send(.cameraStopped)
    }
    
    /// Captures a photo using the camera session
    private func handleCaptureImage(_ output: PassthroughSubject<CameraViewModelOutput, Never>) {
        capturePhoto { [weak self] result in
            guard let self = self else { return }
            
            switch result {
            case .success(let image):
                self.state.value.capturedImage = image
                output.send(.imageCaptured(image))
                self.processRecognition(image: image, output: output)
                
            case .failure(let error):
                self.state.value.error = error
                output.send(.recognitionFailed(error))
            }
        }
    }
    
    /// Cancels ongoing recognition process
    private func handleCancelRecognition(_ output: PassthroughSubject<CameraViewModelOutput, Never>) {
        recognitionService.cancelRecognition()
        state.value.isProcessing = false
        state.value.capturedImage = nil
        state.value.recognitionResult = nil
        output.send(.recognitionCancelled)
    }
    
    /// Resets camera state for new photo
    private func handleRetakePhoto(_ output: PassthroughSubject<CameraViewModelOutput, Never>) {
        state.value.capturedImage = nil
        state.value.recognitionResult = nil
        state.value.isProcessing = false
        output.send(.cameraStarted)
    }
    
    /// Confirms recognition results
    private func handleConfirmRecognition(_ output: PassthroughSubject<CameraViewModelOutput, Never>) {
        guard let result = state.value.recognitionResult else { return }
        
        // Verify recognition completed within performance requirement
        if result.processingTime > 3.0 {
            Logger.shared.warning("Recognition exceeded 3s performance requirement")
        }
        
        // Reset camera state
        state.value.capturedImage = nil
        state.value.recognitionResult = nil
        state.value.isProcessing = false
        
        output.send(.recognitionCompleted(result))
    }
    
    // MARK: - Private Methods - Camera Setup
    
    /// Configures and initializes the camera capture session
    private func setupCamera() -> Result<Void, Error> {
        // Check camera permissions
        let authStatus = AVCaptureDevice.authorizationStatus(for: .video)
        
        guard authStatus == .authorized else {
            return .failure(NSError(domain: "CameraPermissionError", code: -1))
        }
        
        // Configure camera input
        guard let camera = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .back),
              let input = try? AVCaptureDeviceInput(device: camera) else {
            return .failure(NSError(domain: "CameraSetupError", code: -2))
        }
        
        // Configure photo output
        let output = AVCapturePhotoOutput()
        
        // Add input and output to session
        captureSession.beginConfiguration()
        
        guard captureSession.canAddInput(input),
              captureSession.canAddOutput(output) else {
            return .failure(NSError(domain: "CameraConfigError", code: -3))
        }
        
        captureSession.addInput(input)
        captureSession.addOutput(output)
        captureSession.commitConfiguration()
        
        // Start capture session on background queue
        DispatchQueue.global(qos: .userInitiated).async { [weak self] in
            self?.captureSession.startRunning()
        }
        
        return .success(())
    }
    
    /// Captures a photo using the configured camera session
    private func capturePhoto(completion: @escaping (Result<UIImage, Error>) -> Void) {
        guard let photoOutput = captureSession.outputs.first as? AVCapturePhotoOutput else {
            completion(.failure(NSError(domain: "CaptureError", code: -1)))
            return
        }
        
        // Configure photo settings
        let settings = AVCapturePhotoSettings()
        settings.flashMode = .auto
        settings.isHighResolutionPhotoEnabled = true
        
        // Create photo capture delegate
        let delegate = PhotoCaptureDelegate { result in
            completion(result)
        }
        
        // Capture photo
        photoOutput.capturePhoto(with: settings, delegate: delegate)
    }
    
    /// Processes captured image for ingredient recognition
    /// Requirement: Performance Metrics - Must complete within 3s
    private func processRecognition(image: UIImage, output: PassthroughSubject<CameraViewModelOutput, Never>) {
        state.value.isProcessing = true
        output.send(.recognitionStarted)
        
        // Start recognition process with 3s timeout requirement
        recognitionService.recognizeIngredients(image: image) { [weak self] result in
            guard let self = self else { return }
            
            DispatchQueue.main.async {
                switch result {
                case .success(let recognitionResult):
                    self.state.value.recognitionResult = recognitionResult
                    self.state.value.isProcessing = false
                    output.send(.recognitionCompleted(recognitionResult))
                    
                case .failure(let error):
                    self.state.value.error = error
                    self.state.value.isProcessing = false
                    output.send(.recognitionFailed(error))
                }
            }
        }
    }
}

// MARK: - Photo Capture Delegate
private class PhotoCaptureDelegate: NSObject, AVCapturePhotoCaptureDelegate {
    private let completion: (Result<UIImage, Error>) -> Void
    
    init(completion: @escaping (Result<UIImage, Error>) -> Void) {
        self.completion = completion
        super.init()
    }
    
    func photoOutput(_ output: AVCapturePhotoOutput,
                    didFinishProcessingPhoto photo: AVCapturePhoto,
                    error: Error?) {
        if let error = error {
            completion(.failure(error))
            return
        }
        
        guard let imageData = photo.fileDataRepresentation(),
              let image = UIImage(data: imageData) else {
            completion(.failure(NSError(domain: "PhotoProcessingError", code: -1)))
            return
        }
        
        completion(.success(image))
    }
}