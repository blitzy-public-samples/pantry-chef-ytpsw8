// HUMAN TASKS:
// 1. Configure recipe suggestion limit with product team (currently set to 10)
// 2. Set up expiring items threshold with product team (currently set to 7 days)
// 3. Review analytics tracking requirements for home screen interactions
// 4. Configure error message localization strings
// 5. Set up performance monitoring for recipe matching operations

import Foundation // iOS 13.0+
import Combine // iOS 13.0+

// MARK: - HomeViewModelInput
// Requirement: Mobile-First Design - Defines possible user interactions in home screen
public enum HomeViewModelInput {
    case viewDidAppear
    case refreshContent
    case selectRecipe(id: String)
    case selectExpiringItem(id: String)
}

// MARK: - HomeViewModelOutput
// Requirement: Mobile-First Design - Defines possible UI updates for home screen
public enum HomeViewModelOutput {
    case updateSuggestedRecipes([Recipe])
    case updateExpiringItems([PantryItem])
    case showRecipeDetail(Recipe)
    case showError(String)
    case showLoading(Bool)
}

// MARK: - HomeViewState
// Requirement: Mobile-First Design - Defines UI state for home screen
public struct HomeViewState {
    var suggestedRecipes: [Recipe]
    var expiringItems: [PantryItem]
    var isLoading: Bool
    var error: String?
    
    init(
        suggestedRecipes: [Recipe] = [],
        expiringItems: [PantryItem] = [],
        isLoading: Bool = false,
        error: String? = nil
    ) {
        self.suggestedRecipes = suggestedRecipes
        self.expiringItems = expiringItems
        self.isLoading = isLoading
        self.error = error
    }
}

// MARK: - HomeViewModel
// Requirements:
// - Recipe Suggestions: Smart recipe matching based on available ingredients
// - Expiration Tracking: Digital pantry management with expiration tracking
// - Mobile-First Design: Native iOS implementation using MVVM pattern
public final class HomeViewModel: ViewModelType {
    // MARK: - Properties
    public let state: CurrentValueSubject<HomeViewState, Never>
    private let recipeService: RecipeService
    private let pantryService: PantryService
    private var cancellables = Set<AnyCancellable>()
    
    // MARK: - Constants
    private let recipeSuggestionLimit = 10
    private let expiringItemsThreshold = 7 // days
    
    // MARK: - Initialization
    public init(
        recipeService: RecipeService = .shared,
        pantryService: PantryService = .shared
    ) {
        self.state = CurrentValueSubject<HomeViewState, Never>(.init())
        self.recipeService = recipeService
        self.pantryService = pantryService
        
        Logger.shared.debug("HomeViewModel initialized")
    }
    
    // MARK: - ViewModelType Implementation
    public func transform(input: AnyPublisher<HomeViewModelInput, Never>) -> AnyPublisher<HomeViewModelOutput, Never> {
        // Merge all input handlers into a single output stream
        return Publishers.Merge4(
            handleViewDidAppear(input),
            handleRefreshContent(input),
            handleRecipeSelection(input),
            handleExpiringItemSelection(input)
        ).eraseToAnyPublisher()
    }
    
    // MARK: - Private Methods
    
    /// Handles initial view loading and data fetching
    /// Requirement: Recipe Suggestions, Expiration Tracking - Initial data load
    private func handleViewDidAppear(_ input: AnyPublisher<HomeViewModelInput, Never>) -> AnyPublisher<HomeViewModelOutput, Never> {
        input
            .filter { if case .viewDidAppear = $0 { return true }; return false }
            .flatMap { [weak self] _ -> AnyPublisher<HomeViewModelOutput, Never> in
                guard let self = self else {
                    return Empty().eraseToAnyPublisher()
                }
                
                // Show loading state
                self.state.value.isLoading = true
                
                // Fetch both suggested recipes and expiring items concurrently
                return Publishers.Zip(
                    self.fetchSuggestedRecipes(),
                    self.fetchExpiringItems()
                )
                .map { recipes, items -> [HomeViewModelOutput] in
                    self.state.value.isLoading = false
                    self.state.value.error = nil
                    return [
                        .updateSuggestedRecipes(recipes),
                        .updateExpiringItems(items)
                    ]
                }
                .catch { error -> AnyPublisher<[HomeViewModelOutput], Never> in
                    self.state.value.isLoading = false
                    self.state.value.error = error.localizedDescription
                    return Just([.showError(error.localizedDescription)])
                        .eraseToAnyPublisher()
                }
                .flatMap { outputs in
                    Publishers.Sequence(sequence: outputs)
                        .eraseToAnyPublisher()
                }
                .eraseToAnyPublisher()
            }
            .eraseToAnyPublisher()
    }
    
    /// Handles manual content refresh
    /// Requirement: Recipe Suggestions, Expiration Tracking - Manual refresh
    private func handleRefreshContent(_ input: AnyPublisher<HomeViewModelInput, Never>) -> AnyPublisher<HomeViewModelOutput, Never> {
        input
            .filter { if case .refreshContent = $0 { return true }; return false }
            .flatMap { [weak self] _ -> AnyPublisher<HomeViewModelOutput, Never> in
                guard let self = self else {
                    return Empty().eraseToAnyPublisher()
                }
                
                return Just(.showLoading(true))
                    .append(
                        Publishers.Zip(
                            self.fetchSuggestedRecipes(),
                            self.fetchExpiringItems()
                        )
                        .map { recipes, items -> [HomeViewModelOutput] in
                            self.state.value.error = nil
                            return [
                                .showLoading(false),
                                .updateSuggestedRecipes(recipes),
                                .updateExpiringItems(items)
                            ]
                        }
                        .catch { error -> AnyPublisher<[HomeViewModelOutput], Never> in
                            self.state.value.error = error.localizedDescription
                            return Just([
                                .showLoading(false),
                                .showError(error.localizedDescription)
                            ])
                            .eraseToAnyPublisher()
                        }
                        .flatMap { outputs in
                            Publishers.Sequence(sequence: outputs)
                                .eraseToAnyPublisher()
                        }
                    )
                    .eraseToAnyPublisher()
            }
            .eraseToAnyPublisher()
    }
    
    /// Handles recipe selection for navigation
    /// Requirement: Recipe Suggestions - Recipe detail navigation
    private func handleRecipeSelection(_ input: AnyPublisher<HomeViewModelInput, Never>) -> AnyPublisher<HomeViewModelOutput, Never> {
        input
            .compactMap { input -> String? in
                if case let .selectRecipe(id) = input {
                    return id
                }
                return nil
            }
            .flatMap { [weak self] recipeId -> AnyPublisher<HomeViewModelOutput, Never> in
                guard let self = self else {
                    return Empty().eraseToAnyPublisher()
                }
                
                return self.recipeService.getRecipeDetails(recipeId: recipeId)
                    .map { recipe -> HomeViewModelOutput in
                        .showRecipeDetail(recipe)
                    }
                    .catch { error -> AnyPublisher<HomeViewModelOutput, Never> in
                        Just(.showError(error.localizedDescription))
                            .eraseToAnyPublisher()
                    }
                    .eraseToAnyPublisher()
            }
            .eraseToAnyPublisher()
    }
    
    /// Handles expiring item selection
    /// Requirement: Expiration Tracking - Item detail navigation
    private func handleExpiringItemSelection(_ input: AnyPublisher<HomeViewModelInput, Never>) -> AnyPublisher<HomeViewModelOutput, Never> {
        input
            .compactMap { input -> String? in
                if case let .selectExpiringItem(id) = input {
                    return id
                }
                return nil
            }
            .flatMap { [weak self] itemId -> AnyPublisher<HomeViewModelOutput, Never> in
                guard let self = self,
                      let item = self.state.value.expiringItems.first(where: { $0.id == itemId }) else {
                    return Just(.showError("Item not found"))
                        .eraseToAnyPublisher()
                }
                
                // Find recipes that can use this expiring item
                return self.recipeService.matchRecipes(availableIngredients: [item.ingredient])
                    .map { recipes -> HomeViewModelOutput in
                        if let bestMatch = recipes.first {
                            return .showRecipeDetail(bestMatch)
                        } else {
                            return .showError("No recipes found for this ingredient")
                        }
                    }
                    .catch { error -> AnyPublisher<HomeViewModelOutput, Never> in
                        Just(.showError(error.localizedDescription))
                            .eraseToAnyPublisher()
                    }
                    .eraseToAnyPublisher()
            }
            .eraseToAnyPublisher()
    }
    
    /// Fetches suggested recipes based on pantry contents
    /// Requirement: Recipe Suggestions - Smart recipe matching
    private func fetchSuggestedRecipes() -> AnyPublisher<[Recipe], Error> {
        pantryService.loadPantry(userId: "current_user") // TODO: Inject user ID
            .mapError { $0 as Error }
            .flatMap { pantry -> AnyPublisher<[Recipe], Error> in
                self.recipeService.matchRecipes(availableIngredients: pantry.items.map { $0.ingredient })
                    .map { recipes in
                        Array(recipes.prefix(self.recipeSuggestionLimit))
                    }
                    .eraseToAnyPublisher()
            }
            .handleEvents(
                receiveOutput: { [weak self] recipes in
                    self?.state.value.suggestedRecipes = recipes
                }
            )
            .eraseToAnyPublisher()
    }
    
    /// Fetches ingredients nearing expiration
    /// Requirement: Expiration Tracking - Expiration monitoring
    private func fetchExpiringItems() -> AnyPublisher<[PantryItem], Error> {
        pantryService.getExpiringItems(expiringItemsThreshold)
            .mapError { $0 as Error }
            .handleEvents(
                receiveOutput: { [weak self] items in
                    self?.state.value.expiringItems = items
                }
            )
            .eraseToAnyPublisher()
    }
}