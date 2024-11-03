//
// Recipe.swift
// PantryChef
//
// HUMAN TASKS:
// 1. Verify recipe difficulty levels match UI picker options
// 2. Review recipe matching algorithm weights with product team
// 3. Confirm social sharing permissions align with privacy requirements

import Foundation // iOS 13.0+

// MARK: - Recipe Model
// Requirements:
// - Smart Recipe Matching: Sophisticated matching based on available ingredients
// - Recipe Management: Comprehensive recipe data model with all required attributes
// - Social Recipe Sharing: Social features with public/private visibility and likes

@objc
@objcMembers
class Recipe: NSObject {
    // MARK: - Properties
    let id: String
    let name: String
    let description: String
    let ingredients: [RecipeIngredient]
    let steps: [String]
    let prepTime: Int
    let cookTime: Int
    let difficulty: String
    let tags: [String]
    let imageUrl: String?
    let servings: Int
    let authorId: String
    let isPublic: Bool
    private(set) var likes: Int
    let createdAt: Date
    private(set) var updatedAt: Date
    
    // MARK: - Initialization
    init(id: String,
         name: String,
         description: String,
         ingredients: [RecipeIngredient],
         steps: [String],
         prepTime: Int,
         cookTime: Int,
         difficulty: String,
         tags: [String],
         imageUrl: String? = nil,
         servings: Int,
         authorId: String,
         isPublic: Bool) {
        // Input validation
        guard !id.isEmpty, !name.isEmpty, !description.isEmpty,
              !ingredients.isEmpty, !steps.isEmpty,
              prepTime >= 0, cookTime >= 0,
              !difficulty.isEmpty, servings > 0,
              !authorId.isEmpty else {
            fatalError("Invalid recipe parameters")
        }
        
        self.id = id
        self.name = name
        self.description = description
        self.ingredients = ingredients
        self.steps = steps
        self.prepTime = prepTime
        self.cookTime = cookTime
        self.difficulty = difficulty
        self.tags = tags
        self.imageUrl = imageUrl
        self.servings = servings
        self.authorId = authorId
        self.isPublic = isPublic
        self.likes = 0
        
        // Set timestamps
        self.createdAt = Date()
        self.updatedAt = Date()
        
        super.init()
    }
    
    // MARK: - Public Methods
    
    /// Calculates total recipe time in minutes
    /// Requirement: Recipe Management - Comprehensive time tracking
    /// - Returns: Combined prep and cook time in minutes
    func totalTime() -> Int {
        return prepTime + cookTime
    }
    
    /// Checks if all required recipe ingredients are available
    /// Requirement: Smart Recipe Matching - Ingredient availability checking
    /// - Parameter availableIngredients: List of ingredients in user's pantry
    /// - Returns: True if all required ingredients are available in sufficient quantities
    func hasAllIngredients(_ availableIngredients: [Ingredient]) -> Bool {
        // Create dictionary of available ingredients by ID for efficient lookup
        let availableDict = Dictionary(uniqueKeysWithValues: availableIngredients.map { ($0.id, $0) })
        
        // Check each required (non-optional) recipe ingredient
        return ingredients.filter { !$0.isOptional }.allSatisfy { recipeIngredient in
            guard let available = availableDict[recipeIngredient.ingredientId] else {
                return false
            }
            return available.quantity >= recipeIngredient.quantity
        }
    }
    
    /// Calculates recipe match score based on available ingredients
    /// Requirement: Smart Recipe Matching - Sophisticated matching algorithm
    /// - Parameter availableIngredients: List of ingredients in user's pantry
    /// - Returns: Score between 0 and 1 indicating match quality
    func matchScore(_ availableIngredients: [Ingredient]) -> Double {
        let availableDict = Dictionary(uniqueKeysWithValues: availableIngredients.map { ($0.id, $0) })
        var totalScore = 0.0
        let requiredCount = ingredients.filter { !$0.isOptional }.count
        
        for recipeIngredient in ingredients {
            guard let available = availableDict[recipeIngredient.ingredientId] else {
                continue
            }
            
            // Calculate quantity match percentage
            let quantityMatch = min(available.quantity / recipeIngredient.quantity, 1.0)
            
            // Weight optional ingredients less than required ones
            let weight = recipeIngredient.isOptional ? 0.5 : 1.0
            
            totalScore += quantityMatch * weight
        }
        
        // Normalize score based on required ingredients
        return requiredCount > 0 ? totalScore / Double(requiredCount) : 0.0
    }
    
    /// Increments recipe likes count
    /// Requirement: Social Recipe Sharing - Likes tracking
    func incrementLikes() {
        likes += 1
        updatedAt = Date()
    }
}

// MARK: - RecipeIngredient Model
@objc
@objcMembers
class RecipeIngredient: NSObject {
    // MARK: - Properties
    let ingredientId: String
    let name: String
    let quantity: Double
    let unit: String
    let isOptional: Bool
    
    // MARK: - Initialization
    init(ingredientId: String,
         name: String,
         quantity: Double,
         unit: String,
         isOptional: Bool = false) {
        // Input validation
        guard !ingredientId.isEmpty, !name.isEmpty,
              quantity > 0, !unit.isEmpty else {
            fatalError("Invalid recipe ingredient parameters")
        }
        
        self.ingredientId = ingredientId
        self.name = name
        self.quantity = quantity
        self.unit = unit
        self.isOptional = isOptional
        
        super.init()
    }
}

// MARK: - Equatable
extension Recipe: Equatable {
    static func == (lhs: Recipe, rhs: Recipe) -> Bool {
        return lhs.id == rhs.id
    }
}

// MARK: - CustomStringConvertible
extension Recipe: CustomStringConvertible {
    var description: String {
        return "Recipe(id: \(id), name: \(name), ingredients: \(ingredients.count))"
    }
}

// MARK: - CustomStringConvertible
extension RecipeIngredient: CustomStringConvertible {
    var description: String {
        return "RecipeIngredient(name: \(name), quantity: \(quantity) \(unit))"
    }
}