//
// MockNetworkService.swift
// PantryChefTests
//
// HUMAN TASKS:
// 1. Configure test data fixtures for common API responses
// 2. Set up test coverage reporting integration
// 3. Review mock behavior with team for edge cases

import Foundation // iOS 13.0+
import Combine // iOS 13.0+
import XCTest // iOS 13.0+

// MARK: - MockNetworkError
// Requirement: API Integration Testing - Custom error type for simulated network failures
enum MockNetworkError: Error {
    case simulatedError
}

// MARK: - MockNetworkService
// Requirement: API Integration Testing - Mock implementation of NetworkService for testing
final class MockNetworkService {
    // MARK: - Properties
    private var storedAuthToken: String?
    private var mockResponses: [String: Any]
    private var mockErrors: [String: NetworkError]
    private var shouldSimulateError: Bool
    private var simulatedError: NetworkError?
    private let decoder: JSONDecoder
    
    // MARK: - Initialization
    init() {
        self.mockResponses = [:]
        self.mockErrors = [:]
        self.shouldSimulateError = false
        self.simulatedError = nil
        
        // Configure JSON decoder with snake_case strategy
        self.decoder = JSONDecoder()
        self.decoder.keyDecodingStrategy = .convertFromSnakeCase
        self.decoder.dateDecodingStrategy = .iso8601
    }
    
    // MARK: - NetworkService Interface Implementation
    
    /// Simulates a network request with configurable mock response or error
    /// - Parameters:
    ///   - endpoint: The API endpoint path
    ///   - method: The HTTP method to use
    ///   - body: Optional request body conforming to Encodable
    ///   - headers: Optional additional headers
    /// - Returns: A publisher emitting mock response or error
    func request<T: Decodable>(
        _ endpoint: String,
        method: HTTPMethod,
        body: Encodable? = nil,
        headers: [String: String]? = nil
    ) -> AnyPublisher<T, NetworkError> {
        // Check if global error simulation is enabled
        if shouldSimulateError {
            return Fail(error: simulatedError ?? .requestFailed)
                .eraseToAnyPublisher()
        }
        
        // Check for endpoint-specific error
        if let error = mockErrors[endpoint] {
            return Fail(error: error)
                .eraseToAnyPublisher()
        }
        
        // Look up mock response for endpoint
        if let mockResponse = mockResponses[endpoint] {
            do {
                // Convert mock response to Data and decode
                let data = try JSONSerialization.data(withJSONObject: mockResponse)
                let decoded = try decoder.decode(T.self, from: data)
                return Just(decoded)
                    .setFailureType(to: NetworkError.self)
                    .eraseToAnyPublisher()
            } catch {
                return Fail(error: .decodingFailed)
                    .eraseToAnyPublisher()
            }
        }
        
        // No mock response found
        return Fail(error: .invalidResponse)
            .eraseToAnyPublisher()
    }
    
    /// Stores mock authentication token
    /// - Parameter token: The token string to store
    func setAuthToken(_ token: String?) {
        self.storedAuthToken = token
    }
    
    /// Clears stored mock authentication token
    func clearAuthToken() {
        self.storedAuthToken = nil
    }
    
    // MARK: - Mock Configuration Methods
    
    /// Configures mock response for specific endpoint
    /// - Parameters:
    ///   - endpoint: The API endpoint path
    ///   - response: The mock response object
    func setMockResponse(_ endpoint: String, response: Any) {
        self.mockResponses[endpoint] = response
    }
    
    /// Configures mock error for specific endpoint
    /// - Parameters:
    ///   - endpoint: The API endpoint path
    ///   - error: The NetworkError to return
    func setMockError(_ endpoint: String, error: NetworkError) {
        self.mockErrors[endpoint] = error
    }
    
    /// Configures global error simulation
    /// - Parameter error: The NetworkError to simulate
    func simulateError(_ error: NetworkError) {
        self.shouldSimulateError = true
        self.simulatedError = error
    }
    
    /// Resets mock to initial state
    func reset() {
        self.mockResponses.removeAll()
        self.mockErrors.removeAll()
        self.shouldSimulateError = false
        self.simulatedError = nil
        self.storedAuthToken = nil
    }
}