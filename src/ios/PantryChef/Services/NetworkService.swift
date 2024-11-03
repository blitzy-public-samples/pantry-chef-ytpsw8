//
// NetworkService.swift
// PantryChef
//
// HUMAN TASKS:
// 1. Configure SSL certificate pinning with production certificates
// 2. Set up API key and secrets in build configuration
// 3. Review and adjust timeout values for production environment
// 4. Configure error tracking service integration
// 5. Set up network security monitoring

import Foundation // iOS 13.0+
import Combine // iOS 13.0+

// MARK: - NetworkError
// Requirement: Data Flow Architecture - Defines comprehensive set of network operation errors
public enum NetworkError: Error {
    case invalidURL
    case requestFailed
    case invalidResponse
    case decodingFailed
    case unauthorized
    case noConnection
}

// MARK: - HTTPMethod
// Requirement: API Integration - Defines supported HTTP methods for API requests
public enum HTTPMethod: String {
    case get = "GET"
    case post = "POST"
    case put = "PUT"
    case delete = "DELETE"
}

// MARK: - NetworkService
// Requirement: API Integration - Implements API client for mobile app integration
public final class NetworkService {
    // MARK: - Properties
    public static let shared = NetworkService()
    private let session: URLSession
    private var authToken: String?
    private let decoder: JSONDecoder
    
    // MARK: - Initialization
    private init() {
        // Configure URLSession with secure defaults
        let configuration = URLSessionConfiguration.default
        configuration.timeoutIntervalForRequest = API.timeout
        configuration.timeoutIntervalForResource = API.timeout
        configuration.waitsForConnectivity = true
        configuration.requestCachePolicy = .reloadIgnoringLocalCacheData
        
        // Requirement: Security Protocols - Configure TLS 1.3
        configuration.tlsMinimumSupportedProtocol = .tlsProtocol13
        
        // Configure default headers
        configuration.httpAdditionalHeaders = [
            "Content-Type": "application/json",
            "Accept": "application/json",
            "User-Agent": "PantryChef-iOS/\(AppInfo.version)",
            "X-Client-Version": AppInfo.version
        ]
        
        // Initialize session with configuration
        self.session = URLSession(configuration: configuration)
        
        // Configure JSON decoder with snake_case strategy
        self.decoder = JSONDecoder()
        self.decoder.keyDecodingStrategy = .convertFromSnakeCase
        self.decoder.dateDecodingStrategy = .iso8601
        
        Logger.shared.debug("NetworkService initialized with base URL: \(API.baseURL)")
    }
    
    // MARK: - Public Methods
    
    /// Makes a type-safe network request with error handling and response decoding
    /// - Parameters:
    ///   - endpoint: The API endpoint path
    ///   - method: The HTTP method to use
    ///   - body: Optional request body conforming to Encodable
    ///   - headers: Optional additional headers
    /// - Returns: A publisher emitting the decoded response or error
    public func request<T: Decodable>(
        _ endpoint: String,
        method: HTTPMethod,
        body: Encodable? = nil,
        headers: [String: String]? = nil
    ) -> AnyPublisher<T, NetworkError> {
        // Construct full URL from base URL and endpoint
        guard let url = URL(string: "\(API.baseURL)/\(API.version)\(endpoint)") else {
            Logger.shared.error("Invalid URL for endpoint: \(endpoint)")
            return Fail(error: NetworkError.invalidURL).eraseToAnyPublisher()
        }
        
        // Create URLRequest with method and headers
        var request = URLRequest(url: url)
        request.httpMethod = method.rawValue
        
        // Add authentication token if available
        if let token = authToken {
            request.addValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        
        // Add custom headers if provided
        headers?.forEach { request.addValue($0.value, forHTTPHeaderField: $0.key) }
        
        // Encode request body if provided
        if let body = body {
            do {
                request.httpBody = try JSONEncoder().encode(body)
            } catch {
                Logger.shared.error("Failed to encode request body: \(error)")
                return Fail(error: NetworkError.requestFailed).eraseToAnyPublisher()
            }
        }
        
        // Sign request with timestamp and API key
        let timestamp = String(Int(Date().timeIntervalSince1970))
        request.addValue(timestamp, forHTTPHeaderField: "X-Timestamp")
        
        // Log request details
        Logger.shared.debug("Making \(method.rawValue) request to: \(url.absoluteString)")
        
        // Execute request using URLSession dataTaskPublisher
        return session.dataTaskPublisher(for: request)
            .tryMap { data, response in
                // Validate HTTP response
                guard let httpResponse = response as? HTTPURLResponse else {
                    Logger.shared.error("Invalid response type")
                    throw NetworkError.invalidResponse
                }
                
                // Check status code
                switch httpResponse.statusCode {
                case 200...299:
                    return data
                case 401:
                    Logger.shared.error("Unauthorized request: \(httpResponse.statusCode)")
                    throw NetworkError.unauthorized
                default:
                    Logger.shared.error("Request failed with status: \(httpResponse.statusCode)")
                    throw NetworkError.requestFailed
                }
            }
            .tryMap { data in
                // Attempt to decode response data
                do {
                    let decoded = try self.decoder.decode(T.self, from: data)
                    Logger.shared.debug("Successfully decoded response of type: \(T.self)")
                    return decoded
                } catch {
                    Logger.shared.error("Failed to decode response: \(error)")
                    throw NetworkError.decodingFailed
                }
            }
            .mapError { error in
                // Map errors to NetworkError type
                if let networkError = error as? NetworkError {
                    return networkError
                }
                if let urlError = error as? URLError {
                    return urlError.code == .notConnectedToInternet ? .noConnection : .requestFailed
                }
                return .requestFailed
            }
            .receive(on: DispatchQueue.main)
            .eraseToAnyPublisher()
    }
    
    /// Updates the authentication token used for API requests
    /// - Parameter token: The JWT token string or nil to clear
    public func setAuthToken(_ token: String?) {
        self.authToken = token
        Logger.shared.debug("Updated auth token: \(token != nil ? "[MASKED]" : "nil")")
    }
    
    /// Removes the current authentication token and resets security state
    public func clearAuthToken() {
        self.authToken = nil
        
        // Reset session configuration
        let configuration = session.configuration
        configuration.httpAdditionalHeaders?.removeValue(forKey: "Authorization")
        
        // Cancel any authenticated requests
        session.getAllTasks { tasks in
            tasks.forEach { $0.cancel() }
        }
        
        Logger.shared.debug("Cleared auth token and reset security state")
    }
}