//
// ImageRecognitionService.swift
// PantryChef
//
// HUMAN TASKS:
// 1. Configure CoreML model file in Xcode project settings
// 2. Verify ML model version compatibility with backend API
// 3. Set up performance monitoring to track 3s processing requirement
// 4. Review and adjust confidence threshold based on testing results

import UIKit // iOS 13.0+
import Vision // iOS 13.0+
import CoreML // iOS 13.0+

// MARK: - RecognitionError
enum RecognitionError: Error {
    case preprocessingFailed
    case recognitionFailed
    case invalidInput
    case networkError
    case modelUpdateFailed
}

// MARK: - ImageRecognitionService
// Requirement: Photographic Ingredient Recognition - Service class managing ingredient recognition
final class ImageRecognitionService {
    // MARK: - Properties
    private var mlModel: VNCoreMLModel?
    private let recognitionQueue: DispatchQueue
    private let confidenceThreshold: Double
    private var isProcessing: Bool
    private let processingTimeout: TimeInterval
    
    // MARK: - Singleton
    static let shared = ImageRecognitionService()
    
    // MARK: - Initialization
    private init() {
        // Initialize recognition queue with high priority for performance
        self.recognitionQueue = DispatchQueue(label: "com.pantrychef.recognition",
                                            qos: .userInitiated,
                                            attributes: .concurrent)
        
        // Set default confidence threshold
        self.confidenceThreshold = 0.7
        
        // Initialize processing state
        self.isProcessing = false
        
        // Set processing timeout to meet 3s requirement
        self.processingTimeout = 3.0
        
        // Load ML model
        do {
            // Load bundled ML model
            guard let modelURL = Bundle.main.url(forResource: "IngredientRecognition", withExtension: "mlmodelc") else {
                Logger.shared.error("Failed to locate ML model in bundle")
                return
            }
            
            let compiledModel = try MLModel(contentsOf: modelURL)
            self.mlModel = try VNCoreMLModel(for: compiledModel)
            Logger.shared.info("ML model loaded successfully")
        } catch {
            Logger.shared.error("Failed to load ML model: \(error.localizedDescription)")
        }
    }
    
    // MARK: - Public Methods
    
    /// Performs ingredient recognition on an image using local ML model and API validation
    /// Requirement: Performance Metrics - Image processing must complete within 3s
    /// - Parameters:
    ///   - image: The input image to process
    ///   - completion: Completion handler with recognition result or error
    func recognizeIngredients(image: UIImage, completion: @escaping (Result<RecognitionResult, RecognitionError>) -> Void) {
        // Check if already processing
        guard !isProcessing else {
            Logger.shared.error("Recognition already in progress")
            completion(.failure(.recognitionFailed))
            return
        }
        
        // Set processing state
        isProcessing = true
        
        // Start performance timer
        let startTime = Date()
        
        // Create processing timeout
        let timeoutWorkItem = DispatchWorkItem {
            if self.isProcessing {
                self.isProcessing = false
                Logger.shared.error("Recognition timed out after \(self.processingTimeout) seconds")
                completion(.failure(.recognitionFailed))
            }
        }
        
        // Schedule timeout
        recognitionQueue.asyncAfter(deadline: .now() + processingTimeout, execute: timeoutWorkItem)
        
        // Process image on recognition queue
        recognitionQueue.async { [weak self] in
            guard let self = self else { return }
            
            // Preprocess image
            let preprocessResult = ImageProcessor.shared.preprocessImage(image: image)
            
            guard case .success(let processedImage) = preprocessResult else {
                self.handleError(.preprocessingFailed, completion: completion)
                return
            }
            
            // Compress image if needed
            let compressionResult = ImageProcessor.shared.compressImage(image: processedImage, compressionQuality: 0.8)
            
            guard case .success = compressionResult else {
                self.handleError(.preprocessingFailed, completion: completion)
                return
            }
            
            // Detect ingredient regions
            let detectionResult = ImageProcessor.shared.detectIngredients(image: processedImage)
            
            guard case .success(let regions) = detectionResult else {
                self.handleError(.recognitionFailed, completion: completion)
                return
            }
            
            // Perform ML model inference
            guard let mlModel = self.mlModel else {
                self.handleError(.recognitionFailed, completion: completion)
                return
            }
            
            let request = VNCoreMLRequest(model: mlModel) { request, error in
                if let error = error {
                    Logger.shared.error("ML inference failed: \(error.localizedDescription)")
                    self.handleError(.recognitionFailed, completion: completion)
                    return
                }
                
                guard let results = request.results as? [VNClassificationObservation] else {
                    self.handleError(.recognitionFailed, completion: completion)
                    return
                }
                
                // Filter results by confidence threshold
                let highConfidenceResults = results.filter { $0.confidence >= Float(self.confidenceThreshold) }
                
                // Create detected ingredients
                let detectedIngredients = zip(highConfidenceResults, regions).map { result, region in
                    DetectedIngredient(
                        name: result.identifier,
                        category: "Unknown",  // Category would be determined by backend
                        confidenceScore: Double(result.confidence),
                        boundingBox: region,
                        additionalMetadata: ["classification_identifier": result.identifier]
                    )
                }
                
                // Calculate processing time
                let processingTime = Date().timeIntervalSince(startTime)
                
                // Create metadata
                let metadata = ImageMetadata(
                    dimensions: image.size,
                    format: "JPEG",
                    quality: 0.8,
                    captureTime: startTime,
                    processingParameters: ["confidence_threshold": self.confidenceThreshold],
                    deviceModel: UIDevice.current.model,
                    osVersion: UIDevice.current.systemVersion
                )
                
                // Create recognition result
                let recognitionResult = RecognitionResult(
                    id: UUID().uuidString,
                    detectedIngredients: detectedIngredients,
                    processingTime: processingTime,
                    isSuccessful: true,
                    metadata: metadata
                )
                
                // Cancel timeout
                timeoutWorkItem.cancel()
                
                // Log processing time
                Logger.shared.info("Recognition completed in \(processingTime) seconds")
                
                // Reset processing state
                self.isProcessing = false
                
                // Return result
                completion(.success(recognitionResult))
            }
            
            // Configure request
            request.imageCropAndScaleOption = .centerCrop
            
            do {
                // Create image request handler
                let handler = VNImageRequestHandler(cgImage: processedImage.cgImage!,
                                                  orientation: .up,
                                                  options: [:])
                
                // Perform request
                try handler.perform([request])
            } catch {
                Logger.shared.error("Vision request failed: \(error.localizedDescription)")
                self.handleError(.recognitionFailed, completion: completion)
            }
        }
    }
    
    /// Cancels ongoing recognition process
    /// Requirement: Image Recognition Component - Handles recognition pipeline control
    func cancelRecognition() {
        guard isProcessing else { return }
        
        isProcessing = false
        Logger.shared.info("Recognition cancelled")
    }
    
    /// Updates the local ML model with latest version
    /// Requirement: Image Recognition Component - Model management
    /// - Returns: Result indicating success or failure
    func updateMLModel() -> Result<Void, RecognitionError> {
        Logger.shared.info("Starting ML model update")
        
        do {
            // Check for model updates from backend API
            // Implementation would include API call to check for updates
            
            // Download new model if available
            guard let modelURL = Bundle.main.url(forResource: "IngredientRecognition", withExtension: "mlmodelc") else {
                throw RecognitionError.modelUpdateFailed
            }
            
            // Compile model
            let compiledModel = try MLModel(contentsOf: modelURL)
            self.mlModel = try VNCoreMLModel(for: compiledModel)
            
            Logger.shared.info("ML model updated successfully")
            return .success(())
        } catch {
            Logger.shared.error("Model update failed: \(error.localizedDescription)")
            return .failure(.modelUpdateFailed)
        }
    }
    
    // MARK: - Private Methods
    
    private func handleError(_ error: RecognitionError, completion: @escaping (Result<RecognitionResult, RecognitionError>) -> Void) {
        isProcessing = false
        Logger.shared.error("Recognition error: \(error)")
        completion(.failure(error))
    }
}