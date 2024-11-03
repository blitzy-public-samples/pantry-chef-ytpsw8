//
// RecipeViewModelTests.swift
// PantryChefTests
//
// HUMAN TASKS:
// 1. Configure test timeout values in CI/CD pipeline
// 2. Set up test data fixtures for recipe matching scenarios
// 3. Review test coverage requirements with QA team
// 4. Configure mock service response delays to match production scenarios

import XCTest
import Combine // iOS 13.0+
@testable import PantryChef

final class RecipeViewModelTests: XCTestCase {
    // MARK: - Properties
    private var sut: RecipeViewModel!
    private var mockRecipeService: MockRecipeService!
    private var cancellables: Set<AnyCancellable>!
    private var testRecipes: [Recipe]!
    
    // MARK: - Setup & Teardown
    override func setUp() {
        super.setUp()
        mockRecipeService = MockRecipeService()
        cancellables = Set<AnyCancellable>()
        setupTestRecipes()
        sut = RecipeViewModel(recipeService: mockRecipeService)
    }
    
    override func tearDown() {
        cancellables.forEach { $0.cancel() }
        cancellables = nil
        testRecipes = nil
        sut = nil
        mockRecipeService = nil
        super.tearDown()
    }
    
    // MARK: - Test Helpers
    private func setupTestRecipes() {
        testRecipes = [
            Recipe(
                id: "recipe1",
                name: "Test Recipe 1",
                description: "Test description 1",
                ingredients: [
                    RecipeIngredient(ingredientId: "ing1", name: "Ingredient 1", quantity: 1.0, unit: "cup"),
                    RecipeIngredient(ingredientId: "ing2", name: "Ingredient 2", quantity: 2.0, unit: "tbsp")
                ],
                steps: ["Step 1", "Step 2"],
                prepTime: 10,
                cookTime: 20,
                difficulty: "medium",
                tags: ["tag1", "tag2"],
                servings: 4,
                authorId: "author1",
                isPublic: true
            ),
            Recipe(
                id: "recipe2",
                name: "Test Recipe 2",
                description: "Test description 2",
                ingredients: [
                    RecipeIngredient(ingredientId: "ing3", name: "Ingredient 3", quantity: 3.0, unit: "oz"),
                    RecipeIngredient(ingredientId: "ing4", name: "Ingredient 4", quantity: 4.0, unit: "g")
                ],
                steps: ["Step 1", "Step 2"],
                prepTime: 15,
                cookTime: 25,
                difficulty: "easy",
                tags: ["tag3", "tag4"],
                servings: 2,
                authorId: "author2",
                isPublic: true
            )
        ]
    }
    
    private func createInputPublisher(_ input: RecipeViewModel.RecipeViewModelInput) -> AnyPublisher<RecipeViewModel.RecipeViewModelInput, Never> {
        return Just(input).eraseToAnyPublisher()
    }
    
    // MARK: - Tests
    
    /// Tests recipe loading functionality with pagination
    /// Requirement: Recipe Management - Recipe database and matching with comprehensive recipe data model
    func testLoadRecipes() {
        // Given
        let expectation = XCTestExpectation(description: "Load recipes")
        mockRecipeService.mockFetchRecipesResponse = .success(testRecipes)
        var receivedOutput: RecipeViewModel.RecipeViewModelOutput?
        
        // When
        sut.transform(input: createInputPublisher(.loadRecipes(page: 1, limit: 20)))
            .sink { output in
                receivedOutput = output
                expectation.fulfill()
            }
            .store(in: &cancellables)
        
        // Then
        wait(for: [expectation], timeout: 5.0)
        
        if case let .recipesLoaded(recipes) = receivedOutput {
            XCTAssertEqual(recipes.count, testRecipes.count)
            XCTAssertEqual(recipes[0].id, testRecipes[0].id)
            XCTAssertEqual(sut.state.value.currentPage, 1)
            XCTAssertEqual(sut.state.value.recipes.count, testRecipes.count)
            XCTAssertFalse(sut.state.value.isLoading)
        } else {
            XCTFail("Expected recipesLoaded output")
        }
    }
    
    /// Tests recipe search functionality with tag filtering
    /// Requirement: Recipe Management - Recipe database and matching with comprehensive recipe data model
    func testSearchRecipes() {
        // Given
        let expectation = XCTestExpectation(description: "Search recipes")
        let searchQuery = "Test"
        let searchTags = ["tag1"]
        mockRecipeService.mockSearchRecipesResponse = .success([testRecipes[0]])
        var receivedOutput: RecipeViewModel.RecipeViewModelOutput?
        
        // When
        sut.transform(input: createInputPublisher(.searchRecipes(query: searchQuery, tags: searchTags)))
            .sink { output in
                receivedOutput = output
                expectation.fulfill()
            }
            .store(in: &cancellables)
        
        // Then
        wait(for: [expectation], timeout: 5.0)
        
        if case let .searchResults(recipes) = receivedOutput {
            XCTAssertEqual(recipes.count, 1)
            XCTAssertEqual(recipes[0].id, testRecipes[0].id)
            XCTAssertEqual(sut.state.value.currentSearchQuery, searchQuery)
            XCTAssertFalse(sut.state.value.isLoading)
        } else {
            XCTFail("Expected searchResults output")
        }
    }
    
    /// Tests recipe matching based on available ingredients with scoring
    /// Requirement: Smart Recipe Matching - Smart recipe matching based on available ingredients through sophisticated matching algorithms and scoring
    func testIngredientMatching() {
        // Given
        let expectation = XCTestExpectation(description: "Match recipes")
        let testIngredients = [
            Ingredient(id: "ing1", name: "Ingredient 1", quantity: 2.0, unit: "cup"),
            Ingredient(id: "ing2", name: "Ingredient 2", quantity: 3.0, unit: "tbsp")
        ]
        mockRecipeService.mockMatchRecipesResponse = .success([testRecipes[0]])
        var receivedOutput: RecipeViewModel.RecipeViewModelOutput?
        
        // When
        sut.transform(input: createInputPublisher(.matchWithIngredients(testIngredients)))
            .sink { output in
                receivedOutput = output
                expectation.fulfill()
            }
            .store(in: &cancellables)
        
        // Then
        wait(for: [expectation], timeout: 5.0)
        
        if case let .matchedRecipes(recipes) = receivedOutput {
            XCTAssertEqual(recipes.count, 1)
            XCTAssertEqual(recipes[0].id, testRecipes[0].id)
            XCTAssertTrue(recipes[0].hasAllIngredients(testIngredients))
            XCTAssertGreaterThan(recipes[0].matchScore(testIngredients), 0.0)
            XCTAssertFalse(sut.state.value.isLoading)
        } else {
            XCTFail("Expected matchedRecipes output")
        }
    }
    
    /// Tests recipe like toggling functionality with state updates
    /// Requirement: Social Recipe Sharing - Social recipe sharing and community features through recipe likes and visibility management
    func testRecipeLikeToggle() {
        // Given
        let expectation = XCTestExpectation(description: "Toggle recipe like")
        let recipeId = testRecipes[0].id
        mockRecipeService.mockToggleLikeResponse = .success(true)
        var receivedOutput: RecipeViewModel.RecipeViewModelOutput?
        
        // When
        sut.transform(input: createInputPublisher(.toggleRecipeLike(recipeId)))
            .sink { output in
                receivedOutput = output
                expectation.fulfill()
            }
            .store(in: &cancellables)
        
        // Then
        wait(for: [expectation], timeout: 5.0)
        
        if case let .likeToggled(id, isLiked) = receivedOutput {
            XCTAssertEqual(id, recipeId)
            XCTAssertTrue(isLiked)
            XCTAssertTrue(sut.state.value.recipeLikeStatus[recipeId] ?? false)
        } else {
            XCTFail("Expected likeToggled output")
        }
    }
    
    /// Tests error handling during recipe loading
    func testLoadRecipesError() {
        // Given
        let expectation = XCTestExpectation(description: "Load recipes error")
        let testError = NSError(domain: "TestError", code: -1, userInfo: nil)
        mockRecipeService.mockFetchRecipesResponse = .failure(testError)
        var receivedOutput: RecipeViewModel.RecipeViewModelOutput?
        
        // When
        sut.transform(input: createInputPublisher(.loadRecipes(page: 1, limit: 20)))
            .sink { output in
                receivedOutput = output
                expectation.fulfill()
            }
            .store(in: &cancellables)
        
        // Then
        wait(for: [expectation], timeout: 5.0)
        
        if case let .error(error) = receivedOutput {
            XCTAssertEqual((error as NSError).domain, testError.domain)
            XCTAssertFalse(sut.state.value.isLoading)
        } else {
            XCTFail("Expected error output")
        }
    }
    
    /// Tests pagination with load more functionality
    func testLoadMoreRecipes() {
        // Given
        let expectation = XCTestExpectation(description: "Load more recipes")
        mockRecipeService.mockFetchRecipesResponse = .success(testRecipes)
        sut.state.value.currentPage = 1
        sut.state.value.hasMorePages = true
        var receivedOutput: RecipeViewModel.RecipeViewModelOutput?
        
        // When
        sut.transform(input: createInputPublisher(.loadMore))
            .sink { output in
                receivedOutput = output
                expectation.fulfill()
            }
            .store(in: &cancellables)
        
        // Then
        wait(for: [expectation], timeout: 5.0)
        
        if case let .recipesLoaded(recipes) = receivedOutput {
            XCTAssertEqual(recipes.count, testRecipes.count)
            XCTAssertEqual(sut.state.value.currentPage, 2)
            XCTAssertFalse(sut.state.value.isLoading)
        } else {
            XCTFail("Expected recipesLoaded output")
        }
    }
}

// MARK: - Mock Recipe Service
private class MockRecipeService: RecipeService {
    var mockFetchRecipesResponse: Result<[Recipe], Error>?
    var mockSearchRecipesResponse: Result<[Recipe], Error>?
    var mockMatchRecipesResponse: Result<[Recipe], Error>?
    var mockToggleLikeResponse: Result<Bool, Error>?
    
    override func fetchRecipes(page: Int, limit: Int) -> AnyPublisher<[Recipe], Error> {
        return mockFetchRecipesResponse?.publisher.eraseToAnyPublisher() ??
            Fail(error: NSError(domain: "No mock response", code: -1)).eraseToAnyPublisher()
    }
    
    override func searchRecipes(query: String, tags: [String]?) -> AnyPublisher<[Recipe], Error> {
        return mockSearchRecipesResponse?.publisher.eraseToAnyPublisher() ??
            Fail(error: NSError(domain: "No mock response", code: -1)).eraseToAnyPublisher()
    }
    
    override func matchRecipes(availableIngredients: [Ingredient]) -> AnyPublisher<[Recipe], Error> {
        return mockMatchRecipesResponse?.publisher.eraseToAnyPublisher() ??
            Fail(error: NSError(domain: "No mock response", code: -1)).eraseToAnyPublisher()
    }
    
    override func toggleRecipeLike(recipeId: String) -> AnyPublisher<Bool, Error> {
        return mockToggleLikeResponse?.publisher.eraseToAnyPublisher() ??
            Fail(error: NSError(domain: "No mock response", code: -1)).eraseToAnyPublisher()
    }
}