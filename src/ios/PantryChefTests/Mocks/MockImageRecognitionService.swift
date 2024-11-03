//
// MockImageRecognitionService.swift
// PantryChefTests
//
// HUMAN TASKS:
// 1. Configure test data sets for different recognition scenarios
// 2. Verify mock processing time values match production metrics
// 3. Review simulated failure scenarios with test team

import UIKit // iOS 13.0+
import XCTest // iOS 13.0+

@testable import PantryChef

// MARK: - Mock Recognition Error
enum MockRecognitionError: Error {
    case simulatedFailure
    case timeoutError
}

// MARK: - Mock Image Recognition Service
/// Mock implementation of ImageRecognitionService for testing purposes
/// Requirements:
/// - Photographic Ingredient Recognition: Simulates ingredient recognition behavior
/// - Image Recognition Component: Handles recognition results from the image processing pipeline
/// - Performance Metrics: Simulates 3-second processing time requirement
final class MockImageRecognitionService {
    // MARK: - Properties
    private(set) var isProcessing: Bool
    private(set) var shouldFail: Bool
    private(set) var simulatedProcessingTime: Double
    private(set) var mockDetectedIngredients: [DetectedIngredient]
    private(set) var recognitionCallCount: Int
    private(set) var cancelCallCount: Int
    private let mockQueue: DispatchQueue
    
    // MARK: - Initialization
    init(shouldFail: Bool = false, simulatedProcessingTime: Double = 1.0) {
        // Set initial processing state
        self.isProcessing = false
        
        // Configure failure behavior
        self.shouldFail = shouldFail
        
        // Validate and set simulated processing time (must be <= 3s)
        self.simulatedProcessingTime = min(simulatedProcessingTime, 3.0)
        
        // Initialize empty mock ingredients array
        self.mockDetectedIngredients = []
        
        // Set call counters to zero
        self.recognitionCallCount = 0
        self.cancelCallCount = 0
        
        // Initialize mock queue with user-initiated QoS
        self.mockQueue = DispatchQueue(label: "com.pantrychef.mock.recognition",
                                     qos: .userInitiated)
    }
    
    // MARK: - Public Methods
    
    /// Mock implementation of ingredient recognition adhering to 3s timeout requirement
    /// - Parameters:
    ///   - image: Input image to process
    ///   - completion: Completion handler with recognition result or error
    func recognizeIngredients(image: UIImage, completion: @escaping (Result<RecognitionResult, RecognitionError>) -> Void) {
        // Increment recognition call count
        recognitionCallCount += 1
        
        // Validate input image
        guard image.cgImage != nil else {
            completion(.failure(.invalidInput))
            return
        }
        
        // Set processing state
        isProcessing = true
        
        // Simulate processing delay using mockQueue.asyncAfter
        mockQueue.asyncAfter(deadline: .now() + simulatedProcessingTime) { [weak self] in
            guard let self = self else { return }
            
            // Check if simulated time exceeds 3s timeout
            if self.simulatedProcessingTime > 3.0 {
                self.isProcessing = false
                completion(.failure(.recognitionFailed))
                return
            }
            
            // Handle simulated failure if configured
            if self.shouldFail {
                self.isProcessing = false
                completion(.failure(.recognitionFailed))
                return
            }
            
            // Create mock recognition result
            let metadata = ImageMetadata(
                dimensions: image.size,
                format: "JPEG",
                quality: 0.8,
                captureTime: Date(),
                processingParameters: ["mock": true],
                deviceModel: "Mock Device",
                osVersion: "Mock OS"
            )
            
            let result = RecognitionResult(
                id: UUID().uuidString,
                detectedIngredients: self.mockDetectedIngredients,
                processingTime: self.simulatedProcessingTime,
                isSuccessful: true,
                metadata: metadata
            )
            
            // Reset processing state
            self.isProcessing = false
            
            // Return mock result
            completion(.success(result))
        }
    }
    
    /// Mock implementation of recognition cancellation
    func cancelRecognition() {
        // Increment cancel call count
        cancelCallCount += 1
        
        // Reset processing state
        isProcessing = false
    }
    
    /// Configures mock detected ingredients for testing
    /// - Parameter ingredients: Array of mock detected ingredients
    func setMockIngredients(_ ingredients: [DetectedIngredient]) {
        // Validate ingredients array
        guard !ingredients.isEmpty else { return }
        
        // Store provided ingredients array for mock responses
        mockDetectedIngredients = ingredients
    }
}

// MARK: - ImageRecognitionService Protocol Conformance
extension MockImageRecognitionService: ImageRecognitionService {
    // Protocol conformance is implicit through matching method signatures
}