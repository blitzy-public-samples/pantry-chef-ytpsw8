//
// Pantry.swift
// PantryChef
//
// HUMAN TASKS:
// 1. Configure default storage locations based on regional preferences
// 2. Review and adjust validation rules for production environment
// 3. Set up monitoring for expiration tracking performance
// 4. Configure logging levels for production deployment

import Foundation // iOS 13.0+

// MARK: - StorageLocation
// Requirement: Digital Pantry Management - Defines possible storage locations for inventory organization
@objc public enum StorageLocation: String {
    case REFRIGERATOR = "REFRIGERATOR"
    case FREEZER = "FREEZER"
    case PANTRY = "PANTRY"
    case SPICE_RACK = "SPICE_RACK"
}

// MARK: - PantryItem
// Requirement: Inventory Management - Model for individual pantry items with expiration tracking
@objc public class PantryItem: NSObject {
    public let id: String
    public let ingredientId: String
    public var quantity: Double
    public var unit: String
    public var location: StorageLocation
    public let purchaseDate: Date
    public var expirationDate: Date
    public var notes: String?
    
    public init(id: String,
                ingredientId: String,
                quantity: Double,
                unit: String,
                location: StorageLocation,
                purchaseDate: Date,
                expirationDate: Date) {
        // Validate input parameters using Security constants
        guard !id.isEmpty,
              !ingredientId.isEmpty,
              quantity > 0,
              !unit.isEmpty,
              expirationDate > purchaseDate else {
            Logger.shared.error("Invalid parameters for PantryItem initialization")
            fatalError("Invalid PantryItem parameters")
        }
        
        self.id = id
        self.ingredientId = ingredientId
        self.quantity = quantity
        self.unit = unit
        self.location = location
        self.purchaseDate = purchaseDate
        self.expirationDate = expirationDate
        self.notes = nil
        
        super.init()
        
        Logger.shared.info("PantryItem initialized successfully: \(id)")
    }
}

// MARK: - Pantry
// Requirement: Digital Pantry Management - Core model for secure inventory management
@objc @objcMembers public class Pantry: NSObject {
    public let id: String
    public let userId: String
    public var name: String
    public private(set) var items: [PantryItem]
    public private(set) var locations: [StorageLocation]
    public let createdAt: Date
    public private(set) var updatedAt: Date
    
    public init(id: String, userId: String, name: String) {
        // Validate input parameters using Security constants
        guard !id.isEmpty,
              !userId.isEmpty,
              !name.isEmpty else {
            Logger.shared.error("Invalid parameters for Pantry initialization")
            fatalError("Invalid Pantry parameters")
        }
        
        self.id = id
        self.userId = userId
        self.name = name
        self.items = []
        self.locations = [.REFRIGERATOR, .FREEZER, .PANTRY, .SPICE_RACK]
        self.createdAt = Date()
        self.updatedAt = Date()
        
        super.init()
        
        Logger.shared.info("Pantry initialized successfully: \(id)")
    }
    
    // MARK: - Item Management Methods
    
    /// Adds a new item to the pantry with validation
    /// - Parameter item: The item to add
    /// - Returns: Success status of the operation
    public func addItem(_ item: PantryItem) -> Bool {
        // Validate item data using Security constants
        guard !items.contains(where: { $0.id == item.id }) else {
            Logger.shared.error("Item with ID \(item.id) already exists in pantry")
            return false
        }
        
        // Validate storage location
        guard locations.contains(item.location) else {
            Logger.shared.error("Invalid storage location for item: \(item.id)")
            return false
        }
        
        // Add item and update timestamp
        items.append(item)
        updatedAt = Date()
        
        Logger.shared.info("Item added successfully: \(item.id)")
        return true
    }
    
    /// Removes an item from the pantry
    /// - Parameter itemId: ID of the item to remove
    /// - Returns: Success status of the operation
    public func removeItem(_ itemId: String) -> Bool {
        // Validate itemId using Security constants
        guard !itemId.isEmpty else {
            Logger.shared.error("Invalid item ID provided")
            return false
        }
        
        // Find and remove item
        guard let index = items.firstIndex(where: { $0.id == itemId }) else {
            Logger.shared.warning("Item not found: \(itemId)")
            return false
        }
        
        items.remove(at: index)
        updatedAt = Date()
        
        Logger.shared.info("Item removed successfully: \(itemId)")
        return true
    }
    
    /// Updates an existing pantry item with validation
    /// - Parameters:
    ///   - itemId: ID of the item to update
    ///   - updatedItem: New item data
    /// - Returns: Success status of the operation
    public func updateItem(_ itemId: String, updatedItem: PantryItem) -> Bool {
        // Find item with matching ID
        guard let index = items.firstIndex(where: { $0.id == itemId }) else {
            Logger.shared.warning("Item not found for update: \(itemId)")
            return false
        }
        
        // Validate updated item data using Security constants
        guard updatedItem.quantity > 0,
              !updatedItem.unit.isEmpty,
              locations.contains(updatedItem.location),
              updatedItem.expirationDate > Date() else {
            Logger.shared.error("Invalid update data for item: \(itemId)")
            return false
        }
        
        // Update item properties
        items[index] = updatedItem
        updatedAt = Date()
        
        Logger.shared.info("Item updated successfully: \(itemId)")
        return true
    }
    
    /// Retrieves items nearing expiration within threshold
    /// - Parameter daysThreshold: Number of days to check for expiration
    /// - Returns: Array of items expiring within threshold
    public func getExpiringItems(_ daysThreshold: Int) -> [PantryItem] {
        // Validate daysThreshold parameter
        guard daysThreshold > 0 else {
            Logger.shared.error("Invalid days threshold provided")
            return []
        }
        
        let calendar = Calendar.current
        let thresholdDate = calendar.date(byAdding: .day, value: daysThreshold, to: Date()) ?? Date()
        
        // Filter and sort items by expiration date
        let expiringItems = items.filter { item in
            item.expirationDate <= thresholdDate
        }.sorted { $0.expirationDate < $1.expirationDate }
        
        Logger.shared.info("Found \(expiringItems.count) items expiring within \(daysThreshold) days")
        return expiringItems
    }
}