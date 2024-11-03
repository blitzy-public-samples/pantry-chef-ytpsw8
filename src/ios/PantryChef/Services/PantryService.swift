//
// PantryService.swift
// PantryChef
//
// HUMAN TASKS:
// 1. Configure backend synchronization intervals based on usage patterns
// 2. Set up monitoring for pantry operations performance
// 3. Review and adjust caching TTL values for production
// 4. Configure notification triggers for expiring items
// 5. Set up analytics tracking for pantry operations

import Foundation // iOS 13.0+
import Combine // iOS 13.0+

// MARK: - PantryServiceError
// Requirement: Digital Pantry Management - Defines possible pantry operation errors
public enum PantryServiceError: Error {
    case syncFailed
    case itemNotFound
    case validationFailed
    case networkError
    case cacheError
}

// MARK: - PantryService
// Requirement: Digital Pantry Management - Implements pantry management functionality
public final class PantryService {
    // MARK: - Properties
    public static let shared = PantryService()
    private var currentPantry: Pantry?
    private let pantryUpdateSubject = PassthroughSubject<Pantry, Never>()
    private var cancellables = Set<AnyCancellable>()
    
    // MARK: - Initialization
    private init() {
        // Set up notification observers for background sync
        NotificationCenter.default.publisher(for: UIApplication.willEnterForegroundNotification)
            .sink { [weak self] _ in
                guard let self = self,
                      let pantry = self.currentPantry else { return }
                self.syncWithBackend()
                    .sink(
                        receiveCompletion: { _ in },
                        receiveValue: { _ in }
                    )
                    .store(in: &self.cancellables)
            }
            .store(in: &cancellables)
        
        // Configure memory warning handlers
        NotificationCenter.default.publisher(for: UIApplication.didReceiveMemoryWarningNotification)
            .sink { [weak self] _ in
                self?.cancellables.removeAll()
            }
            .store(in: &cancellables)
        
        Logger.shared.debug("PantryService initialized")
    }
    
    // MARK: - Public Methods
    
    /// Loads pantry data from cache or network with reactive updates
    /// - Parameter userId: The user ID to load pantry for
    /// - Returns: Publisher emitting pantry data or error
    // Requirement: Digital Pantry Management - Implements pantry data loading
    public func loadPantry(userId: String) -> AnyPublisher<Pantry, PantryServiceError> {
        // Check cache first
        let cacheKey = "pantry_\(userId)"
        if case .success(let data) = CacheService.shared.get(key: cacheKey) {
            do {
                let pantry = try JSONDecoder().decode(Pantry.self, from: data)
                self.currentPantry = pantry
                self.pantryUpdateSubject.send(pantry)
                Logger.shared.debug("Loaded pantry from cache: \(pantry.id)")
                return Just(pantry)
                    .setFailureType(to: PantryServiceError.self)
                    .eraseToAnyPublisher()
            } catch {
                Logger.shared.error("Failed to decode cached pantry: \(error)")
            }
        }
        
        // Fetch from network if cache miss
        return NetworkService.shared.request(
            "/pantry/\(userId)",
            method: .get
        )
        .mapError { error -> PantryServiceError in
            Logger.shared.error("Network error loading pantry: \(error)")
            return .networkError
        }
        .flatMap { (pantry: Pantry) -> AnyPublisher<Pantry, PantryServiceError> in
            // Cache the fetched data
            do {
                let data = try JSONEncoder().encode(pantry)
                CacheService.shared.set(data: data, key: cacheKey)
            } catch {
                Logger.shared.error("Failed to cache pantry: \(error)")
            }
            
            self.currentPantry = pantry
            self.pantryUpdateSubject.send(pantry)
            return Just(pantry)
                .setFailureType(to: PantryServiceError.self)
                .eraseToAnyPublisher()
        }
        .eraseToAnyPublisher()
    }
    
    /// Adds a new item to the pantry with validation and synchronization
    /// - Parameter item: The item to add
    /// - Returns: Publisher emitting success status
    // Requirement: Inventory Management - Implements item addition functionality
    public func addItem(_ item: PantryItem) -> AnyPublisher<Bool, PantryServiceError> {
        guard let pantry = currentPantry else {
            return Fail(error: PantryServiceError.validationFailed)
                .eraseToAnyPublisher()
        }
        
        // Validate and add item locally
        guard pantry.addItem(item) else {
            return Fail(error: PantryServiceError.validationFailed)
                .eraseToAnyPublisher()
        }
        
        // Sync with backend
        return NetworkService.shared.request(
            "/pantry/\(pantry.id)/items",
            method: .post,
            body: item
        )
        .mapError { error -> PantryServiceError in
            Logger.shared.error("Network error adding item: \(error)")
            return .networkError
        }
        .flatMap { (_: Bool) -> AnyPublisher<Bool, PantryServiceError> in
            // Update cache
            do {
                let data = try JSONEncoder().encode(pantry)
                CacheService.shared.set(data: data, key: "pantry_\(pantry.userId)")
            } catch {
                Logger.shared.error("Failed to cache updated pantry: \(error)")
            }
            
            self.pantryUpdateSubject.send(pantry)
            return Just(true)
                .setFailureType(to: PantryServiceError.self)
                .eraseToAnyPublisher()
        }
        .eraseToAnyPublisher()
    }
    
    /// Removes an item from the pantry with synchronization
    /// - Parameter itemId: ID of the item to remove
    /// - Returns: Publisher emitting success status
    // Requirement: Inventory Management - Implements item removal functionality
    public func removeItem(_ itemId: String) -> AnyPublisher<Bool, PantryServiceError> {
        guard let pantry = currentPantry else {
            return Fail(error: PantryServiceError.validationFailed)
                .eraseToAnyPublisher()
        }
        
        // Remove item locally
        guard pantry.removeItem(itemId) else {
            return Fail(error: PantryServiceError.itemNotFound)
                .eraseToAnyPublisher()
        }
        
        // Sync with backend
        return NetworkService.shared.request(
            "/pantry/\(pantry.id)/items/\(itemId)",
            method: .delete
        )
        .mapError { error -> PantryServiceError in
            Logger.shared.error("Network error removing item: \(error)")
            return .networkError
        }
        .flatMap { (_: Bool) -> AnyPublisher<Bool, PantryServiceError> in
            // Update cache
            do {
                let data = try JSONEncoder().encode(pantry)
                CacheService.shared.set(data: data, key: "pantry_\(pantry.userId)")
            } catch {
                Logger.shared.error("Failed to cache updated pantry: \(error)")
            }
            
            self.pantryUpdateSubject.send(pantry)
            return Just(true)
                .setFailureType(to: PantryServiceError.self)
                .eraseToAnyPublisher()
        }
        .eraseToAnyPublisher()
    }
    
    /// Updates an existing pantry item with validation and synchronization
    /// - Parameters:
    ///   - itemId: ID of the item to update
    ///   - updatedItem: New item data
    /// - Returns: Publisher emitting success status
    // Requirement: Inventory Management - Implements item update functionality
    public func updateItem(_ itemId: String, updatedItem: PantryItem) -> AnyPublisher<Bool, PantryServiceError> {
        guard let pantry = currentPantry else {
            return Fail(error: PantryServiceError.validationFailed)
                .eraseToAnyPublisher()
        }
        
        // Update item locally
        guard pantry.updateItem(itemId, updatedItem: updatedItem) else {
            return Fail(error: PantryServiceError.validationFailed)
                .eraseToAnyPublisher()
        }
        
        // Sync with backend
        return NetworkService.shared.request(
            "/pantry/\(pantry.id)/items/\(itemId)",
            method: .put,
            body: updatedItem
        )
        .mapError { error -> PantryServiceError in
            Logger.shared.error("Network error updating item: \(error)")
            return .networkError
        }
        .flatMap { (_: Bool) -> AnyPublisher<Bool, PantryServiceError> in
            // Update cache
            do {
                let data = try JSONEncoder().encode(pantry)
                CacheService.shared.set(data: data, key: "pantry_\(pantry.userId)")
            } catch {
                Logger.shared.error("Failed to cache updated pantry: \(error)")
            }
            
            self.pantryUpdateSubject.send(pantry)
            return Just(true)
                .setFailureType(to: PantryServiceError.self)
                .eraseToAnyPublisher()
        }
        .eraseToAnyPublisher()
    }
    
    /// Retrieves items nearing expiration with reactive updates
    /// - Parameter daysThreshold: Number of days to check for expiration
    /// - Returns: Publisher emitting expiring items
    // Requirement: Expiration Tracking - Implements expiration monitoring
    public func getExpiringItems(_ daysThreshold: Int) -> AnyPublisher<[PantryItem], PantryServiceError> {
        guard let pantry = currentPantry else {
            return Fail(error: PantryServiceError.validationFailed)
                .eraseToAnyPublisher()
        }
        
        let expiringItems = pantry.getExpiringItems(daysThreshold)
        return Just(expiringItems)
            .setFailureType(to: PantryServiceError.self)
            .eraseToAnyPublisher()
    }
    
    /// Synchronizes local pantry data with backend
    /// - Returns: Publisher emitting completion or error
    // Requirement: Digital Pantry Management - Implements backend synchronization
    public func syncWithBackend() -> AnyPublisher<Void, PantryServiceError> {
        guard let pantry = currentPantry else {
            return Fail(error: PantryServiceError.validationFailed)
                .eraseToAnyPublisher()
        }
        
        return NetworkService.shared.request(
            "/pantry/\(pantry.id)/sync",
            method: .post,
            body: pantry
        )
        .mapError { error -> PantryServiceError in
            Logger.shared.error("Sync failed: \(error)")
            return .syncFailed
        }
        .flatMap { (updatedPantry: Pantry) -> AnyPublisher<Void, PantryServiceError> in
            self.currentPantry = updatedPantry
            
            // Update cache
            do {
                let data = try JSONEncoder().encode(updatedPantry)
                CacheService.shared.set(data: data, key: "pantry_\(updatedPantry.userId)")
            } catch {
                Logger.shared.error("Failed to cache synced pantry: \(error)")
            }
            
            self.pantryUpdateSubject.send(updatedPantry)
            return Just(())
                .setFailureType(to: PantryServiceError.self)
                .eraseToAnyPublisher()
        }
        .eraseToAnyPublisher()
    }
}