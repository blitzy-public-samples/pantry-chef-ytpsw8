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
class ShoppingListItem: NSObject, Codable {
    // MARK: - Properties
    let id: String
    let name: String
    let quantity: Double
    let unit: String
    var isPurchased: Bool
    var notes: String?

    // MARK: - Cross-Platform Contract Fields
    // Additive fields that align this iOS item with the canonical server/web
    // `ShoppingListItem` contract (src/web/src/interfaces/shopping.interface.ts).
    // Declared `var` with defaults so the existing designated initializer
    // `init(name:quantity:unit:)` (which does not set them) stays valid, and so
    // they can be carried over when an item is reconstructed in
    // `ShoppingList.updateItemQuantity(itemId:newQuantity:)`.
    var category: String = ""
    var recipeId: String? = nil
    var recipeName: String? = nil

    // MARK: - Codable Coding Keys
    // Explicit key mapping bridges iOS naming to the cross-platform contract
    // WITHOUT schema drift: the server/web field is `checked`, while iOS keeps
    // `isPurchased`. The canonical server/web contract
    // (src/web/src/interfaces/shopping.interface.ts) uses camelCase keys, so the
    // multi-word rawValues below (`recipeId`, `recipeName`) preserve that contract
    // verbatim. The shared JSONDecoder's `.convertFromSnakeCase` strategy (see
    // NetworkService.swift) is merely tolerant of snake_case payloads
    // (`recipe_id`, `recipe_name`) should any ever appear; it is not required for
    // the canonical camelCase responses.
    enum CodingKeys: String, CodingKey {
        case id, name, quantity, unit, category, notes
        case isPurchased = "checked"   // server/web uses `checked`; iOS uses `isPurchased`
        case recipeId                  // camelCase `recipeId` matches the server/web contract
        case recipeName                // camelCase `recipeName` matches the server/web contract
    }
    
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

    // MARK: - Codable Conformance

    /// Decodes a `ShoppingListItem` from a server/web JSON payload.
    /// Marked `required` because the class is non-final and must satisfy the
    /// `Decodable` initializer requirement for any subclass. Every stored
    /// property is assigned before `super.init()`. `decodeIfPresent` with
    /// sensible defaults keeps decoding resilient to partial payloads (the
    /// server may omit optional or iOS-irrelevant fields).
    required init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        self.id = try container.decodeIfPresent(String.self, forKey: .id) ?? UUID().uuidString
        self.name = try container.decode(String.self, forKey: .name)
        self.quantity = try container.decodeIfPresent(Double.self, forKey: .quantity) ?? 0
        self.unit = try container.decodeIfPresent(String.self, forKey: .unit) ?? ""
        self.category = try container.decodeIfPresent(String.self, forKey: .category) ?? ""
        self.isPurchased = try container.decodeIfPresent(Bool.self, forKey: .isPurchased) ?? false
        self.notes = try container.decodeIfPresent(String.self, forKey: .notes)
        self.recipeId = try container.decodeIfPresent(String.self, forKey: .recipeId)
        self.recipeName = try container.decodeIfPresent(String.self, forKey: .recipeName)
        super.init()
    }

    /// Encodes the item back to the cross-platform contract. `isPurchased` is
    /// emitted under the `checked` key (per `CodingKeys`); optional fields use
    /// `encodeIfPresent` so absent values are omitted rather than encoded as null.
    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(id, forKey: .id)
        try container.encode(name, forKey: .name)
        try container.encode(quantity, forKey: .quantity)
        try container.encode(unit, forKey: .unit)
        try container.encode(category, forKey: .category)
        try container.encode(isPurchased, forKey: .isPurchased)   // emits `checked`
        try container.encodeIfPresent(notes, forKey: .notes)
        try container.encodeIfPresent(recipeId, forKey: .recipeId)
        try container.encodeIfPresent(recipeName, forKey: .recipeName)
    }
}

// MARK: - Shopping List Model
@objc
@objcMembers
class ShoppingList: NSObject, Codable {
    // MARK: - Properties
    let id: String
    let name: String
    let userId: String
    private(set) var items: [ShoppingListItem]
    var isCompleted: Bool
    let createdAt: Date
    private(set) var updatedAt: Date
    var completedAt: Date?

    // MARK: - Cross-Platform Contract Fields
    // Optional generation options mirroring the server contract's
    // `IShoppingListGenerationOptions`. Optional with a `nil` default so the
    // existing designated initializer stays valid and so server payloads that
    // omit it decode without error.
    var generationOptions: ShoppingListGenerationOptions? = nil

    // MARK: - Codable Coding Keys
    // All camelCase rawValues, preserving the canonical server/web contract
    // verbatim: the multi-word keys (userId, createdAt, updatedAt, completedAt,
    // generationOptions) are camelCase on the wire. The shared JSONDecoder's
    // `.convertFromSnakeCase` strategy is only a tolerance for snake_case
    // payloads should any ever appear; it is not required for the canonical
    // camelCase responses. `isCompleted` and `completedAt` are iOS-only
    // convenience fields (not in the web contract); they round-trip locally and
    // decode defensively when absent.
    enum CodingKeys: String, CodingKey {
        case id, name, userId, items, isCompleted, createdAt, updatedAt, completedAt, generationOptions
    }
    
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
        updatedItem.category = item.category
        updatedItem.recipeId = item.recipeId
        updatedItem.recipeName = item.recipeName
        
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

    // MARK: - Codable Conformance

    /// Decodes a `ShoppingList` from a server/web JSON payload.
    /// Marked `required` because the class is non-final and must satisfy the
    /// `Decodable` initializer requirement. Core identity fields (`id`, `name`,
    /// `userId`) are required; the items collection and iOS-only fields default
    /// defensively so partial payloads never throw. Every stored property is
    /// assigned before `super.init()`. The `private(set)` setters for `items`
    /// and `updatedAt` are writable here because this initializer is defined
    /// within the type that declares them.
    required init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        self.id = try container.decode(String.self, forKey: .id)
        self.name = try container.decode(String.self, forKey: .name)
        self.userId = try container.decode(String.self, forKey: .userId)
        self.items = try container.decodeIfPresent([ShoppingListItem].self, forKey: .items) ?? []
        self.isCompleted = try container.decodeIfPresent(Bool.self, forKey: .isCompleted) ?? false
        self.createdAt = try container.decodeIfPresent(Date.self, forKey: .createdAt) ?? Date()
        self.updatedAt = try container.decodeIfPresent(Date.self, forKey: .updatedAt) ?? Date()
        self.completedAt = try container.decodeIfPresent(Date.self, forKey: .completedAt)
        self.generationOptions = try container.decodeIfPresent(
            ShoppingListGenerationOptions.self,
            forKey: .generationOptions
        )
        super.init()
    }

    /// Encodes the list to the cross-platform contract. Optional fields
    /// (`completedAt`, `generationOptions`) use `encodeIfPresent` so absent
    /// values are omitted rather than encoded as null.
    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(id, forKey: .id)
        try container.encode(name, forKey: .name)
        try container.encode(userId, forKey: .userId)
        try container.encode(items, forKey: .items)
        try container.encode(isCompleted, forKey: .isCompleted)
        try container.encode(createdAt, forKey: .createdAt)
        try container.encode(updatedAt, forKey: .updatedAt)
        try container.encodeIfPresent(completedAt, forKey: .completedAt)
        try container.encodeIfPresent(generationOptions, forKey: .generationOptions)
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

// MARK: - Shopping List Generation Options
// Value type mirroring the canonical `IShoppingListGenerationOptions` contract
// (src/web/src/interfaces/shopping.interface.ts). Declared as a `Codable`
// struct following the in-repo precedent for value types in `User.swift`
// (e.g. `UserPreferences`, `NotificationSettings`). Auto-synthesized `Codable`
// is sufficient here: the canonical server/web contract uses camelCase keys
// (`recipeIds`, `excludeInventoryItems`, `mergeDuplicates`), which the property
// names match directly. The shared decoder's `.convertFromSnakeCase` strategy
// is only a tolerance for snake_case payloads (`recipe_ids`,
// `exclude_inventory_items`, `merge_duplicates`) should any ever appear; it is
// not required for the canonical camelCase responses.
struct ShoppingListGenerationOptions: Codable {
    var recipeIds: [String]
    var servings: Int            // `Int` is sufficient; the web contract uses `number`
    var excludeInventoryItems: Bool
    var mergeDuplicates: Bool
}