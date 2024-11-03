//
// CacheService.swift
// PantryChef
//
// HUMAN TASKS:
// 1. Review and adjust memory limits based on device capabilities and app usage patterns
// 2. Configure cache cleanup intervals based on production usage metrics
// 3. Monitor cache hit rates and adjust TTL values accordingly
// 4. Set up cache analytics tracking in production environment

import Foundation // iOS 13.0+

// MARK: - CacheError
// Requirement: Cache Layer - Defines error types for caching operations
enum CacheError: Error {
    case invalidKey
    case dataNotFound
    case serializationFailed
    case expirationError
}

// MARK: - CacheEntry
// Requirement: Cache Layer - Implements cache entry structure with TTL support
class CacheEntry {
    let data: Data
    let expirationDate: Date?
    
    init(data: Data, expirationDate: Date?) {
        self.data = data
        self.expirationDate = expirationDate
    }
    
    var isExpired: Bool {
        guard let expirationDate = expirationDate else { return false }
        return Date() >= expirationDate
    }
}

// MARK: - CacheService
// Requirement: Cache Layer - Implements local caching functionality with TTL support
final class CacheService {
    // MARK: - Properties
    private let cache: NSCache<NSString, CacheEntry>
    private let cacheQueue: DispatchQueue
    private let defaultTTL: TimeInterval
    
    // MARK: - Singleton
    static let shared = CacheService()
    
    // MARK: - Initialization
    private init() {
        // Initialize cache with memory limits
        cache = NSCache<NSString, CacheEntry>()
        cache.name = "com.pantrychef.cache"
        cache.countLimit = 1000 // Maximum number of items
        cache.totalCostLimit = 50 * 1024 * 1024 // 50MB limit
        
        // Create serial queue for thread-safe operations
        cacheQueue = DispatchQueue(label: "com.pantrychef.cachequeue", qos: .utility)
        
        // Set default TTL from API configuration
        defaultTTL = Security.tokenExpirationTime
        
        // Configure cache cleanup notifications
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(cleanupExpiredEntries),
            name: UIApplication.didReceiveMemoryWarningNotification,
            object: nil
        )
        
        // Initialize background cleanup timer
        setupCleanupTimer()
    }
    
    // MARK: - Private Methods
    private func setupCleanupTimer() {
        Timer.scheduledTimer(
            withTimeInterval: 300, // 5 minutes
            repeats: true
        ) { [weak self] _ in
            self?.cleanupExpiredEntries()
        }
    }
    
    // MARK: - Public Methods
    
    /// Stores data in cache with optional TTL
    /// - Parameters:
    ///   - data: The data to cache
    ///   - key: The cache key
    ///   - ttl: Optional time-to-live duration
    // Requirement: Performance Optimization - Implements client-side caching for improved performance
    func set(data: Data, key: String, ttl: TimeInterval? = nil) {
        guard !key.isEmpty else {
            Logger.shared.error("Cache set failed: Invalid key")
            return
        }
        
        cacheQueue.async { [weak self] in
            guard let self = self else { return }
            
            let expirationDate = ttl.map { Date().addingTimeInterval($0) }
                ?? Date().addingTimeInterval(self.defaultTTL)
            
            let entry = CacheEntry(data: data, expirationDate: expirationDate)
            self.cache.setObject(entry, forKey: key as NSString)
            
            Logger.shared.debug("Cache set: \(key), TTL: \(ttl ?? self.defaultTTL)s")
        }
    }
    
    /// Retrieves data from cache if not expired
    /// - Parameter key: The cache key
    /// - Returns: Result containing either the cached data or an error
    // Requirement: Data Flow Architecture - Implements thread-safe cache operations
    func get(key: String) -> Result<Data, CacheError> {
        guard !key.isEmpty else {
            Logger.shared.error("Cache get failed: Invalid key")
            return .failure(.invalidKey)
        }
        
        var result: Result<Data, CacheError>!
        let semaphore = DispatchSemaphore(value: 0)
        
        cacheQueue.async { [weak self] in
            guard let self = self else {
                result = .failure(.dataNotFound)
                semaphore.signal()
                return
            }
            
            guard let entry = self.cache.object(forKey: key as NSString) else {
                Logger.shared.debug("Cache miss: \(key)")
                result = .failure(.dataNotFound)
                semaphore.signal()
                return
            }
            
            if entry.isExpired {
                self.cache.removeObject(forKey: key as NSString)
                Logger.shared.debug("Cache expired: \(key)")
                result = .failure(.expirationError)
            } else {
                Logger.shared.debug("Cache hit: \(key)")
                result = .success(entry.data)
            }
            
            semaphore.signal()
        }
        
        semaphore.wait()
        return result
    }
    
    /// Removes data from cache
    /// - Parameter key: The cache key
    // Requirement: Performance Optimization - Implements memory-efficient storage
    func remove(key: String) {
        guard !key.isEmpty else {
            Logger.shared.error("Cache remove failed: Invalid key")
            return
        }
        
        cacheQueue.async { [weak self] in
            self?.cache.removeObject(forKey: key as NSString)
            Logger.shared.debug("Cache removed: \(key)")
        }
    }
    
    /// Clears all cached data
    // Requirement: Cache Layer - Implements cache management functionality
    func clear() {
        cacheQueue.async { [weak self] in
            self?.cache.removeAllObjects()
            Logger.shared.debug("Cache cleared")
        }
    }
    
    /// Removes expired entries from cache
    @objc private func cleanupExpiredEntries() {
        cacheQueue.async { [weak self] in
            guard let self = self else { return }
            
            let enumerator = self.cache.enumerate()
            var removedCount = 0
            
            while let keyedEntry = enumerator.nextObject() as? (key: NSString, entry: CacheEntry) {
                if keyedEntry.entry.isExpired {
                    self.cache.removeObject(forKey: keyedEntry.key)
                    removedCount += 1
                }
            }
            
            if removedCount > 0 {
                Logger.shared.debug("Cache cleanup: removed \(removedCount) expired entries")
            }
        }
    }
    
    deinit {
        NotificationCenter.default.removeObserver(self)
    }
}