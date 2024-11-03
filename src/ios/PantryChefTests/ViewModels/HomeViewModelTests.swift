// HUMAN TASKS:
// 1. Configure test data with product team to ensure realistic test scenarios
// 2. Set up test coverage monitoring in CI/CD pipeline
// 3. Review error message assertions with localization team
// 4. Configure performance benchmarks for concurrent data fetching tests

import XCTest
import Combine
@testable import PantryChef

// MARK: - HomeViewModelTests
// Requirements:
// - Recipe Suggestions Testing: Verify smart recipe matching based on available ingredients
// - Expiration Tracking Testing: Validate digital pantry management with expiration tracking
final class HomeViewModelTests: XCTestCase {
    // MARK: - Properties
    private var sut: HomeViewModel!
    private var mockRecipeService: MockRecipeService!
    private var mockPantryService: MockPantryService!
    private var cancellables: Set<AnyCancellable>!
    private var input: PassthroughSubject<HomeViewModelInput, Never>!
    private var subscriptions: [AnyCancellable]!
    
    // MARK: - Setup & Teardown
    override func setUp() {
        super.setUp()
        mockRecipeService = MockRecipeService()
        mockPantryService = MockPantryService()
        sut = HomeViewModel(recipeService: mockRecipeService, pantryService: mockPantryService)
        input = PassthroughSubject<HomeViewModelInput, Never>()
        cancellables = Set<AnyCancellable>()
        subscriptions = []
        
        // Set up transform pipeline
        let output = sut.transform(input: input.eraseToAnyPublisher())
        output.sink { [weak self] _ in
            // Capture outputs for verification
        }.store(in: &cancellables)
    }
    
    override func tearDown() {
        subscriptions.forEach { $0.cancel() }
        subscriptions = nil
        cancellables = nil
        input = nil
        sut = nil
        mockRecipeService = nil
        mockPantryService = nil
        super.tearDown()
    }
    
    // MARK: - Initial State Tests
    func testInitialState() {
        // Test initial state of the view model
        XCTAssertTrue(sut.state.value.suggestedRecipes.isEmpty)
        XCTAssertTrue(sut.state.value.expiringItems.isEmpty)
        XCTAssertFalse(sut.state.value.isLoading)
        XCTAssertNil(sut.state.value.error)
    }
    
    // MARK: - View Lifecycle Tests
    func testViewDidAppearFetchesRecipesAndExpiringItems() {
        // Given
        let expectation = XCTestExpectation(description: "Fetch data on viewDidAppear")
        let mockRecipes = [Recipe.mock(), Recipe.mock()]
        let mockItems = [PantryItem.mock(daysUntilExpiration: 5)]
        
        mockRecipeService.mockMatchRecipesResult = .success(mockRecipes)
        mockPantryService.mockExpiringItemsResult = .success(mockItems)
        mockPantryService.mockLoadPantryResult = .success(Pantry.mock())
        
        var outputs: [HomeViewModelOutput] = []
        sut.transform(input: input.eraseToAnyPublisher())
            .sink { output in
                outputs.append(output)
                if outputs.count == 3 { // Loading + 2 updates
                    expectation.fulfill()
                }
            }
            .store(in: &cancellables)
        
        // When
        input.send(.viewDidAppear)
        
        // Then
        wait(for: [expectation], timeout: 1.0)
        XCTAssertEqual(sut.state.value.suggestedRecipes, mockRecipes)
        XCTAssertEqual(sut.state.value.expiringItems, mockItems)
        XCTAssertFalse(sut.state.value.isLoading)
        XCTAssertNil(sut.state.value.error)
    }
    
    // MARK: - Refresh Tests
    func testRefreshContentUpdatesData() {
        // Given
        let expectation = XCTestExpectation(description: "Refresh content")
        let mockRecipes = [Recipe.mock()]
        let mockItems = [PantryItem.mock(daysUntilExpiration: 3)]
        
        mockRecipeService.mockMatchRecipesResult = .success(mockRecipes)
        mockPantryService.mockExpiringItemsResult = .success(mockItems)
        mockPantryService.mockLoadPantryResult = .success(Pantry.mock())
        
        var loadingStates: [Bool] = []
        sut.transform(input: input.eraseToAnyPublisher())
            .sink { output in
                if case let .showLoading(isLoading) = output {
                    loadingStates.append(isLoading)
                }
                if loadingStates.count == 2 {
                    expectation.fulfill()
                }
            }
            .store(in: &cancellables)
        
        // When
        input.send(.refreshContent)
        
        // Then
        wait(for: [expectation], timeout: 1.0)
        XCTAssertEqual(loadingStates, [true, false])
        XCTAssertEqual(sut.state.value.suggestedRecipes, mockRecipes)
        XCTAssertEqual(sut.state.value.expiringItems, mockItems)
    }
    
    // MARK: - Recipe Selection Tests
    func testRecipeSelectionEmitsCorrectOutput() {
        // Given
        let expectation = XCTestExpectation(description: "Recipe selection")
        let mockRecipe = Recipe.mock()
        mockRecipeService.mockRecipeDetailsResult = .success(mockRecipe)
        
        sut.transform(input: input.eraseToAnyPublisher())
            .sink { output in
                if case let .showRecipeDetail(recipe) = output {
                    XCTAssertEqual(recipe, mockRecipe)
                    expectation.fulfill()
                }
            }
            .store(in: &cancellables)
        
        // When
        input.send(.selectRecipe(id: mockRecipe.id))
        
        // Then
        wait(for: [expectation], timeout: 1.0)
    }
    
    // MARK: - Expiring Item Selection Tests
    func testExpiringItemSelectionEmitsCorrectOutput() {
        // Given
        let expectation = XCTestExpectation(description: "Expiring item selection")
        let mockItem = PantryItem.mock(daysUntilExpiration: 2)
        let mockRecipe = Recipe.mock()
        
        sut.state.value.expiringItems = [mockItem]
        mockRecipeService.mockMatchRecipesResult = .success([mockRecipe])
        
        sut.transform(input: input.eraseToAnyPublisher())
            .sink { output in
                if case let .showRecipeDetail(recipe) = output {
                    XCTAssertEqual(recipe, mockRecipe)
                    expectation.fulfill()
                }
            }
            .store(in: &cancellables)
        
        // When
        input.send(.selectExpiringItem(id: mockItem.id))
        
        // Then
        wait(for: [expectation], timeout: 1.0)
    }
    
    // MARK: - Error Handling Tests
    func testErrorHandling() {
        // Given
        let expectation = XCTestExpectation(description: "Error handling")
        let mockError = NSError(domain: "com.pantrychef.test", code: -1, userInfo: [NSLocalizedDescriptionKey: "Test error"])
        
        mockRecipeService.mockMatchRecipesResult = .failure(mockError)
        mockPantryService.mockLoadPantryResult = .failure(mockError)
        
        sut.transform(input: input.eraseToAnyPublisher())
            .sink { output in
                if case let .showError(message) = output {
                    XCTAssertEqual(message, mockError.localizedDescription)
                    expectation.fulfill()
                }
            }
            .store(in: &cancellables)
        
        // When
        input.send(.viewDidAppear)
        
        // Then
        wait(for: [expectation], timeout: 1.0)
        XCTAssertEqual(sut.state.value.error, mockError.localizedDescription)
        XCTAssertFalse(sut.state.value.isLoading)
    }
    
    // MARK: - Concurrent Data Fetching Tests
    func testConcurrentDataFetching() {
        // Given
        let expectation = XCTestExpectation(description: "Concurrent data fetching")
        expectation.expectedFulfillmentCount = 2
        
        let mockRecipes = [Recipe.mock()]
        let mockItems = [PantryItem.mock(daysUntilExpiration: 1)]
        
        mockRecipeService.mockMatchRecipesResult = .success(mockRecipes)
        mockPantryService.mockExpiringItemsResult = .success(mockItems)
        mockPantryService.mockLoadPantryResult = .success(Pantry.mock())
        
        sut.transform(input: input.eraseToAnyPublisher())
            .sink { output in
                switch output {
                case .updateSuggestedRecipes:
                    expectation.fulfill()
                case .updateExpiringItems:
                    expectation.fulfill()
                default:
                    break
                }
            }
            .store(in: &cancellables)
        
        // When
        input.send(.viewDidAppear)
        
        // Then
        wait(for: [expectation], timeout: 1.0)
        XCTAssertEqual(sut.state.value.suggestedRecipes, mockRecipes)
        XCTAssertEqual(sut.state.value.expiringItems, mockItems)
    }
}

// MARK: - Mock Extensions
private extension Recipe {
    static func mock() -> Recipe {
        Recipe(
            id: UUID().uuidString,
            name: "Test Recipe",
            description: "Test Description",
            ingredients: [Ingredient.mock()],
            steps: ["Step 1"],
            prepTime: 10,
            cookTime: 20,
            difficulty: "Easy",
            tags: ["test"]
        )
    }
}

private extension PantryItem {
    static func mock(daysUntilExpiration: Int) -> PantryItem {
        PantryItem(
            id: UUID().uuidString,
            ingredient: Ingredient.mock(),
            quantity: 1,
            unit: "unit",
            expirationDate: Calendar.current.date(byAdding: .day, value: daysUntilExpiration, to: Date())!,
            location: "Fridge",
            category: "Test"
        )
    }
}

private extension Ingredient {
    static func mock() -> Ingredient {
        Ingredient(
            id: UUID().uuidString,
            name: "Test Ingredient",
            category: "Test",
            nutritionalInfo: [:],
            commonUnit: "unit"
        )
    }
}

private extension Pantry {
    static func mock() -> Pantry {
        Pantry(
            id: UUID().uuidString,
            userId: "test_user",
            items: [PantryItem.mock(daysUntilExpiration: 5)],
            locations: ["Fridge"]
        )
    }
}