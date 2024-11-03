//
// RecipeService.swift
// PantryChef
//
// HUMAN TASKS:
// 1. Configure recipe matching algorithm weights with product team
// 2. Set up recipe caching TTL values based on usage patterns
// 3. Review social sharing permissions with security team
// 4. Configure recipe image caching strategy
// 5. Set up analytics tracking for recipe interactions

import Foundation // iOS 13.0+
import Combine // iOS 13.0+

// MARK: - RecipeService
// Requirements:
// - Smart Recipe Matching: Sophisticated matching based on available ingredients
// - Recipe Management: Comprehensive recipe data model with all required attributes
// - Social Recipe Sharing: Social features with recipe likes and visibility management
final class RecipeService {
    // MARK: - Properties
    private let networkService: NetworkService
    private let cacheService: CacheService
    private let cacheTTL: TimeInterval = 3600 // 1 hour default TTL
    
    // MARK: - Singleton
    static let shared = RecipeService()
    
    // MARK: - Initialization
    private init() {
        self.networkService = .shared
        self.cacheService = .shared
        
        // Configure recipe-specific network settings
        Logger.shared.debug("RecipeService initialized")
    }
    
    // MARK: - Public Methods
    
    /// Fetches paginated recipes from backend with caching support
    /// Requirement: Recipe Management - Recipe database with pagination
    /// - Parameters:
    ///   - page: Page number for pagination
    ///   - limit: Number of recipes per page
    /// - Returns: Publisher emitting array of recipes or error
    func fetchRecipes(page: Int, limit: Int) -> AnyPublisher<[Recipe], Error> {
        let cacheKey = "recipes_page_\(page)_limit_\(limit)"
        
        // Check cache first
        if case .success(let data) = cacheService.get(key: cacheKey) {
            do {
                let recipes = try JSONDecoder().decode([Recipe].self, from: data)
                return Just(recipes)
                    .setFailureType(to: Error.self)
                    .eraseToAnyPublisher()
            } catch {
                Logger.shared.error("Cache decoding failed: \(error)")
            }
        }
        
        // Fetch from network if cache miss
        return networkService.request(
            "/recipes",
            method: .get,
            headers: ["X-Page": "\(page)", "X-Limit": "\(limit)"]
        )
        .map { (recipes: [Recipe]) in
            // Cache successful response
            if let data = try? JSONEncoder().encode(recipes) {
                self.cacheService.set(data: data, key: cacheKey, ttl: self.cacheTTL)
            }
            return recipes
        }
        .eraseToAnyPublisher()
    }
    
    /// Searches recipes by name, ingredients, or tags
    /// Requirement: Recipe Management - Comprehensive recipe search
    /// - Parameters:
    ///   - query: Search query string
    ///   - tags: Optional array of tags to filter by
    /// - Returns: Publisher emitting matching recipes or error
    func searchRecipes(query: String, tags: [String]? = nil) -> AnyPublisher<[Recipe], Error> {
        var params: [String: Any] = ["query": query]
        if let tags = tags {
            params["tags"] = tags
        }
        
        return networkService.request(
            "/recipes/search",
            method: .get,
            headers: ["X-Search-Params": params.jsonString]
        )
        .eraseToAnyPublisher()
    }
    
    /// Finds recipes matching available ingredients using backend matching
    /// Requirement: Smart Recipe Matching - Sophisticated matching algorithm
    /// - Parameter availableIngredients: List of ingredients in user's pantry
    /// - Returns: Publisher emitting matching recipes sorted by match score
    func matchRecipes(availableIngredients: [Ingredient]) -> AnyPublisher<[Recipe], Error> {
        let ingredientIds = availableIngredients.map { $0.id }
        let cacheKey = "recipe_matches_\(ingredientIds.sorted().joined())"
        
        // Check cache first with shorter TTL for matches
        if case .success(let data) = cacheService.get(key: cacheKey) {
            do {
                let recipes = try JSONDecoder().decode([Recipe].self, from: data)
                return Just(recipes)
                    .setFailureType(to: Error.self)
                    .eraseToAnyPublisher()
            } catch {
                Logger.shared.error("Cache decoding failed: \(error)")
            }
        }
        
        // Fetch matches from backend
        return networkService.request(
            "/recipes/match",
            method: .post,
            body: ["ingredients": ingredientIds]
        )
        .map { (recipes: [Recipe]) in
            // Sort recipes by match score
            let sortedRecipes = recipes.sorted { recipe1, recipe2 in
                recipe1.matchScore(availableIngredients) > recipe2.matchScore(availableIngredients)
            }
            
            // Cache results with shorter TTL
            if let data = try? JSONEncoder().encode(sortedRecipes) {
                self.cacheService.set(data: data, key: cacheKey, ttl: 900) // 15 minutes TTL
            }
            
            return sortedRecipes
        }
        .eraseToAnyPublisher()
    }
    
    /// Fetches detailed information for a specific recipe with caching
    /// Requirement: Recipe Management - Comprehensive recipe data model
    /// - Parameter recipeId: Unique identifier of the recipe
    /// - Returns: Publisher emitting recipe details or error
    func getRecipeDetails(recipeId: String) -> AnyPublisher<Recipe, Error> {
        let cacheKey = "recipe_details_\(recipeId)"
        
        // Check cache first
        if case .success(let data) = cacheService.get(key: cacheKey) {
            do {
                let recipe = try JSONDecoder().decode(Recipe.self, from: data)
                return Just(recipe)
                    .setFailureType(to: Error.self)
                    .eraseToAnyPublisher()
            } catch {
                Logger.shared.error("Cache decoding failed: \(error)")
            }
        }
        
        // Fetch from network if cache miss
        return networkService.request(
            "/recipes/\(recipeId)",
            method: .get
        )
        .map { (recipe: Recipe) in
            // Cache successful response
            if let data = try? JSONEncoder().encode(recipe) {
                self.cacheService.set(data: data, key: cacheKey, ttl: self.cacheTTL)
            }
            return recipe
        }
        .eraseToAnyPublisher()
    }
    
    /// Toggles like status for a recipe with backend synchronization
    /// Requirement: Social Recipe Sharing - Recipe likes management
    /// - Parameter recipeId: Unique identifier of the recipe
    /// - Returns: Publisher emitting new like status
    func toggleRecipeLike(recipeId: String) -> AnyPublisher<Bool, Error> {
        return networkService.request(
            "/recipes/\(recipeId)/like",
            method: .post
        )
        .map { (response: [String: Bool]) -> Bool in
            // Update cache if recipe exists
            let cacheKey = "recipe_details_\(recipeId)"
            if case .success(let data) = self.cacheService.get(key: cacheKey),
               var recipe = try? JSONDecoder().decode(Recipe.self, from: data) {
                recipe.incrementLikes()
                if let updatedData = try? JSONEncoder().encode(recipe) {
                    self.cacheService.set(data: updatedData, key: cacheKey, ttl: self.cacheTTL)
                }
            }
            
            // Invalidate matches cache as like status affects sorting
            self.cacheService.remove(key: "recipe_matches_")
            
            return response["liked"] ?? false
        }
        .eraseToAnyPublisher()
    }
}

// MARK: - Private Extensions
private extension Dictionary where Key == String {
    var jsonString: String {
        guard let data = try? JSONSerialization.data(withJSONObject: self),
              let string = String(data: data, encoding: .utf8) else {
            return "{}"
        }
        return string
    }
}