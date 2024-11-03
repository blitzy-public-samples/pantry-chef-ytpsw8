//
// ImageRecognitionServiceTests.swift
// PantryChefTests
//
// HUMAN TASKS:
// 1. Configure test image assets in test bundle
// 2. Verify performance baseline metrics match production requirements
// 3. Add additional test cases for specific ingredient types
// 4. Review error simulation scenarios with QA team

import XCTest // iOS 13.0+
import UIKit // iOS 13.0+
@testable import PantryChef

// MARK: - ImageRecognitionServiceTests
// Requirements:
// - Photographic Ingredient Recognition: Test ingredient recognition functionality
// - Image Recognition Component: Validate recognition pipeline behavior
// - Performance Metrics: Verify 3s processing time requirement
final class ImageRecognitionServiceTests: XCTestCase {
    
    // MARK: - Properties
    private var sut: ImageRecognitionService!
    private var mockService: MockImageRecognitionService!
    private var testImage: UIImage!
    
    // MARK: - Setup and Teardown
    override func setUp() {
        super.setUp()
        
        // Initialize test image from bundle
        guard let image = UIImage(named: "test_ingredients", in: Bundle(for: type(of: self)), compatibleWith: nil) else {
            XCTFail("Failed to load test image")
            return
        }
        testImage = image
        
        // Initialize mock service with default settings
        mockService = MockImageRecognitionService(shouldFail: false, simulatedProcessingTime: 1.0)
        
        // Configure mock service with test ingredients
        let testIngredients = [
            DetectedIngredient(
                name: "Apple",
                category: "Fruit",
                confidenceScore: 0.95,
                boundingBox: CGRect(x: 0, y: 0, width: 100, height: 100),
                additionalMetadata: ["color": "red"]
            ),
            DetectedIngredient(
                name: "Banana",
                category: "Fruit",
                confidenceScore: 0.88,
                boundingBox: CGRect(x: 100, y: 0, width: 100, height: 100),
                additionalMetadata: ["color": "yellow"]
            )
        ]
        mockService.setMockIngredients(testIngredients)
        
        // Initialize real service
        sut = ImageRecognitionService.shared
    }
    
    override func tearDown() {
        // Reset mock service state
        mockService.cancelRecognition()
        mockService = nil
        
        // Clear test image
        testImage = nil
        
        // Cancel any ongoing recognition tasks
        sut.cancelRecognition()
        sut = nil
        
        super.tearDown()
    }
    
    // MARK: - Test Cases
    
    /// Tests successful ingredient recognition flow with performance validation
    /// Requirements:
    /// - Photographic Ingredient Recognition: Verify accurate ingredient detection
    /// - Performance Metrics: Validate 3s processing time requirement
    func testRecognizeIngredientsSuccess() {
        // Given
        let expectation = XCTestExpectation(description: "Recognition completed")
        var recognitionResult: RecognitionResult?
        
        // When
        mockService.recognizeIngredients(image: testImage) { result in
            switch result {
            case .success(let result):
                recognitionResult = result
                expectation.fulfill()
            case .failure(let error):
                XCTFail("Recognition failed with error: \(error)")
            }
        }
        
        // Then
        wait(for: [expectation], timeout: 5.0)
        
        // Verify recognition result
        XCTAssertNotNil(recognitionResult, "Recognition result should not be nil")
        XCTAssertTrue(recognitionResult?.isSuccessful == true, "Recognition should be successful")
        
        // Verify detected ingredients
        XCTAssertEqual(recognitionResult?.detectedIngredients.count, 2, "Should detect 2 ingredients")
        
        // Verify processing time requirement
        XCTAssertLessThanOrEqual(recognitionResult?.processingTime ?? 0, 3.0, "Processing time should be under 3 seconds")
        
        // Verify confidence scores
        let highConfidenceIngredients = recognitionResult?.getHighConfidenceIngredients(confidenceThreshold: 0.7)
        XCTAssertEqual(highConfidenceIngredients?.count, 2, "Both ingredients should have high confidence")
        
        // Verify recognition call count
        XCTAssertEqual(mockService.recognitionCallCount, 1, "Recognition should be called once")
    }
    
    /// Tests error handling in recognition flow
    /// Requirement: Image Recognition Component - Error handling validation
    func testRecognizeIngredientsFailure() {
        // Given
        let expectation = XCTestExpectation(description: "Recognition failed")
        mockService = MockImageRecognitionService(shouldFail: true)
        
        // When
        mockService.recognizeIngredients(image: testImage) { result in
            switch result {
            case .success:
                XCTFail("Recognition should fail")
            case .failure(let error):
                // Verify error type
                XCTAssertEqual(error, .recognitionFailed)
                expectation.fulfill()
            }
        }
        
        // Then
        wait(for: [expectation], timeout: 5.0)
        
        // Verify processing state is reset
        XCTAssertFalse(mockService.isProcessing, "Processing state should be reset")
        
        // Verify recognition call count
        XCTAssertEqual(mockService.recognitionCallCount, 1, "Recognition should be called once")
    }
    
    /// Tests recognition cancellation functionality
    /// Requirement: Image Recognition Component - Cancellation handling
    func testCancelRecognition() {
        // Given
        let expectation = XCTestExpectation(description: "Recognition cancelled")
        mockService = MockImageRecognitionService(simulatedProcessingTime: 2.0)
        
        // When
        mockService.recognizeIngredients(image: testImage) { _ in
            // Should not complete due to cancellation
            XCTFail("Recognition should be cancelled")
        }
        
        // Cancel recognition after short delay
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
            self.mockService.cancelRecognition()
            expectation.fulfill()
        }
        
        // Then
        wait(for: [expectation], timeout: 5.0)
        
        // Verify processing state is reset
        XCTAssertFalse(mockService.isProcessing, "Processing should be cancelled")
        
        // Verify cancel call count
        XCTAssertEqual(mockService.cancelCallCount, 1, "Cancel should be called once")
    }
    
    /// Tests recognition performance against 3s requirement
    /// Requirement: Performance Metrics - Processing time validation
    func testPerformanceRequirements() {
        // Given
        let iterations = 5
        var processingTimes: [TimeInterval] = []
        let expectation = XCTestExpectation(description: "Performance test completed")
        expectation.expectedFulfillmentCount = iterations
        
        // When
        measure {
            for _ in 0..<iterations {
                mockService.recognizeIngredients(image: testImage) { result in
                    if case .success(let recognitionResult) = result {
                        processingTimes.append(recognitionResult.processingTime)
                        expectation.fulfill()
                    }
                }
            }
        }
        
        // Then
        wait(for: [expectation], timeout: 20.0)
        
        // Verify all processing times are under 3s
        let maxProcessingTime = processingTimes.max() ?? 0
        XCTAssertLessThanOrEqual(maxProcessingTime, 3.0, "Maximum processing time should be under 3 seconds")
        
        // Verify average processing time
        let averageProcessingTime = processingTimes.reduce(0, +) / Double(processingTimes.count)
        XCTAssertLessThanOrEqual(averageProcessingTime, 2.0, "Average processing time should be under 2 seconds")
        
        // Verify performance consistency
        let processingTimeVariance = processingTimes.map { pow($0 - averageProcessingTime, 2) }.reduce(0, +) / Double(processingTimes.count)
        XCTAssertLessThanOrEqual(processingTimeVariance, 0.5, "Processing time variance should be low")
    }
    
    /// Tests manual verification requirements
    /// Requirement: Image Recognition Component - Confidence threshold validation
    func testManualVerificationRequirements() {
        // Given
        let lowConfidenceIngredient = DetectedIngredient(
            name: "Carrot",
            category: "Vegetable",
            confidenceScore: 0.65,
            boundingBox: CGRect(x: 0, y: 0, width: 100, height: 100)
        )
        mockService.setMockIngredients([lowConfidenceIngredient])
        
        let expectation = XCTestExpectation(description: "Recognition completed")
        
        // When
        mockService.recognizeIngredients(image: testImage) { result in
            if case .success(let recognitionResult) = result {
                // Verify manual verification is required
                XCTAssertTrue(recognitionResult.needsManualVerification(minimumConfidence: 0.7))
                expectation.fulfill()
            }
        }
        
        // Then
        wait(for: [expectation], timeout: 5.0)
    }
    
    /// Tests concurrent recognition requests
    /// Requirement: Image Recognition Component - Concurrent processing handling
    func testConcurrentRecognitionRequests() {
        // Given
        let expectation = XCTestExpectation(description: "Concurrent recognitions completed")
        expectation.expectedFulfillmentCount = 3
        var completedResults: [RecognitionResult] = []
        
        // When
        for _ in 0..<3 {
            mockService.recognizeIngredients(image: testImage) { result in
                if case .success(let recognitionResult) = result {
                    completedResults.append(recognitionResult)
                    expectation.fulfill()
                }
            }
        }
        
        // Then
        wait(for: [expectation], timeout: 10.0)
        
        // Verify all requests completed
        XCTAssertEqual(completedResults.count, 3, "All concurrent requests should complete")
        
        // Verify recognition call count
        XCTAssertEqual(mockService.recognitionCallCount, 3, "Recognition should be called three times")
        
        // Verify all results are within performance requirements
        let maxProcessingTime = completedResults.map { $0.processingTime }.max() ?? 0
        XCTAssertLessThanOrEqual(maxProcessingTime, 3.0, "Concurrent processing should meet performance requirements")
    }
}