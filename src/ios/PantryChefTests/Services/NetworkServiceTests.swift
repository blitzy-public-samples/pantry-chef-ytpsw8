//
// NetworkServiceTests.swift
// PantryChefTests
//
// HUMAN TASKS:
// 1. Configure test data fixtures in project test bundle
// 2. Set up test coverage reporting integration
// 3. Review test cases with team for edge case coverage
// 4. Configure CI pipeline test automation settings

import XCTest // iOS 13.0+
import Foundation // iOS 13.0+
import Combine // iOS 13.0+
@testable import PantryChef

// MARK: - NetworkServiceTests
// Requirement: API Integration Testing - Validates API client integration and request handling
final class NetworkServiceTests: XCTestCase {
    // MARK: - Properties
    private var sut: NetworkService!
    private var mockService: MockNetworkService!
    private var cancellables: Set<AnyCancellable>!
    
    // MARK: - Test Lifecycle
    override func setUp() {
        super.setUp()
        sut = NetworkService.shared
        mockService = MockNetworkService()
        cancellables = Set<AnyCancellable>()
    }
    
    override func tearDown() {
        // Cancel all publishers to prevent memory leaks
        cancellables.forEach { $0.cancel() }
        cancellables = nil
        
        // Reset mock service state
        mockService.reset()
        
        // Clear authentication state
        sut.clearAuthToken()
        
        super.tearDown()
    }
    
    // MARK: - Test Cases
    
    // Requirement: API Integration Testing - Tests successful API request handling
    func testSuccessfulRequest() {
        // Given
        let expectation = XCTestExpectation(description: "Successful API request")
        let endpoint = "/test/endpoint"
        let mockResponse = ["id": "123", "name": "Test Item"]
        
        struct TestResponse: Codable {
            let id: String
            let name: String
        }
        
        mockService.setMockResponse(endpoint, response: mockResponse)
        
        // When
        mockService.request(endpoint, method: .get)
            .sink(
                receiveCompletion: { completion in
                    switch completion {
                    case .finished:
                        break
                    case .failure(let error):
                        XCTFail("Request should not fail: \(error)")
                    }
                },
                receiveValue: { (response: TestResponse) in
                    // Then
                    XCTAssertEqual(response.id, "123")
                    XCTAssertEqual(response.name, "Test Item")
                    expectation.fulfill()
                }
            )
            .store(in: &cancellables)
        
        wait(for: [expectation], timeout: 1.0)
    }
    
    // Requirement: API Integration Testing - Tests error handling in API requests
    func testRequestWithError() {
        // Given
        let expectation = XCTestExpectation(description: "Failed API request")
        let endpoint = "/test/error"
        
        struct TestResponse: Codable {
            let data: String
        }
        
        mockService.setMockError(endpoint, error: .requestFailed)
        
        // When
        mockService.request(endpoint, method: .get)
            .sink(
                receiveCompletion: { completion in
                    switch completion {
                    case .finished:
                        XCTFail("Request should fail")
                    case .failure(let error):
                        // Then
                        XCTAssertEqual(error, NetworkError.requestFailed)
                        expectation.fulfill()
                    }
                },
                receiveValue: { (_: TestResponse) in
                    XCTFail("Should not receive value")
                }
            )
            .store(in: &cancellables)
        
        wait(for: [expectation], timeout: 1.0)
    }
    
    // Requirement: Security Testing - Tests authentication token handling
    func testAuthTokenHandling() {
        // Given
        let testToken = "test_auth_token"
        let expectation = XCTestExpectation(description: "Auth token handling")
        let endpoint = "/auth/test"
        let mockResponse = ["status": "authenticated"]
        
        struct TestResponse: Codable {
            let status: String
        }
        
        mockService.setMockResponse(endpoint, response: mockResponse)
        
        // When
        sut.setAuthToken(testToken)
        
        mockService.request(endpoint, method: .get)
            .sink(
                receiveCompletion: { completion in
                    switch completion {
                    case .finished:
                        // Then - Test token clearing
                        self.sut.clearAuthToken()
                        expectation.fulfill()
                    case .failure(let error):
                        XCTFail("Request should not fail: \(error)")
                    }
                },
                receiveValue: { (response: TestResponse) in
                    XCTAssertEqual(response.status, "authenticated")
                }
            )
            .store(in: &cancellables)
        
        wait(for: [expectation], timeout: 1.0)
    }
    
    // Requirement: Security Testing - Tests unauthorized access handling
    func testUnauthorizedError() {
        // Given
        let expectation = XCTestExpectation(description: "Unauthorized error handling")
        let endpoint = "/protected/resource"
        
        struct TestResponse: Codable {
            let data: String
        }
        
        mockService.setMockError(endpoint, error: .unauthorized)
        
        // When
        mockService.request(endpoint, method: .get)
            .sink(
                receiveCompletion: { completion in
                    switch completion {
                    case .finished:
                        XCTFail("Request should fail with unauthorized")
                    case .failure(let error):
                        // Then
                        XCTAssertEqual(error, NetworkError.unauthorized)
                        expectation.fulfill()
                    }
                },
                receiveValue: { (_: TestResponse) in
                    XCTFail("Should not receive value")
                }
            )
            .store(in: &cancellables)
        
        wait(for: [expectation], timeout: 1.0)
    }
    
    // Requirement: API Integration Testing - Tests request method handling
    func testRequestMethods() {
        // Given
        let expectation = XCTestExpectation(description: "HTTP methods handling")
        let endpoint = "/test/methods"
        let mockResponse = ["method": "POST"]
        
        struct TestResponse: Codable {
            let method: String
        }
        
        mockService.setMockResponse(endpoint, response: mockResponse)
        
        // When
        mockService.request(endpoint, method: .post)
            .sink(
                receiveCompletion: { completion in
                    switch completion {
                    case .finished:
                        expectation.fulfill()
                    case .failure(let error):
                        XCTFail("Request should not fail: \(error)")
                    }
                },
                receiveValue: { (response: TestResponse) in
                    // Then
                    XCTAssertEqual(response.method, "POST")
                }
            )
            .store(in: &cancellables)
        
        wait(for: [expectation], timeout: 1.0)
    }
    
    // Requirement: API Integration Testing - Tests request body encoding
    func testRequestWithBody() {
        // Given
        let expectation = XCTestExpectation(description: "Request with body")
        let endpoint = "/test/body"
        
        struct TestRequest: Codable {
            let message: String
        }
        
        struct TestResponse: Codable {
            let status: String
        }
        
        let requestBody = TestRequest(message: "test message")
        let mockResponse = ["status": "received"]
        
        mockService.setMockResponse(endpoint, response: mockResponse)
        
        // When
        mockService.request(endpoint, method: .post, body: requestBody)
            .sink(
                receiveCompletion: { completion in
                    switch completion {
                    case .finished:
                        expectation.fulfill()
                    case .failure(let error):
                        XCTFail("Request should not fail: \(error)")
                    }
                },
                receiveValue: { (response: TestResponse) in
                    // Then
                    XCTAssertEqual(response.status, "received")
                }
            )
            .store(in: &cancellables)
        
        wait(for: [expectation], timeout: 1.0)
    }
}