// HUMAN TASKS:
// 1. Ensure iOS deployment target is set to iOS 13.0 or higher in Xcode project settings
// 2. Configure recipe matching algorithm weights with product team
// 3. Set up analytics tracking for recipe interactions
// 4. Review recipe caching strategy and TTL values

// External dependencies:
// - Foundation framework (iOS 13.0+)
// - Combine framework (iOS 13.0+)

import Foundation
import Combine

// MARK: - RecipeViewModel
/// View model managing recipe-related business logic and state with comprehensive support for recipe management,
/// matching, and social features. Implements MVVM architecture with Combine framework for reactive data flow.
final class RecipeViewModel: ViewModelType {
    // MARK: - Input Events
    enum RecipeViewModelInput {
        case loadRecipes(page: Int, limit: Int)
        case searchRecipes(query: String, tags: [String]?)
        case filterByTags([String])
        case matchWithIngredients([Ingredient])
        case toggleRecipeLike(String)
        case loadMore
        case refreshRecipes
    }
    
    // MARK: - Output Events
    enum RecipeViewModelOutput {
        case recipesLoaded([Recipe])
        case searchResults([Recipe])
        case matchedRecipes([Recipe])
        case error(Error)
        case loading(Bool)
        case likeToggled(String, Bool)
        case refreshCompleted
        case loadMoreCompleted
    }
    
    // MARK: - State
    struct RecipeViewModelState {
        var recipes: [Recipe] = []
        var selectedTags: [String] = []
        var isLoading: Bool = false
        var currentPage: Int = 1
        var itemsPerPage: Int = 20
        var hasMorePages: Bool = true
        var currentSearchQuery: String?
        var recipeLikeStatus: [String: Bool] = [:]
    }
    
    // MARK: - Properties
    private let recipeService: RecipeService
    let state: CurrentValueSubject<RecipeViewModelState, Never>
    private var cancellables = Set<AnyCancellable>()
    
    // MARK: - Initialization
    init(recipeService: RecipeService = .shared) {
        self.recipeService = recipeService
        self.state = CurrentValueSubject<RecipeViewModelState, Never>(.init())
    }
    
    // MARK: - ViewModelType Implementation
    /// Transforms input events into state changes and output events using Combine
    /// Requirement: Recipe Management - Comprehensive recipe data management
    func transform(input: AnyPublisher<RecipeViewModelInput, Never>) -> AnyPublisher<RecipeViewModelOutput, Never> {
        return input.flatMap { [weak self] input -> AnyPublisher<RecipeViewModelOutput, Never> in
            guard let self = self else {
                return Empty().eraseToAnyPublisher()
            }
            
            switch input {
            case let .loadRecipes(page, limit):
                return self.handleLoadRecipes(page: page, limit: limit)
                
            case let .searchRecipes(query, tags):
                return self.handleSearch(query: query, tags: tags)
                
            case let .filterByTags(tags):
                self.state.value.selectedTags = tags
                return self.handleSearch(
                    query: self.state.value.currentSearchQuery ?? "",
                    tags: tags
                )
                
            case let .matchWithIngredients(ingredients):
                return self.handleIngredientMatch(ingredients: ingredients)
                
            case let .toggleRecipeLike(recipeId):
                return self.handleLikeToggle(recipeId: recipeId)
                
            case .loadMore:
                guard self.state.value.hasMorePages && !self.state.value.isLoading else {
                    return Empty().eraseToAnyPublisher()
                }
                let nextPage = self.state.value.currentPage + 1
                return self.handleLoadRecipes(
                    page: nextPage,
                    limit: self.state.value.itemsPerPage
                )
                
            case .refreshRecipes:
                self.state.value.currentPage = 1
                self.state.value.hasMorePages = true
                return self.handleLoadRecipes(
                    page: 1,
                    limit: self.state.value.itemsPerPage
                ).map { output in
                    if case .recipesLoaded = output {
                        return .refreshCompleted
                    }
                    return output
                }.eraseToAnyPublisher()
            }
        }.eraseToAnyPublisher()
    }
    
    // MARK: - Private Methods
    
    /// Handles recipe loading with pagination support
    /// Requirement: Recipe Management - Recipe database with pagination
    private func handleLoadRecipes(page: Int, limit: Int) -> AnyPublisher<RecipeViewModelOutput, Never> {
        self.state.value.isLoading = true
        
        return recipeService.fetchRecipes(page: page, limit: limit)
            .handleEvents(receiveOutput: { [weak self] recipes in
                guard let self = self else { return }
                
                if page == 1 {
                    self.state.value.recipes = recipes
                } else {
                    self.state.value.recipes.append(contentsOf: recipes)
                }
                
                self.state.value.currentPage = page
                self.state.value.hasMorePages = recipes.count >= limit
                self.state.value.isLoading = false
            })
            .map { RecipeViewModelOutput.recipesLoaded($0) }
            .catch { error -> AnyPublisher<RecipeViewModelOutput, Never> in
                Just(.error(error))
                    .handleEvents(receiveOutput: { [weak self] _ in
                        self?.state.value.isLoading = false
                    })
                    .eraseToAnyPublisher()
            }
            .eraseToAnyPublisher()
    }
    
    /// Handles recipe search operations with tag filtering
    /// Requirement: Recipe Management - Comprehensive recipe search
    private func handleSearch(query: String, tags: [String]?) -> AnyPublisher<RecipeViewModelOutput, Never> {
        self.state.value.isLoading = true
        self.state.value.currentSearchQuery = query
        
        return recipeService.searchRecipes(query: query, tags: tags)
            .handleEvents(receiveOutput: { [weak self] recipes in
                self?.state.value.isLoading = false
            })
            .map { RecipeViewModelOutput.searchResults($0) }
            .catch { error -> AnyPublisher<RecipeViewModelOutput, Never> in
                Just(.error(error))
                    .handleEvents(receiveOutput: { [weak self] _ in
                        self?.state.value.isLoading = false
                    })
                    .eraseToAnyPublisher()
            }
            .eraseToAnyPublisher()
    }
    
    /// Handles recipe matching based on available ingredients
    /// Requirement: Smart Recipe Matching - Sophisticated matching algorithm
    private func handleIngredientMatch(ingredients: [Ingredient]) -> AnyPublisher<RecipeViewModelOutput, Never> {
        self.state.value.isLoading = true
        
        return recipeService.matchRecipes(availableIngredients: ingredients)
            .handleEvents(receiveOutput: { [weak self] recipes in
                self?.state.value.isLoading = false
            })
            .map { RecipeViewModelOutput.matchedRecipes($0) }
            .catch { error -> AnyPublisher<RecipeViewModelOutput, Never> in
                Just(.error(error))
                    .handleEvents(receiveOutput: { [weak self] _ in
                        self?.state.value.isLoading = false
                    })
                    .eraseToAnyPublisher()
            }
            .eraseToAnyPublisher()
    }
    
    /// Handles recipe like toggling with backend synchronization
    /// Requirement: Social Recipe Sharing - Recipe likes management
    private func handleLikeToggle(recipeId: String) -> AnyPublisher<RecipeViewModelOutput, Never> {
        return recipeService.toggleRecipeLike(recipeId: recipeId)
            .handleEvents(receiveOutput: { [weak self] isLiked in
                self?.state.value.recipeLikeStatus[recipeId] = isLiked
                
                // Update like status in recipes array
                if let index = self?.state.value.recipes.firstIndex(where: { $0.id == recipeId }) {
                    self?.state.value.recipes[index].incrementLikes()
                }
            })
            .map { RecipeViewModelOutput.likeToggled(recipeId, $0) }
            .catch { Just(.error($0)) }
            .eraseToAnyPublisher()
    }
}

// MARK: - CustomStringConvertible
extension RecipeViewModel: CustomStringConvertible {
    var description: String {
        return "RecipeViewModel(recipes: \(state.value.recipes.count), page: \(state.value.currentPage))"
    }
}