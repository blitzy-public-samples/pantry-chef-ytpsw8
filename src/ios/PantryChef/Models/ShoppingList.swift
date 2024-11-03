//
// ShoppingList.swift
// PantryChef
//
// HUMAN TASKS:
// 1. Verify shopping list item unit types align with Ingredient units
// 2. Review quantity validation rules with product team
// 3. Confirm list completion criteria with stakeholders

import Foundation // iOS 13.0+

// MARK: - Shopping List Item Model
@objc
class ShoppingListItem: NSObject {
    // MARK: - Properties
    let id: String
    let name: String
    let quantity: Double
    let unit: String
    var isPurchased: Bool
    var notes: String?
    
    // MARK: - Initialization
    init(name: String, quantity: Double, unit: String) {
        // Input validation
        guard !name.isEmpty, quantity >= 0, !unit.isEmpty else {
            fatalError("Invalid shopping list item parameters")
        }
        
        self.id = UUID().uuidString
        self.name = name
        self.quantity = quantity
        self.unit = unit
        self.isPurchased = false
        self.notes = nil
        
        super.init()
    }
    
    // MARK: - Public Methods
    
    /// Toggles the purchased status of the item
    /// Requirement: Shopping List Generation - Item purchase tracking
    func togglePurchased() {
        isPurchased = !isPurchased
    }
}

// MARK: - Shopping List Model
@objc
@objcMembers
class ShoppingList: NSObject {
    // MARK: - Properties
    let id: String
    let name: String
    let userId: String
    private(set) var items: [ShoppingListItem]
    var isCompleted: Bool
    let createdAt: Date
    private(set) var updatedAt: Date
    var completedAt: Date?
    
    // MARK: - Initialization
    init(id: String, name: String, userId: String) {
        // Input validation
        guard !id.isEmpty, !name.isEmpty, !userId.isEmpty else {
            fatalError("Invalid shopping list parameters")
        }
        
        self.id = id
        self.name = name
        self.userId = userId
        self.items = []
        self.isCompleted = false
        self.createdAt = Date()
        self.updatedAt = Date()
        self.completedAt = nil
        
        super.init()
    }
    
    // MARK: - Public Methods
    
    /// Adds a new item to the shopping list with quantity validation
    /// Requirement: Shopping List Generation - Comprehensive item management
    /// - Parameters:
    ///   - name: Item name
    ///   - quantity: Item quantity
    ///   - unit: Unit of measurement
    /// - Returns: The newly created shopping list item
    func addItem(name: String, quantity: Double, unit: String) -> ShoppingListItem {
        // Validate quantity
        guard quantity >= 0 else {
            fatalError("Item quantity must be non-negative")
        }
        
        let item = ShoppingListItem(name: name, quantity: quantity, unit: unit)
        items.append(item)
        updatedAt = Date()
        
        return item
    }
    
    /// Removes an item from the shopping list by ID
    /// Requirement: Shopping List Generation - Item removal functionality
    /// - Parameter itemId: ID of the item to remove
    /// - Returns: Success status of the removal operation
    func removeItem(itemId: String) -> Bool {
        guard let index = items.firstIndex(where: { $0.id == itemId }) else {
            return false
        }
        
        items.remove(at: index)
        updatedAt = Date()
        
        return true
    }
    
    /// Updates the quantity of a shopping list item with validation
    /// Requirement: Shopping List Generation - Quantity management
    /// - Parameters:
    ///   - itemId: ID of the item to update
    ///   - newQuantity: New quantity value
    /// - Returns: Success status of the update operation
    func updateItemQuantity(itemId: String, newQuantity: Double) -> Bool {
        // Validate quantity
        guard newQuantity >= 0 else {
            return false
        }
        
        guard let item = items.first(where: { $0.id == itemId }) else {
            return false
        }
        
        // Create new item with updated quantity since quantity is immutable
        let updatedItem = ShoppingListItem(name: item.name, quantity: newQuantity, unit: item.unit)
        updatedItem.isPurchased = item.isPurchased
        updatedItem.notes = item.notes
        
        if let index = items.firstIndex(where: { $0.id == itemId }) {
            items[index] = updatedItem
            updatedAt = Date()
            return true
        }
        
        return false
    }
    
    /// Marks the shopping list as completed with timestamp update
    /// Requirement: Shopping List Generation - List completion tracking
    func markAsCompleted() {
        isCompleted = true
        completedAt = Date()
        updatedAt = Date()
    }
}

// MARK: - Equatable
extension ShoppingList: Equatable {
    static func == (lhs: ShoppingList, rhs: ShoppingList) -> Bool {
        return lhs.id == rhs.id
    }
}

// MARK: - CustomStringConvertible
extension ShoppingList: CustomStringConvertible {
    var description: String {
        return "ShoppingList(id: \(id), name: \(name), items: \(items.count))"
    }
}