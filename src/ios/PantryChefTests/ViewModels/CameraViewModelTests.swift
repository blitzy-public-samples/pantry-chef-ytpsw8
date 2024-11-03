//
// CameraViewModelTests.swift
// PantryChefTests
//
// HUMAN TASKS:
// 1. Verify test coverage meets team standards
// 2. Review performance test thresholds with product team
// 3. Add additional edge case scenarios as identified in QA
// 4. Configure CI pipeline test timeouts appropriately

import XCTest
import Combine
import UIKit
@testable import PantryChef

final class CameraViewModelTests: XCTestCase {
    // MARK: - Properties
    private var sut: CameraViewModel!
    private var mockRecognitionService: MockImageRecognitionService!
    private var cancellables: Set<AnyCancellable>!
    
    // MARK: - Setup & Teardown
    override func setUp() {
        super.setUp()
        // Initialize mock service with 3s timeout requirement
        mockRecognitionService = MockImageRecognitionService(simulatedProcessingTime: 1.0)
        
        // Initialize view model with mock service
        sut = CameraViewModel()
        
        // Initialize cancellables set for Combine subscriptions
        cancellables = Set<AnyCancellable>()
    }
    
    override func tearDown() {
        // Cancel all Combine subscriptions
        cancellables.removeAll()
        
        // Reset mock service state and counters
        mockRecognitionService = nil
        sut = nil
        
        super.tearDown()
    }
    
    // MARK: - Test Camera Startup
    /// Tests camera initialization and startup sequence
    /// Requirements addressed:
    /// - Photographic Ingredient Recognition (1.2)
    func testCameraStartup() {
        // Given
        let expectation = XCTestExpectation(description: "Camera startup")
        var receivedOutput: CameraViewModelOutput?
        
        // Create input publisher
        let input = PassthroughSubject<CameraViewModelInput, Never>()
        
        // Subscribe to transform output
        sut.transform(input: input.eraseToAnyPublisher())
            .sink { output in
                receivedOutput = output
                if case .cameraStarted = output {
                    expectation.fulfill()
                }
            }
            .store(in: &cancellables)
        
        // When
        input.send(.startCamera)
        
        // Then
        wait(for: [expectation], timeout: 1.0)
        XCTAssertTrue(sut.state.value.isCapturing)
        XCTAssertEqual(receivedOutput, .cameraStarted)
    }
    
    // MARK: - Test Image Capture
    /// Tests photo capture functionality
    /// Requirements addressed:
    /// - Photographic Ingredient Recognition (1.2)
    func testImageCapture() {
        // Given
        let expectation = XCTestExpectation(description: "Image capture")
        let testImage = UIImage()
        var receivedOutput: CameraViewModelOutput?
        
        // Create input publisher
        let input = PassthroughSubject<CameraViewModelInput, Never>()
        
        // Subscribe to transform output
        sut.transform(input: input.eraseToAnyPublisher())
            .sink { output in
                receivedOutput = output
                if case .imageCaptured = output {
                    expectation.fulfill()
                }
            }
            .store(in: &cancellables)
        
        // When
        input.send(.captureImage)
        
        // Then
        wait(for: [expectation], timeout: 1.0)
        XCTAssertNotNil(sut.state.value.capturedImage)
        if case .imageCaptured(let image) = receivedOutput {
            XCTAssertNotNil(image)
        } else {
            XCTFail("Expected .imageCaptured output")
        }
    }
    
    // MARK: - Test Ingredient Recognition
    /// Tests ingredient recognition workflow with performance requirement
    /// Requirements addressed:
    /// - Image Recognition Component (6.1.2)
    /// - Performance Metrics (Appendix C)
    func testIngredientRecognition() {
        // Given
        let expectation = XCTestExpectation(description: "Recognition completion")
        let testImage = UIImage()
        let mockIngredients = [
            DetectedIngredient(name: "Apple", confidence: 0.95),
            DetectedIngredient(name: "Banana", confidence: 0.88)
        ]
        mockRecognitionService.setMockIngredients(mockIngredients)
        
        // Create input publisher
        let input = PassthroughSubject<CameraViewModelInput, Never>()
        
        // Subscribe to transform output
        sut.transform(input: input.eraseToAnyPublisher())
            .sink { output in
                if case .recognitionCompleted = output {
                    expectation.fulfill()
                }
            }
            .store(in: &cancellables)
        
        // When
        input.send(.captureImage)
        
        // Then
        wait(for: [expectation], timeout: 3.0) // Performance requirement
        XCTAssertFalse(sut.state.value.isProcessing)
        XCTAssertNotNil(sut.state.value.recognitionResult)
        XCTAssertLessThanOrEqual(sut.state.value.recognitionResult?.processingTime ?? 0, 3.0)
    }
    
    // MARK: - Test Recognition Cancellation
    /// Tests recognition cancellation handling
    func testRecognitionCancellation() {
        // Given
        let expectation = XCTestExpectation(description: "Recognition cancellation")
        
        // Create input publisher
        let input = PassthroughSubject<CameraViewModelInput, Never>()
        
        // Subscribe to transform output
        sut.transform(input: input.eraseToAnyPublisher())
            .sink { output in
                if case .recognitionCancelled = output {
                    expectation.fulfill()
                }
            }
            .store(in: &cancellables)
        
        // When
        input.send(.captureImage)
        input.send(.cancelRecognition)
        
        // Then
        wait(for: [expectation], timeout: 1.0)
        XCTAssertFalse(sut.state.value.isProcessing)
        XCTAssertNil(sut.state.value.recognitionResult)
        XCTAssertEqual(mockRecognitionService.cancelCallCount, 1)
    }
    
    // MARK: - Test Recognition Failure
    /// Tests error handling during recognition
    func testRecognitionFailure() {
        // Given
        let expectation = XCTestExpectation(description: "Recognition failure")
        mockRecognitionService = MockImageRecognitionService(shouldFail: true)
        
        // Create input publisher
        let input = PassthroughSubject<CameraViewModelInput, Never>()
        
        // Subscribe to transform output
        sut.transform(input: input.eraseToAnyPublisher())
            .sink { output in
                if case .recognitionFailed = output {
                    expectation.fulfill()
                }
            }
            .store(in: &cancellables)
        
        // When
        input.send(.captureImage)
        
        // Then
        wait(for: [expectation], timeout: 1.0)
        XCTAssertFalse(sut.state.value.isProcessing)
        XCTAssertNotNil(sut.state.value.error)
        XCTAssertNil(sut.state.value.recognitionResult)
    }
    
    // MARK: - Test Performance Requirements
    /// Tests recognition performance requirements
    /// Requirements addressed:
    /// - Performance Metrics (Appendix C)
    func testPerformanceRequirements() {
        // Given
        let expectation = XCTestExpectation(description: "Performance test")
        mockRecognitionService = MockImageRecognitionService(simulatedProcessingTime: 3.1) // Exceeds limit
        
        // Create input publisher
        let input = PassthroughSubject<CameraViewModelInput, Never>()
        
        // Subscribe to transform output
        sut.transform(input: input.eraseToAnyPublisher())
            .sink { output in
                if case .recognitionFailed = output {
                    expectation.fulfill()
                }
            }
            .store(in: &cancellables)
        
        // When
        let startTime = Date()
        input.send(.captureImage)
        
        // Then
        wait(for: [expectation], timeout: 4.0)
        let processingTime = Date().timeIntervalSince(startTime)
        XCTAssertFalse(sut.state.value.isProcessing)
        XCTAssertNotNil(sut.state.value.error)
        XCTAssertGreaterThan(processingTime, 3.0)
    }
}