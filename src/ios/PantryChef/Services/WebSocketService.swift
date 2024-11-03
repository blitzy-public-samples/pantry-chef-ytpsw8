//
// WebSocketService.swift
// PantryChef
//
// HUMAN TASKS:
// 1. Configure WebSocket connection timeouts in production environment
// 2. Set up SSL/TLS certificates for secure WebSocket connections
// 3. Configure reconnection strategy parameters for production use
// 4. Review and adjust event handling capacity limits

import Foundation // iOS 13.0+
import Starscream // v4.0.0

// MARK: - WebSocketEvent
/// Represents different types of WebSocket events in the application
public enum WebSocketEvent {
    case connected
    case disconnected
    case message(Data)
    case error(Error)
}

// MARK: - WebSocketService
/// Requirement: Real-time Communication - Implements Socket.io Client for real-time updates
public final class WebSocketService {
    // MARK: - Singleton
    public static let shared = WebSocketService()
    
    // MARK: - Properties
    private var socket: WebSocket
    private(set) var isConnected: Bool = false
    private let baseURL: URL
    private var eventHandlers: [(WebSocketEvent) -> Void] = []
    
    // MARK: - Constants
    private enum Constants {
        static let reconnectDelay: TimeInterval = 3.0
        static let connectionTimeout: TimeInterval = 10.0
        static let maxReconnectAttempts = 5
    }
    
    // MARK: - Initialization
    private init() {
        // Initialize base URL from Constants
        guard let url = URL(string: "\(Constants.API.baseURL)".replacingOccurrences(of: "http", with: "ws")) else {
            fatalError("Invalid WebSocket URL configuration")
        }
        self.baseURL = url
        
        // Configure WebSocket
        var request = URLRequest(url: baseURL)
        request.timeoutInterval = Constants.connectionTimeout
        
        // Initialize Starscream WebSocket with configuration
        socket = WebSocket(request: request)
        socket.delegate = self
        
        // Configure socket settings
        socket.callbackQueue = DispatchQueue.main
        socket.enabledSSLCipherSuites = ["TLS_AES_128_GCM_SHA256", "TLS_AES_256_GCM_SHA384"]
        
        Logger.shared.debug("WebSocket service initialized with URL: \(baseURL.absoluteString)")
    }
    
    // MARK: - Public Methods
    
    /// Requirement: WebSocket Events - Handles real-time events for ingredient recognition
    public func connect() {
        guard Constants.Features.webSocketEnabled else {
            Logger.shared.info("WebSocket functionality is disabled")
            return
        }
        
        guard !isConnected else {
            Logger.shared.debug("WebSocket is already connected")
            return
        }
        
        Logger.shared.info("Attempting to establish WebSocket connection")
        socket.connect()
        
        // Set connection timeout
        DispatchQueue.main.asyncAfter(deadline: .now() + Constants.connectionTimeout) { [weak self] in
            guard let self = self, !self.isConnected else { return }
            Logger.shared.error("WebSocket connection timeout")
            self.handleConnectionFailure()
        }
    }
    
    /// Requirement: Service Integration - Integrates with WebSocket server for real-time data synchronization
    public func disconnect() {
        Logger.shared.info("Disconnecting WebSocket")
        socket.disconnect()
        isConnected = false
        notifyHandlers(.disconnected)
    }
    
    /// Sends data through the WebSocket connection
    /// - Parameter data: The data to send
    public func send(data: Data) {
        guard isConnected else {
            Logger.shared.error("Cannot send data: WebSocket is not connected")
            return
        }
        
        Logger.shared.debug("Sending data through WebSocket")
        socket.write(data: data, completion: { [weak self] in
            guard let self = self else { return }
            Logger.shared.debug("Data sent successfully through WebSocket")
        })
    }
    
    /// Adds a handler for WebSocket events
    /// - Parameter handler: The event handler closure
    public func addEventHandler(_ handler: @escaping (WebSocketEvent) -> Void) {
        Logger.shared.debug("Adding new WebSocket event handler")
        eventHandlers.append(handler)
    }
    
    /// Removes a specific event handler
    /// - Parameter handler: The event handler to remove
    public func removeEventHandler(_ handler: @escaping (WebSocketEvent) -> Void) {
        Logger.shared.debug("Removing WebSocket event handler")
        // Remove handler by reference equality
        eventHandlers.removeAll(where: { $0 as AnyObject === handler as AnyObject })
    }
    
    // MARK: - Private Methods
    
    private func handleConnectionFailure() {
        isConnected = false
        notifyHandlers(.disconnected)
        
        // Implement exponential backoff for reconnection
        let reconnectDelay = Constants.reconnectDelay
        DispatchQueue.main.asyncAfter(deadline: .now() + reconnectDelay) { [weak self] in
            self?.connect()
        }
    }
    
    private func notifyHandlers(_ event: WebSocketEvent) {
        eventHandlers.forEach { handler in
            DispatchQueue.main.async {
                handler(event)
            }
        }
    }
}

// MARK: - WebSocketDelegate
extension WebSocketService: WebSocketDelegate {
    public func didReceive(event: WebSocketEvent, client: WebSocket) {
        switch event {
        case .connected(_):
            Logger.shared.info("WebSocket connected successfully")
            isConnected = true
            notifyHandlers(.connected)
            
        case .disconnected(let reason, let code):
            Logger.shared.info("WebSocket disconnected: \(reason) (code: \(code))")
            isConnected = false
            notifyHandlers(.disconnected)
            
        case .text(let string):
            Logger.shared.debug("Received text message: \(string)")
            if let data = string.data(using: .utf8) {
                notifyHandlers(.message(data))
            }
            
        case .binary(let data):
            Logger.shared.debug("Received binary message of size: \(data.count) bytes")
            notifyHandlers(.message(data))
            
        case .ping(_):
            Logger.shared.debug("Received ping")
            
        case .pong(_):
            Logger.shared.debug("Received pong")
            
        case .viabilityChanged(let isViable):
            Logger.shared.info("WebSocket viability changed: \(isViable)")
            
        case .reconnectSuggested(let shouldReconnect):
            Logger.shared.info("WebSocket reconnection suggested: \(shouldReconnect)")
            if shouldReconnect {
                handleConnectionFailure()
            }
            
        case .cancelled:
            Logger.shared.info("WebSocket connection cancelled")
            isConnected = false
            notifyHandlers(.disconnected)
            
        case .error(let error):
            Logger.shared.error("WebSocket error: \(error?.localizedDescription ?? "Unknown error")")
            notifyHandlers(.error(error ?? NSError(domain: "WebSocketService", code: -1, userInfo: nil)))
            handleConnectionFailure()
            
        case .peerClosed:
            Logger.shared.info("WebSocket peer closed connection")
            isConnected = false
            notifyHandlers(.disconnected)
        }
    }
}