//
// Ingredient.swift
// PantryChef
//
// HUMAN TASKS:
// 1. Verify unit types align with UI picker options
// 2. Confirm category values match filtering requirements
// 3. Review quantity validation rules with product team

import Foundation // iOS 13.0+

// MARK: - Ingredient Model
// Requirements:
// - Digital Pantry Management: Comprehensive ingredient tracking with location and quantity
// - Photographic Ingredient Recognition: Support for image-based recognition via imageUrl
// - Expiration Tracking: Sophisticated date handling for ingredient freshness

@objc
@objcMembers
class Ingredient: NSObject {
    // MARK: - Properties
    let id: String
    let name: String
    let category: String
    private(set) var quantity: Double
    let unit: String
    let location: String
    let expirationDate: Date?
    let notes: String?
    let imageUrl: String?
    let createdAt: Date
    private(set) var updatedAt: Date
    
    // MARK: - Initialization
    init(id: String,
         name: String,
         category: String,
         quantity: Double,
         unit: String,
         location: String,
         expirationDate: Date? = nil,
         notes: String? = nil,
         imageUrl: String? = nil) {
        // Input validation
        guard !id.isEmpty, !name.isEmpty, !category.isEmpty,
              quantity >= 0, !unit.isEmpty, !location.isEmpty else {
            fatalError("Invalid ingredient parameters")
        }
        
        self.id = id
        self.name = name
        self.category = category
        self.quantity = quantity
        self.unit = unit
        self.location = location
        self.expirationDate = expirationDate
        self.notes = notes
        self.imageUrl = imageUrl
        
        // Set timestamps
        self.createdAt = Date()
        self.updatedAt = Date()
        
        super.init()
    }
    
    // MARK: - Public Methods
    
    /// Checks if the ingredient has expired
    /// Requirement: Expiration Tracking - Monitor ingredient freshness
    var isExpired: Bool {
        guard let expirationDate = expirationDate else {
            return false
        }
        return expirationDate.isExpired
    }
    
    /// Calculates days until expiration
    /// Requirement: Expiration Tracking - Proactive expiration monitoring
    var daysUntilExpiration: Int? {
        guard let expirationDate = expirationDate else {
            return nil
        }
        return expirationDate.daysUntilExpiration
    }
    
    /// Updates ingredient quantity with validation
    /// Requirement: Digital Pantry Management - Accurate quantity tracking
    /// - Parameter newQuantity: New quantity value to set
    /// - Throws: IngredientError if quantity is invalid
    func updateQuantity(_ newQuantity: Double) throws {
        guard newQuantity >= 0 else {
            throw IngredientError.invalidQuantity
        }
        
        self.quantity = newQuantity
        self.updatedAt = Date()
    }
}

// MARK: - Error Handling
enum IngredientError: Error {
    case invalidQuantity
    
    var localizedDescription: String {
        switch self {
        case .invalidQuantity:
            return "Ingredient quantity must be greater than or equal to zero"
        }
    }
}

// MARK: - Equatable
extension Ingredient: Equatable {
    static func == (lhs: Ingredient, rhs: Ingredient) -> Bool {
        return lhs.id == rhs.id
    }
}

// MARK: - CustomStringConvertible
extension Ingredient: CustomStringConvertible {
    var description: String {
        return "Ingredient(id: \(id), name: \(name), quantity: \(quantity) \(unit))"
    }
}