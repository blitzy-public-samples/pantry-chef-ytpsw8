// XCTest framework - iOS 13.0+
import XCTest

class RecipeUITests: XCTestCase {
    // MARK: - Properties
    let app = XCUIApplication()
    
    // MARK: - Setup and Teardown
    override func setUp() {
        super.setUp()
        
        // Configure test environment
        continueAfterFailure = false
        app.launchArguments = ["UI-Testing"]
        app.launchEnvironment = ["TESTING_MODE": "1"]
        
        // Launch application
        app.launch()
    }
    
    override func tearDown() {
        super.tearDown()
        
        // Clean up test environment
        app.terminate()
    }
    
    // MARK: - Test Cases
    
    /// Tests navigation to and within recipe list
    /// Requirement: Recipe Management - Recipe database and matching for efficient recipe discovery
    func testRecipeListNavigation() throws {
        // Navigate to recipes tab
        let recipesTab = app.tabBars.buttons["Recipes"]
        XCTAssertTrue(recipesTab.exists)
        recipesTab.tap()
        
        // Verify recipe list view appears
        let recipeList = app.collectionViews["RecipeCollectionView"]
        XCTAssertTrue(recipeList.waitForExistence(timeout: 5))
        
        // Verify recipe grid layout
        let recipeCards = recipeList.cells
        XCTAssertGreaterThan(recipeCards.count, 0)
        
        // Verify recipe card components
        let firstRecipeCard = recipeCards.element(boundBy: 0)
        XCTAssertTrue(firstRecipeCard.images["RecipeImage"].exists)
        XCTAssertTrue(firstRecipeCard.staticTexts["RecipeTitle"].exists)
        XCTAssertTrue(firstRecipeCard.staticTexts["CookingTime"].exists)
        
        // Test vertical scrolling
        let lastRecipeCard = recipeCards.element(boundBy: recipeCards.count - 1)
        lastRecipeCard.swipeUp()
        XCTAssertTrue(lastRecipeCard.waitForExistence(timeout: 5))
        
        // Verify category filter tabs
        let categoryTabs = app.scrollViews["CategoryTabs"]
        XCTAssertTrue(categoryTabs.exists)
        
        // Test horizontal category scrolling
        categoryTabs.swipeLeft()
        categoryTabs.swipeRight()
    }
    
    /// Tests recipe search functionality
    /// Requirement: Recipe Management - Recipe database and matching for efficient recipe discovery
    func testRecipeSearch() throws {
        // Navigate to recipes
        app.tabBars.buttons["Recipes"].tap()
        
        // Tap search bar
        let searchBar = app.searchFields["SearchRecipes"]
        XCTAssertTrue(searchBar.waitForExistence(timeout: 5))
        searchBar.tap()
        
        // Enter search query
        searchBar.typeText("Pasta")
        
        // Verify search results
        let searchResults = app.collectionViews["RecipeCollectionView"]
        XCTAssertTrue(searchResults.waitForExistence(timeout: 5))
        
        // Verify results contain search term
        let firstResult = searchResults.cells.element(boundBy: 0)
        let resultTitle = firstResult.staticTexts["RecipeTitle"].label
        XCTAssertTrue(resultTitle.lowercased().contains("pasta"))
        
        // Test search filters
        let filtersButton = app.buttons["FiltersButton"]
        filtersButton.tap()
        
        // Apply difficulty filter
        app.buttons["DifficultyEasy"].tap()
        
        // Apply cooking time filter
        app.buttons["TimeUnder30"].tap()
        
        // Apply ingredient filter
        app.searchFields["IngredientFilter"].tap()
        app.searchFields["IngredientFilter"].typeText("tomato")
        app.buttons["AddIngredient"].tap()
        
        // Apply filters
        app.buttons["ApplyFilters"].tap()
        
        // Verify filtered results
        XCTAssertTrue(searchResults.waitForExistence(timeout: 5))
        
        // Test empty state
        searchBar.buttons["ClearText"].tap()
        searchBar.typeText("NonexistentRecipe12345")
        
        let emptyStateView = app.otherElements["EmptyStateView"]
        XCTAssertTrue(emptyStateView.waitForExistence(timeout: 5))
        
        // Clear search
        searchBar.buttons["ClearText"].tap()
        XCTAssertFalse(emptyStateView.exists)
    }
    
    /// Tests recipe detail view functionality
    /// Requirement: Recipe Detail View - Recipe details screen with comprehensive recipe information
    func testRecipeDetailView() throws {
        // Navigate to recipes and select first recipe
        app.tabBars.buttons["Recipes"].tap()
        let recipeList = app.collectionViews["RecipeCollectionView"]
        XCTAssertTrue(recipeList.waitForExistence(timeout: 5))
        recipeList.cells.element(boundBy: 0).tap()
        
        // Verify recipe header
        let recipeHeader = app.otherElements["RecipeHeader"]
        XCTAssertTrue(recipeHeader.images["RecipeImage"].exists)
        XCTAssertTrue(recipeHeader.staticTexts["RecipeTitle"].exists)
        
        // Verify cooking indicators
        let indicators = app.otherElements["RecipeIndicators"]
        XCTAssertTrue(indicators.staticTexts["CookingTime"].exists)
        XCTAssertTrue(indicators.staticTexts["Difficulty"].exists)
        
        // Verify ingredients list
        let ingredientsList = app.tables["IngredientsTable"]
        XCTAssertTrue(ingredientsList.exists)
        XCTAssertGreaterThan(ingredientsList.cells.count, 0)
        
        // Verify cooking steps
        let stepsTable = app.tables["CookingStepsTable"]
        XCTAssertTrue(stepsTable.exists)
        XCTAssertGreaterThan(stepsTable.cells.count, 0)
        
        // Test ingredient scaling
        let servingsControl = app.steppers["ServingsStepper"]
        XCTAssertTrue(servingsControl.exists)
        servingsControl.buttons["Increment"].tap()
        
        // Verify nutritional information
        let nutritionView = app.otherElements["NutritionView"]
        XCTAssertTrue(nutritionView.exists)
        
        // Test save recipe
        let saveButton = app.buttons["SaveRecipe"]
        saveButton.tap()
        XCTAssertTrue(app.alerts["RecipeSaved"].waitForExistence(timeout: 5))
        
        // Test share recipe
        let shareButton = app.buttons["ShareRecipe"]
        shareButton.tap()
        XCTAssertTrue(app.sheets["ShareSheet"].waitForExistence(timeout: 5))
    }
    
    /// Tests interactive cooking mode functionality
    /// Requirement: Recipe Detail View - Recipe details screen with comprehensive recipe information
    func testCookingMode() throws {
        // Navigate to recipe detail
        app.tabBars.buttons["Recipes"].tap()
        let recipeList = app.collectionViews["RecipeCollectionView"]
        recipeList.cells.element(boundBy: 0).tap()
        
        // Start cooking mode
        let startCookingButton = app.buttons["StartCooking"]
        XCTAssertTrue(startCookingButton.waitForExistence(timeout: 5))
        startCookingButton.tap()
        
        // Verify step navigation
        let cookingStepView = app.otherElements["CookingStepView"]
        XCTAssertTrue(cookingStepView.exists)
        
        let nextStepButton = app.buttons["NextStep"]
        let previousStepButton = app.buttons["PreviousStep"]
        
        nextStepButton.tap()
        XCTAssertTrue(previousStepButton.isEnabled)
        previousStepButton.tap()
        
        // Test timer functionality
        let timerButton = app.buttons["StartTimer"]
        if timerButton.exists {
            timerButton.tap()
            XCTAssertTrue(app.staticTexts["TimerCountdown"].exists)
        }
        
        // Verify ingredient checklist
        let ingredientChecklist = app.tables["IngredientChecklist"]
        XCTAssertTrue(ingredientChecklist.exists)
        ingredientChecklist.cells.element(boundBy: 0).tap()
        
        // Test step completion
        let completeStepButton = app.buttons["CompleteStep"]
        completeStepButton.tap()
        
        // Verify voice control
        let voiceControlButton = app.buttons["VoiceControl"]
        XCTAssertTrue(voiceControlButton.exists)
        voiceControlButton.tap()
        
        // Verify screen wake lock
        XCTAssertTrue(UIScreen.main.isIdleTimerDisabled)
        
        // Exit cooking mode
        let exitButton = app.buttons["ExitCooking"]
        exitButton.tap()
        XCTAssertTrue(app.alerts["ExitCookingMode"].waitForExistence(timeout: 5))
        app.alerts["ExitCookingMode"].buttons["Confirm"].tap()
    }
}